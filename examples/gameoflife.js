"use strict";
var code = class {
	onSetup(configuration, dataSource){
		this.oldFrames = []
		this.endRepetitions = 10
	}

	getPixel(x, y, bitmap) {
		// Pretend there is blackness all around
		if (x<0 || x >= width || y<0 || y>=height) {
			return 0
		}

		var pixel = bitmap.getPixel(x,y)
		return pixel
	}

	countNeighbours(x, y, bitmap) {
		var neighbours = 0
		for (var ix=x-1; ix<=x+1; ix++) {
			for (var iy=y-1; iy<=y+1; iy++) {
				var pixel = this.getPixel(ix, iy, bitmap)

				// Count all values above zero and don't count the pixel in the middle itself
				var isCenter = (ix==x && iy==y)
				var isVisible = (pixel > 0)
				if (isVisible && !isCenter) {
					neighbours++;
				}
			}
		}

		return neighbours
	}

	onFrame(inFrame, timePassedInSeconds, frameCallback){
		var outFrame = new MonoBitmap(width, height);
		for (var x=0; x<width; x++) {
			for (var y=0; y<height; y++) {
				var isAlive = inFrame.getPixel(x,y) > 0
				var neighbours = this.countNeighbours(x, y, inFrame)
				
				// Game of life. Default is death.
				var willLive = false
				
				if (isAlive && neighbours == 2) {
					// Let it live if alive and it has two neighbours
					willLive = true
				}				
				else if (neighbours == 3) {
					// Let it live if alive, and awaken the dead if three neighbours 
					willLive = true
				}
				outFrame.putPixel(x, y, willLive ? 1 : 0)
			}
		}

		// Stop after we start repeating the pattern. There are certain patterns that oscillate
		var foundFrame = this.oldFrames.find((element, index, array) => {
			return outFrame.getBytes().equals(element.getBytes())
		}) 

		if (foundFrame != undefined) {
			this.endRepetitions--
		}

		inFrame.drawBitmap(outFrame, 0, 0);
		var timeToStop = this.endRepetitions <= 0
		var timeToNext = timeToStop ? 0 : 200;

		// Keep the last 20 iterations
		this.oldFrames.push(outFrame)
		if (this.oldFrames.length > 20) {
			this.oldFrames.shift()
		}

		return timeToNext;
 	}
};