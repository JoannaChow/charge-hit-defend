const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const users = [];
const rooms = [];


function findUserIndex(user){
	return user.Id == this;
};

function findRoomIndex(room){
	return room.Roomname == this;
};

function isNewroom(roomname){
	if(rooms.findIndex(findRoomIndex, roomname) == -1) return true;
	return false;
};

function signIn(id){
	const newuser = { Id: id, 
					Roomname: "", 
					OpponentId: "", 
					Selection: "charge", 
					Charge: 0,
					Ready: false, };
	users.push(newuser);
	console.log(users);
};

function checkIn(id, roomname){
	const userIndex = users.findIndex(findUserIndex, id);
	users[userIndex].Roomname = roomname;
	if(isNewroom(roomname)){
		const newroom = {Roomname: roomname, Player1: id, Player2: ""};
		rooms.push(newroom);
	}
	else{
		const roomIndex = rooms.findIndex(findRoomIndex, roomname);
		if(rooms[roomIndex].Player1 == ""){
			rooms[roomIndex].Player1 = id;
		}
		else{
			rooms[roomIndex].Player2 = id;
		}

		const p1 = rooms[roomIndex].Player1;
		const p2 = rooms[roomIndex].Player2;
		const p1Index = users.findIndex(findUserIndex, p1);
		const p2Index = users.findIndex(findUserIndex, p2);
		if(p1 != "" && p2 != ""){
			users[p1Index].OpponentId = p2;
			users[p2Index].OpponentId = p1;
		}
	}
	console.log(rooms);
};

function checkOut(id){
	const userIndex = users.findIndex(findUserIndex, id);
	const roomname = users[userIndex].Roomname;
	users[userIndex].Roomname = "";
	const roomIndex = rooms.findIndex(findRoomIndex, roomname);
	if(rooms[roomIndex].Player1 == id){
		rooms[roomIndex].Player1 = "";
	}
	else{
		rooms[roomIndex].Player2 = "";
	}

	if(rooms[roomIndex].Player1 == "" && rooms[roomIndex].Player2 == ""){
		// remove room from array rooms
		rooms.splice(roomIndex, 1);
	}
	console.log(rooms);
};

function isFull(roomname){
	const roomIndex = rooms.findIndex(findRoomIndex, roomname);
	
	if(roomIndex > -1 && rooms[roomIndex].Player1 != "" && rooms[roomIndex].Player2 != "") return true;

	return false;
};

function allReady(roomname){
	const roomIndex = rooms.findIndex(findRoomIndex, roomname);
	const p1Index = users.findIndex(findUserIndex, rooms[roomIndex].Player1);
	const p2Index = users.findIndex(findUserIndex, rooms[roomIndex].Player2);

	if(users[p1Index].Ready && users[p2Index].Ready) return true;
	return false;
};

function hasCheckedIn(id){
	const userIndex = users.findIndex(findUserIndex, id);
	if(users[userIndex].Roomname == "") return false;
	return true;
	console.log(rooms);
};

function removeUser(id){	
	const userIndex = users.findIndex(findUserIndex, id);
	users.splice(userIndex, 1);
	console.log(`remove user ${id}`);
	console.log(users);
};

function resetUser(id){
	const userIndex = users.findIndex(findUserIndex, id);
	users[userIndex].OpponentId = "";
	users[userIndex].Selection = "charge";
	users[userIndex].Charge = 0;
	users[userIndex].Ready = false;
};

//--------------------------------------------------------------------

