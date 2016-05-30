'use strict';

const { Application } = require('spectron');
const { assert } = require('chai');

const config = require('../../../config.json');
const { 
	APP_PATH,
	WAIT_UNTIL_TIMEOUT
} = config;

describe('View > Dark Mode', function () {
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
	
	it('Should toggle dark mode', () => {
		return app.client.waitUntilWindowLoaded()
			.then(() => {
				return app.client.selectorExecute('//body', (elements) => {
					return elements[0].classList.contains('light-mode');
				});
			})
			.then((hasNoTipsClass) => assert.isFalse(hasNoTipsClass, 'The body element should not have the .light-mode class when on startup.'))
			.then(() => app.electron.ipcRenderer.send('test-dark-mode'))
			.then(() => {
				return app.client.waitUntil(() => {
					return app.client.selectorExecute('//body', (elements) => {
						return elements[0].classList.contains('light-mode');
					});
				}, WAIT_UNTIL_TIMEOUT);
			})
			.then((hasNoTipsClass) => assert.isTrue(hasNoTipsClass, 'The body element should have the .light-mode class Dark Mode is off.'))
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
