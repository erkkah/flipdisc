"use strict"

/*
 * Main script for the flipdisc server.
 *
 * Reads settings from "flipdisc.ini", opens a connection to the display
 * and starts the web admin interface.
 *
 * The web interface serves a static one page app using socket.io for event based communication.
 *
 * Logs to stdout.
 */

var fs = require('fs');
var ini = require('ini');
var express = require('express');
var http = require('http');
var socketio = require('socket.io');
var diskdb = require('diskdb');

var util = require('./lib/util')
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
var display = new FlipDisplay({
	device: config.serial.device,
	baudRate: config.serial.baudRate,
	panelLayout: config.display
});

var controller = null;

var displayStatus = "Not initialized";
display.open().then(function(){
	displayStatus = "Opened";
	display.clear(0, function(error){
		console.log("Done clearing, ", error);
	})
	controller = new Controller(state, display, config.controller);
	controller.on('statuschanged', function(status){
		io.emit('statuschanged', getDisplayStatus());
	});
}).catch(function(err){
	console.log("failed to init display:", err);
	displayStatus = err + "";
})

// Serve admin interface statics from /public
app.use(express.static(__dirname + '/public'));

// Server database files directly from db storage
app.use('/db', express.static(__dirname + '/db'));

function getDisplayStatus(){
	var controllerStatus = controller ? controller.getStatus() : {};
	controllerStatus.display = displayStatus;
	return controllerStatus;
}

// Performs a full update of attached web client
function updateClient(client){
	client.emit('configchanged', state.getConfig());
	client.emit('modeschanged', state.getModes());
	client.emit('scriptschanged', state.getDisplayScripts());
	client.emit('datascriptschanged', state.getDataFetchers());
	client.emit('statuschanged', getDisplayStatus());
}

// For each new connection, attach new event handlers to the socket
io.on('connection', function(socket){

	if(controller){
		controller.on('frame', function(frame){
			socket.volatile.emit('frame', frame);
		});
	}

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
			// Basic test compilation, throws on problems
			var compiled = util.scriptToObject(script.code, script.name);

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
			// Basic test compilation, throws on problems
			var compiled = util.scriptToObject(script.code, script.name);

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

// Hook up event handling for state changes, broadcast to all clients
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

server.listen(PORT, function(){
	console.log(`listening on *:${PORT}`);
});

