"use strict";

/* eslint-env node, es6 */

/**
 * Debug console with event emitter.
 * Pipes output to stdout and emits "message" event on output.
 * 
 * @example
 * var DC = require('debugconsole');
 * DC.on("message", function(msg){
 *   ...
 * }
 * DC.console.log("Hello?");
 * @module debugconsole
 */

const stream = require('stream');
const EventEmitter = require('events');

class DebugConsole extends EventEmitter {
	constructor(){
		super();
		this.writable = new stream.Writable({
			write: this.write.bind(this)
		});

		this.console = new console.Console(this.writable);
	}

	write(chunk, encoding, next){
		var message = chunk.toString();
		this.emit('message', {
			timestamp: new Date(),
			message: message
		});
		return process.stdout.write(chunk, encoding, next);
	}
}

module.exports = new DebugConsole();
