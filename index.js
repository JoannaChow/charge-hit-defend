var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
// var user1 = {id:"", selection:"", charge:0};
// var user2 = {id:"", selection:"", charge:0};
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

function isPairup(roomname){
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

function getRoomname(id) {
	return users[id].Roomname;
};

function removeUser(id) {
	delete users[id];
};

//--------------------------------------------------------------------

app.get('/', function(req, res){
	res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){
	console.log('a user '+ socket.id+' connected');

	socket.on('disconnect', function(){
		if(isInArray(socket.id)) {
			var roomname = users[socket.id].Roomname;
			removeUser(socket.id);
			io.to(roomname).emit('back_to_ready', 'back to getting ready');
			console.log('user: '+ socket.id +' disconnected');
		}
		else console.log('user: '+ socket.id +' didnt disconnected');
	});

	socket.on('ready', function(roomname){
		if(!isInArray(socket.id)){
			//add user into the array
			addInArray(socket.id, roomname);
			console.log('user: '+ socket.id +' get in room: ' + roomname);
			if(isInArray(socket.id)) console.log('user: '+ socket.id +' is in the array!');
			if(!isInArray(socket.id)) console.log('user: '+ socket.id +' is not in the array!');
			socket.join(roomname, function(){
				//start game
				if(isPairup(roomname)){
					io.to(roomname).emit('start', 'getting start');
				}
			});
		}
	});

	socket.on('select', function(msg){
		users[socket.id].selection = msg;
		var player2 = users[socket.id].OpponentId;

		if(users[socket.id].selection != "" && users[player2].selection != ""){
			if(users[socket.id].selection == "charge"){
				users[socket.id].charge++;
				if(users[socket.id].charge >= 1) io.to(socket.id).emit('enable_hit', 'enable to hit');

				if(users[player2].selection == "hit"){
					users[player2].charge--;
					if(users[player2].charge == 0) io.to(player2).emit('disable_hit', 'disable to hit');
					io.to(socket.id).emit('end', 'you lose');
					io.to(player2).emit('end', 'you win');
				}
				else{ // users[player2].selection == "charge" or "defend"
					if(users[player2].selection == "charge"){
						users[player2].charge++;
						if(users[player2].charge >= 1) io.to(player2).emit('enable_hit', 'enable to hit');
					}
					io.to(socket.id).emit('continue', 'you are safe', users[socket.id].charge);
					io.to(player2).emit('continue', 'you are safe', users[player2].charge);
				}
			}
			else if(users[socket.id].selection == "hit"){
				users[socket.id].charge--;
				if(users[socket.id].charge == 0) io.to(socket.id).emit('disable_hit', 'enable to hit');
				
				if(users[player2].selection == "charge"){
					users[player2].charge++;
					if(users[player2].charge >= 1) io.to(player2).emit('enable_hit', 'enable to hit');
					io.to(socket.id).emit('end', 'you win');
					io.to(player2).emit('end', 'you lose');
				}
				else{ // users[player2].selection == "hit" or "defend"
					io.to(socket.id).emit('continue', 'you are even', users[socket.id].charge);
					if(users[player2].selection == "hit"){
						users[player2].charge--;
						if(users[player2].charge == 0) io.to(users[player2].id).emit('disable_hit', 'disable to hit');
						io.to(player2).emit('continue', 'you are even', users[player2].charge);
					}
					if(users[player2].selection == "defend")io.to(player2).emit('continue', 'you are safe', users[player2].charge);
				}
			}
			else{ // users[socket.id].selection == "defend"
				io.to(socket.id).emit('continue', 'you are safe', users[socket.id].charge);
				if(users[player2].selection == "hit"){
					users[player2].charge--;
					if(users[player2].charge == 0) io.to(player2).emit('disable_hit', 'disable to hit');
					io.to(player2).emit('continue', 'you are even', users[player2].charge);
				}
				else{
					if(users[player2].selection == "charge"){
						users[player2].charge++;
						if(users[player2].charge >= 1) io.to(player2).emit('enable_hit', 'enable to hit');
					}
					io.to(player2).emit('continue', 'you are safe', users[player2].charge);
				}
			}

			// reset select
			users[socket.id].selection = "";
			users[player2].selection = "";
		}
	});
});

http.listen(3000, function(){
	console.log('listening on *:3000');
});