"use strict";

/* eslint-env node, es6 */

const assert = require('assert');
const child_process = require('child_process');
const EventEmitter = require('events');
const dc = require('./debugconsole');

/**
 * Sandboxed runner for modularized classes.
 * Runs instances of classes in separate processes to capture all errors
 * without taking the main server down.
 *
 * @fires error
 * @fires result
 */
 class SandboxedClassModule extends EventEmitter {
 	/**
 	 * Launches a child process with a class exported by a module.
 	 * Wraps a class so that it runs in a separate process.
 	 * Only works for modules that set module.exports to a class.
 	 *
 	 * @constructor
 	 * @param childmod {string} - Resolvable module identifier, relative to this module
 	 * @param args {Array} - Constructor arguments
 	 */
 	constructor(childmod, args){
 		super();

 		// Launch this module as a child process
 		// 'silent' mode pipes stdout and stderr from child
 		this.child = child_process.fork(module.filename, [], {silent: true});

 		// Listen to the child!
 		this.child.on('message', this.onChildMessage.bind(this));

 		this.child.on('error', this.onChildError.bind(this));
 		this.child.on('exit', this.onChildExit.bind(this));

 		// Pipe the child logs to the debug console
 		this.child.stdout.pipe(dc, { end: false });
 		this.child.stderr.pipe(dc, { end: false });

 		this.child.send({
 			cmd: 'create',
 			module: childmod,
 			args: args
 		});
 	}

 	onChildMessage(message){
 		if(message.result){
 			this.emit("result", message);
 		}
 		else if(message.error){
 			this.emit("error", message.error);
 		}
 	}

 	onChildError(event){
 		console.log("Received error from child process:", event);
 	}

 	onChildExit(event){
 		this.destruct();
 		this.emit('exit');
 	}

 	/**
 	 * Call method on sandboxed class instance.
 	 * Return value will be sent asynchronously as a "result" event.
 	 * @param methodName {string} - name of the method to call
 	 * @param args {Array} - method arguments
 	 */
 	call(methodName, args){
 		this.child.send({
 			cmd: 'call',
 			method: methodName,
 			args: args
 		})
 	}

 	/**
 	 * Shuts down the sandbox.
 	 */
 	destruct(){
 		this.child.stdout.unpipe();
 		this.child.stderr.unpipe();
 		if(this.child.connected){
 			this.child.disconnect();
 		}
 		this.child.kill();
 	}
}

module.exports = SandboxedClassModule;


// http://stackoverflow.com/questions/1606797/use-of-apply-with-new-operator-is-this-possible
function newCall(cls, args){
	var f = Function.bind.apply(cls, [null].concat(args));
	return new f();
}

var obj = null;

function onServerMessage(message){
	try{
		if(message.cmd == 'create'){
			//console.log("Creating ", message.module, message.args);
			var mod = require(message.module);
			assert(mod instanceof Function);
			obj = newCall(mod, message.args);
		}
		else if(message.cmd == 'call'){
			if(obj == null){
				throw new Error("Cannot call uninitialized object");
			}
			var method = obj[message.method];
			if(method == null){
				throw new Error(`Unknown method '${message.method}'`);
			}
			var result = method.apply(obj, message.args);

			// Send result to parent
			process.send({
				result: result,
				method: message.method
			});
		}
		else {
			console.log("Unknown server message: ", message)
		}
	}
	catch(error){
		//console.log(error);
		process.send({error: error.stack});
	}
}

function childMain(){
	process.on('message', onServerMessage);
}

// Main entry point of child process
if(module.id == '.'){
	childMain();
}
