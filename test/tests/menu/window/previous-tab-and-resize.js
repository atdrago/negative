'use strict';

const { Application } = require('spectron');

const config    = require('../../../config.json');
const {
	APP_PATH,
	WAIT_UNTIL_TIMEOUT
} = config;

describe('Window > Previous Tab And Resize', function () {
	this.timeout(60000);

	beforeEach(function () {
		this.app = new Application({
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

		return this.app.start();
	});

	afterEach(function () {
		if (this.app && this.app.isRunning()) {
			return this.app.stop();
		}
	});

	it('Should go to previous tab and resize', function () {
		let firstTabBounds;

		return this.app.client.waitUntilWindowLoaded()
			.then(() => this.app.browserWindow.getBounds())
			.then((bounds) => {
				firstTabBounds = bounds;

				return this.app.electron.ipcRenderer.send('test-previous-tab-and-resize');
			})
			.then(() => {
				return this.app.client.waitUntil(() => {
					return this.app.browserWindow.getBounds()
						.then((bounds) => {
							return firstTabBounds.width !== bounds.width && firstTabBounds.height !== bounds.height;
						});
				}, WAIT_UNTIL_TIMEOUT);
			})
			.then(() => this.app.electron.ipcRenderer.send('test-previous-tab-and-resize'))
			.then(() => {
				return this.app.client.waitUntil(() => {
					return this.app.browserWindow.getBounds()
						.then((bounds) => {
							return firstTabBounds.width === bounds.width && firstTabBounds.height === bounds.height;
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
