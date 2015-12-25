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
		var self = this;

		self.display.drawBitmap(newFrame.getBytes(), function(error){
			if(error){
				var status = Object.assign({}, self.status);
				status.lastMessage = error + "";
				self.setStatus(status);
			}
		});
	}

	setStatus(status) {
		assert(status);
		assert(typeof status.dataFetcher == 'boolean');
		assert(typeof status.animator == 'boolean');
		assert(typeof status.lastMessage == 'string');

		this.status = status;
		this.emit('statuschanged', this.status);
	}

	onReconfigure(){
		var status = {
			dataFetcher: false,
			animator: false,
			lastMessage: ""
		}

		var self = this;

		try{
			var currentMode = self.modes.find(function(mode){
				return(mode._id == self.currentModeId);
			});

			if(!currentMode || currentMode.scripts.length == 0){
				if(self.dataFetcher){
					self.dataFetcher.stop();
				}
				if(self.animator){
					self.animator.stop();
				}

				status.lastMessage = "No animations in current mode, stopping."
			}
			else {
				var newFetcher = new DataFetcher(self.dataScripts);
				newFetcher.start();
				status.dataFetcher = true;

				var stack = currentMode.scripts.map(function(scriptReference){
					var code = self.displayScripts.find(function(script){
						return(script._id == scriptReference.scriptID);
					})

					var animatorObject = util.scriptToObject(code.code, code.name);

					return {
						script: animatorObject,
						config: scriptReference.config
					}
				})

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
			}
		}
		catch(er){
			console.log(er.stack);
			status.lastMessage = er + "";
			self.setStatus(status);
		}

		self.setStatus(status);
		self.reconfigureRequested = false;
	}

	onConfigChange(config){
		if(this.currentModeId != config.selectedMode){
			this.currentModeId = config.selectedMode;
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
		//console.log('Status: ', this.status)
		return this.status;
	}
}

module.exports = Controller;