app.get('/', function(req, res){
	res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){
	signIn(socket.id);
	console.log('a user '+ socket.id+' connected');

	socket.on('disconnect', function(){
		if(hasCheckedIn(socket.id)) {
			const userIndex = users.findIndex(findUserIndex, socket.id);
			const opponentUser = users[userIndex].OpponentId;
			checkOut(socket.id);
			resetUser(opponentUser);
			io.to(opponentUser).emit('ready', "opponent player left, wait for other player");
			console.log('user: '+ socket.id +' checked out');
		}
		else{
			removeUser(socket.id);
			console.log('user: '+ socket.id +' disconnected');
		}
	});

	socket.on('back_to_lobby', function(){
		const userIndex = users.findIndex(findUserIndex, socket.id);
		const roomname = users[userIndex].Roomname;
		checkOut(socket.id);
		resetUser(socket.id);
		socket.leave(roomname);
		io.to(socket.id).emit('back_to_lobby', "Left room " + roomname);
		console.log(`user ${socket.id} left room ${roomname}.`);
	});

	socket.on('enter', function(roomname){
		const checkedIn = hasCheckedIn(socket.id);		
		if(roomname != "" || checkedIn){
			if(checkedIn || (isNewroom(roomname) || !isFull(roomname))){
				if(!checkedIn){
					checkIn(socket.id, roomname);
				}
				else{
					const userIndex = users.findIndex(findUserIndex, socket.id);
					roomname = users[userIndex].Roomname;
					resetUser(socket.id);
				}

				// validated roomname
				// enter the room
				socket.join(roomname, function(){
					io.to(socket.id).emit('in_room', "Please be ready.");
					console.log(`user ${socket.id} entered room ${roomname}.`)
				});
			}
			else{
				// the room is occupied
				io.to(socket.id).emit('back_to_lobby', "Roomname is already used by other players.");
			}
		}
		else{
			// toomname is not valid
			io.to(socket.id).emit('back_to_lobby', "Roomname cannot be empty!");
		}
	});

	socket.on('ready', function(){
		const userIndex = users.findIndex(findUserIndex, socket.id);
		users[userIndex].Ready = true;
		const roomname = users[userIndex].Roomname;

		if(isFull(roomname) && allReady(roomname)){
			// 2 players are ready, start game
			socket.to(roomname).emit('start');
			io.to(socket.id).emit('start');
			console.log(`In room ${roomname}, user ${socket.id} started the game.`);
		}
		else{
			// wait for another player
			io.to(socket.id).emit('ready', 'wait for the other roomplayer get ready!');
			console.log(`In room ${roomname}, user ${socket.id} wait for the other player.`);
		}
	});

	socket.on('unready', function(){
		const userIndex = users.findIndex(findUserIndex, socket.id);
		users[userIndex].ready = false;
		io.to(socket.id).emit('in_room', 'Please be ready.');
	});

	socket.on('select', function(msg){
		const userIndex = users.findIndex(findUserIndex, socket.id);
		users[userIndex].Selection = msg;
		console.log(`${socket.id} selected ${msg}.`)
	});

	socket.on('timesup', function(){
		const p1Index = users.findIndex(findUserIndex, socket.id);
		const opponentId = users[p1Index].OpponentId;
		const roomname = users[p1Index].Roomname;
		const roomIndex = rooms.findIndex(findRoomIndex, roomname);
		const p2Index = users.findIndex(findUserIndex, opponentId);
		if(socket.id == rooms[roomIndex].Player1){
			// let player1 be game logic manager
			//game logic
			switch(users[p1Index].Selection){
				case "charge":
					users[p1Index].Charge++;
					if(users[p1Index].Charge >= 1) io.to(socket.id).emit('enable_hit');

					if(users[p2Index].Selection == "charge"){
						users[p2Index].Charge++;
						if(users[p2Index].Charge >= 1) io.to(opponentId).emit('enable_hit');
						io.to(socket.id).emit('continue', 'Opponent charged, you are safe.', users[p1Index].Charge);
						io.to(opponentId).emit('continue', 'Opponent charged, you are safe.', users[p2Index].Charge);
					}
					else if(users[p2Index].Selection == "hit"){
						users[p2Index].Charge--;
						if(users[p2Index].Charge == 0) io.to(opponentId).emit('disable_hit');
						io.to(socket.id).emit('end', 'Opponent hit, you lose.', users[p1Index].Charge);
						io.to(opponentId).emit('end', 'Opponent charged, you win.', users[p2Index].Charge);
					}
					else{
						// users[p2Index].Selection == "defend"
						io.to(socket.id).emit('continue', 'Opponent defended, you are safe', users[p1Index].Charge);
						io.to(opponentId).emit('continue', 'Opponent charged, you are safe', users[p2Index].Charge);
					}
					break;
				case "hit":
					users[p1Index].Charge--;
					if(users[p1Index].Charge == 0) io.to(socket.id).emit('disable_hit');

					if(users[p2Index].Selection == "charge"){
						users[p2Index].Charge++;
						if(users[p2Index].Charge >= 1) io.to(opponentId).emit('enable_hit');
						io.to(socket.id).emit('end', 'Opponent charged, you win.', users[p1Index].Charge);
						io.to(opponentId).emit('end', 'Opponent hit, you lose.', users[p2Index].Charge);
					}
					else if(users[p2Index].Selection == "hit"){
						users[p2Index].Charge--;
						if(users[p2Index].Charge == 0) io.to(opponentId).emit('disable_hit');
						io.to(socket.id).emit('continue', 'Opponent hit, you are even', users[p1Index].Charge);
						io.to(opponentId).emit('continue', 'Opponent hit, you are even', users[p2Index].Charge);
						
					}
					else{
						// users[p2Index].Selection == "defend"
						io.to(socket.id).emit('continue', 'Opponent defended, you are even', users[p1Index].Charge);
						io.to(opponentId).emit('continue', 'Opponent hit, you are safe', users[p2Index].Charge);
					}
					break;
				default:
					// case 'defend'
					if(users[p2Index].Selection == "charge"){
						users[p2Index].Charge++;
						if(users[p2Index].Charge >= 1) io.to(opponentId).emit('enable_hit');
						io.to(socket.id).emit('continue', 'Opponent charged, you are safe', users[p1Index].Charge);
						io.to(opponentId).emit('continue', 'Opponent defended, you are safe', users[p2Index].Charge);
					}
					else if(users[p2Index].Selection == "hit"){
						users[p2Index].Charge--;
						if(users[p2Index].Charge == 0) io.to(opponentId).emit('disable_hit');
						io.to(socket.id).emit('continue', 'Opponent hit, you are safe', users[p1Index].Charge);
						io.to(opponentId).emit('continue', 'Opponent defended, you are even', users[p2Index].Charge);
						
					}
					else{
						// users[p2Index].Selection == "defend"
						io.to(socket.id).emit('continue', 'Opponent defended, you are safe', users[p1Index].Charge);
						io.to(opponentId).emit('continue', 'Opponent defended, you are safe', users[p2Index].Charge);
					}
					break;
			}

			//reset selection
			users[p1Index].Selection = "charge";
			users[p2Index].Selection = "charge";

		}	
	});
});

http.listen(3000, function(){
	console.log('listening on *:3000');
});