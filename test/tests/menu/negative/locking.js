'use strict';

const { Application } = require('spectron');
const { assert }      = require('chai');

const config = require('../../../config.json');
const {
	APP_PATH,
	TIPS_ID,
	WAIT_UNTIL_TIMEOUT
} = config;

describe('Negative > Lock Negative', function () {
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

	it('Should lock and unlock', function () {
		// Focus the preferences window with `client.window`
		return this.app.client.waitUntilWindowLoaded()
			.then(() => this.app.electron.ipcRenderer.send('test-locking'))
			.then(() => {
				// Get the class that is toggled by the "Show tips" checkbox
				return this.app.client.waitUntil(() => {
					return this.app.client.selectorExecute('//body', (elements) => {
						return elements[0].classList.contains('locked');
					});
				}, WAIT_UNTIL_TIMEOUT);
			})
			.then(() => this.app.electron.ipcRenderer.send('test-locking'))
			.then(() => {
				return this.app.client.waitUntil(() => {
					return this.app.client.selectorExecute('//body', (elements) => {
						return !elements[0].classList.contains('locked');
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
});
