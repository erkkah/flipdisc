"use strict"

var assert = require('assert');

/**
 * A simple one byte per pixel monochrome bitmap.
 * Pixel values are either 1 or 0.
 * @param width - Bitmap width in pixels
 * @param height - Bitmap height in pixels
 * @param [optionalBytes] {Array} - one byte per pixel (width*height element)
 * array to create bitmap from
 * @constructor
 */
function MonoBitmap(width, height, optionalBytes){
	assert(width > 0, "Width must be > 0");
	assert(height > 0, "Height must be > 0");

	this.width = width;
	this.height = height;

	if(optionalBytes){
		assert(optionalBytes.length == width * height,
			`Buffer must be of length ${width * height}, not ${optionalBytes.length}`);
		this.buffer = Buffer.from(optionalBytes);
	}
	else {
		this.buffer = Buffer.alloc(width * height);
	}
}
module.exports = MonoBitmap;

/**
 * Sets pixel at x, y to one or zero.
 * @param x {integer}
 * @param y {integer}
 */
MonoBitmap.prototype.putPixel = function(x, y, value) {
	assert(x >= 0);
	assert(y >= 0);
	assert(x < this.width);
	assert(y < this.height);
	assert(value == 1 || value == 0);
	assert.equal(x, Math.floor(x), "X coord is integer");
	assert.equal(y, Math.floor(y), "Y coord is integer");

	this.buffer[y * this.width + x] = value;
};

/**
 * Gets pixel value at x, y.
 * @param x {integer}
 * @param y {integer}
 */
MonoBitmap.prototype.getPixel = function(x, y) {
	assert(x >= 0);
	assert(y >= 0);
	assert(x < this.width);
	assert(y < this.height);
	assert.equal(x, Math.floor(x), "X coord is integer");
	assert.equal(y, Math.floor(y), "Y coord is integer");

	return this.buffer[y * this.width + x];
};

/**
 * Fills whole bitmap with one or zero.
 * @param value - 1 or 0
 * @return this - for chaining
 */
MonoBitmap.prototype.fill = function(value){
	assert(value == 1 || value == 0);

	this.buffer.fill(value);
	return this;
}

/**
 * Draws another bitmap onto this bitmap at a given position.
 * The source bitmap will be clipped to fit.
 * Negative destination coordinates are supported.
 *
 * @param source {MonoBitmap} - source bitmap
 * @param targetX {integer} - destination x coordinate
 * @param targetY {integer} - destination y coordinate
 */
MonoBitmap.prototype.drawBitmap = function(source, targetX, targetY){
	assert(source instanceof MonoBitmap);
	assert(targetX < this.width);
	assert(targetY < this.height);

	// Source is completely outside of target
	if(targetX <= -source.width || targetY <= -source.height){
		return;
	}

	var clippedRight = Math.min(targetX + source.width, this.width);
	var clippedBottom = Math.min(targetY + source.height, this.height);

	var clippedWidth = clippedRight - targetX;
	var clippedHeight = clippedBottom - targetY;

	var clippedLeft = 0;
	var clippedTop = 0;

	if(targetX < 0){
		clippedLeft = -targetX;
		clippedWidth += targetX;
		targetX = 0;
	}

	if(targetY < 0){
		clippedTop = -targetY;
		clippedHeight += targetY;
		targetY = 0;
	}

	//var croppedSource = source.crop(clippedLeft, clippedTop, clippedWidth, clippedHeight);

	for(var y = 0; y < clippedHeight; y++){
		var targetPosition = (targetY + y) * this.width + targetX;
		var sourcePosition = (clippedTop + y) * source.width + clippedLeft;
		source.buffer.copy(this.buffer, targetPosition, sourcePosition, sourcePosition + clippedWidth);
	}
}

/**
 * Draws a solid black line using Bresenham.
 * Coordinates are inclusive, meaning a line from (0, 0) to (0, 0)
 * sets one pixel.
 * @param x0 {integer}
 * @param y0 {integer}
 * @param x1 {integer}
 * @param y1 {integer}
 * @param color {integer}
 */
MonoBitmap.prototype.drawLine = function(x0, y0, x1, y1, color) {
	assert(x0 >= 0 && x0 < this.width, "x0 in range");
	assert(y0 >= 0 && y0 < this.height, "y0 in range");
	assert(x1 >= 0 && x1 < this.width, "x1 in range");
	assert(y1 >= 0 && y1 < this.height, "y1 in range");
	assert(color == 1 || color == 0, "color is valid");

	var dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
	var dy = Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1; 
	var err = (dx>dy ? dx : -dy)/2;

	while (true) {
		this.putPixel(x0, y0, color);
		if (x0 === x1 && y0 === y1) {
			break;
		}
		var e2 = err;
		if (e2 > -dx) {
			err -= dy;
			x0 += sx;
		}
		if (e2 < dy) {
			err += dx;
			y0 += sy;
		}
	}
}

/**
 * Returns a cropped copy of this bitmap.
 * @param x {integer} - start x coordinate, left edge
 * @param y {integer} - start y coordinate, top edge
 * @param width {integer}
 * @param height {integer}
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
		var result = new MonoBitmap(width, height);

		for(var y = 0; y < height; y++){
			var targetPosition = y * width;
			var sourcePosition = y * this.width + x;
			this.buffer.copy(result.buffer, targetPosition, sourcePosition, sourcePosition + width);
		}
		return result;
	}
}

/**
 * @returns {Buffer} - raw bytes of this bitmap
 */
MonoBitmap.prototype.getBytes = function(){
	return Buffer.from(this.buffer);
}
