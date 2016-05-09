'use strict';

const { Application } = require('spectron');
const { assert } = require('chai');

const APP_PATH = './dist/Negative-darwin-x64/Negative.app/Contents/MacOS/Negative';

const IMAGE_ID = '#negativeImage';
const REGEX_BASE_64_PNG = /^data:image\/png;base64,/;

describe('Negative', function () {
	const app = new Application({
		path: APP_PATH,
		env: {
			IGNORE_WINDOW_SETTINGS: true,
			NODE_ENV: 'development'
		}
	});
	
	before(function () {
		return app.start();
	});

	after(function () {
		if (app && app.isRunning()) {
			return app.stop();
		}
	});
	
	describe('Launch', function () {
		it('shows an initial window', function () {
			return app.client.getWindowCount().then(function (count) {
				assert.isAtLeast(count, 1);
			});
		});
	});

	describe('Menues', function () {
		describe('Negative', function () {
			after(function () {
				return app.start();
			});
			
			it('About Negative');
			it('Preferences...');
			it('Quit Negative', function () {
				return app.electron.ipcRenderer.send('test-quit-negative')
					.then(function () {
						return app.client.getWindowCount().then(function (count) {
							assert.equal(count, 0);
						});
					});
			});
		});
		
		describe('File', function () {
			it('New Tab', function () {
				return app.electron.ipcRenderer.send('test-new-tab')
					.then(function () {
						return app.client.selectorExecute('#tabs', function (element) {
							const el = element[0];
							
							return el.children && el.children.length;
						});
					})
					.then(function (tabCount) {
						assert.equal(tabCount, 2);
					});
			});
			
			it('Close Tab', function () {
				return app.electron.ipcRenderer.send('test-close-tab')
					.then(function () {
						return app.client.selectorExecute('#tabs', function (element) {
							const el = element[0];
							
							return el.children && el.children.length;
						});
					})
					.then(function (tabCount) {
						assert.equal(tabCount, 1);
					});
			});
			
			it('New Window');
			it('Close Window');
			it('Close');
		});
		
		describe('Edit', function () {
			it('Undo', function () {
				// Get some history first
				return app.electron.ipcRenderer.send('test-clear')
					.then(function () {
						return app.electron.ipcRenderer.send('test-capture');
					})
					.then(function () {
						return app.client.selectorExecute(IMAGE_ID, (element) => element[0].getAttribute('src'));
					})
					.then(function (src) {
						assert.notEqual(src, '');
					})
					.then(function () {
						return app.electron.ipcRenderer.send('test-undo');
					})
					.then(function () {
						return app.client.selectorExecute(IMAGE_ID, (element) => element[0].getAttribute('src'));
					})
					.then(function (src) {
						assert.equal(src, '');
					});
					
			});
			
			it('Redo', function () {
				// Use history from Undo test
				return app.electron.ipcRenderer.send('test-redo')
					.then(function () {
						return app.client.selectorExecute(IMAGE_ID, (element) => element[0].getAttribute('src'));
					})
					.then(function (src) {
						assert.isTrue(REGEX_BASE_64_PNG.test(src));
					});
			});
			
			it('Copy', function () {
				return app.electron.ipcRenderer.send('test-capture')
					.then(function () {
						return app.electron.ipcRenderer.send('test-copy');
					})
					.then(function () {
						return app.electron.clipboard.readImage();
					})
					.then(function (image) {
						assert.isDefined(image);
						assert.isDefined(image.getSize);
					})
			});
			
			it('Paste', function () {
				return app.electron.ipcRenderer.send('test-clear')
					.then(function () {
						return app.electron.ipcRenderer.send('test-paste');
					})
					.then(function () {
						return app.client.selectorExecute(IMAGE_ID, (element) => element[0].getAttribute('src'));
					})
					.then(function (src) {
						assert.isTrue(REGEX_BASE_64_PNG.test(src));
					});
			});
		});
		
		describe('View', function () {
			it('Capture', function () {
				// Clear first, then test that capturing works
				return app.electron.ipcRenderer.send('test-clear')
					.then(function () {
						return app.electron.ipcRenderer.send('test-capture');
					})
					.then(function () {
						return app.client.selectorExecute(IMAGE_ID, (element) => element[0].getAttribute('src'));
					})
					.then(function (src) {
						assert.isTrue(REGEX_BASE_64_PNG.test(src));
					})
			});
			
			it('Clear', function () {
				// Capture first, then test that clearing works
				return app.electron.ipcRenderer.send('test-capture')
					.then(function () {
						return app.electron.ipcRenderer.send('test-clear')
					})
					.then(function () {
						return app.client.selectorExecute(IMAGE_ID, (element) => element[0].getAttribute('src'));
					})
					.then(function (src) {
						assert.equal(src, '');
					});
			});
			
			it('Actual Size');
			it('Zoom In');
			it('Zoom Out');
			it('Reload');
			it('Toggle DevTools');
		});
		
		describe('Window', function () {
			it('Minimize');
			it('Fit Window to Image');
			it('Next Tab');
			it('Previous Tab');
			it('Next Tab and Resize');
			it('Previous Tab and Resize');
			
			describe('Move', function () {
				function testBounds(direction, amount) {
					return new Promise(function (resolve, reject) {
						let oldBounds;
						
						return app.browserWindow.getBounds()
							.then(function (bounds) {
								oldBounds = bounds;
								return app.electron.ipcRenderer.send(`test-move-${direction}-${amount}`);
							})
							.then(function () {
								return app.browserWindow.getBounds();
							})
							.then(function (newBounds) {
								resolve({
									oldBounds: oldBounds,
									newBounds: newBounds
								});
							});
					});
				}
				
				it('Left by 1px', function () {
					return testBounds('left', 1).then(function (result) {
						assert.strictEqual(result.newBounds.x, result.oldBounds.x - 1);
					});
				});
				
				it('Right by 1px', function () {
					return testBounds('right', 1).then(function (result) {
						assert.strictEqual(result.newBounds.x, result.oldBounds.x + 1);
					});
				});
				
				it('Up by 1px', function () {
					return testBounds('up', 1).then(function (result) {
						assert.strictEqual(result.newBounds.y, result.oldBounds.y - 1);
					});
				});
				
				it('Down by 1px', function () {
					return testBounds('down', 1).then(function (result) {
						assert.strictEqual(result.newBounds.y, result.oldBounds.y + 1);
					});
				});
				
				it('Left by 10px', function () {
					return testBounds('left', 10).then(function (result) {
						assert.strictEqual(result.newBounds.x, result.oldBounds.x - 10);
					});
				});
				
				it('Right by 10px', function () {
					return testBounds('right', 10).then(function (result) {
						assert.strictEqual(result.newBounds.x, result.oldBounds.x + 10);
					});
				});
				
				it('Up by 10px', function () {
					return testBounds('up', 10).then(function (result) {
						assert.strictEqual(result.newBounds.y, result.oldBounds.y - 10);
					});
				});
				
				it('Down by 10px', function () {
					return testBounds('down', 10).then(function (result) {
						assert.strictEqual(result.newBounds.y, result.oldBounds.y + 10);
					});
				});
			});
		});
	});
});

