"use strict"
const assert = require('assert');
const EventEmitter = require('events');

const MonoBitmap = require('./monobitmap');
const util = require('./util');
const Animator = require('./animator');
const DataFetcher = require('./datafetcher');

/**
 * Central control class for the display.
 * Runs data fetchers, animations and updates the display.
 * Listens to state change and emits controller status events.
 */
class Controller extends EventEmitter {

	constructor(state, display) {
		super();
		var self = this;

		self.status = {}
		self.state = state;
		self.display = display;

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

	reconfigure(){
		if(!this.reconfigureRequested){
			this.reconfigureRequested = true;
			setImmediate(this.onReconfigure.bind(this));
		}
	}

	onFrameUpdate(newFrame){
		assert(newFrame instanceof MonoBitmap);

		this.display.drawBitmap(newFrame.getBytes());
	}

	onReconfigure(){
		var status = {
			running: false,
			dataFetcher: false,
			animator: false,
			lastMessage: ""
		}

		var self = this;

		try{
			if(self.running){
				status.running = true;

				var newFetcher = new DataFetcher(self.dataScripts);
				newFetcher.start();
				status.dataFetcher = true;

				var currentMode = self.modes.find(function(mode){
					return(mode._id == self.currentModeId);
				});

				var stack = currentMode.scripts.map(function(scriptReference){
					var code = self.displayScripts.find(function(script){
						return(script._ID == scriptReference.scriptID);
					})

					var animatorObject = util.scriptToObject(code);

					return {
						script: animatorObject,
						config: scriptReference.config
					}
				})

				console.log('scripts: ', currentMode.scripts);
				console.log('stack: ', stack);

				var newAnimator = new Animator(stack, newFetcher, self.onFrameUpdate.bind(self));
				newAnimator.start();
				status.animator = true;

				if(self.dataFetcher){
					self.dataFetcher.stop();
				}
				if(self.animator){
					self.animator.stop();
				}

				self.dataFetcher = newFetcher;
				self.animator = newAnimator;

				status.lastMessage = "OK";
				self.status = status;
				self.emit('statuschanged', status);
			}
			else { // ! running
				if(self.dataFetcher){
					self.dataFetcher.stop();
				}
				if(self.animator){
					self.animator.stop();
				}

				status.lastMessage = "OK";
				self.status = status;
				self.emit('statuschanged', status);
			}
		}
		catch(er){
			console.log(er.stack);
			status.lastMessage = er + "";
			self.status = status;
			console.log('Emitting:', status);
			self.emit('statuschanged', status);
		}

		self.reconfigureRequested = false;
	}

	onConfigChange(config){
		if(this.currentModeId != config.selectedMode){
			this.currentModeId = config.selectedMode;
			this.reconfigure();
		}
		if(this.running != config.running){
			this.running = config.running;
			this.reconfigure();
		}
	}

	onModesChanged(modes){
		this.modes = modes;
		this.reconfigure();
	}

	onDataScriptsChanged(scripts){
		this.dataScripts = scripts;
		this.reconfigure();
	}

	onDisplayScriptsChanged(scripts){
		this.displayScripts = scripts;
		this.reconfigure();
	}

	getStatus(){
		return this.status;
	}
}

module.exports = Controller;
