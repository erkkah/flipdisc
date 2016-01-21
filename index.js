/*
	Client main js script
 */

// Fill in to get ES6:ish environment
require('babel-polyfill');

// Riot + tags
var riot = require('riot');
var liveview = require('./tags/liveview.tag');
var modeselector = require('./tags/modeselector.tag');
var modeeditor = require('./tags/modeeditor.tag');
var scripteditor = require('./tags/scripteditor.tag');
var setup = require('./tags/setup.tag');

// Get socket from the window global
var socket = window.socket;

// Mount all tags..

riot.mount('liveview, modeselector, modeeditor, setup', socket);

riot.mount('#dsp-scripteditor', {
	"socket": socket,
	"title": "Display scripts",
	"events": {
		"update": "scriptschanged",
		"set": "setscript",
		"delete": "deletescript"
	},
	"template": 
`"use strict";

var code = class {
	onSetup(configuration, dataSource){
		// set properties of this animation script
		// pull data from data source
		// set up animation
	}

	onFrame(oldFrame, timePassedInSeconds, frameCallback){
		// calculate one frame of animation
		// ...
		// call frameCallback with updated frame data and ms to next callback
		// Providing no callback time ends the script.
		//
		// frameCallback(updatedFrame, 1000);
	}
};
`
});

riot.mount('#data-scripteditor', {
	"socket": socket,
	"title": "Data scripts",
	"events": {
		"update": "datascriptschanged",
		"set": "setdatascript",
		"delete": "deletedatascript",
		"result": "data"
	},
	"template":
`"use strict";

var code = class { 
	constructor(){
		// set up stuff
	}
	onUpdate(){
		// get fresh data
		// ...
		// return data object
	}
};
`
});
