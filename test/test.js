'use strict';

const { Application } = require('spectron');
const { assert } = require('chai');

const APP_PATH  = './dist/Negative-darwin-x64/Negative.app/Contents/MacOS/Negative';
const IMAGE_ID  = '#negativeImage';
const TABS_ID   = '#tabs';
const REGEX_PNG = /^data:image\/png;base64,/;

describe.skip('Negative', function () {
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
	
	/**
	 * Reset all windows.
	 */
	function reset() {
		return app.electron.ipcRenderer.send('test-reset')
			.then(() => app.client.windowHandles())
			.then((handles) => app.client.window(handles.value[0]));
	}
	
	beforeEach(() => {
		return app.start();
	});

	afterEach(() => {
		if (app && app.isRunning()) {
			return app.stop();
		}
	});

	describe('Menues', () => {		
		describe('View', () => {
			it('Actual Size', () => {
				return app.electron.ipcRenderer.send('test-capture')
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
			
			it('Zoom In', () => {
				return app.electron.ipcRenderer.send('test-capture')
					.then(() => app.electron.ipcRenderer.send('test-actual-size'))
					.then(() => app.electron.ipcRenderer.send('test-zoom-in'))
					.then(() => {
						return app.client.selectorExecute(IMAGE_ID, (element) => {
							const zoomLevel = element[0].getAttribute('data-zoom-level');
							
							return zoomLevel;
						});
					})
					.then((zoomLevel) => assert.equal(zoomLevel, 1.25))
					.then(() => app.electron.ipcRenderer.send('test-zoom-in'))
					.then(() => app.electron.ipcRenderer.send('test-zoom-in'))
					.then(() => app.electron.ipcRenderer.send('test-zoom-in'))
					.then(() => app.electron.ipcRenderer.send('test-zoom-in'))
					.then(() => {
						return app.client.selectorExecute(IMAGE_ID, (element) => {
							const zoomLevel = element[0].getAttribute('data-zoom-level');
							
							return zoomLevel;
						});
					})
					.then((zoomLevel) => assert.equal(zoomLevel, 2));
			});
			
			it('Zoom Out', () => {
				return app.electron.ipcRenderer.send('test-capture')
					.then(() => app.electron.ipcRenderer.send('test-actual-size'))
					.then(() => app.electron.ipcRenderer.send('test-zoom-out'))
					.then(() => {
						return app.client.selectorExecute(IMAGE_ID, (element) => {
							const zoomLevel = element[0].getAttribute('data-zoom-level');
							
							return zoomLevel;
						});
					})
					.then((zoomLevel) => assert.equal(zoomLevel, 0.75))
					.then(() => app.electron.ipcRenderer.send('test-zoom-out'))
					.then(() => app.electron.ipcRenderer.send('test-zoom-out'))
					.then(() => {
						return app.client.selectorExecute(IMAGE_ID, (element) => {
							const zoomLevel = element[0].getAttribute('data-zoom-level');
							
							return zoomLevel;
						});
					})
					.then((zoomLevel) => assert.equal(zoomLevel, 0.5));
			});
		});
	});
});

