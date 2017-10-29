'use strict';

const { Application } = require('spectron');
const { assert }      = require('chai');

const config = require('../../../config.json');
const {
	APP_PATH,
	TABS_ID
} = config;

describe('Window > Previous Tab', function () {
	this.timeout(60000);

	beforeEach(function () {
		this.app = new Application({
			path: APP_PATH,
			env: {
				ELECTRON_ENABLE_LOGGING: true,
				ELECTRON_ENABLE_STACK_DUMPING: true,
				NEGATIVE_IGNORE_SETTINGS: false,
				NEGATIVE_SKIP_RESET_DIALOG: true,
				NEGATIVE_SETTINGS_PATH: '../test/fixtures/window-with-two-tabs.json',
				NEGATIVE_VERBOSE: true,
				NODE_ENV: 'development'
			}
		});

		return this.app.start();
	});

	afterEach(function () {
		if (this.app && this.app.isRunning()) {
			return this.app.stop();
		}
	});

	it('Should go to previous tab', function () {
		return this.app.client.waitUntilWindowLoaded()
			.then(() => this.app.electron.ipcRenderer.send('test-previous-tab'))
			.then(() => {
				return this.app.client.selectorExecute(TABS_ID, (element) => {
					return Array.from(element[0].children).findIndex((child) => child.classList.contains('selected'));
				});
			})
			.then((selectedIndex) => assert.equal(selectedIndex, 1))
			.then(() => this.app.electron.ipcRenderer.send('test-previous-tab'))
			.then(() => {
				return this.app.client.selectorExecute(TABS_ID, (element) => {
					return Array.from(element[0].children).findIndex((child) => child.classList.contains('selected'));
				});
			})
			.then((selectedIndex) => assert.equal(selectedIndex, 0))
			.catch((err) => {
				return this.app.client.getMainProcessLogs()
					.then((logs) => {
						console.log('*** MAIN PROCESS LOGS ***');
						logs.forEach((log) => console.log(log));

						return this.app.client.getRenderProcessLogs();
					})
					.then((logs) => {
						console.log('*** RENDER PROCESS LOGS ***');
						logs.forEach((log) => console.log(log));

						throw err;
					});
			});
	});
});
