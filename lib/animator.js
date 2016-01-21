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
 *   onFrame(oldFrame, timePassedInSeconds, frameCallback){
 *     // calculate one frame of animation
 *     // ...
 *     // call frameCallback with updated frame data and ms to next callback
 *     // Providing no callback time ends the script
 *     // frameCallback(updatedFrame, 1000);
 * 
 *     if(timePassedInSeconds < 3){
 *       frameCallback(this.message, 1000);
 *     }
 *     else {
 *       frameCallback(this.message);
 *     }
 *   }
 * }
 * ```
 *
 * Note that the frames handled and produced by the <code>onFrame</code> can be of
 * any format, they are opaque to the animator.
 */
class Animator {
	/**
	 * Creates a new non-running animator instance.
	 *
	 * @constructor
	 * @param {object} stack - A stack of animation scripts
	 * @param {object} dataSource - Data source that will provide data to the scripts, must provide a "getData" method.
	 * @param {function} frameCallback - Gets called for each animation frame: frameCallback(frame, doneCallback)
	 *		The doneCallback must be called on completed frame to trigger new frames.
	 */
	constructor(stack, dataSource, frameCallback){
		assert(stack instanceof Array);
		assert(stack.length > 0);

		this.stack = stack;
		this.dataSource = dataSource;
		this.frameCallback = frameCallback;
		this.scriptIndex = -1;
		this.currentScript = undefined;
		this.animationStart = 0;
		this.stackStart = 0;
		this.currentFrame = {};
		this.stopped = false;
		this.compileFrameScript();
		this.compileSetupScript();
	}


	// internal, called from display script to deliver frames
	// and request another callback
	onFrame(frameData, timeToNextMS){
		var self = this;

		if(self.stopped){
			return;
		}
		self.currentFrame = frameData;

		var frameStart = new Date().getTime();

		function onFrameCompleted(error){
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

		self.frameCallback(frameData, onFrameCompleted);
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
			if(stackDuration < 1000){
				throttle = 1000;
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
		var timeout = 500;
		this.onSetupCaller = new util.CompiledScript(code, "onSetupCaller", {self: this}, timeout);
	}

	/**
	 * Precompile animation script caller to be able to run with timeout
	 * while keeping most of the performance.
	 * @internal
	 */
	compileFrameScript(){
		var code = "self.currentScript.onFrame(self.currentFrame, now - self.animationStart, self.getCallback());";
		var timeout = 500;
		this.onFrameCaller = new util.CompiledScript(code, "onFrameCaller", {self: this}, timeout);
	}

	/**
	 * Call precompiled script caller to drive one frame of animation.
	 * @internal
	 */
	callOnFrameCaller(){
		try{
			this.onFrameCaller.globals.now = new Date().getTime() / 1000;
			this.onFrameCaller.run();
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
