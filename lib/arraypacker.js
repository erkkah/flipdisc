"use strict";

/* eslint-env node, es6 */

var assert = require('assert');
var MonoBitmap = require('./monobitmap');

/**
 * Simple run length encoder of {@link MonoBitmap} objects for sending to browser
 * with no dependencies and okish performance cpu and bandwith wise. There is no bit diddling
 * or other cleverness.
 * 
 * Max bitmap size is 255 * 255.
 * 
 * Encoded frames start with [width, height] followed by one byte per pixel stripe, performing simple RLE encoding.
 * Example: width, height, numwhites, numblacks, numwhites, numblacks, et.c.
 * 
 * Note that numwhites or numwhites might be 0 for stripes longer than 255.
 */
class MonoBitmapEncoder {
	/**
	 * @constructor
	 */
	constructor() {
	}

	/**
	 * Encode one frame, returns the encoded bytes.
	 *
	 * @param newFrame {MonoBitmap} - Bitmap to compress
	 * @return {Array} - Encoded bytes
	 */
	encode(newFrame){
		assert(newFrame instanceof MonoBitmap);

		if(newFrame.width > 255 || newFrame.height > 255){
			throw new Error("Cannot encode widths or heights > 255");
		}

		// full frame encoding

		var white = true;
		var black = !white;
		var mode = white;

		var fullBuffer = [newFrame.width, newFrame.height];

		var numWhites = 0;
		var numBlacks = 0;
		
		var pixels = newFrame.getBytes();
		for(var pixel of pixels){
			if(pixel == 0){
				if(mode == white){
					fullBuffer.push(numWhites);
					numWhites = 0;
					mode = black;
				}
				numBlacks++;

				// flush
				if(numBlacks == 255){
					fullBuffer.push(255);	// numBlacks
					fullBuffer.push(0);		// numWhites
					numBlacks = 0;
				}
			}
			else {
				if(mode == black){
					fullBuffer.push(numBlacks);
					numBlacks = 0;
					mode = white;
				}
				numWhites++;

				// flush
				if(numWhites == 255){
					fullBuffer.push(255);	// numWhites
					fullBuffer.push(0);		// numBlacks
					numWhites = 0;
				}
			}
		}

		// finalize full frame
		if(mode == white){
			fullBuffer.push(numWhites);
			fullBuffer.push(0);
		}
		else {
			fullBuffer.push(numBlacks);
		}

		return fullBuffer;
	}
}

/**
 * Decodes frames encoded by {@link MonoBitmapEncoder}.
 */
class MonoBitmapDecoder {
	/**
	 * @constructor
	 */
	constructor(){
		this.frame = [];
	}

	/**
	 * Decode one <code>MonoBitmapEncoder</code> encoded frame.
	 * Returns the byte array containing the bitmap pixels.
	 * To get a <code>MonoBitmap</code> representation, use
	 * {@link MonoBitmapDecoder#getLastDecodedBitmap} after decoding is complete.
	 *
	 * @param newFrame {Array} - Byte sequence as returned from MonoBitmapEncoder
	 * @return {Array} - Bytes containing one full decoded frame
	 */
	decode(newFrame){
		this.width = newFrame[0];
		this.height = newFrame[1];
		if(this.frame.length != this.width * this.height){
			this.frame = Buffer.alloc(this.width * this.height);
		}

		if(newFrame.length % 2 != 0){
			throw new Error("Invalid full frame length");
		}

		var fullPos = 0;
		for(var pos = 2; pos < newFrame.length; pos += 2){
			var numWhites = newFrame[pos];
			var numBlacks = newFrame[pos + 1];
			this.frame.fill(1, fullPos, fullPos + numWhites);
			fullPos += numWhites;
			this.frame.fill(0, fullPos, fullPos + numBlacks);
			fullPos += numBlacks;
		}
		return this.frame;
	}

	getLastDecodedBitmap(){
		return new MonoBitmap(this.width, this.height, this.frame);
	}
}

module.exports.Encoder = MonoBitmapEncoder;
module.exports.Decoder = MonoBitmapDecoder;
