var assert = require('assert');
var fs = require('fs');
var pure = require('pureimage');
var flip = require('./flipdisplay.js');

var WIDTH = 28;
var HEIGHT = 14;

var canvas = pure.make(WIDTH, HEIGHT);
var context = canvas.getContext();
context.fillStyle = 'white';
context.strokeStyle = 'white';
context.USE_FONT_GLYPH_CACHING = false;

var FONT = "ttf/thin_pixel-7.ttf";
var font = pure.registerFont(FONT, "Orange Kid", 8, "regular", "");
font.load();

var n = 0;

function renderFrame(){
	context.fillStyle = 'black';
	context.fillRect(0, 0, WIDTH, HEIGHT);
	context.strokeRect(0.5, 0.5, WIDTH - 1, HEIGHT - 1);

	if(!font.loaded){
		console.log("Waiting for font to load..");
		return;
	}

	context.fillStyle = 'white';
	context.setFont("Orange Kid", 12);
	var text = n.toString();
	n++;
	n %= 100;

	context.fillText("12345", 2, 10);
	//context.strokeText("12345", 2, 10);
	//console.log(text);

	var monoBitmap = RGBAtoMono(canvas._buffer);
	display.drawBitmap(monoBitmap);
}


var display = new flip.Display();
display.open(function(error){
	if(error){
		console.log('Failed to open display');
	}
	else {
		display.clear(0, function(error){
			if(error){
				console.log('Failed to clear display:' + error)
			}
		});
		setInterval(renderFrame, 100);
	}
});

function cropMono(source, sourceWidth, sourceHeight, destinationWidth, destinationHeight){
	assert(sourceWidth >= destinationWidth);
	assert(sourceHeight >= destinationHeight);

	var result = [];
	var dstIdx = 0;

	for(var srcY = 0; srcY < destinationHeight; srcY++){
		for(var srcX = 0; srcX < destinationWidth; srcX++, dstIdx++){
			result[dstIdx] = source[srcY * sourceWidth + srcX];
		}
	}

	return result;
}

function RGBAtoMono(pixelData) {
	assert(pixelData.length % 4 == 0);
	var result = [];

	for(var p = 0; p < pixelData.length; p += 4){
		var r = pixelData[p];
		var g = pixelData[p + 1];
		var b = pixelData[p + 2];
		//var a = pixelData[p + 3];
		var desaturated = (Math.max(r, g, b) + Math.min(r, g, b)) / 2;
		var mono = desaturated > 250 ? 1 : 0;
		result[p / 4] = mono;
	}

	return result;
}
