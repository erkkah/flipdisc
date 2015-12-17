var assert = require('assert');
var async = require('async');
var fs = require('fs');
var BDF = require('bdf');
var flip = require('./flipdisplay.js');
var MonoBitmap = require('./monobitmap.js');
require('array.from');

var WIDTH = 28;
var HEIGHT = 14;

var n = 0;

var display = new flip.Display();
var font = new BDF();
var bitmap = new MonoBitmap(WIDTH, HEIGHT);

function loadFont(callback){
	font.load("fonts/4x6.bdf", callback);
}

function openDisplay(callback){
	display.open(callback);
}

function clearDisplay(callback){
	display.clear(0, callback);
}

function startAnimation(callback){
	setInterval(renderFrame, 100);
	callback(null);
}

async.series([

	loadFont,
	openDisplay,
	clearDisplay,
	startAnimation

	],
	function(error, result){
		if(error){
			console.log(error);
		}
	});

function drawText(bitmap, x, y, text, font){
	//console.log(font.meta);

	var rendered = font.writeText(text);
	var textWidth = rendered.width;
	var textHeight = rendered.height;
	rendered.length = rendered.height;
	delete rendered.width;
	delete rendered.height;
	var textRowsArray = Array.from(rendered, function(from){
		return new Buffer(from)
	});
	var textBuffer = Buffer.concat(textRowsArray);
	//console.log(rendered);
	//console.log(textWidth, textHeight, textBuffer.length);
	var textBitmap = new MonoBitmap(textWidth, textHeight, textBuffer);
	bitmap.drawBitmap(textBitmap, x, y);
}

function renderFrame(){
	var text = n.toString();
	n++;
	n %= 1000;

	bitmap.fill(0);
	text = "ÅjTgX!"
	drawText(bitmap, 0, 0, text, font);
	display.drawBitmap(bitmap.getBytes());
}

