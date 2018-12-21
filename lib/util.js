"use strict"

/* eslint-env node, es6 */

/**
 * Misc utils :)
 * @module util
 */

const assert = require('assert');
const vm = require('vm');
const BDF = require('bdf');
const path = require('path');

const dc = require('./debugconsole');
const MonoBitmap = require('./monobitmap');

/**
 * Compiles javascript source to a class definition and instantiated that class
 * using a no-arg constructor.
 * The class type function must be assigned to the global variable <code>code</code>.
 * The code will be compiled and run in a separate context from the caller.
 *
 * @param {string} script - javascript source code
 * @param {string} filename - file name of the source code, used in error reporting
 * @param {object} [globals] - initial contents of the global context
 */
module.exports.scriptToObject = function(script, filename, globals){
	// Include console and require as globals in the script context
	var sandbox = {
		console: dc.console,
		require: require
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

/**
 * Compiles a script and stores it together with contextualized sandbox for later execution.
 */
module.exports.CompiledScript = class {
	constructor(script, filename, globals, timeout){
		assert(script);
		assert(filename);
		assert(globals);

		this.runOptions = timeout ? {timeout: timeout} : {};
		var options = {filename: filename};
		this.script = new vm.Script(script, options);
		this.globals = globals;
		this.context = vm.createContext(this.globals);
	}

	run(){
		this.script.runInContext(this.context, this.runOptions);
	}
};

/**
 * Looks up a property in an object specified by path.
 * The path is a period separated string of property names.
 * @param obj {Object}
 * @param path {String}
 * @return The specified property, or null if it cannot be found
 */
module.exports.resolveProperty = function(obj, path){
	assert(obj instanceof Object, "obj must be an Object");
	assert(path, "path must be specified");

	var pathList = path.split('.');
	var result = pathList.reduce(function(acc, selector){
		if(acc){
			acc = acc[selector];
		}
		return acc;
	}, obj);

	return result;
}


var fonts = {}

/**
 * @internal
 */
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

/**
 * Renders text using specified font, returns a bitmap with the rendered text.
 * @param text {string}
 * @param fontID {string}
 * @returns {MonoBitmap}
 */
module.exports.getTextBitmap = function(text, fontID) {
	var font = loadFont(fontID);
	var rendered;
	try{
		rendered = font.writeText(text);
	}catch(error){
		throw new Error("Failed to render text using specified font: " + error.stack);
	}
	var textWidth = rendered.width;
	var textHeight = rendered.height;
	rendered.length = rendered.height;
	delete rendered.width;
	delete rendered.height;
	var textRowsArray = Array.from(rendered, function(from){
		return Buffer.from(from)
	});
	var textBuffer = Buffer.concat(textRowsArray);
	var textBitmap = new MonoBitmap(textWidth, textHeight, textBuffer);
	return textBitmap;
}

/**
 * Draws text to a bitmap.
 * Position is upper left corner of the text to draw.
 *
 * @param bitmap {MonoBitmap} - destination bitmap
 * @param x {integer} - horizontal position in the destination bitmap
 * @param y {integer} - vertical position in the destination bitmap
 * @param text {string}
 * @param fontID {string}
 */
module.exports.drawText = function(bitmap, x, y, text, fontID) {
	assert(bitmap instanceof MonoBitmap, "bitmap must be a MonoBitmap instance");
	assert(text, "Text must be specified");
	assert(fontID, "Font ID must be specified");

	try{
		var textBitmap = module.exports.getTextBitmap(text, fontID);
		bitmap.drawBitmap(textBitmap, x, y);
	}catch(error){
		dc.console.log(`Failed to draw text ${text}, ${error}`);
	}
}

// Basic test code
if(module.id == '.'){
	var a = {
		b: 12,
		c: {
			d: [],
			e: {
				f: 98
			}
		}
	};

	var resolve = module.exports.resolveProperty;
	var prop = resolve(a, 'b');
	assert(prop == 12);

	prop = resolve(a, 'c');
	assert(prop.e.f == 98);

	prop = resolve(a, "c.e.f");
	assert(prop == 98);

	prop = resolve(a, "hubba.e.q");
	assert(prop == null);
}
