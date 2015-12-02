(function (window, document, JSON) { 

'use strict';

let ipc = require('electron').ipcRenderer;

class SettingsForm {
    constructor() {
        this.shouldShowTips = document.getElementById('shouldShowTips');

        this.shouldShowTips.addEventListener('change', function (evt) {
            ipc.send('set-settings-request', { shouldShowTips: evt.target.checked });
        });

        ipc.send('get-settings-request');
        ipc.on('get-settings-response', function (evt, settings) {
            this.shouldShowTips.checked = (settings['shouldShowTips'] !== false);
        }.bind(this));
    }
}

document.addEventListener('DOMContentLoaded', function () {

    let settingsForm = new SettingsForm();

	let noop = function (evt) { evt.preventDefault(); return false; };

	document.body.addEventListener('dragend', 	noop, false);
	document.body.addEventListener('dragleave', noop, false);
	document.body.addEventListener('dragover', 	noop, false);
	document.body.addEventListener('dragstart', noop, false);
	document.body.addEventListener('drop', 		noop, false);

});

})(window, document, JSON);