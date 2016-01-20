"use strict"

/* eslint-env node, es6 */

/**
 * Misc utils :)
 * @module util
 */

const assert = require('assert');
const vm = require('vm');

const dc = require('./debugconsole');

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
