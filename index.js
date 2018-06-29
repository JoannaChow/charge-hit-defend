var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var users = {};

function isInArray(id) {
	if(users[id] == null) return false;
	else return true;
};

function addInArray(id, roomname) {
	users[id] = {
		Roomname: roomname,
		OpponentId: "",
		Selection: "",
		Charge: 0
	};
	console.log(users);
};

function isOccupied(roomname){
	var counter = 0;
	var player1;
	var player2;
	for(key in users) {
		if(users[key].Roomname == roomname) {
			counter++;
			if(counter == 1) player1 = key;
			else player2 = key;
		}
	}
	if(counter == 2) {
		users[player1].OpponentId = player2;
		users[player2].OpponentId = player1;
		return true;
	}
	else return false;

	//the other way to loop an object
	// const keys = Object.keys(users);
	// for(let i = 0; i < keys.size(); i++) {
	// 	console.log(users[key]);
	// }
};

function removeUser(id) {
	delete users[id];
};

function resetUser(id) {
	users[id].Roomname = "";
	users[id].OpponentId = "";
	users[id].Selection = "";
	users[id].Charge = 0;
};

//--------------------------------------------------------------------

app.get('/', function(req, res){
	res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){
	console.log('a user '+ socket.id+' connected');

	socket.on('disconnect', function(){
		if(isInArray(socket.id)) {
			var opponentUser = users[socket.id].OpponentId;
			removeUser(socket.id);
			resetUser(opponentUser);
			io.to(opponentUser).emit('back_to_ready', false, "");
			console.log('user: '+ socket.id +' disconnected');
		}
		else console.log('user: '+ socket.id +' didnt disconnected');
	});

	socket.on('ready', function(roomname){
		if(roomname != "" && !isOccupied(roomname)){
			if(!isInArray(socket.id)){
				//add user into the array with the roomname
				addInArray(socket.id, roomname);
				console.log('user: '+ socket.id +' get in room: ' + roomname);
			}
			else if(users[socket.id].Roomname == ""){
				//get into new room
				users[socket.id].Roomname = roomname;
			}

			socket.join(roomname, function(){
				//if now there are 2 players in the room, start game
				if(isOccupied(roomname)){
					io.to(roomname).emit('start', 'getting start');
				}
				else{
					io.to(socket.id).emit('ready');
				}
			});
		}
		else{
			if(roomname == "") io.to(socket.id).emit('back_to_ready', true, "Roomname cannot be empty!");
			else io.to(socket.id).emit('back_to_ready', true, "");
		}
	});

	socket.on('select', function(msg){
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
					io.to(socket.id).emit('end', 'you lose');
					io.to(player2).emit('end', 'you win');
				}
				else{ // users[player2].Selection == "charge" or "defend"
					if(users[player2].Selection == "charge"){
						users[player2].Charge++;
						if(users[player2].Charge >= 1) io.to(player2).emit('enable_hit', 'enable to hit');
					}
					io.to(socket.id).emit('continue', 'you are safe\n', users[socket.id].Charge);
					io.to(player2).emit('continue', 'you are safe\n', users[player2].Charge);
				}
			}
			else if(users[socket.id].Selection == "hit"){
				users[socket.id].Charge--;
				if(users[socket.id].Charge == 0) io.to(socket.id).emit('disable_hit', 'enable to hit');
				
				if(users[player2].Selection == "charge"){
					users[player2].Charge++;
					if(users[player2].Charge >= 1) io.to(player2).emit('enable_hit', 'enable to hit');
					io.to(socket.id).emit('end', 'you win');
					io.to(player2).emit('end', 'you lose');
				}
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
				}
				else{
					if(users[player2].Selection == "charge"){
						users[player2].Charge++;
						if(users[player2].Charge >= 1) io.to(player2).emit('enable_hit', 'enable to hit');
					}
					io.to(player2).emit('continue', 'you are safe\n', users[player2].Charge);
				}
			}

			// reset select
			users[socket.id].Selection = "";
			users[player2].Selection = "";
		}
	});
});

http.listen(3000, function(){
	console.log('listening on *:3000');
});