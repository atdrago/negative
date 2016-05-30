'use strict';

const { Application } = require('spectron');
const { assert }      = require('chai');

const config       = require('../config.json');
const { APP_PATH } = config;

describe('Launch', function () {
	const app = new Application({
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
	
	this.timeout(60000);
	
	beforeEach(() => {
		return app.start();
	});

	afterEach(() => {
		if (app && app.isRunning()) {
			return app.stop();
		}
	});
	
	it('Shows a window', () => {
		return app.client.waitUntilWindowLoaded()
			.then(() => app.client.getWindowCount())
			.then((count) => assert.isAtLeast(count, 1))
			.then(() => {
				return app.client.selectorExecute('//body', (elements) => {
					return elements[0].classList;
				})
			})
			.then((classList) => {
				assert.isFalse(classList.includes('blur'));
				assert.isTrue(classList.includes('focus'));
				assert.isTrue(classList.includes('primary'));
			})
			.catch((err) => {
				return app.client.getMainProcessLogs()
					.then((logs) => {
						console.log('*** MAIN PROCESS LOGS ***');
						logs.forEach((log) => console.log(log));
						
						return app.client.getRenderProcessLogs();
					})
					.then((logs) => {
						console.log('*** RENDER PROCESS LOGS ***');
						logs.forEach((log) => console.log(log));
						
						throw err;
					});
			});
	});
});
