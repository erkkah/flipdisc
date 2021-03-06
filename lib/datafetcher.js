"use strict"

/* eslint-env node, es6 */

const assert = require('assert');
const util = require('./util');
const dc = require('./debugconsole');

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
				var globals = {
				};
				var fetcherObject = util.scriptToObject(script.code, `Data Script '${script.name}'`, globals);

				this.scripts.push({
					name: script.name,
					fetcher: fetcherObject,
					running: false
				});
			}catch(er){
				throw new Error(`Failed to load script '${script.name}': ${er}`);
			}
		}
	}

	/**
	 * Starts the updater timer.
	 */
	start(){
		// Run immediately to avoid having to wait for the first timeout
		this.onUpdate();

		var updater = this.onUpdate.bind(this);
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

	setDataForScript(scriptName, data){
		this.data[scriptName] = {
			data: data,
			timestamp: new Date().getTime()
		};
	}

	// internal
	onUpdate(){
		var self = this;

		for(let idx in self.scripts){
			let script = self.scripts[idx];
			if(script.running){
				dc.console.log(`Not retriggering already running script ${script.name}`);
			}
			else {
				try{
					script.running = true;

					// Support both sync and async upUpdate implementations
					let syncResult = script.fetcher.onUpdate(function(error, asyncResult){
						if(!error){
							if(!script.running){
								dc.console.log(`Received callback from inactive script ${script.name}`);
							}
							self.setDataForScript(script.name, asyncResult);
						}
						else {
							dc.console.log(error);
							self.setDataForScript(script.name, {
								error: error
							});
						}
						script.running = false;
					});

					if(syncResult){
						if(!script.running){
							dc.console.log(`Received result from inactive script ${script.name}`);
						}
						script.running = false;
						self.setDataForScript(script.name, syncResult);
					}
				}catch(error){
					dc.console.log(error);
					self.setDataForScript(script.name, {
						error: error
					});
				}
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
