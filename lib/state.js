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
		//EventEmitter.call(this);

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
	 * @returns - array of mode objects
	 */
	getModes() {
		var modes = this.db.modes.find();
		return modes;
	}

	/**
	 * Adds or updates a mode.
	 * Objects with _id field set updates existing objects.
	 * Triggers the 'modeschanged'
	 * @param mode {Object}
	 */
	setMode(mode) {
		assert(mode.name, "Has non-empty name field");
		assert.notEqual(mode.description, undefined, "Has description field");
		assert.notEqual(mode.scripts, undefined, "Has scripts field");
		assert(mode.scripts instanceof Array);

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


	getDisplayScripts() {

	}

	setDisplayScript() {

	}

	deleteDisplayScript() {

	}
}

//util.inherits(State, EventEmitter);
module.exports = State;
