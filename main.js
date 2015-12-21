"use strict"

var fs = require('fs');
var ini = require('ini');
var express = require('express');
var http = require('http');
var socketio = require('socket.io');
var diskdb = require('diskdb');

var FlipDisplay = require('./lib/flipdisplay')
var State = require('./lib/state')

var config = ini.parse(fs.readFileSync(__dirname + '/flipdisc.ini', 'utf-8'));

var PORT = config.http.port || 3000;
var DBROOT = config.database.root || './db';

var app = express();
var server = http.Server(app);
var io = socketio(server);
var db = diskdb.connect(DBROOT);

var state = new State(db);
var display = new FlipDisplay();

display.open().then(function(){
	console.log("Display opened")
}).catch(function(err){
	console.log("failed to init display:", err)
})

app.use(express.static(__dirname + '/public'));

function updateClient(client){
	client.emit('configchanged', state.getConfig());
	client.emit('modeschanged', state.getModes());
}

io.on('connection', function(socket){
	console.log('a user connected');

	socket.on('refresh', function(){
		console.log('Refreshing client');
		updateClient(socket);
	});

	socket.on('setconfig', function(config){
		console.log('Received config update');
		state.setConfig(config);
	});

	socket.on('setmode', function(mode){
		console.log('Received mode update:', mode);
		state.setMode(mode);
	});

	socket.on('deletemode', function(modeId){
		console.log('Received mode deletion');
		state.deleteMode(
			{
				_id: modeId
			}
		);
	});	

	socket.on('error', function(error){
		console.log(error);
		socket.emit('notification', 'Server error: ' + error);
	});
});

state.on('configchanged', function(config){
	io.emit('configchanged', config);
});

state.on('modeschanged', function(modes){
	io.emit('modeschanged', modes);
});

server.listen(PORT, function(){
	console.log(`listening on *:${PORT}`);
});
