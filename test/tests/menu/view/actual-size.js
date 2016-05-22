'use strict';

const { Application } = require('spectron');
const { assert } = require('chai');

const APP_PATH = './dist/Negative-darwin-x64/Negative.app/Contents/MacOS/Negative';
const IMAGE_ID = '#negativeImage';

describe('View > Actual Size', function () {
	const app = new Application({
		path: APP_PATH,
		env: {
			ELECTRON_ENABLE_LOGGING: true,
			ELECTRON_ENABLE_STACK_DUMPING: true,
			NEGATIVE_IGNORE_WINDOW_SETTINGS: false,
			NEGATIVE_SKIP_RESET_DIALOG: true,
			NEGATIVE_SETTINGS_PATH: '../test/fixtures/two-windows-with-data.json',
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
	
	it('Should zoom to 0', () => {
		// @TODO - Load settings file for actual size. Blocked by #96.
		return app.client.waitUntilWindowLoaded()
			.then(() => app.electron.ipcRenderer.send('test-zoom-in'))
			.then(() => app.electron.ipcRenderer.send('test-actual-size'))
			.then(() => {
				return app.client.selectorExecute(IMAGE_ID, (element) => {
					const zoomLevel = element[0].getAttribute('data-zoom-level');
					
					return zoomLevel;
				});
			})
			.then((zoomLevel) => assert.equal(zoomLevel, 1));
	});
});
