"use strict";

/**
 * Fills display with color 1 or 0.
 * Example config:
 * {
 *  "color": 1
 * }
 */

var code = class {
	onSetup(configuration, dataSource){
		this.color = configuration.color;

	}
	
	onFrame(oldFrame, timePassedInSeconds, frameCallback){
		// Just fill and return
		oldFrame.fill(this.color);
		return 0;
	}
};
