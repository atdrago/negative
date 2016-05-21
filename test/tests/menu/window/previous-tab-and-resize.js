'use strict';

const { Application } = require('spectron');
const { assert } = require('chai');

const APP_PATH = './dist/Negative-darwin-x64/Negative.app/Contents/MacOS/Negative';

describe('Window > Previous Tab And Resize', function () {
	const app = new Application({
		path: APP_PATH,
		env: {
			ELECTRON_ENABLE_LOGGING: true,
			ELECTRON_ENABLE_STACK_DUMPING: true,
			NEGATIVE_IGNORE_WINDOW_SETTINGS: false,
			NEGATIVE_SKIP_RESET_DIALOG: true,
			NEGATIVE_SETTINGS_PATH: '../test/fixtures/window-with-two-tabs-of-different-sizes.json',
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
	
	it('Should go to previous tab and resize', () => {
		let firstTabBounds, secondTabBounds;
		
		return app.browserWindow.getBounds()
			.then((bounds) => {
				firstTabBounds = bounds;
				
				return app.electron.ipcRenderer.send('test-previous-tab-and-resize');
			})
			.then(() => app.browserWindow.getBounds())
			.then((bounds) => {
				secondTabBounds = bounds;
				
				assert.notStrictEqual(firstTabBounds.width, secondTabBounds.width);
				assert.notStrictEqual(firstTabBounds.height, secondTabBounds.height);
				
				return app.electron.ipcRenderer.send('test-previous-tab-and-resize');
			})
			.then(() => app.browserWindow.getBounds())
			.then((bounds) => {
				assert.strictEqual(firstTabBounds.width, bounds.width);
				assert.strictEqual(firstTabBounds.height, bounds.height);
			});
	});
});
