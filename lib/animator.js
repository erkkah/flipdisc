"use strict"
var assert = require('assert');

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
	 * @param {function} frameCallback - Gets called for each animation frame
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
		this.currentFrame = {};
		this.stopped = false;
	}


	// internal
	onFrame(frameData, timeToNextMS){
		if(this.stopped){
			return;
		}
		this.currentFrame = frameData;
		this.frameCallback(frameData);
		if(timeToNextMS){
			// limit to [0, 10000]
			timeToNextMS = Math.max(0, timeToNextMS);
			timeToNextMS = Math.min(10000, timeToNextMS);
			setTimeout(this.scriptCaller.bind(this), timeToNextMS);
		}
		else {
			// ??? Handle zero length stacks here ?
			this.loadNextInStack();
			setImmediate(this.scriptCaller.bind(this));
		}
	}

	// internal
	getCallback(){
		return this.onFrame.bind(this);
	}

	// internal
	loadNextInStack(){
		this.animationStart = new Date().getTime() / 1000;

		this.scriptIndex++;
		this.scriptIndex %= this.stack.length;
		var current = this.stack[this.scriptIndex];

		console.log("Loading script at ", this.scriptIndex);

		this.currentScript = current.script;
		this.currentScript.onSetup(current.config, this.dataSource.getData());
	}

	// internal
	scriptCaller(){
		var now = new Date().getTime() / 1000;
		try{
			this.currentScript.onFrame(this.currentFrame, now - this.animationStart, this.getCallback());
		}catch(error){
			// ??? Fix remote log viewing somehow
			console.log(error.stack);
		}
	}

	/**
	 * Starts the animator. Will immediately load and animate through the animation stack.
	 * If previously stopped, the sequence will start where it left off.
	 */
	start(){
		this.stopped = false;
		this.loadNextInStack();
		setImmediate(this.scriptCaller.bind(this));
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
