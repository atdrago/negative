'use strict';

const { Application } = require('spectron');
const { assert } = require('chai');

const APP_PATH = './dist/Negative-darwin-x64/Negative.app/Contents/MacOS/Negative';
const IMAGE_ID = '#negativeImage';
const REGEX_PNG = /^data:image\/png;base64,/;

describe('Edit > Redo', function () {
	const app = new Application({
		path: APP_PATH,
		env: {
			ELECTRON_ENABLE_LOGGING: true,
			ELECTRON_ENABLE_STACK_DUMPING: true,
			NEGATIVE_IGNORE_WINDOW_SETTINGS: false,
			NEGATIVE_SKIP_RESET_DIALOG: true,
			NEGATIVE_SETTINGS_PATH: '../test/fixtures/two-windows-with-data-after-undo.json',
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
	
	it('Should redo', () => {
		return app.client.waitUntilWindowLoaded()
			.then(() => app.electron.ipcRenderer.send('test-redo'))
			.then(() => {
				return app.client.selectorExecute(IMAGE_ID, (element) => element[0].getAttribute('src'));
			})
			.then((src) => assert.isTrue(REGEX_PNG.test(src)));
	});
});
