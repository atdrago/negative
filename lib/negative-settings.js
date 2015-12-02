'use strict';

let app = require('app'),
    fs = require('fs'),
    path = require('path');

module.exports = {
    init() {
        this.settingsFilePath = path.join(app.getPath('userData'), 'settings.json');

        fs.readFile(this.settingsFilePath, function (err, result) {
            if (err) {
                this.settings = {}
            } else {
                this.settings = JSON.parse(result);
            }
        }.bind(this));
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
