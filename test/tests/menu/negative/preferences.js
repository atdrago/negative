'use strict';

const { Application } = require('spectron');
const { assert }      = require('chai');

const config = require('../../../config.json');
const {
	APP_PATH,
	TIPS_ID,
	WAIT_UNTIL_TIMEOUT
} = config;

describe('Negative > Preferences', function () {
	this.timeout(60000);

	beforeEach(function () {
		this.app = new Application({
			path: APP_PATH,
			env: {
				ELECTRON_ENABLE_LOGGING: true,
				ELECTRON_ENABLE_STACK_DUMPING: true,
				NEGATIVE_IGNORE_SETTINGS: true,
				NEGATIVE_SKIP_RESET_DIALOG: true,
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

	it('Should open', function () {
		return this.app.client.waitUntilWindowLoaded()
			.then(() => this.app.electron.ipcRenderer.send('test-preferences'))
			.then(() => this.app.client.getWindowCount())
			.then((count) => assert.strictEqual(count, 2))
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
			})

	});

	it('Should toggle tips', function () {
		// Focus the preferences window with `client.window`
		return this.app.client.waitUntilWindowLoaded()
			.then(() => this.app.electron.ipcRenderer.send('test-preferences'))
			.then(() => this.app.client.windowByIndex(1))
			.then(() => {
				// Get "Show tips" checkbox value
				return this.app.client.waitUntil(() => {
					return this.app.client.selectorExecute(TIPS_ID, (elements) => {
						return elements[0].checked;
					});
				}, WAIT_UNTIL_TIMEOUT);
			})
			// Focus the Negative window
			.then(() => this.app.client.windowByIndex(0))
			.then(() => {
				// Get the class that is toggled by the "Show tips" checkbox
				return this.app.client.waitUntil(() => {
					return this.app.client.selectorExecute('//body', (elements) => {
						return !elements[0].classList.contains('no-tips');
					});
				}, WAIT_UNTIL_TIMEOUT);
			})
			.then(() => this.app.client.windowByIndex(1))
			.then(() => this.app.client.leftClick(TIPS_ID))
			.then(() => this.app.client.windowByIndex(0))
			.then(() => {
				return this.app.client.waitUntil(() => {
					return this.app.client.selectorExecute('//body', (elements) => {
						return elements[0].classList.contains('no-tips');
					});
				}, WAIT_UNTIL_TIMEOUT);
			})
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

	// @TODO - Close should be tested here, but because it uses
	// `performSelector`, it cannot be properly tested until
	// Spectron supports testing menu item functionality.
	it('Close');
});
