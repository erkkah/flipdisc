"use strict";

/* eslint-env node, es6 */

const assert = require('assert');
const EventEmitter = require('events');

const dc = require('./debugconsole');
const MonoBitmap = require('./monobitmap');
const util = require('./util');
const Animator = require('./animator');
const Sandbox = require('./sandbox');

/**
 * Central control class for the display.
 * Runs data fetchers, animations and updates the display.
 * Listens to state change and emits controller status events.
 *
 * Tears down and recreates animations and data fetchers from scratch
 * on any state change.
 *
 * @fires Controller#statuschanged
 * @fires Controller#datachanged
 * @fires Controller#frame
 */
class Controller extends EventEmitter {

	/**
	 * Creates and starts a new controller instance.
	 *
	 * The config <code>updateInterval</code> property sets the time in seconds
	 * between {@link DataFetcher} updates.
	 * 
	 * The config <code>scriptTimeout</code> property sets the animator script
	 * timeout in milliseconds, defaults to 500ms.
	 *
	 * @param state {State} - Initialized state object
	 * @param display {Display} - Initialized display object
	 * @param config {Object} - Hash with config settings
	 * @constructor
	 */
	constructor(state, display, config) {
		super();
		var self = this;

		self.setStatus({
			animator: false,
			dataFetcher: false,
			lastMessage: "Initializing..."
		});
		self.state = state;
		self.display = display;
		self.config = config;

		self.currentModeId = null;
		self.reconfigureRequested = false;

		self.state.on('configchanged', function(config){
			self.onConfigChange(config);
		});
		self.onConfigChange(self.state.getConfig());

		self.state.on('modeschanged', function(modes){
			self.onModesChanged(modes);
		});
		self.onModesChanged(self.state.getModes());

		self.state.on('datafetcherschanged', function(scripts){
			self.onDataScriptsChanged(scripts);
		});		
		self.onDataScriptsChanged(self.state.getDataFetchers());

		self.state.on('scriptschanged', function(scripts){
			self.onDisplayScriptsChanged(scripts);
		});
		self.onDisplayScriptsChanged(self.state.getDisplayScripts());
	}

	// Schedule reconfiguration on next tick, bundling several requests
	// together.
	reconfigureAnimations(){
		if(!this.reconfigureRequested){
			this.reconfigureRequested = true;
			setImmediate(this.onReconfigureAnimations.bind(this));
		}
	}

	// Animator callback. No new frames will be scheduled until
	// the provided callback is called.
	onFrameUpdate(newFrame, callback){
		assert(newFrame instanceof MonoBitmap, "Frame must be a MonoBitmap instance");
		var self = this;

		self.display.drawBitmap(newFrame.getBytes(), function(error){
			if(error){
				this.updateStatus(function(status){
					status.lastMessage = error + "";
					return status;
				});
			}
			callback(error);
		});

		self.emit('frame', newFrame);
	}

	updateStatus(updater){
		var status = Object.assign({}, this.status);
		this.setStatus(updater(status));
	}

	// Sets complete status and emits notification event
	setStatus(status) {
		assert(status);
		assert(typeof status.dataFetcher == 'boolean');
		assert(typeof status.animator == 'boolean');
		assert(typeof status.lastMessage == 'string');

		this.status = status;

		/**
		 * @event Controller#statuschanged
		 * @type {object}
		 * @property dataFetcher {boolean} - Indicates running status of the data fetcher
		 * @property animator {boolean} - Indicates running status of the animator
		 * @property lastMessage {string} - The last message to show as a status line, whatever that means :)
		 */
		this.emit('statuschanged', this.status);
	}

	// Tears down and sets up animation stack
	onReconfigureAnimations(){
		var self = this;

		try{
			// Find selected mode
			var currentMode = self.modes.find(function(mode){
				return(mode._id == self.currentModeId);
			});

			// No selected mode, or mode has no scripts
			if(!currentMode || currentMode.scripts.length == 0){
				if(self.animator){
					self.animator.stop();
				}

				self.updateStatus(function(status){
					status.lastMessage = "No animations in current mode, stopping.";
					status.animator = false;
					return status;
				});
			}
			else {
				var stack = currentMode.scripts.map(function(scriptReference){
					var code = self.displayScripts.find(function(script){
						return(script._id == scriptReference.scriptID);
					});

					var dimensions = self.display.getDimensions();
					var globals = {
						width: dimensions[0],
						height: dimensions[1],
						getTextBitmap: util.getTextBitmap,
						drawText: util.drawText,
						MonoBitmap: require('./monobitmap'),
						// Disable 'require'
						require: null
					};
					var animatorObject = util.scriptToObject(code.code, `Display Script '${code.name}'`, globals);
					var animatorConfig = JSON.parse(scriptReference.config);

					return {
						script: animatorObject,
						config: animatorConfig
					};
				});

				var timeout = self.config.scriptTimeout || 500;
				var newAnimator = new Animator(stack, self.dataSource, self.onFrameUpdate.bind(self), timeout);

				if(self.animator){
					self.animator.stop();
				}

				// Hack!
				// letting the previous animation run out before starting the new
				// to avoid first frame overwrite problems.
				setTimeout(function(){
					newAnimator.start();
				}, 10);
				
				self.animator = newAnimator;

				self.updateStatus(function(status){
					status.lastMessage = "OK";
					status.animator = true;
					return status;
				});
			}
		}
		catch(er){
			dc.console.log(er.stack);

			self.updateStatus(function(status){
				status.lastMessage = er + "";
				status.animator = true;
				return status;
			});
		}

		self.reconfigureRequested = false;
	}

