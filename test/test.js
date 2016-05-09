'use strict';

const { Application } = require('spectron');
const { assert } = require('chai');

const APP_PATH = './dist/Negative-darwin-x64/Negative.app/Contents/MacOS/Negative';

const IMAGE_ID = '#negativeImage';
const REGEX_BASE_64_PNG = /^data:image\/png;base64,/;

describe('Negative', () => {
	const app = new Application({
		path: APP_PATH,
		env: {
			IGNORE_WINDOW_SETTINGS: true,
			NODE_ENV: 'development'
		}
	});
	
	before(() => {
		return app.start();
	});

	after(() => {
		if (app && app.isRunning()) {
			return app.stop();
		}
	});
	
	describe('Launch', () => {
		it('Shows a window', () => {
			return app.client.getWindowCount()
				.then((count) => assert.isAtLeast(count, 1));
		});
	});

	describe('Menues', () => {
		describe('Negative', () => {
			after(() => app.start());
			
			it('About Negative');
			it('Preferences...');
			it('Quit Negative', () => {
				return app.electron.ipcRenderer.send('test-quit-negative')
					.then(() => app.client.getWindowCount())
					.then((count) => assert.equal(count, 0));
			});
		});
		
		describe('File', () => {
			it('New Tab', () => {
				return app.electron.ipcRenderer.send('test-new-tab')
					.then(() => {
						return app.client.selectorExecute('#tabs', (element) => {
							const el = element[0];
							
							return el.children && el.children.length;
						});
					})
					.then((tabCount) => assert.equal(tabCount, 2));
			});
			
			it('Close Tab', () => {
				return app.electron.ipcRenderer.send('test-close-tab')
					.then(() => {
						return app.client.selectorExecute('#tabs', (element) => {
							const el = element[0];
							
							return el.children && el.children.length;
						});
					})
					.then((tabCount) => assert.equal(tabCount, 1));
			});
			
			it.skip('New Window', () => {
				return app.electron.ipcRenderer.send('test-new-window')
					.then(() => app.client.getWindowCount())
					.then((count) => assert.equal(count, 2))
					.then(() => app.browserWindow.close());
			});
			
			it.skip('Close Window', () => {
				return app.electron.ipcRenderer.send('test-close-window')
					.then(() => app.client.getWindowCount())
					.then((count) => assert.equal(count, 1));
			});
			
			it('Close');
		});
		
		describe('Edit', () => {
			it('Undo', () => {
				// Get some history first
				return app.electron.ipcRenderer.send('test-clear')
					.then(() => app.electron.ipcRenderer.send('test-capture'))
					.then(() => {
						return app.client.selectorExecute(IMAGE_ID, (element) => element[0].getAttribute('src'));
					})
					.then((src) => assert.notEqual(src, ''))
					.then(() => app.electron.ipcRenderer.send('test-undo'))
					.then(() => {
						return app.client.selectorExecute(IMAGE_ID, (element) => element[0].getAttribute('src'));
					})
					.then((src) => assert.equal(src, ''));
					
			});
			
			it('Redo', () => {
				// Use history from Undo test
				return app.electron.ipcRenderer.send('test-redo')
					.then(() => {
						return app.client.selectorExecute(IMAGE_ID, (element) => element[0].getAttribute('src'));
					})
					.then((src) => assert.isTrue(REGEX_BASE_64_PNG.test(src)));
			});
			
			it('Copy', () => {
				return app.electron.ipcRenderer.send('test-capture')
					.then(() => app.electron.ipcRenderer.send('test-copy'))
					.then(() => app.electron.clipboard.readImage())
					.then((image) => {
						assert.isDefined(image);
						assert.isDefined(image.getSize);
					});
			});
			
			it('Paste', () => {
				return app.electron.ipcRenderer.send('test-clear')
					.then(() => app.electron.ipcRenderer.send('test-paste'))
					.then(() => {
						return app.client.selectorExecute(IMAGE_ID, (element) => element[0].getAttribute('src'));
					})
					.then((src) => assert.isTrue(REGEX_BASE_64_PNG.test(src)));
			});
		});
		
		describe('View', () => {
			it('Capture', () => {
				// Clear first, then test that capturing works
				return app.electron.ipcRenderer.send('test-clear')
					.then(() => app.electron.ipcRenderer.send('test-capture'))
					.then(() => {
						return app.client.selectorExecute(IMAGE_ID, (element) => element[0].getAttribute('src'));
					})
					.then((src) => assert.isTrue(REGEX_BASE_64_PNG.test(src)));
			});
			
			it('Clear', () => {
				// Capture first, then test that clearing works
				return app.electron.ipcRenderer.send('test-capture')
					.then(() => app.electron.ipcRenderer.send('test-clear'))
					.then(() => {
						return app.client.selectorExecute(IMAGE_ID, (element) => element[0].getAttribute('src'))
					})
					.then((src) => assert.equal(src, ''));
			});
			
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
			
			it('Reload');
			it('Toggle DevTools');
		});
		
		describe('Window', () => {
			it('Minimize');
			it('Fit Window to Image', () => {
				let origBounds;
				
				return app.electron.ipcRenderer.send('test-capture')
					.then(() => app.browserWindow.getBounds())
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
			it('Next Tab');
			it('Previous Tab');
			it('Next Tab and Resize');
			it('Previous Tab and Resize');
			
			describe('Move', () => {
				function testBounds(direction, amount) {
					return new Promise((resolve, reject) => {
						let oldBounds;
						
						return app.browserWindow.getBounds()
							.then((bounds) => {
								oldBounds = bounds;
								return app.electron.ipcRenderer.send(`test-move-${direction}-${amount}`);
							})
							.then(() => app.browserWindow.getBounds())
							.then((newBounds) => {
								resolve({
									oldBounds: oldBounds,
									newBounds: newBounds
								});
							});
					});
				}
				
				it('Left by 1px', () => {
					return testBounds('left', 1)
						.then((result) => assert.strictEqual(result.newBounds.x, result.oldBounds.x - 1));
				});
				
				it('Right by 1px', () => {
					return testBounds('right', 1)
						.then((result) => assert.strictEqual(result.newBounds.x, result.oldBounds.x + 1));
				});
				
				it('Up by 1px', () => {
					return testBounds('up', 1)
						.then((result) => assert.strictEqual(result.newBounds.y, result.oldBounds.y - 1));
				});
				
				it('Down by 1px', () => {
					return testBounds('down', 1)
						.then((result) => assert.strictEqual(result.newBounds.y, result.oldBounds.y + 1));
				});
				
				it('Left by 10px', () => {
					return testBounds('left', 10)
						.then((result) => assert.strictEqual(result.newBounds.x, result.oldBounds.x - 10));
				});
				
				it('Right by 10px', () => {
					return testBounds('right', 10)
						.then((result) => assert.strictEqual(result.newBounds.x, result.oldBounds.x + 10));
				});
				
				it('Up by 10px', () => {
					return testBounds('up', 10)
						.then((result) => assert.strictEqual(result.newBounds.y, result.oldBounds.y - 10));
				});
				
				it('Down by 10px', () => {
					return testBounds('down', 10)
						.then((result) => assert.strictEqual(result.newBounds.y, result.oldBounds.y + 10));
				});
			});
		});
	});
});

