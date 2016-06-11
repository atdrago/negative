window.SettingsForm = (function () {
	'use strict';
	
	const { ipcRenderer } = require('electron');

	class SettingsForm {
		constructor() {
			this.checkForUpdatesButton = document.getElementById('checkForUpdates');
			this.checkForUpdatesLabel = document.getElementById('checkForUpdatesLabel');
			this.checkForUpdatesLoadingIndicator = document.getElementById('checkForUpdatesLoadingIndicator');
			this.shouldAutoUpdateCheckbox = document.getElementById('shouldAutoUpdate');
			this.shouldShowTipsCheckbox = document.getElementById('shouldShowTips');

			this.initEventListeners();
			this.initIpcListeners();
		}
		
		initEventListeners() {
			this.shouldAutoUpdateCheckbox.addEventListener('change', (evt) => {
				ipcRenderer.send('set-settings-request', { shouldAutoUpdate: evt.target.checked });
			});

			this.shouldShowTipsCheckbox.addEventListener('change', (evt) => {
				ipcRenderer.send('set-settings-request', { shouldShowTips: evt.target.checked });
			});
			
			this.checkForUpdatesButton.addEventListener('click', (evt) => {
				evt.preventDefault();
				this.checkForUpdates();
			});
		}
		
		initIpcListeners() {
			ipcRenderer.send('get-settings-request');
			ipcRenderer.on('get-settings-response', (evt, settings) => {
				this.shouldShowTipsCheckbox.checked = (settings['shouldShowTips'] !== false);
				this.shouldAutoUpdateCheckbox.checked = (settings['shouldAutoUpdate'] !== false);
			});
		}
		
		showLoadingIndicator() {
			this.checkForUpdatesLoadingIndicator.classList.add('loading-indicator-show');
		}
		
		hideLoadingIndicator() {
			this.checkForUpdatesLoadingIndicator.classList.remove('loading-indicator-show');
		}
		
		checkForUpdates() {
			ipcRenderer.send('check-for-updates-request');
		}
		
		setUpdatesMessage(message) {
			this.checkForUpdatesLabel.textContent = message;
		}
		
		disableUpdatesButton() {
			this.checkForUpdatesButton.disabled = true;
		}
		
		enableUpdatesButton() {
			this.checkForUpdatesButton.disabled = false;
		}
	}
	
	return SettingsForm;
})();
