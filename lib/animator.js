"use strict"

/* eslint-env node, es6 */

const assert = require('assert');
const dc = require('./debugconsole');
const util = require('./util');

/**
 * An Animator repeatedly runs through a set of animation scripts,
 * calling the provided callback for each frame produced.
 *
 * The script stack uses the following format:
 * ```
 * [
 *   {
 *     "script": animationObject,
 *     "config": {"msg": "msg1"}
 *   },
 *   {
 *     "script": animationObject,
 *     "config": {"msg": "msg2"}
 *   }
 * ]
 * ```
 *
 * Animation scripts are basic objects with <code>onSetup</code>
 * and <code>onFrame</code> methods. The <code>onSetup</code> method
 * will be called before each animation sequence starts, to pull fresh
 * data from the data source and perform needed setup.
 *
 * Example script:
 * ```
 * class ExampleAnimator
 * {
 *   constructor(){
 *     this.message = "Hello!"
 *   }
 * 
 *   onSetup(configuration, dataSource){
 *     // set properties of this animation script
 *     // pull data from data source
 *     // set up animation
 *     var key = configuration.msg;
 *     this.message = dataSource[key];
 *   }
 * 
 *   onFrame(oldFrame, timePassedInSeconds){
 *     // calculate one frame of animation
 *     // ...
 *     // and return ms to next callback.
 *     // Return 0 to end the script.
 *
 *     oldFrame.setText(this.message);
 *     if(timePassedInSeconds < 3){
 *       return 1000;
 *     }
 *     else {
 *       return 0;
 *     }
 *   }
 * }
 * ```
 *
 * Note that the frames handled the <code>onFrame</code> can be of
 * any format, they are opaque to the animator.
 */
class Animator {
	/**
	 * Creates a new non-running animator instance.
	 *
	 * @constructor
	 * @param {object} stack - A stack of animation scripts
	 * @param {object} dataSource - Data source that will provide data to the scripts, must provide a "getData" method.
	 * @param {object} initialFrame - First frame that will be passed to the animation scripts.
	 * @param {function} frameCallback - Gets called for each animation frame: frameCallback(frame, doneCallback)
	 *		The doneCallback must be called on completed frame to trigger new frames.
	 * @param {integer} [timeout] - Script timeout in milliseconds.
	 */
	constructor(stack, dataSource, initialFrame, frameCallback, timeout){
		assert(stack instanceof Array);
		assert(stack.length > 0);

		this.stack = stack;
		this.dataSource = dataSource;
		this.frameCallback = frameCallback;
		this.scriptIndex = -1;
		this.currentScript = undefined;
		this.animationStart = 0;
		this.stackStart = 0;
		this.currentFrame = initialFrame;
		this.stopped = false;
		this.timeout = timeout || 500;
		this.compileFrameScript();
		this.compileSetupScript();
	}


	// internal, called from display script to deliver frames
	// and request another callback
	onFrame(timeToNextMS){
		var self = this;

		if(self.stopped){
			return;
		}

		var frameStart = new Date().getTime();

		function onFrameCompleted(error){
			if(self.stopped){
				return;
			}
			if(timeToNextMS){
				var now = new Date().getTime();
				// limit to [0, 10000]
				timeToNextMS = Math.max(0, timeToNextMS);
				timeToNextMS = Math.min(10000, timeToNextMS);

				var timeElapsed = now - frameStart;
				var triggerDelay = timeToNextMS - timeElapsed;
				if(triggerDelay < 1){
					var fps = 1000 / timeElapsed;
					dc.console.log(`Animation lag at ${fps} fps`);
					triggerDelay = 1;
				}
				setTimeout(self.callOnFrameCaller.bind(self), triggerDelay);
			}
			else {
				var throttle = self.loadNextInStack();
				if(throttle){
					setTimeout(self.callOnFrameCaller.bind(self), throttle);
				}
				else {
					setImmediate(self.callOnFrameCaller.bind(self));
				}
			}
		}

		self.frameCallback(self.currentFrame, onFrameCompleted);
	}

	// internal
	getCallback(){
		return this.onFrame.bind(this);
	}

	// internal
	loadNextInStack(){
		var now = new Date().getTime();
		this.animationStart = now / 1000;

		this.scriptIndex++;
		this.scriptIndex %= this.stack.length;
		var current = this.stack[this.scriptIndex];

		var throttle = 0;
		if(this.scriptIndex == 0){
			var stackDuration = this.animationStart - this.stackStart;
			this.stackStart = this.animationStart;
			// Arbitrary limit to avoid runaway stacks
			if(stackDuration < 50){
				throttle = 50;
			}
		}

		this.currentScript = current.script;

		try{
			// Call precompiled setup script
			this.onSetupCaller.globals.config = current.config;
			this.onSetupCaller.globals.data = this.dataSource.getData();
			this.onSetupCaller.run();
		}catch(error){
			dc.console.log(error.stack);
		}

		return throttle;
	}

	/**
	 * Precompile setup script caller to be able to run with timeout.
	 * Note that while onSetup is not performance critical, compiling
	 * is a real cycle waster / battery drainer.
	 * @internal
	 */
	compileSetupScript(){
		var code = "self.currentScript.onSetup(config, data);";
		this.onSetupCaller = new util.CompiledScript(code, "onSetupCaller", {self: this}, this.timeout);
	}

	/**
	 * Precompile animation script caller to be able to run with timeout
	 * while keeping most of the performance.
	 * @internal
	 */
	compileFrameScript(){
		var code = "self.currentScript.onFrame(self.currentFrame, now - self.animationStart);";
		this.onFrameCaller = new util.CompiledScript(code, "onFrameCaller", {self: this}, this.timeout);
	}

	/**
	 * Call precompiled script caller to drive one frame of animation.
	 * @internal
	 */
	callOnFrameCaller(){
		if(this.stopped){
			return;
		}
		try{
			this.onFrameCaller.globals.now = new Date().getTime() / 1000;
			let timeToNextMS = this.onFrameCaller.run();
			this.onFrame(timeToNextMS);
		}catch(error){
			dc.console.log(error.stack);
		}
	}

	/**
	 * Starts the animator. Will immediately load and animate through the animation stack.
	 * If previously stopped, the sequence will start where it left off.
	 */
	start(){
		this.stopped = false;
		this.loadNextInStack();
		setImmediate(this.callOnFrameCaller.bind(this));
	}

	/**
	 * Stops the animator after the current frame is done.
	 * If animation is started again, it will pick up where it was stopped.
	 */
	stop(){
		this.stopped = true;
	}
}

module.exports = Animator;
