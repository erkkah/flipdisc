var assert = require('assert');
var fs = require('fs');
var THREE = require('three');
var SWRenderer = require('three-software-renderer');
var flip = require('./flipdisplay.js');

// sizes are rounded to next smallest multiple of 8
var WIDTH = 32; // 28
var HEIGHT = 16; // 14

var scene = new THREE.Scene();
var cam = new THREE.PerspectiveCamera(45, 1, 1, 2000);
var renderer = new SWRenderer();

cam.position.z = 100;
renderer.setSize(WIDTH, HEIGHT);

var box = new THREE.Mesh(
	new THREE.BoxGeometry(30, 30, 30),
	new THREE.MeshBasicMaterial({color: 0xffffff})
	);

scene.add(box);

function renderFrame(){
	box.rotation.y += Math.PI / 100;
	var pixels = renderer.render(scene, cam);
	var monoBitmap = RGBAtoMono(pixels.data);
	var croppedBitmap = cropMono(monoBitmap, pixels.width, pixels.height, 28, 14);
	display.drawBitmap(croppedBitmap);

/*
	var croppedBitmap = [];
	for(var x = 0; x < 28; x++){
		for(var y = 0; y < 14; y++){
			value = x == y ? 1 : 0;
			croppedBitmap[y * 28 + x] = value;
		}
	}
	display.drawBitmap(croppedBitmap);
*/
/*
	var data = new Buffer(28);
	data.fill(0x1);
	data[0] = 0x7f;
	display.drawPanel(0, data);
*/
}


var display = new flip.Display();
display.open(function(error){
	if(error){
		console.log('Failed to open display');
	}
	else {
		display.clear(0, function(error){
			if(error){
				console.log('Failed to clear display:' + error)
			}
		});
		setInterval(renderFrame, 100);
	}
});

function cropMono(source, sourceWidth, sourceHeight, destinationWidth, destinationHeight){
	assert(sourceWidth >= destinationWidth);
	assert(sourceHeight >= destinationHeight);

	var result = [];
	var dstIdx = 0;

	for(var srcY = 0; srcY < destinationHeight; srcY++){
		for(var srcX = 0; srcX < destinationWidth; srcX++, dstIdx++){
			result[dstIdx] = source[srcY * sourceWidth + srcX];
		}
	}

	return result;
}

function RGBAtoMono(pixelData) {
	assert(pixelData.length % 4 == 0);
	var result = [];

	for(var p = 0; p < pixelData.length; p += 4){
		var r = pixelData[p];
		var g = pixelData[p + 1];
		var b = pixelData[p + 2];
		//var a = pixelData[p + 3];
		var desaturated = (Math.max(r, g, b) + Math.min(r, g, b)) / 2;
		var mono = desaturated > 128 ? 1 : 0;
		result[p / 4] = mono;
	}

	return result;
}
