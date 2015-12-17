"use strict"
var assert = require('assert');

/**
 * An Animator runs through a set of animation scripts,
 * calling the provided callback for each frame produced.
 *
 * The script stack uses the following format:
 *
 * @param {object} stack - A stack of animation scripts
 * @param {object} dataSource - Data source that will provide data to the scripts
 * @param {function} frameCallback - Gets called for each animation frame
 */
function Animator(stack, dataSource, frameCallback){
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

Animator.prototype.onFrame = function(frameData, timeToNextMS){
	if(this.stopped){
		return;
	}
	this.currentFrame = frameData;
	this.frameCallback.call({}, frameData);
	if(timeToNextMS){
		setTimeout(this.scriptCaller.bind(this), timeToNextMS);
	}
	else {
		this.loadNextInStack();
		setImmediate(this.scriptCaller.bind(this));
	}
}

Animator.prototype.getCallback = function(){
	return this.onFrame.bind(this);
}

Animator.prototype.loadNextInStack = function(){
	this.animationStart = new Date().getTime() / 1000;

	this.scriptIndex++;
	this.scriptIndex %= this.stack.length;
	var current = this.stack[this.scriptIndex];

	var script = function(){};
	script.prototype = current.script;
	this.currentScript = new script();
	this.currentScript.onSetup(current.config, this.dataSource);
}

Animator.prototype.scriptCaller = function(){
	var now = new Date().getTime() / 1000;
	this.currentScript.onFrame(this.currentFrame, now - this.animationStart, this.getCallback());
}

Animator.prototype.start = function(){
	this.stopped = false;
	this.loadNextInStack();
	setImmediate(this.scriptCaller.bind(this));
}

Animator.prototype.stop = function(){
	this.stopped = true;
}

module.exports = Animator;

var animationScript =
	{
		"message": "",

		"onSetup": function(configuration, dataSource){
			// set properties of this animation script
			// pull data from data source
			// reset animation
			var key = configuration.msg;
			this.message = dataSource[key];
		},

		"onFrame": function(oldFrame, timePassed, frameCallback){
			// calculate one frame of animation
			// ...
			// call frameCallback with updated frame data and ms to next callback
			// Providing no callback time ends the script
			// frameCallback(updatedFrame, 1000);

			if(timePassed < 3){
				frameCallback(this.message, 1000);
			}
			else {
				frameCallback(this.message);
			}
		}
	}

var animationStack = [
	{
		"script": animationScript,
		"config": {"msg": "msg1"}
	},
	{
		"script": animationScript,
		"config": {"msg": "msg2"}
	}
]

var animator = new Animator(animationStack, {"msg1": "hej", "msg2": "hå"}, function(frameData){
	console.log("frame", frameData);
});

animator.start();
setTimeout(function(){
	animator.stop();
}, 5000);
