"use strict"

const assert = require('assert');
const vm = require('vm');

module.exports = {
	scriptToObject: function(script, filename, globals){
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
}