	// Reconfigures and restarts the data fetcher child process
	reconfigureDatafetcher(){
		var self = this;

		try{
			var updateInterval = self.config ? self.config.updateInterval : 0; // 0 == default

			// Create a sandboxed DataFetcher instance
			console.log("Creating new sandbox");

			function catcher(error, instance) {
				if(error) {
					dc.console.log("Failed to create data fetcher: ", error);
					instance.destruct();
					if(self.dataFetcher == instance){
						self.dataFetcher = null;
					}
				}
			}
			var newFetcher = new Sandbox('./datafetcher', [self.dataScripts, updateInterval], catcher);

			newFetcher.on('exit', function(){
				dc.console.log("Data fetcher process exited");

				self.updateStatus(function(status){
					status.lastMessage = "Data fetcher process exited";
					status.dataFetcher = false;
					return status;
				});
			});

			newFetcher.on('error', function(error){
				dc.console.error("Error in Data Fetcher: ", error);
			});

			if(self.dataFetcher){
				console.log("Tearing down old data fetcher");
				self.dataFetcher.call("stop");
				// We don't need a suicide notification
				self.dataFetcher.removeAllListeners('exit');
				self.dataFetcher.destruct();
			}

			console.log("Starting new sandbox");
			newFetcher.call("start");
			self.dataFetcher = newFetcher;

			if(self.dataSource){
				console.log("Restarting old data source");
				// Restarting rather than starting a new one will keep
				// existing animators working, since they keep a reference
				// to the data source.
				self.dataSource.restart(newFetcher);
			}
			else {
				console.log("Starting new data source");
				// DataSource will pull data three times per data fetcher interval.
				self.dataSource = new DataSource(self, newFetcher, (updateInterval * 1000) / 3);
			}

			self.updateStatus(function(status){
				status.lastMessage = "OK";
				status.dataFetcher = true;
				return status;
			});			
		}
		catch(er){
			dc.console.log(er.stack);

			self.updateStatus(function(status){
				status.lastMessage = er + "";
				return status;
			});
		}
	}

	onConfigChange(config){
		if(this.currentModeId != config.selectedMode){
			this.currentModeId = config.selectedMode;
			this.reconfigureAnimations();
		}
	}

	onModesChanged(modes){
		this.modes = modes;
		this.reconfigureAnimations();
	}

	onDisplayScriptsChanged(scripts){
		this.displayScripts = scripts;
		this.reconfigureAnimations();
	}

	onDataScriptsChanged(scripts){
		this.dataScripts = scripts;
		this.reconfigureDatafetcher();
	}


	/**
	 * Returns the contents of the last {@link Controller#event:statuschanged} event
	 */
	getStatus(){
		return this.status;
	}
}

module.exports = Controller;

/**
 * Local data source buffer to provide sync access to data
 * asynchronously generated in the sandbox process.
 * Also extends the returned data object with property lookup utilities.
 */
class DataSource {
	constructor(controller, dataFetcherSandBox, updateIntervalMS){
		var self = this;

		self.fetcher = dataFetcherSandBox;
		self.controller = controller;
		// Full data storage, values are {data: {<valueobject>}, timestamp: <timestamp>}
		self.data = {};
		// Data storage without timestamps, values are <valueobject> above
		self.flatData = {};
		self.flatData.resolve = (path) => {return null;};

		// Pull data from the data fetcher at regular intervals
		self.interval = setInterval(function(){
			if(self.fetcher.isConnected()){
				self.fetcher.call('getData', [], function(error, result){
					if(error){
						dc.console.log("Failed to get data from data source: ", error);
					}
					else{
						// Find new or updated data. Ignore deleted data.
						var changed = Object.keys(result).some(function(el){
							var newData = result[el];
							var oldData = self.data[el];

							return (!oldData || (oldData.timestamp != newData.timestamp));
						});

						// Update and broadcast on changes
						if(changed){
							self.data = result;
							self.flatData = {};
							for(var key in result){
								self.flatData[key] = result[key].data;
							}
							// Add "resolve" method to data object
							self.flatData.resolve = function(path){
								return util.resolveProperty(this, path);
							};
							self.controller.emit("datachanged", self.flatData);
						}
					}
				});
			}
		}, updateIntervalMS);
	}

	/**
	 * Replaces the current data fetcher with a new instance.
	 */
	restart(newFetcher){
		this.fetcher = newFetcher;
	}

	getData(){
		return this.flatData;
	}

	stop(){
		clearInterval(this.interval);
	}
}
