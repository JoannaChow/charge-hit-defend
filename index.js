var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var readylist = ["", ""];
var select = ["",""];
var chargelist = [0,0];

app.get('/', function(req, res){
	res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){
	console.log('a user '+ socket.id+' connected');

	socket.on('disconnect', function(){
		if(readylist[0] == socket.id){
			readylist[0] = "";
			io.to('room').emit('back_to_ready', 'back to getting ready');
		} else if(readylist[1] == socket.id){
			readylist[1] = "";
			io.to('room').emit('back_to_ready', 'back to getting ready');
		}
		chargelist = [0,0];
		console.log('user: '+ socket.id +' disconnected');
		console.log("readylist: " + readylist);
	});

	socket.on('ready', function(msg){
		if((readylist[0] == "" && readylist[1] != socket.id) || 
			(readylist[1] == "" && readylist[0] != socket.id)){
			socket.join('room', function(){
				if(readylist[0] == ""){
					readylist[0] = socket.id;
				}else readylist[1] = socket.id;
				console.log(socket.id +' is ' + msg);
				console.log("readylist: " + readylist);

				if(readylist[0] != "" && readylist[1] != ""){
					io.to('room').emit('start', 'getting start');
				}
			});
		}
	});

	socket.on('select', function(msg){
		if(socket.id == readylist[0]){
			select[0] = msg;
		}else select[1] = msg;

		if(select[0] != "" && select[1] != ""){
			// if(chargelist[0] > 0) io.to(readylist[0]).emit('enable_hit', 'disable to hit');
			// if(chargelist[1] > 0) io.to(readylist[1]).emit('enable_hit', 'disable to hit');
			console.log("readylist: " + readylist);
			if(select[0] == "charge"){
				chargelist[0]++;
				if(chargelist[0] >= 1) io.to(readylist[0]).emit('enable_hit', 'enable to hit');

				if(select[1] == "hit"){
					chargelist[1]--;
					if(chargelist[1] == 0) io.to(readylist[1]).emit('disable_hit', 'disable to hit');
					io.to(readylist[0]).emit('end', 'you lose');
					io.to(readylist[1]).emit('end', 'you win');
				}
				else{ // select[1] == "charge" or "defend"
					if(select[1] == "charge"){
						chargelist[1]++;
						if(chargelist[1] >= 1) io.to(readylist[1]).emit('enable_hit', 'enable to hit');
					}
					io.to(readylist[0]).emit('continue', 'you are safe', chargelist[0]);
					io.to(readylist[1]).emit('continue', 'you are safe', chargelist[1]);
				}
			}
			else if(select[0] == "hit"){
				chargelist[0]--;
				if(chargelist[0] == 0) io.to(readylist[0]).emit('disable_hit', 'enable to hit');
				
				if(select[1] == "charge"){
					chargelist[1]++;
					if(chargelist[1] >= 1) io.to(readylist[1]).emit('enable_hit', 'enable to hit');
					io.to(readylist[0]).emit('end', 'you win');
					io.to(readylist[1]).emit('end', 'you lose');
				}
				else{ // select[1] == "hit" or "defend"
					io.to(readylist[0]).emit('continue', 'you are even', chargelist[0]);
					if(select[1] == "hit"){
						chargelist[1]--;
						if(chargelist[1] == 0) io.to(readylist[1]).emit('disable_hit', 'disable to hit');
						io.to(readylist[1]).emit('continue', 'you are even', chargelist[1]);
					}
					if(select[1] == "defend")io.to(readylist[1]).emit('continue', 'you are safe', chargelist[1]);
				}
			}
			else{ // select[0] == "defend"
				io.to(readylist[0]).emit('continue', 'you are safe', chargelist[0]);
				if(select[1] == "hit"){
					chargelist[1]--;
					if(chargelist[1] == 0) io.to(readylist[1]).emit('disable_hit', 'disable to hit');
					io.to(readylist[1]).emit('continue', 'you are even', chargelist[1]);
				}
				else{
					if(select[1] == "charge"){
						chargelist[1]++;
						if(chargelist[1] >= 1) io.to(readylist[1]).emit('enable_hit', 'enable to hit');
					}
					io.to(readylist[1]).emit('continue', 'you are safe', chargelist[1]);
				}
			}

			// reset select
			select[0] = "";
			select[1] = "";
		}
	});
});

http.listen(3000, function(){
	console.log('listening on *:3000');
});