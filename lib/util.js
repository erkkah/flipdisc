"use strict"

/**
 * Misc utils :)
 * @module util
 */

const assert = require('assert');
const vm = require('vm');

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
	// Include require and console as globals in the script context
	var sandbox = {
		"require": require,
		"console": console
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
