"use strict";
var assert = require('assert');

/*

Simple run length encoding of buffers for sending small monochrome bitmaps to browser
with no dependencies and okish performance cpu and bandwith wise. There is no bit diddling,
smallest addressable entity is a byte.

Max bitmap size is 255 * 255.

Setup frames (0) contain width, height.

Full frames (1) contain one byte per pixel stripe, performing simple RLE encoding.
Example: numwhites, numblacks, numwhites, numblacks, et.c.

Note that numwhites or numwhites might be 0 for stripes longer than 255.

Encoder will emit setup frames every X frame.

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
	}

	/**
	 * @param newFrame {Buffer} - Array like object with byte valued pixels
	 * @param callback {function} - will get called with (error, Buffer) on each encoding output
	 */
	encode(newFrame, callback){
		assert.equal(newFrame.length, this.width * this.height);
		assert(callback);

		if(this.setupCounter == 0){
			// encode setup frame here
			var setupBuffer = [0, this.width, this.height]	// 0 == setup
			callback(null, setupBuffer);
		}
		this.setupCounter++;
		this.setupCounter %= this.setupInterval;

		// full frame encoding

		var white = true;
		var black = !white;
		var mode = white;

		var fullBuffer = [1];	// 1 == full

		var numWhites = 0;
		var numBlacks = 0;
		
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

		return callback(null, fullBuffer);
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
				return callback(null, this.frame);
				break;
			default:
				return callback(new Error("Invalid frame code"));
		}
	}
}

module.exports.Encoder = MonoBitmapEncoder;
module.exports.Decoder = MonoBitmapDecoder;

/// Basic tests:

function runTests(){
	const logLevel = 3;

	var width = 10;
	var height = 17;
	var white = new Buffer(width * height).fill(1);
	var black = new Buffer(width * height).fill(0);

	var A = new Buffer(black);
	var B = new Buffer(A);
	A.fill(1, 44);
	B.fill(1, 46);

	var encoder = new MonoBitmapEncoder(width, height);
	var decoder = new MonoBitmapDecoder();

	function indexedCheck(bufA, bufB){
		assert(bufA.length == bufB.length);
		for(var i = 0; i < bufA.length; i++){
			if(bufA[i] != bufB[i]){
				console.log(`(${bufA[i]} != ${bufB[i]})@${i}`)
				console.log(`A[${i}]:`, bufA.slice(i));
				console.log(`B[${i}]:`, bufB.slice(i));
				assert(false);
			}
		}
	}

	function checkCodec(buffer, logLevel){
		encoder.encode(buffer, function(error, encoded){
			assert.ifError(error);

			if(logLevel > 1){
				var ratio = 100 * (encoded.length / buffer.length);
				console.log(`Compression ratio: ${ratio.toFixed(2)}%`);
			}
			if(logLevel > 2){
				console.log("Raw: ", buffer);
				console.log("Encoded: ", encoded);
			}

			decoder.decode(encoded, function(error, decoded){
				assert.ifError(error);
				//assert.deepEqual(decoded, buffer);
				indexedCheck(decoded, buffer);
			});
		});
	}

	console.log("*** White");
	checkCodec(white, logLevel);

	console.log("*** Black");
	checkCodec(black, logLevel);

	console.log("*** A/B");
	checkCodec(A, logLevel);
	checkCodec(B, logLevel);

	function createRandom(){
		let buffer = new Buffer(width * height);
		for(var i = 0; i < buffer.length; i++){
			buffer[i] = Math.random() > 0.5 ? 1 : 0;
		}
		return buffer;
	}

	console.log("*** Random");
	for(var i = 0; i < 10; i++){
		var rnd = createRandom();
		checkCodec(rnd, logLevel);
	}

	function addRandomDots(buffer) {
		var spread = 12;
		var pos = Math.floor(Math.random() * (buffer.length - spread));
		var len = Math.floor(Math.random() * spread);
		buffer.fill(1, pos, pos + len);
	}

	console.log("*** Random dots");
	for(var i = 0; i < 1000; i++){
		addRandomDots(black);
		checkCodec(black, logLevel);
	}

}

// runTests();
