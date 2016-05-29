'use strict';

const { Application } = require('spectron');

const config    = require('../../../config.json');
const REGEX_PNG = new RegExp(config.REGEX_PNG);
const { 
	APP_PATH,
	WAIT_UNTIL_TIMEOUT
} = config;

describe('Window > Next Tab And Resize', function () {
	const app = new Application({
		path: APP_PATH,
		env: {
			ELECTRON_ENABLE_LOGGING: true,
			ELECTRON_ENABLE_STACK_DUMPING: true,
			NEGATIVE_IGNORE_SETTINGS: false,
			NEGATIVE_SKIP_RESET_DIALOG: true,
			NEGATIVE_SETTINGS_PATH: '../test/fixtures/window-with-two-tabs-of-different-sizes.json',
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
	
	it('Should go to next tab and resize', () => {
		let firstTabBounds;
		
		return app.client.waitUntilWindowLoaded()
			.then(() => app.browserWindow.getBounds())
			.then((bounds) => {
				firstTabBounds = bounds;
				
				return app.electron.ipcRenderer.send('test-next-tab-and-resize');
			})
			.then(() => {
				return app.client.waitUntil(() => {
					return app.browserWindow.getBounds()
						.then((bounds) => {
							return firstTabBounds.width !== bounds.width && firstTabBounds.height !== bounds.height;
						});
				}, WAIT_UNTIL_TIMEOUT);
			})
			.then(() => app.electron.ipcRenderer.send('test-next-tab-and-resize'))
			.then(() => {
				return app.client.waitUntil(() => {
					return app.browserWindow.getBounds()
						.then((bounds) => {
							return firstTabBounds.width === bounds.width && firstTabBounds.height === bounds.height;
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
