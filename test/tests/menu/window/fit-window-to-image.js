'use strict';

const { Application } = require('spectron');

const config    = require('../../../config.json');
const REGEX_PNG = new RegExp(config.REGEX_PNG);
const { 
	APP_PATH,
	IMAGE_ID,
	WAIT_UNTIL_TIMEOUT
} = config;

describe('Window > Fit Window to Image', function () {
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
	
	it('Should fit', () => {
		let origBounds;
		
		return app.client.waitUntilWindowLoaded()
			.then(() => app.browserWindow.getBounds())
			.then((bounds) => {
				origBounds = bounds;
				
				let { width, height } = bounds;
				
				return app.browserWindow.setSize(width + 100, height + 100);
			})
			.then(() => app.electron.ipcRenderer.send('test-fit-window-to-image'))
			.then(() => {
				return app.client.waitUntil(() => {
					return app.browserWindow.getBounds()
						.then((bounds) => {
							return origBounds.width === bounds.width && origBounds.height === bounds.height;
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
