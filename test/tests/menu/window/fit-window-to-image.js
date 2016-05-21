'use strict';

const { Application } = require('spectron');
const { assert } = require('chai');

const APP_PATH = './dist/Negative-darwin-x64/Negative.app/Contents/MacOS/Negative';
const IMAGE_ID = '#negativeImage';
const REGEX_PNG = /^data:image\/png;base64,/;

describe('Window > Fit Window to Image', function () {
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
	
	it('Should fit', () => {
		let origBounds;
		
		return app.browserWindow.getBounds()
			.then((bounds) => {
				origBounds = bounds;
				
				let { width, height } = bounds;
				
				return app.browserWindow.setSize(width + 100, height + 100);
			})
			.then(() => app.electron.ipcRenderer.send('test-fit-window-to-image'))
			.then(() => app.browserWindow.getBounds())
			.then((bounds) => {
				assert.strictEqual(origBounds.width, bounds.width);
				assert.strictEqual(origBounds.height, bounds.height);
			});
	});
});