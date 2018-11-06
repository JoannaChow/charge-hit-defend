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
	const newuser = { Id: id, Roomname: "", OpponentId: "", Selection: "", Charge: 0 };
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
};

function isFull(roomname){
	const roomIndex = rooms.findIndex(findRoomIndex, roomname);
	
	if(roomIndex > -1 && rooms[roomIndex].Player1 != "" && rooms[roomIndex].Player2 != "") return true;

	return false;
};

function hasCheckedIn(id){
	const userIndex = users.findIndex(findUserIndex, id);
	if(users[userIndex].Roomname == "") return false;
	return true;
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
	users[userIndex].Selection = "";
	users[userIndex].Charge = 0;
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
			const userIndex = users.findIndex(findUserIndex, id);
			const opponentUser = users[userIndex].OpponentId;
			checkOut(socket.id);
			resetUser(opponentUser);
			io.to(opponentUser).emit('back_to_ready', "opponent player left, wait for other player");
			console.log('user: '+ socket.id +' checked out');
		}
		else{
			removeUser(socket.id);
			console.log('user: '+ socket.id +' disconnected');
		}
	});

	socket.on('ready', function(roomname){
		if(roomname != ""){
			if(isNewroom(roomname) || !isFull(roomname)){
				// validated roomname
				// get in the room
				checkIn(socket.id, roomname);
				console.log('user: '+ socket.id +' get in room: ' + roomname);

				socket.join(roomname, function(){
					if(isFull(roomname)){
						// 2 players are ready, start game
						io.to(roomname).emit('start', 'getting start');
					}
					else{
						// wait for another player
						io.to(socket.id).emit('ready');
					}
				});
			}
			// the room is occupied
			io.to(socket.id).emit('back_to_ready', "Roomname is already used by other players.");
		}
		else{
			// roomname is not valid
			io.to(socket.id).emit('back_to_ready', "Roomname cannot be empty!");
		}
	});

	socket.on('select', function(msg){
<<<<<<< HEAD
		const p1Index = users.findIndex(findUserIndex, id);
		users[p1Index].Selection = msg;
		const player2 = users[p1Index].OpponentId;
		const p2Index = users.findIndex(findUserIndex, player2);
		
		//game logic
		if(users[p1Index].Selection != "" && users[p2Index].Selection != ""){
			if(users[p1Index].Selection == "charge"){
				users[p1Index].Charge++;
				if(users[p1Index].Charge >= 1) io.to(socket.id).emit('enable_hit', 'enable to hit');

				if(users[p2Index].Selection == "hit"){
					users[p2Index].Charge--;
					if(users[p2Index].Charge == 0) io.to(player2).emit('disable_hit', 'disable to hit');
=======
		users[socket.id].Selection = msg;
		var player2 = users[socket.id].OpponentId;

		console.log(users);
		//game logic
		if(users[socket.id].Selection != "" && users[player2].Selection != ""){
			if(users[socket.id].Selection == "charge"){
				users[socket.id].Charge++;
				if(users[socket.id].Charge >= 1) io.to(socket.id).emit('enable_hit', 'enable to hit');

				if(users[player2].Selection == "hit"){
					users[player2].Charge--;
					if(users[player2].Charge == 0) io.to(player2).emit('disable_hit', 'disable to hit');
>>>>>>> 0b2b7f43d72f9a2818789c3b58df47aea28ee2f1
					io.to(socket.id).emit('end', 'you lose');
					io.to(player2).emit('end', 'you win');
				}
				else{ // users[p2Index].Selection == "charge" or "defend"
					if(users[p2Index].Selection == "charge"){
						users[p2Index].Charge++;
						if(users[p2Index].Charge >= 1) io.to(player2).emit('enable_hit', 'enable to hit');
					}
<<<<<<< HEAD
					io.to(socket.id).emit('continue', 'you are safe', users[p1Index].Charge);
					io.to(player2).emit('continue', 'you are safe', users[p2Index].Charge);
=======
					io.to(socket.id).emit('continue', 'you are safe\n', users[socket.id].Charge);
					io.to(player2).emit('continue', 'you are safe\n', users[player2].Charge);
>>>>>>> 0b2b7f43d72f9a2818789c3b58df47aea28ee2f1
				}
			}
			else if(users[p1Index].Selection == "hit"){
				users[p1Index].Charge--;
				if(users[p1Index].Charge == 0) io.to(socket.id).emit('disable_hit', 'enable to hit');
				
				if(users[p2Index].Selection == "charge"){
					users[p2Index].Charge++;
					if(users[p2Index].Charge >= 1) io.to(player2).emit('enable_hit', 'enable to hit');
					io.to(socket.id).emit('end', 'you win');
					io.to(player2).emit('end', 'you lose');
				}
<<<<<<< HEAD
				else{ // users[p2Index].Selection == "hit" or "defend"
					io.to(socket.id).emit('continue', 'you are even', users[p1Index].Charge);
					if(users[p2Index].Selection == "hit"){
						users[p2Index].Charge--;
						if(users[p2Index].Charge == 0) io.to(users[p2Index].id).emit('disable_hit', 'disable to hit');
						io.to(player2).emit('continue', 'you are even', users[p2Index].Charge);
					}
					if(users[p2Index].Selection == "defend")io.to(player2).emit('continue', 'you are safe', users[p2Index].Charge);
				}
			}
			else{ // users[p1Index].Selection == "defend"
				io.to(socket.id).emit('continue', 'you are safe', users[p1Index].Charge);
				if(users[p2Index].Selection == "hit"){
					users[p2Index].Charge--;
					if(users[p2Index].Charge == 0) io.to(player2).emit('disable_hit', 'disable to hit');
					io.to(player2).emit('continue', 'you are even', users[p2Index].Charge);
=======
				else{ // users[player2].Selection == "hit" or "defend"
					io.to(socket.id).emit('continue', 'you are even\n', users[socket.id].Charge);
					if(users[player2].Selection == "hit"){
						users[player2].Charge--;
						if(users[player2].Charge == 0) io.to(users[player2].id).emit('disable_hit', 'disable to hit');
						io.to(player2).emit('continue', 'you are even\n', users[player2].Charge);
					}
					if(users[player2].Selection == "defend")io.to(player2).emit('continue', 'you are safe\n', users[player2].Charge);
				}
			}
			else{ // users[socket.id].Selection == "defend"
				io.to(socket.id).emit('continue', 'you are safe\n', users[socket.id].Charge);
				if(users[player2].Selection == "hit"){
					users[player2].Charge--;
					if(users[player2].Charge == 0) io.to(player2).emit('disable_hit', 'disable to hit');
					io.to(player2).emit('continue', 'you are even\n', users[player2].Charge);
>>>>>>> 0b2b7f43d72f9a2818789c3b58df47aea28ee2f1
				}
				else{
					if(users[p2Index].Selection == "charge"){
						users[p2Index].Charge++;
						if(users[p2Index].Charge >= 1) io.to(player2).emit('enable_hit', 'enable to hit');
					}
<<<<<<< HEAD
					io.to(player2).emit('continue', 'you are safe', users[p2Index].Charge);
=======
					io.to(player2).emit('continue', 'you are safe\n', users[player2].Charge);
>>>>>>> 0b2b7f43d72f9a2818789c3b58df47aea28ee2f1
				}
			}

			// reset select
			users[p1Index].Selection = "";
			users[p2Index].Selection = "";
		}
	});
});

http.listen(3000, function(){
	console.log('listening on *:3000');
});