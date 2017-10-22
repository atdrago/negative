'use strict';

const { Application } = require('spectron');
const { assert } = require('chai');

const config = require('../../../config.json');
const {
	APP_PATH,
	WAIT_UNTIL_TIMEOUT
} = config;

describe('View > Dark Mode', function () {
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

	it('Should toggle dark mode', function () {
		return this.app.client.waitUntilWindowLoaded()
			.then(() => {
				return this.app.client.selectorExecute('//body', (elements) => {
					return elements[0].classList.contains('light-mode');
				});
			})
			.then((hasNoTipsClass) => assert.isFalse(hasNoTipsClass, 'The body element should not have the .light-mode class when on startup.'))
			.then(() => this.app.electron.ipcRenderer.send('test-dark-mode'))
			.then(() => {
				return this.app.client.waitUntil(() => {
					return this.app.client.selectorExecute('//body', (elements) => {
						return elements[0].classList.contains('light-mode');
					});
				}, WAIT_UNTIL_TIMEOUT);
			})
			.then((hasNoTipsClass) => assert.isTrue(hasNoTipsClass, 'The body element should have the .light-mode class when Dark Mode is off.'))
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
