"use strict";

/**
 * Waits a specified time before moving to the next animation step.
 * Does not change the display, cannot be first in the stack.
 * Config parameter "delay" sets delay time in seconds.
 */
 
var code = class {
	onSetup(configuration, dataSource){
		this.delay = configuration.delay || 1;
	}
	onFrame(oldFrame, timePassedInSeconds){
		var nextCallbackIn = 100;
		if(timePassedInSeconds > this.delay){
			nextCallbackIn = 0;
		}
		return nextCallbackIn;
	}
};
