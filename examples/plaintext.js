"use strict";

/**
 * Clears the display, draws a nonanimated text.
 * Text is either fetched from data source based on
 * the 'reference' config parameter, or fetched from
 * the 'text' config parameter.
 * 
 * There is no animation or delay, only one frame will be drawn.
 * 
 * Configuration parameters:
 * 
 * reference: data source path of text (optional)
 * text: text to show if no reference is given or reference is not valid (yet)
 * font: a valid font ID
 * offset: an array containing the x and y offsets of the text (optional)
 * 
 */

var code = class {
	onSetup(configuration, dataSource){
		var text;
		
		if(configuration.reference){
			text = dataSource.resolve(configuration.reference) + "";
		}
		if(!text){
			text = configuration.text || "Hello?";
		}
		var font = configuration.font || "5x7";
		var offset = configuration.offset || [0, 0];
		var x = offset[0] || 0;
		var y = offset[1] || 0;
		
		this.bmp = new MonoBitmap(width, height);
		this.bmp.fill(0);
		drawText(this.bmp, x, y, text, font);
	}
	
	onFrame(oldFrame, timePassedInSeconds, frameCallback){
		// Just draw and return
		frameCallback(this.bmp, 0);
	}
};
