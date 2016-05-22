'use strict';

const { Application } = require('spectron');
const { assert } = require('chai');

const APP_PATH = './dist/Negative-darwin-x64/Negative.app/Contents/MacOS/Negative';
const IMAGE_ID = '#negativeImage';
const REGEX_PNG = /^data:image\/png;base64,/;

describe('View > Capture', function () {
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
	
	it('Should capture', () => {
		return app.client.waitUntilWindowLoaded()
			.then(() => app.electron.ipcRenderer.send('test-capture'))
			.then(() => {
				return app.client.selectorExecute(IMAGE_ID, (element) => element[0].getAttribute('src'));
			})
			.then((src) => assert.isTrue(REGEX_PNG.test(src)));
	});
});
