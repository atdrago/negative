const { ipcRenderer } = require('electron');

class SettingsForm {
	constructor() {
		this.shouldShowTips = document.getElementById('shouldShowTips');

		this.shouldShowTips.addEventListener('change', function (evt) {
			ipcRenderer.send('set-settings-request', { shouldShowTips: evt.target.checked });
		});

		ipcRenderer.send('get-settings-request');
		ipcRenderer.on('get-settings-response', (evt, settings) => {
			this.shouldShowTips.checked = (settings['shouldShowTips'] !== false);
		});
	}
}
