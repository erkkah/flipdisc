/*
	Client main js script
 */

require('babel-polyfill');

// Export arraypacker as a window global
window.arraypacker = require('./lib/arraypacker');

var riot = require('riot');
var liveview = require('./tags/liveview.tag');
var modeselector = require('./tags/modeselector.tag');
var modeeditor = require('./tags/modeeditor.tag');
var scripteditor = require('./tags/scripteditor.tag');
var setup = require('./tags/setup.tag');

var socket = window.socket;

riot.mount('liveview, modeselector, modeeditor, setup', socket);

var scriptEditor = riot.mount('#dsp-scripteditor', {
	"socket": socket,
	"title": "Display scripts",
	"events": {
		"update": "scriptschanged",
		"set": "setscript",
		"delete": "deletescript"
	},
	"template": '"use strict";\nvar code = class {\n' + 
	'	onSetup(configuration, dataSource){\n' +
	'		// set properties of this animation script\n' +
		'		// pull data from data source\n' +
		'		// set up animation\n' +
		'	}\n' +
		'	onFrame(oldFrame, timePassedInSeconds, frameCallback){\n' +
	'		// calculate one frame of animation\n' +
	'		// ...\n' +
	'		// call frameCallback with updated frame data and ms to next callback\n' +
	'		// Providing no callback time ends the script.\n' +
	'		//\n' +
	'		// frameCallback(updatedFrame, 1000);\n' +
	' 	}\n' +
	'};\n'
});

var dataEditor = riot.mount('#data-scripteditor', {
	"socket": socket,
	"title": "Data scripts",
	"events": {
		"update": "datascriptschanged",
		"set": "setdatascript",
		"delete": "deletedatascript",
		"result": "data"
	},
	"template": '"use strict";\nvar code = class {\n' + 
	'	constructor(){\n' +
	'		// set up stuff\n' +
		'	}\n' +
		'	onUpdate(){\n' +
	'		// get fresh data\n' +
	'		// ...\n' +
	'		// return data object\n' +
	' 	}\n' +
	'};\n'
});
