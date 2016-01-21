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
		var bmp = new MonoBitmap(width, height);
		var color = configuration.color;
		bmp.fill(color);
		this.bmp = bmp;
	}
	
	onFrame(oldFrame, timePassedInSeconds, frameCallback){
		// Just fill and return
		frameCallback(this.bmp, 0);
	}
};
