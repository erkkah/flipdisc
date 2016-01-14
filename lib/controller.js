"use strict"

/* eslint-env node, es6 */

const assert = require('assert');
const EventEmitter = require('events');
const BDF = require('bdf');
const path = require('path');

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
 */
class Controller extends EventEmitter {

	/**
	 * Creates and starts a new controller instance.
	 *
	 * The config <code>updateInterval</code> property sets the time in seconds
	 * between {@link DataFetcher} updates.
	 *
	 * @param state {State} - Initialized state object
	 * @param display {Display} - Initialized display object
	 * @param config {Object} - Hash with config settings
	 * @constructor
	 */
	constructor(state, display, config) {
		super();
		var self = this;

		self.status = {}
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
	reconfigure(){
		if(!this.reconfigureRequested){
			this.reconfigureRequested = true;
			setImmediate(this.onReconfigure.bind(this));
		}
	}

	// Animator callback. No new frames will be scheduled until
	// the provided callback is called.
	onFrameUpdate(newFrame, callback){
		assert(newFrame instanceof MonoBitmap);
		var self = this;

		self.display.drawBitmap(newFrame.getBytes(), function(error){
			if(error){
				this.updateStatus(function(status){
					status.lastMessage = error + "";
					return status;
				})
			}
			callback(error);
		});

		self.emit('frame', newFrame);
	}

	updateStatus(updater){
		var status = Object.assign({}, this.status);
		this.setStatus(updater(status));
	}

	// Sets status and emits notification event
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
					self.dataFetcher.call("stop");
					self.dataFetcher.destruct();
				}
				if(self.animator){
					self.animator.stop();
				}

				status.lastMessage = "No animations in current mode, stopping."
			}
			else {
				var updateInterval = self.config ? self.config.updateInterval : 0;

				// Create a sandboxed DataFetcher instance
				var newFetcher = new Sandbox('./datafetcher', [self.dataScripts, updateInterval]);

				newFetcher.on('exit', function(){
					self.updateStatus(function(status){
						status.lastMessage = "Data fetcher process exited";
						status.dataFetcher = false;
						return status;
					})
				});

				class DataSource {
					constructor(dataFetcher){
						var self = this;

						self.fetcher = dataFetcher;
						self.fetcher.on('result', function(result){
							if(result.method == 'getData'){
								self.data = result.result;
							}
						})
					}

					getData(){
						return this.data;
					}
				}

				var dataSource = new DataSource(newFetcher);

				//newFetcher.start();
				newFetcher.call("start");

				status.dataFetcher = true;

				var stack = currentMode.scripts.map(function(scriptReference){
					var code = self.displayScripts.find(function(script){
						return(script._id == scriptReference.scriptID);
					})

					var dimensions = self.display.getDimensions();
					var globals = {
						width: dimensions[0],
						height: dimensions[1],
						getTextBitmap: sandboxedGetTextBitmap,
						drawText: sandboxedDrawText
					}
					var animatorObject = util.scriptToObject(code.code, code.name, globals);
					var animatorConfig = JSON.parse(scriptReference.config);

					return {
						script: animatorObject,
						config: animatorConfig
					}
				})

				var newAnimator = new Animator(stack, dataSource, self.onFrameUpdate.bind(self));
				newAnimator.start();
				status.animator = true;

				if(self.dataFetcher){
					self.dataFetcher.call("stop");
					self.dataFetcher.destruct();
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
			dc.console.log(er.stack);
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

	/**
	 * Returns the contents of the last {@link Controller#event:statuschanged} event
	 */
	getStatus(){
		return this.status;
	}
}

module.exports = Controller;


/// Functions exported to display scripts:

var fonts = {}

function loadFont(fontID) {
	var font = fonts[fontID];
	if(!font){
		font = new BDF();
		var fontPath = path.resolve(__dirname, "fonts", fontID.concat(".bdf"));
		font.loadSync(fontPath);
		fonts[fontID] = font;
	}
	return font;
}

function sandboxedGetTextBitmap(text, fontID) {
	var font = loadFont(fontID);
	var rendered;
	try{
		rendered = font.writeText(text);
	}catch(error){
		throw new Error("Failed to render text using specified font");
	}
	var textWidth = rendered.width;
	var textHeight = rendered.height;
	rendered.length = rendered.height;
	delete rendered.width;
	delete rendered.height;
	var textRowsArray = Array.from(rendered, function(from){
		return new Buffer(from)
	});
	var textBuffer = Buffer.concat(textRowsArray);
	var textBitmap = new MonoBitmap(textWidth, textHeight, textBuffer);
	return textBitmap;
}

function sandboxedDrawText(bitmap, x, y, text, fontID) {
	assert(bitmap instanceof MonoBitmap, "bitmap must be a MonoBitmap instance");
	assert(text, "Text must be specified");
	assert(fontID, "Font ID must be specified");

	var textBitmap = sandboxedGetTextBitmap(text, fontID);
	bitmap.drawBitmap(textBitmap, x, y);
}
