'use strict';

const { Application } = require('spectron');
const { assert }      = require('chai');

const config       = require('../../../config.json');
const { APP_PATH } = config;

describe('Negative > Reset...', function () {
	const app = new Application({
		path: APP_PATH,
		env: {
			ELECTRON_ENABLE_LOGGING: true,
			ELECTRON_ENABLE_STACK_DUMPING: true,
			NEGATIVE_IGNORE_SETTINGS: false,
			NEGATIVE_SKIP_RESET_DIALOG: true,
			NEGATIVE_SETTINGS_PATH: '../test/fixtures/two-windows-with-data.json',
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
	
	it('Should reset', () => {
		return app.client.waitUntilWindowLoaded()
			.then(() => app.electron.ipcRenderer.send('test-reset'))
			.then(() => app.client.windowByIndex(0))
			.then(() => app.client.getWindowCount())
			.then((count) => assert.strictEqual(count, 1))
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
