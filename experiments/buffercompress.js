"use strict";
var assert = require('assert');

/*

Incremental differential encoding of buffers for sending small monochrome bitmaps to browser
with no dependencies and okish performance cpu and bandwith wise. There is no bit diddling,
smallest addressable entity is a byte.

Max bitmap size is 255 * 255.

Setup frames (0) contain width, height.

Full frames (1) contain one byte per pixel stripe, performing simple RLE encoding.
Example: numwhites, numblacks, numwhites, numblacks, et.c.

Note that numwhites or numwhites might be 0 for stripes longer than 255.

Incremental (2) frames contain byte triplets of skip, numwhites, numblacks.
Example: 0, 0, 22,  255, 0, 0,  26, 22, 98, ...

0, 0, 0 is OK, meaning no update

Worst case every other pixel changes every frame, and incremental frames will be three times
bigger than full.

Encoder will emit setup frames every X frame, full frames for initial frames or if incremental
frames become too large.

*/

/**
 *
 */
class MonoBitmapEncoder {
	/**
	 * @constructor
	 */
	constructor(width, height) {
		assert(width < 256);
		assert(height < 256);
		assert(width > 0);
		assert(height > 0);

		this.width = width;
		this.height = height;

		this.setupCounter = 0;
		this.setupInterval = 100;

		// init last frame to black
		this.lastFrame = new Buffer(width * height).fill(0);
	}

	/**
	 * @param newFrame {Buffer} - Array like object with byte valued pixels
	 * @param callback {function} - will get called with (error, Buffer) on each encoding output
	 */
	encode(newFrame, callback){
		if(this.setupCounter == 0){
			// encode setup frame here
			var setupBuffer = [0, this.width, this.height]	// 0 == setup
			callback(null, setupBuffer);
		}
		this.setupCounter++;
		this.setupCounter %= this.setupInterval;

		var fullBuffer = [1];	// 1 == full
		var incrBuffer = [2];	// 2 == incremental

		var white = true;
		var black = !white;
		var mode = white;

		var numWhites = 0;
		var numBlacks = 0;

		// full frame encoding
		for(var pixel of newFrame){
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
				if(mode == black) {
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
		else{
			fullBuffer.push(numBlacks);
		}

		this.lastFrame = new Buffer(newFrame);

		if(incrBuffer.length != 1 && fullBuffer.length > incrBuffer.length){
			return callback(null, incrBuffer);
		}
		else {
			return callback(null, fullBuffer);
		}
	}
}

class MonoBitmapDecoder {
	constructor(){
		this.frame = [];
	}

	decode(newFrame, callback){
		switch(newFrame[0]) {
			case 0:
				// setup
				this.width = newFrame[1];
				this.height = newFrame[2];
				if(this.frame.length == 0){
					this.frame = new Buffer(this.width * this.height).fill(0);
				}
				break;
			case 1:
				// full frame
				if(newFrame.length % 2 != 1){
					return callback(new Error("Invalid full frame length"));
				}
				var fullPos = 0;
				for(var pos = 1; pos < newFrame.length; pos += 2){
					var numWhites = newFrame[pos];
					var numBlacks = newFrame[pos + 1];
					this.frame.fill(1, fullPos, fullPos + numWhites);
					fullPos += numWhites;
					this.frame.fill(0, fullPos, fullPos + numBlacks);
					fullPos += numBlacks;
				}
				callback(null, this.frame);
				break;
			case 2:
				// incremental frame
				return callback(new Error("Incremental decoding not implemented"));
				break;
			default:
				return callback(new Error("Invalid frame code"));
		}
	}
}

/// Basic tests:

function runTests(){
	var width = 255;
	var height = 2;
	var white = new Buffer(width * height).fill(1);
	var black = new Buffer(width * height).fill(0);

	var encoder = new MonoBitmapEncoder(width, height);
	var decoder = new MonoBitmapDecoder();

	function checkCodec(buffer){
		encoder.encode(buffer, function(error, encoded){
			assert.ifError(error);
			decoder.decode(encoded, function(error, decoded){
				assert.ifError(error);
				assert.deepEqual(decoded, buffer);

				var ratio = 100 * (encoded.length / buffer.length);
				console.log(`Compression ratio: ${ratio.toFixed(2)}%`);
			});
		});
	}

	console.log("White");
	checkCodec(white);
	console.log("Black");
	checkCodec(black);

	function createRandom(){
		let buffer = new Buffer(width * height);
		for(var i = 0; i < buffer.length; i++){
			buffer[i] = Math.random() > 0.5 ? 1 : 0;
		}
		return buffer;
	}

	var rnd = createRandom();
	console.log("Random");
	checkCodec(rnd);
}

runTests();
