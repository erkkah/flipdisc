"use strict"

var fs = require('fs');
var ini = require('ini');
var express = require('express');
var http = require('http');
var socketio = require('socket.io');
var diskdb = require('diskdb');

var FlipDisplay = require('./lib/flipdisplay')

var config = ini.parse(fs.readFileSync(__dirname + '/flipdisc.ini', 'utf-8'));

var PORT = config.http.port || 3000;
var DBROOT = config.database.root || './db';

var app = express();
var server = http.Server(app);
var io = socketio(server);
var db = diskdb.connect(DBROOT);
//db.loadCollections(['displayScripts'])

var display = new FlipDisplay();

display.open().then(function(){
	console.log("Display opened")
}).catch(function(err){
	console.log("failed to init display:", err)
})

app.use(express.static(__dirname + '/public'));

io.on('connection', function(socket){
	console.log('a user connected');
});

server.listen(PORT, function(){
	console.log(`listening on *:${PORT}`);
});
