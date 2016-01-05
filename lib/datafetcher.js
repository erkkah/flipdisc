"use strict"

const assert = require('assert');
const util = require('./util');

// 10 s
const DEFAULT_UPDATE_INTERVAL = 10000;

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
 *     code: "... var code = class{ onUpdate(){ return 42 } }"
 *   }
 * ]
 * var fetcher = new DataFetcher()
 * fetcher.start();
 * var data = fetcher.getData();
 */
class DataFetcher {
	/**
	 * @param dataScripts {Array} - list of data script definitions
	 * @param updateInterval {integer} - Update interval in seconds
	 * @constructor
	 */
	constructor(dataScripts, updateInterval){
		this.data = {};
		this.scripts = [];

		this.updateInterval = updateInterval * 1000 || DEFAULT_UPDATE_INTERVAL;

		for(var key in dataScripts){
			var script = dataScripts[key];

			try {
				var fetcherObject = util.scriptToObject(script.code, script.name);

				this.scripts.push({"name": script.name, "fetcher": fetcherObject});
			}catch(er){
				throw new Error(`Failed to load script '${script.name}': ${er}`);
			}
		}
	}

	/**
	 * Starts the updater timer.
	 */
	start(){
		var updater = this._onUpdate.bind(this);
		this.interval = setInterval(updater, this.updateInterval);
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
			try{
				var result = script.fetcher.onUpdate();
				this.data[script.name] = result;
			}catch(er){
				// ??? Fix better status reporting!!
				console.log(er);
			}
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
