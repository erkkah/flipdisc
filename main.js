"use strict"

var fs = require('fs');
var ini = require('ini');
var express = require('express');
var http = require('http');
var socketio = require('socket.io');
var diskdb = require('diskdb');

var FlipDisplay = require('./lib/flipdisplay')
var State = require('./lib/state')
var Controller = require('./lib/controller')

var config = ini.parse(fs.readFileSync(__dirname + '/flipdisc.ini', 'utf-8'));

var PORT = config.http.port || 3000;
var DBROOT = config.database.root || './db';

var app = express();
var server = http.Server(app);
var io = socketio(server);
var db = diskdb.connect(DBROOT);

var state = new State(db);
var display = new FlipDisplay();

var displayStatus = "Not initialized";
display.open().then(function(){
	displayStatus = "Opened";
}).catch(function(err){
	console.log("failed to init display:", err);
	displayStatus = err + "";
})

var controller = new Controller(state, display);

app.use(express.static(__dirname + '/public'));

function addDisplayStatus(controllerStatus){
	controllerStatus.display = displayStatus;
	return controllerStatus;
}

function updateClient(client){
	client.emit('configchanged', state.getConfig());
	client.emit('modeschanged', state.getModes());
	client.emit('scriptschanged', state.getDisplayScripts());
	client.emit('datascriptschanged', state.getDataFetchers());
	client.emit('statuschanged', addDisplayStatus(controller.getStatus()));
}

io.on('connection', function(socket){

	socket.on('refresh', function(){
		console.log('Refreshing client');
		updateClient(socket);
	});

	socket.on('setconfig', function(config){
		console.log('Received config update');
		state.setConfig(config);
	});

	socket.on('setmode', function(mode, callback){
		console.log('Received mode update:', mode);
		try{
			state.setMode(mode);
			callback(null);
		}catch(e){
			console.log(e.stack);
			callback(e + "");
		}
	});

	socket.on('deletemode', function(modeID){
		console.log('Received mode deletion');
		state.deleteMode(
			{
				_id: modeID
			}
		);
	});

	socket.on('setscript', function(script, callback){
		console.log('Received script update:', script);
		try{
			state.setDisplayScript(script);
			callback(null);
		}catch(e){
			console.log(e.stack);
			callback(e + "");
		}
	});

	socket.on('deletescript', function(scriptID, callback){
		console.log('Received script deletion');
		try{
			state.deleteDisplayScript(
				{
					_id: scriptID
				}
			);
			callback(null);
		}catch(e){
			console.log(e.stack);
			callback(e + "");
		}
	});

	socket.on('setdatascript', function(script, callback){
		console.log('Received data script update:', script);
		try{
			state.setDataFetcher(script);
			callback(null);
		}catch(e){
			console.log(e.stack);
			callback(e + "");
		}
	});

	socket.on('deletedatascript', function(scriptID, callback){
		console.log('Received data script deletion');
		try{
			state.deleteDataFetcher(
				{
					_id: scriptID
				}
			);
			callback(null);
		}catch(e){
			console.log(e.stack);
			callback(e + "");
		}
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

state.on('scriptschanged', function(scripts){
	io.emit('scriptschanged', scripts);
});

state.on('datafetcherschanged', function(scripts){
	io.emit('datascriptschanged', scripts);
});

controller.on('statuschanged', function(status){
	io.emit('statuschanged', addDisplayStatus(status));
});

server.listen(PORT, function(){
	console.log(`listening on *:${PORT}`);
});

