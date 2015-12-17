"use strict"

var assert = require('assert');

/**
 * A simple one byte per pixel monochrome bitmap.
 * Pixel values are either 1 or 0.
 */
function MonoBitmap(width, height, optionalBytes){
	assert(width > 0);
	assert(height > 0);

	this.width = width;
	this.height = height;

	if(optionalBytes){
		assert(optionalBytes.length == width * height);
		this.buffer = new Buffer(optionalBytes);
	}
	else {
		this.buffer = new Buffer(width * height);
	}
}
module.exports = MonoBitmap;

MonoBitmap.prototype.putPixel = function(x, y, value) {
	assert(x >= 0);
	assert(y >= 0);
	assert(x < this.width);
	assert(y < this.height);
	assert(value == 1 || value == 0);

	this.buffer[y * this.width + x] = value;
};

MonoBitmap.prototype.getPixel = function(x, y) {
	assert(x >= 0);
	assert(y >= 0);
	assert(x < this.width);
	assert(y < this.height);

	return this.buffer[y * this.width + x];
};

MonoBitmap.prototype.fill = function(value){
	assert(value == 1 || value == 0);

	this.buffer.fill(value);
}

/**
	Draws another bitmap onto this bitmap at a given position.
	The source bitmap will be clipped to fit.
*/
MonoBitmap.prototype.drawBitmap = function(source, targetX, targetY){
	assert(source instanceof MonoBitmap);
	assert(targetX < this.width);
	assert(targetY < this.height);

	var clippedRight = Math.min(targetX + source.width, this.width);
	var clippedBottom = Math.min(targetY + source.height, this.height);
	var clippedWidth = clippedRight - targetX;
	var clippedHeight = clippedBottom - targetY;

	var croppedSource = source.crop(0, 0, clippedWidth, clippedHeight);

	for(var y = 0; y < clippedHeight; y++){
		var targetPosition = (targetY + y) * this.width + targetX;
		var sourcePosition = y * source.width;
		source.buffer.copy(this.buffer, targetPosition, sourcePosition, sourcePosition + clippedWidth);
	}
}

/**
 * Returns a cropped copy of this bitmap.
 */
MonoBitmap.prototype.crop = function(x, y, width, height){
	assert(x >= 0);
	assert(y >= 0);
	assert(x + width <= this.width);
	assert(y + height <= this.height);

	if(x == 0 && y == 0 && width == this.width && height == this.height){
		return new MonoBitmap(width, height, this.buffer);
	}
	else{
		result = new MonoBitmap(width, height);

		for(var y = 0; y < height; y++){
			var targetPosition = y * width;
			var sourcePosition = y * this.width + x;
			this.buffer.copy(result.buffer, targetPosition, sourcePosition, sourcePosition + width);
		}
		return result;
	}
}

MonoBitmap.prototype.getBytes = function(){
	return this.buffer;
}
