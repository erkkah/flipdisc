"use strict"

/* eslint-env node, es6 */

const assert = require('assert');
const SerialPort = require('serialport').SerialPort;

/**
 * Communication layer for an Alfa Zeta flip disc display, built up from XY-panels
 * connected to a serial interface. The physical panels are 28x14 dots, built up from
 * two	28x7 dot sub-panels with separate controllers. The controllers are connected
 * to a RS485 bus and are individually addressable.
 *
 * Only rectangular configurations are supported, with controller addresses
 * starting at 0 and increasing in row first order.
 *
 * A single panel display in landscape mode has a panelLayout parameter of width 1 and height 2.
 *
 * Default configuration:
 * ```
 * {
 *   "device": "/dev/ttyAMA0",
 *   "baudRate": 57600,
 *   "panelLayout": {
 *     "orientation": "landscape",
 *     "width": 1,
 *     "height": 2
 *   }
 * }
 * ```
 * @example
 * var FlipFlop = require('flipdisplay');
 * var display = new FlipFlop();
 *
 */
class Display {
	/**
	 * @constructor
 	 * @param {map} params - Configuration parameters [optional]
 	 */
	constructor(params) {
		this.device = '/dev/ttyAMA0';
		this.baudRate = 57600;
		this.panelLayout = {orientation: 'landscape', width: 1, height: 2};
		if(params){
			if(params.device){
				this.device = params.device;
			}
			if(params.baudRate){
				this.baudRate = params.baudRate;
			}
			if(params.panelLayout){
				this.panelLayout = params.panelLayout;
			}
		}

		if(this.device != 'NONE'){
			// create serial port
			var openOnCreation = false;
			this.port = new SerialPort(this.device, {
				baudRate: this.baudRate,
				parity: 'none',
				stopBits: 1,
				dataBits: 8
			}, openOnCreation);
		}
		else {
			this.port = null;
		}
	}

	/**
	 * @returns - Display dimensions in dots as an array: [width, height]
	 */
	getDimensions(){
		if(this.panelLayout.orientation == 'landscape'){
			return [this.panelLayout.width * 28, this.panelLayout.height * 7];
		}
		else {
			return [this.panelLayout.width * 7, this.panelLayout.height * 28];
		}
	}


	/**
	 * Opens display by opening the serial port.
	 *
	 * @param {function} callback - Called on error or completion
	 * @returns - Promise if invoked without callback
	 */
	open(callback){
		var self = this;
		
		if(callback){
			if(self.port){
				self.port.open(callback);
			}
			else {
				assert(self.device == 'NONE');
				callback(null, self.device);
			}
		}
		else{
			return new Promise(function(fulfill, reject){
				if(self.port){
					self.port.open(function(error, result){
						if(error){
							reject(error);
						}
						else{
							fulfill(result);
						}
					})
				}
				else {
					assert(self.device == 'NONE');
					fulfill(self.device);
				}
			})
		}
	}

	// internal
	drawPanel(panelIndex, data, callback){
		assert(callback);

		var header = new Buffer([0x80]);
		var command = new Buffer([0x83]);
		var end = new Buffer([0x8F]);

		var buffer = Buffer.concat([header, command, new Buffer([panelIndex]), data, end]);
		var serial = this.port;

		if(serial) {
			serial.write(buffer, function(error){
				if(error){
					return callback(error);
				}
				serial.drain(function(error){
					if(error){
						return(callback(error));
					}
					else {
						return(callback(null, panelIndex));
					}
				});
			});
		}
		else {
			return(callback(null, panelIndex));
		}
	}

	/**
	 * Clears the display in color or black.
	 * Sets all dots to the colored side if @param{color} is non zero,
	 * or the black side otherwise.
	 *
	 * @param {byte} color - Non-zero means "color"
	 * @param {function} callback - Called on error or completion
	 */
	clear(color, callback) {
		var buffer = new Buffer(28);
		buffer.fill(color ? 0x7F : 0);
		var numPanels = this.panelLayout.width * this.panelLayout.height;
		var panelsDrawn = 0;

		for (var i = 0; i < numPanels; i++) {
			this.drawPanel(i, buffer, function(error, result){
				if(error){
					return callback(error);
				}
				else {
					panelsDrawn++;
					if(panelsDrawn == numPanels){
						callback(null);
					}
				}
			});
		}
	}

	/**
	 * Draws a full monochrome (1 byte per pixel) bitmap in row-first order.
	 * Bitmap must be of full display size, covering all panels.
	 *
	 * @param {array} bitmap - Array of panelwidth * panelheight elements,
	 * non-zero elements yields a set dot.
	 * @param {function} callback - Called on error or completion.
	 */
	drawBitmap(bitmap, callback) {
		assert(callback);

		if(this.panelLayout.orientation != 'landscape'){
			throw new Error('unsupported panel orientation');
		}

		var panelWidth = this.panelLayout.width;
		var panelHeight = this.panelLayout.height;

		var bitmapWidth = panelWidth * 28;
		var bitmapHeight = panelHeight * 7;

		assert(bitmap.length == bitmapWidth * bitmapHeight, `Bitmap must be ${bitmapWidth}x${bitmapHeight}`);

		var numPanels = panelWidth * panelHeight;
		var panelsDrawn = 0;

		// Loop over all panels, drawing one at a time
		for (var panelRow = 0; panelRow < panelHeight; panelRow++){
			for(var panelColumn = 0; panelColumn < panelWidth; panelColumn++){
				var panelIndex = panelRow * panelWidth + panelColumn;

				// Each panel is 28 dots wide, with each colums addressable as a 7 bit byte.
				// LSB = top dot.
				var buffer = new Buffer(28);

				// Draw sub bitmap to current panel
				var startY = panelRow * 7;
				var startX = panelColumn * 28;

				for(var x = 0; x < 28; x++){
					var y = startY * bitmapWidth;

					var pixel = bitmap[y + startX + x] == 0 ? 0 : 1;
					y += bitmapWidth;
					pixel |= bitmap[y + startX + x] == 0 ? 0 : 2;
					y += bitmapWidth;
					pixel |= bitmap[y + startX + x] == 0 ? 0 : 4;
					y += bitmapWidth;
					pixel |= bitmap[y + startX + x] == 0 ? 0 : 8;
					y += bitmapWidth;
					pixel |= bitmap[y + startX + x] == 0 ? 0 : 16;
					y += bitmapWidth;
					pixel |= bitmap[y + startX + x] == 0 ? 0 : 32;
					y += bitmapWidth;
					pixel |= bitmap[y + startX + x] == 0 ? 0 : 64;

					buffer[x] = pixel;
				}

				this.drawPanel(panelIndex, buffer, function(error, result){
					if(error){
						return callback(error);
					}
					else{
						panelsDrawn++;
						if(panelsDrawn == numPanels){
							return callback(null);
						}
					}
				});
			}
		}	
	}
}

module.exports = Display;