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
	
	it('Should open', () => {
		return app.electron.ipcRenderer.send('test-preferences')
			.then(() => app.client.getWindowCount())
			.then((count) => assert.strictEqual(count, 2));
	});
	
	it('Should toggle tips', () => {
		let windowHandles, originalIsChecked;
		
		// Focus the preferences window with `client.window`
		return app.electron.ipcRenderer.send('test-preferences')
			.then(() => app.client.windowHandles())
			.then((handles) => {
				windowHandles = handles.value;
				app.client.window(windowHandles[1])
			})
			.then(() => {
				return app.client.selectorExecute(TIPS_ID, (elements) => {
					return elements[0].checked;
				});
			})
			.then((isChecked) => {
				originalIsChecked = isChecked;
				
				if (!isChecked) {
					return app.client.leftClick(TIPS_ID);
				}
			})
			.then(() => app.client.window(windowHandles[0]))
			.then(() => {
				return app.client.selectorExecute('//body', (elements) => {
					return elements[0].classList.contains('no-tips');
				})
			})
			.then((hasNoTipsClass) => assert.isFalse(hasNoTipsClass))
			.then(() => app.client.window(windowHandles[1]))
			.then(() => app.client.leftClick(TIPS_ID))
			.then(() => app.client.window(windowHandles[0]))
			.then(() => {
				return app.client.selectorExecute('//body', (elements) => {
					return elements[0].classList.contains('no-tips');
				})
			})
			.then((hasNoTipsClass) => assert.isTrue(hasNoTipsClass));
	});
	
	// @TODO - Close should be tested here, but because it uses
	// `performSelector`, it cannot be properly tested until
	// Spectron supports testing menu item functionality.
	it('Close');
});