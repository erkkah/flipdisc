"use strict";

/**
 * Example display script that draws nonanimated text.
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
		if(configuration.reference){
			this.text = dataSource.resolve(configuration.reference) + "";
		}
		if(!this.text){
			this.text = configuration.text || "Hello?";
		}
		this.font = configuration.font || "5x7";
		this.offset = configuration.offset || [0, 0];
	}
	
	onFrame(oldFrame, timePassedInSeconds){
		var x = this.offset[0] || 0;
		var y = this.offset[1] || 0;
		
		drawText(oldFrame, x, y, this.text, this.font);
		return 0;
	}
};
