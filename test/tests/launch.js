'use strict';

const { Application } = require('spectron');
const { assert } = require('chai');

const APP_PATH  = './dist/Negative-darwin-x64/Negative.app/Contents/MacOS/Negative';

describe('Launch', function () {
	const app = new Application({
		path: APP_PATH,
		env: {
			ELECTRON_ENABLE_LOGGING: true,
			ELECTRON_ENABLE_STACK_DUMPING: true,
			NEGATIVE_IGNORE_WINDOW_SETTINGS: true,
			NEGATIVE_SKIP_RESET_DIALOG: true,
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
	
	it('Shows a window', () => {
		return app.client.waitUntilWindowLoaded()
			.then(() => app.client.getWindowCount())
			.then((count) => assert.isAtLeast(count, 1))
			.then(() => {
				return app.client.selectorExecute('//body', (elements) => {
					return elements[0].classList;
				})
			})
			.then((classList) => {
				assert.isFalse(classList.includes('blur'));
				assert.isTrue(classList.includes('focus'));
				assert.isTrue(classList.includes('primary'));
			});
			
	});
});
