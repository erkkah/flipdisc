"use strict";

/*
 * Example data fetcher script that loads an image from a URL.
 */

const jimp = require('jimp');
const Dither = require('image-dither');
const assert = require('assert');

var dither = new Dither({matrix: Dither.matrices.sierra2});

function RGBAtoBW(rgba) {
	assert(rgba.length % 4 == 0);
	var pixels = rgba.length / 4;
	var bw = new Array(pixels);

	for (var i = 0, j = 0; j < pixels; i += 4, j++) {
		bw[j] = rgba[i];
	}

	return bw;
}

var code = class {
	constructor(){
		// set up stuff
	}
	onUpdate(callback){
        jimp.read('http://files.softicons.com/download/game-icons/classic-games-icons-by-thvg/png/128/Pacman.png')
        	.then(function(pic){
        		var image = pic.resize(jimp.AUTO, 14);
        		var dithered = dither.dither(image.bitmap.data, image.bitmap.width);
        		var bw = RGBAtoBW(dithered);
        		var bmp = {
        		    width: image.bitmap.width,
        		    height: image.bitmap.height,
        		    data: bw
        		};
        	    callback(null, bmp);
            })
        	.catch(function(err){
        		callback(err);
        	});
	}
};
