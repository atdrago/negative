window.SettingsForm = (function () {
	'use strict';
	
	const { 
		ipcRenderer,
		shell
	} = require('electron');

	class SettingsForm {
		constructor() {
			this.checkForUpdatesButton = document.getElementById('checkForUpdates');
			this.checkForUpdatesLabel = document.getElementById('checkForUpdatesLabel');
			this.checkForUpdatesLink = document.getElementById('checkForUpdatesLink');
			this.checkForUpdatesLoadingIndicator = document.getElementById('checkForUpdatesLoadingIndicator');
			this.shouldAutoUpdateCheckbox = document.getElementById('shouldAutoUpdate');
			this.shouldShowTipsCheckbox = document.getElementById('shouldShowTips');
			this.restartAndInstallButton = document.getElementById('restartAndInstall');

			this.initEventListeners();
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
			
			this.checkForUpdatesLink.addEventListener('click', (evt) => {
				evt.preventDefault();
				shell.openExternal(evt.target.href);
			});
			
			this.restartAndInstallButton.addEventListener('click', (evt) => {
				evt.preventDefault();
				this.restartAndInstall();
			});
		}
		
		handleUpdateError(errorMessage) {
			this.enableUpdatesButton();
			this.hideLoadingIndicator();
			this.setUpdatesMessage(errorMessage);
		}
		
		handleCheckingForUpdate() {
			this.disableUpdatesButton();
			this.showLoadingIndicator();
			this.setUpdatesMessage('Checking for update...');
		}
		
		handleUpdateAvailable() {
			this.disableUpdatesButton();
			this.showLoadingIndicator();
			this.setUpdatesMessage('Downloading update...');
		}
		
		handleUpdateNotAvailable() {
			this.enableUpdatesButton();
			this.hideLoadingIndicator();
			this.setUpdatesMessage('Already up to date.');
		}
		
		handleUpdateDownloaded(releaseMessage, releaseNotesUrl) {
			this.enableUpdatesButton();
			this.hideUpdatesButton();
			this.hideLoadingIndicator();
			this.showRestartAndInstallButton();
			this.setUpdatesMessage(releaseMessage);
			this.setUpdatesLink(releaseNotesUrl, 'Release Notes');
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
		
		setUpdatesLink(url, message) {
			this.checkForUpdatesLink.href = url;
			this.checkForUpdatesLink.textContent = message;
		}
		
		disableUpdatesButton() {
			this.checkForUpdatesButton.disabled = true;
		}
		
		enableUpdatesButton() {
			this.checkForUpdatesButton.disabled = false;
		}
		
		hideUpdatesButton() {
			this.checkForUpdatesButton.classList.add('hide');
		}
		
		showUpdatesButton() {
			this.checkForUpdatesButton.classList.remove('hide');
		}
		
		restartAndInstall() {
			ipcRenderer.send('restart-and-install-request');
		}
		
		hideRestartAndInstallButton() {
			this.restartAndInstallButton.classList.add('hide');
		}
		
		showRestartAndInstallButton() {
			this.restartAndInstallButton.classList.remove('hide');
		}
	}
	
	return SettingsForm;
})();
