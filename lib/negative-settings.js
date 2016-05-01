'use strict';

const { app } = require('electron');
const fs      = require('fs');
const path    = require('path');

module.exports = {
	init(callback) {
		this.settingsFilePath = path.join(app.getPath('userData'), 'settings.json');
		
		fs.readFile(this.settingsFilePath, (err, result) => {
			if (err) {
				this.settings = {};
			} else {
				try {
					this.settings = JSON.parse(result);
				} catch (e) {
					process.stderr.write(e);
					this.settings = {};
				}
			}
			
			callback();
		});
	},

	get(key) {
		return this.settings[key];
	},

	set(key, value) {
		this.settings[key] = value;
	},

	save(callback) {
		fs.writeFile(this.settingsFilePath, JSON.stringify(this.settings), callback);
	}
};
