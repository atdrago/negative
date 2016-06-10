'use strict';

const { app } = require('electron');
const fs      = require('fs');
const path    = require('path');

const { 
	NEGATIVE_IGNORE_SETTINGS,
	NEGATIVE_SETTINGS_PATH 
} = process.env;

module.exports = {
	init(callback) {
		const testSettingsFilePath = NEGATIVE_SETTINGS_PATH && path.resolve(__dirname, NEGATIVE_SETTINGS_PATH);
		
		this.settingsFilePath = path.join(app.getPath('userData'), 'settings.json');
		
		fs.readFile(testSettingsFilePath || this.settingsFilePath, (err, result) => {
			if (err || NEGATIVE_IGNORE_SETTINGS === 'true') {
				this.settings = {};
			} else {
				try {
					this.settings = JSON.parse(result);
				} catch (e) {
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
