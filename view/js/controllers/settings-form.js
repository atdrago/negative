let ipc = require('electron').ipcRenderer;

class SettingsForm {
    constructor() {
        this.shouldShowTips = document.getElementById('shouldShowTips');

        this.shouldShowTips.addEventListener('change', function (evt) {
            ipc.send('set-settings-request', { shouldShowTips: evt.target.checked });
        });

        ipc.send('get-settings-request');
        ipc.on('get-settings-response', function (evt, settings) {
            for (let key in settings) {
                if (settings.hasOwnProperty(key)) {
                    switch (key) {
                        case 'shouldShowTips':
                            this.shouldShowTips.checked = settings[key];
                            break;
                    }
                }
            }
        }.bind(this));
    }
}
