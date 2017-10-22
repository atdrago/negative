'use strict';

const { Application } = require('spectron');
const { assert } = require('chai');

const config       = require('../config.json');
const { APP_PATH } = config;

describe('Launch', function () {
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

	it('Shows a window', function () {
		return this.app.client.waitUntilWindowLoaded()
			.then(() => this.app.client.getWindowCount())
			.then((count) => assert.isAtLeast(count, 1))
			.then(() => {
				return this.app.client.selectorExecute('//body', (elements) => {
					return elements[0].classList;
				})
			})
			.then((classList) => {
				assert.isFalse(classList.includes('blur'));
				assert.isTrue(classList.includes('focus'));
				assert.isTrue(classList.includes('primary'));
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
