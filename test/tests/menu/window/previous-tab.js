'use strict';

const { Application } = require('spectron');
const { assert } = require('chai');

const APP_PATH = './dist/Negative-darwin-x64/Negative.app/Contents/MacOS/Negative';
const TABS_ID  = '#tabs';

describe('Window > Previous Tab', function () {
	const app = new Application({
		path: APP_PATH,
		env: {
			ELECTRON_ENABLE_LOGGING: true,
			ELECTRON_ENABLE_STACK_DUMPING: true,
			NEGATIVE_IGNORE_WINDOW_SETTINGS: false,
			NEGATIVE_SKIP_RESET_DIALOG: true,
			NEGATIVE_SETTINGS_PATH: '../test/fixtures/window-with-two-tabs.json',
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
	
	it('Should go to previous tab', () => {
		return app.electron.ipcRenderer.send('test-previous-tab')
			.then(() => {
				return app.client.selectorExecute(TABS_ID, (element) => {
					return Array.from(element[0].children).findIndex((child) => child.classList.contains('selected'));
				});
			})
			.then((selectedIndex) => assert.equal(selectedIndex, 1))
			.then(() => app.electron.ipcRenderer.send('test-previous-tab'))
			.then(() => {
				return app.client.selectorExecute(TABS_ID, (element) => {
					return Array.from(element[0].children).findIndex((child) => child.classList.contains('selected'));
				});
			})
			.then((selectedIndex) => assert.equal(selectedIndex, 0))
	});
});
