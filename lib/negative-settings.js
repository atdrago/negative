'use strict';

const { app } = require('electron');
const fs      = require('fs');
const path    = require('path');

module.exports = {
	init() {
		this.settingsFilePath = path.join(app.getPath('userData'), 'settings.json');

		fs.readFile(this.settingsFilePath, (err, result) => {
			if (err) {
				this.settings = {}
			} else {
				this.settings = JSON.parse(result);
			}
		});
	},

	get(key) {
		return this.settings[key];
	},

	set(key, value) {
		this.settings[key] = value;
	},

	save() {
		fs.writeFile(this.settingsFilePath, JSON.stringify(this.settings));
	}
}
