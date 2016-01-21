"use strict";

var unirest = require('unirest');
var csvparse = require('csv-parse');
var assert = require('assert');

var code = class {
	constructor(){
		// set up stuff
	}
	onUpdate(callback){
	    //console.log('On update');
	    unirest.get('https://www.dropbox.com/s/286bnft6ahewjc1/number_of_active_user_accounts.csv?dl=1')
	    .end(function(result){
	        csvparse(result.body, {columns: true}, function(err, parsed) {
	            var data = {};
	            for(var stat of parsed){
                    data[stat.user_group] = stat.Count;
	            }
    	        callback(null, data);
	        });
	    });
 	}
};
