'use strict';

const { Application } = require('spectron');
const { assert } = require('chai');

const APP_PATH = './dist/Negative-darwin-x64/Negative.app/Contents/MacOS/Negative';

describe('File > Close Window', function () {
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
	
	it('Should close a window', () => {
		// @TODO - This does not actually test that the menu item works, 
		// just that windows close without error
		return app.client.waitUntilWindowLoaded()
			.then(() => app.browserWindow.close())
			.then(() => app.client.getWindowCount())
			.then((count) => assert.equal(count, 1));
	});
});
