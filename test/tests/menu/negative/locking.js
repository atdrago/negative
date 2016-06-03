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
	
	it('Should lock and unlock', () => {
		// Focus the preferences window with `client.window`
		return app.client.waitUntilWindowLoaded()
			.then(() => app.electron.ipcRenderer.send('test-locking'))
			.then(() => {
				// Get the class that is toggled by the "Show tips" checkbox
				return app.client.waitUntil(() => {
					return app.client.selectorExecute('//body', (elements) => {
						return elements[0].classList.contains('locked');
					});
				}, WAIT_UNTIL_TIMEOUT);
			})
			.then(() => app.electron.ipcRenderer.send('test-locking'))
			.then(() => {
				return app.client.waitUntil(() => {
					return app.client.selectorExecute('//body', (elements) => {
						return !elements[0].classList.contains('locked');
					});
				}, WAIT_UNTIL_TIMEOUT);
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
