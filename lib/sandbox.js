"use strict";
const assert = require('assert');
const child_process = require('child_process');
const EventEmitter = require('events');
const dc = require('./debugconsole');

/**
 * Sandboxed runner for modularized classes.
 * Runs instances of classes in separate processes to capture all errors
 * without taking the main server down.
 *
 * @fires SandboxedClassModule#exit
 * @fires SandboxedClassModule#error
 * @fires SandboxedClassModule#result
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

		// Keep track of each call, so that we can match replies
 		this.callID = 0;

 		// Callback registry
 		this.callbacks = new Map();

 		// Create object
 		this.child.send({
 			cmd: 'create',
 			module: childmod,
 			args: args,
 			callID: this.callID++
 		});
 	}

	/**
	 * Fired when the sandbox child process dies with the
	 * process exit code as value.
	 *
	 * @event SandboxedClassModule#exit
	 * @type {integer}
	 */

	/**
	 * Fired for all error conditions, failed function calls et.c.
	 *
	 * @event SandboxedClassModule#error
	 * @type {String}
	 */

	/**
	 * Fired with the result of a successful method call.
	 * Note: Function calls with callbacks do not generate
	 * result events.
	 * 
	 * @event SandboxedClassModule#result
	 * @type {Object}
	 */

 	onChildMessage(message){
 		var callback = this.callbacks.get(message.callID);
 		if(callback){
 			this.callbacks.delete(message.callID);
 		}

 		if(message.result){
 			if(callback){
 				callback(null, message.result);
 			}
 			else {
 				this.emit("result", message);
 			}
 		}
 		else if(message.error){
 			if(callback){
 				callback(message.error);
 			}
 			else {
 				this.emit("error", message.error);
 			}
 		}
 	}

 	onChildError(event){
 		console.log("Received error from child process:", event);
 	}

 	onChildExit(event){
 		//console.log("Child exited", event);
 		this.destruct();
 		this.emit('exit', event);
 	}

 	/**
 	 * Call method on sandboxed class instance.
 	 * Return value will be sent asynchronously using callback
 	 * or as a "result" or "error" event if no callback is specified.
 	 *
 	 * @param methodName {string} - name of the method to call
 	 * @param args {Array} - method arguments
 	 * @param [callback] {Function} - will get called with result if specified
 	 */
 	call(methodName, args, callback){
 		var callID = this.callID++;
 		if(callback){
 			this.callbacks.set(callID, callback);
 		}

 		this.child.send({
 			cmd: 'call',
 			method: methodName,
 			args: args,
 			callID: callID
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

 	isConnected(){
 		return this.child.connected;
 	}
}

module.exports = SandboxedClassModule;


/// Start of child process ///


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
			//console.log(`Received call ${message.callID} to ${message.method}`);
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
				method: message.method,
				callID: message.callID
			});
		}
		else {
			console.log("Unknown server message: ", message)
		}
	}
	catch(error){
		console.log(error);
		process.send({
			error: error.stack,
			callID: message.callID
		});
	}
}

function childMain(){
	process.on('message', onServerMessage);
}

// Main entry point of child process
if(module.id == '.'){
	childMain();
}
