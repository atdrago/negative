'use strict';

const { Application } = require('spectron');
const { assert } = require('chai');

const APP_PATH = './dist/Negative-darwin-x64/Negative.app/Contents/MacOS/Negative';
const TIPS_ID  = '#shouldShowTips';

describe('Negative > Preferences', function () {
	const app = new Application({
		path: APP_PATH,
		env: {
			ELECTRON_ENABLE_LOGGING: true,
			ELECTRON_ENABLE_STACK_DUMPING: true,
			NEGATIVE_IGNORE_SETTINGS: true,
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
	
	it('Should open', () => {
		return app.client.waitUntilWindowLoaded()
			.then(() => app.electron.ipcRenderer.send('test-preferences'))
			.then(() => app.client.getWindowCount())
			.then((count) => assert.strictEqual(count, 2));
	});
	
	it('Should toggle tips', () => {
		// Focus the preferences window with `client.window`
		return app.client.waitUntilWindowLoaded()
			.then(() => app.electron.ipcRenderer.send('test-preferences'))
			.then(() => app.client.windowByIndex(1))
			.then(() => {
				// Get "Show tips" checkbox value
				return app.client.waitUntil(() => {
					return app.client.selectorExecute(TIPS_ID, (elements) => {
						return elements[0].checked;
					});
				});
			})
			// Focus the Negative window
			.then(() => app.client.windowByIndex(0))
			.then(() => {
				// Get the class that is toggled by the "Show tips" checkbox
				return app.client.waitUntil(() => {
					return app.client.selectorExecute('//body', (elements) => {
						return !elements[0].classList.contains('no-tips');
					});
				});
			})
			.then(() => app.client.windowByIndex(1))
			.then(() => app.client.leftClick(TIPS_ID))
			.then(() => app.client.windowByIndex(0))
			.then(() => {
				return app.client.waitUntil(() => {
					return app.client.selectorExecute('//body', (elements) => {
						return elements[0].classList.contains('no-tips');
					});
				});
			})
	});
	
	// @TODO - Close should be tested here, but because it uses
	// `performSelector`, it cannot be properly tested until
	// Spectron supports testing menu item functionality.
	it('Close');
});
