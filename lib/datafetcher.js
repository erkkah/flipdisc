"use strict"

var assert = require('assert');
var vm = require('vm');

// 10 s
const UPDATE_INTERVAL = 10000;

/**
 * Data fetcher, periodically calls scripts to load data to be used
 * by display scripts.
 *
 * The script body must set the global variable <code>code</code> to a java script
 * class containing the method <code>onUpdate()</code>. The value of <code>upUpdate()</code>
 * will be put into the data fetchers data storage under the script name key.
 * 
 * @example
 * var scripts = [
 *   {
 *     name: "constant",
 *     code: "... var code = function(){}"
 *   }
 * ]
 * var fetcher = new DataFetcher()
 * fetcher.start();
 * var data = fetcher.getData();
 */
class DataFetcher {
	/**
	 * @param dataScripts {Array} - list of data script definitions
	 * @constructor
	 */
	constructor(dataScripts){
		this.data = {};
		this.scripts = [];

		for(var key in dataScripts){
			var script = dataScripts[key];

			// Include "require" as a global in the script context
			var sandbox = {
				"require": require
			}
			var context = vm.createContext(sandbox);

			try {
				// Compile and run script. Failed compilation throws out
				vm.runInContext(script.code, context, {filename: script.name});

				var fetcherClass = context.code;
				var fetcherObject = new fetcherClass();

				this.scripts.push({"name": script.name, "fetcher": fetcherObject});
			}catch(er){
				throw new Error('Failed to load scripts: ' + er);
			}
		}
	}

	/**
	 * Starts the updater timer.
	 */
	start(){
		var updater = this._onUpdate.bind(this);
		this.interval = setInterval(updater, UPDATE_INTERVAL);
	}

	/**
	 * Stops the updater timer.
	 */
	stop(){
		if(this.interval){
			clearInterval(this.interval);
			this.interval = null;
		}
	}

	// internal
	_onUpdate(){
		for(var idx in this.scripts){
			var script = this.scripts[idx];
			var result = script.fetcher.onUpdate();
			this.data[script.name] = result;
		}
	}

	/**
	 * @returns a copy of the data storage.
	 */
	getData(){
		return Object.assign({}, this.data);
	}
}

module.exports = DataFetcher;
