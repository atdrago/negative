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
