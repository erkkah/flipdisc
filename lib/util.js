"use strict"

const assert = require('assert');
const vm = require('vm');
const path = require('path');
const BDF = require('bdf');
const MonoBitmap = require('./monobitmap');

var fonts = {}

function loadFont(fontID) {
	var font = fonts[fontID];
	if(!font){
		font = new BDF();
		var fontPath = path.resolve(__dirname, "fonts", fontID.concat(".bdf"));
		font.loadSync(fontPath);
		fonts[fontID] = font;
	}
	return font;
}

function sandboxedGetTextBitmap(text, fontID) {
	var font = loadFont(fontID);
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
	var textBitmap = new MonoBitmap(textWidth, textHeight, textBuffer);
	return textBitmap;
	
}

function sandboxedDrawText(bitmap, x, y, text, fontID) {
	assert(bitmap);
	assert(text);
	assert(fontID);

	var textBitmap = sandboxedGetTextBitmap(text, fontID);
	bitmap.drawBitmap(textBitmap, x, y);
}

module.exports = {
	scriptToObject: function(script, filename, globals){
		// Include require and console as globals in the script context
		var sandbox = {
			"require": require,
			"console": console,
			// Include these in all scripts for now.
			"getTextBitmap": sandboxedGetTextBitmap,
			"drawText": sandboxedDrawText
		}

		if(globals){
			sandbox = Object.assign(sandbox, globals);
		}

		var context = vm.createContext(sandbox);

		// Compile and run script. Failed compilation throws out
		vm.runInContext(script, context, {filename: filename});

		var compiledClass = context.code;
		// For some weird reason, using 'instanceof' here does not work
		if((typeof compiledClass) == 'function'){
			return new compiledClass();
		}
		else {
			console.log(script);
			console.log(typeof compiledClass);
			throw new Error(`Script ${filename} does not set global variable 'code' to a class style function`);
		}
	}
}
