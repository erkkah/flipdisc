"use strict"
const assert = require('assert');
const util = require('util');
const EventEmitter = require('events');

/**
 * Central state of the flip disc controller.
 * Stores modes, data fetchers and display scripts.
 * Storage is backed by a [diskdb](https://www.npmjs.com/package/diskdb) db instance.
 *
 * Implements a <code>EventEmitter</code> to notify clients on changes.
 */
class State extends EventEmitter{
	/**
	 * @param db {diskdb}
	 */
	constructor(db) {
		super();

		assert(db);
		this.db = db;

		this.db.loadCollections(['config', 'modes', 'dataFetchers', 'displayScripts'])
	}

	/**
	 * @returns - current configuration
	 */
	getConfig() {
		var config = this.db.config.findOne();
		console.log('Found config:', config);
		return config || {};
	}

	/**
	 * Updates the global config object.
	 * Emits ('configchanged', config) on successful update.
	 *
	 * @param config {object} - Global configuration object
	 */
	setConfig(config) {
		assert(config);
		assert(config.selectedMode);

		var options = {
			multi: false,
			upsert: true
		}

		var query = {
			_id: config._id || ''
		}

		var data = config;

		var updated = this.db.config.update(query, data, options);
		console.log("Updated configuration: ", updated);

		this.emit('configchanged', this.getConfig());
	}

	/**
	 * Gets the current list of display mode objects.
	 * Display objects have the following structure:
	 * ```
	 * {
	 *   _id: "object id",
	 *   name: "Mode name",
	 *   description: "Mode description",
	 *   scripts: [
	 *     {
	 *       scriptID: "1009123098120398123098",
	 *		 config: {}
	 *     }
	 *   ]
	 * }
	 * ```
	 * @returns - array of mode objects
	 */
	getModes() {
		var modes = this.db.modes.find();
		return modes;
	}

	// internal
	// Verifies an array of mode script declarations
	verifyScripts(scripts){
		assert(scripts instanceof Array, "Script list is an array");

		for(var it in scripts){
			var script = scripts[it];
			assert.notEqual(script.scriptID, "", "Has script Id");
			assert.notEqual(script.config, "", "Has config");
			assert(this.findScriptById(script.scriptID), "Has valid script ID");
		}

		return true;
	}

	/**
	 * Adds or updates a mode.
	 * Objects with _id field set updates existing objects.
	 * Scripts referred to must be valid (exist in the state db).
	 *
	 * Triggers the 'modeschanged' event.
	 * @param mode {Object}
	 */
	setMode(mode) {
		assert(mode.name, "Has non-empty name field");
		assert.notEqual(mode.description, undefined, "Has description field");
		assert.notEqual(mode.scripts, undefined, "Has scripts field");
		assert(this.verifyScripts(mode.scripts), "Script list checks out");

		var options = {
			multi: false,
			upsert: true
		}

		var query = {
			_id: mode._id || ''
		}

		var data = mode;

		var updated = this.db.modes.update(query, data, options);

		this.emit('modeschanged', this.getModes());
	}

	/**
	 * Deletes mode with given <code>_id</code> field.
	 * The <code>_id</code> field is required. All other fields are ignored.
	 * @param mode {Object}
	 */
	deleteMode(mode) {
		assert(mode);
		assert(mode._id, "Mode object must have _id field");

		var id = mode._id;
		var query = {
			_id: id
		}
		var multi = false;
		this.db.modes.remove(query, multi);

		this.emit('modeschanged', this.getModes());
	}


	getDataFetchers() {

	}

	setDataFetcher() {

	}

	deleteDataFetcher() {

	}

	/**
	 * @returns - array of script objects
	 */
	getDisplayScripts() {
		var scripts = this.db.displayScripts.find();
		return scripts;
	}

	findScriptById(id) {
		var query = {_id: id};
		var script = this.db.displayScripts.findOne(query);
		return script;
	}

	/**
	 * Adds or updates a display script.
	 * Objects with _id field set updates existing objects.
	 * Triggers the 'scriptschanged' event.
	 * @param script {Object}
	 */
	setDisplayScript(script) {
		assert(script.name, "Has non-empty name field");
		assert(script.code, "Has non-empty code field");

		var options = {
			multi: false,
			upsert: true
		}

		var query = {
			_id: script._id || ''
		}

		var data = script;

		var updated = this.db.displayScripts.update(query, data, options);

		this.emit('scriptschanged', this.getDisplayScripts());
	}

	/**
	 * Deletes display script with given <code>_id</code> field.
	 * The <code>_id</code> field is required. All other fields are ignored.
	 * @param script {Object}
	 */
	deleteDisplayScript(script) {
		assert(script);
		assert(script._id, "Script object must have _id field");

		var id = script._id;
		var query = {
			_id: id
		}
		var multi = false;
		this.db.displayScripts.remove(query, multi);

		this.emit('scriptschanged', this.getDisplayScripts());
	}
}

module.exports = State;
