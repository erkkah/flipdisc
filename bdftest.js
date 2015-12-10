var assert = require('assert');
var async = require('async');
var fs = require('fs');
var BDF = require('bdf');
var flip = require('./flipdisplay.js');
require('array.from');

var WIDTH = 28;
var HEIGHT = 14;

var n = 0;

var display = new flip.Display();
var font = new BDF();
var bitmap = new MonoBitmap(WIDTH, HEIGHT);

function loadFont(callback){
	font.load("4x6.bdf", callback);
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


/**
	A simple one byte per pixel monochrome bitmap.
	Pixel values are either 1 or 0.
*/
function MonoBitmap(width, height, optionalBytes){
	assert(width > 0);
	assert(height > 0);

	this.width = width;
	this.height = height;

	if(optionalBytes){
		assert(optionalBytes.length == width * height);
		this.buffer = new Buffer(optionalBytes);
	}
	else {
		this.buffer = new Buffer(width * height);
	}
}

MonoBitmap.prototype.putPixel = function(x, y, value) {
	assert(x >= 0);
	assert(y >= 0);
	assert(x < this.width);
	assert(y < this.height);
	assert(value == 1 || value == 0);

	this.buffer[y * this.width + x] = value;
};

MonoBitmap.prototype.getPixel = function(x, y) {
	assert(x >= 0);
	assert(y >= 0);
	assert(x < this.width);
	assert(y < this.height);

	return this.buffer[y * this.width + x];
};

MonoBitmap.prototype.fill = function(value){
	assert(value == 1 || value == 0);

	this.buffer.fill(value);
}

/**
	Draws another bitmap onto this bitmap at a given position.
	The source bitmap will be clipped to fit.
*/
MonoBitmap.prototype.drawBitmap = function(source, targetX, targetY){
	assert(source instanceof MonoBitmap);
	assert(targetX < this.width);
	assert(targetY < this.height);

	var clippedRight = Math.min(targetX + source.width, this.width);
	var clippedBottom = Math.min(targetY + source.height, this.height);
	var clippedWidth = clippedRight - targetX;
	var clippedHeight = clippedBottom - targetY;

	var croppedSource = source.crop(0, 0, clippedWidth, clippedHeight);

	for(var y = 0; y < clippedHeight; y++){
		var targetPosition = (targetY + y) * this.width + targetX;
		var sourcePosition = y * source.width;
		source.buffer.copy(this.buffer, targetPosition, sourcePosition, sourcePosition + clippedWidth);
	}
}

/**
	Returns a cropped copy of this bitmap.
*/
MonoBitmap.prototype.crop = function(x, y, width, height){
	assert(x >= 0);
	assert(y >= 0);
	assert(x + width <= this.width);
	assert(y + height <= this.height);

	if(x == 0 && y == 0 && width == this.width && height == this.height){
		return new MonoBitmap(width, height, this.buffer);
	}
	else{
		result = new MonoBitmap(width, height);

		for(var y = 0; y < height; y++){
			var targetPosition = y * width;
			var sourcePosition = y * this.width + x;
			this.buffer.copy(result.buffer, targetPosition, sourcePosition, sourcePosition + width);
		}
		return result;
	}
}

MonoBitmap.prototype.getBytes = function(){
	return this.buffer;
}
