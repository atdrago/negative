'use strict';

const { Application } = require('spectron');

const config    = require('../../../config.json');
const REGEX_PNG = new RegExp(config.REGEX_PNG);
const {
	APP_PATH,
	IMAGE_ID,
	WAIT_UNTIL_TIMEOUT
} = config;

describe.only('Window > Fit Window to Image', function () {
	this.timeout(60000);

	beforeEach(function () {
		this.app = new Application({
			path: APP_PATH,
			env: {
				ELECTRON_ENABLE_LOGGING: true,
				ELECTRON_ENABLE_STACK_DUMPING: true,
				NEGATIVE_IGNORE_SETTINGS: false,
				NEGATIVE_SKIP_RESET_DIALOG: true,
				NEGATIVE_SETTINGS_PATH: '../test/fixtures/one-window-with-data.json',
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

	it('Should fit', function () {
		let origBounds;

		return this.app.client.waitUntilWindowLoaded()
			.then(() => this.app.browserWindow.getBounds())
			.then((bounds) => {
				origBounds = bounds;

				let { width, height } = bounds;

				return this.app.browserWindow.setSize(width + 100, height + 100);
			})
			.then(() => this.app.electron.ipcRenderer.send('test-fit-window-to-image'))
			.then(() => {
				return this.app.client.waitUntil(() => {
					return this.app.browserWindow.getBounds()
						.then((bounds) => {
							return origBounds.width === bounds.width && origBounds.height === bounds.height;
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
