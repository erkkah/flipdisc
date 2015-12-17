"use strict"

var fs = require('fs');
var ini = require('ini');
var config = ini.parse(fs.readFileSync('./flipdisc.ini', 'utf-8'));

var PORT = config.http.port || 3000;
var DBROOT = config.database.root || './db';

var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var db = require('diskdb');
db = db.connect(DBROOT);
db.loadCollections(['displayScripts'])

app.get('/', function(req, res){
	res.sendfile('index.html');
});

io.on('connection', function(socket){
	console.log('a user connected');
});

http.listen(PORT, function(){
	console.log(`listening on *:${PORT}`);
});
