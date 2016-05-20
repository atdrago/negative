'use strict';

const { Application } = require('spectron');
const { assert } = require('chai');

const APP_PATH  = './dist/Negative-darwin-x64/Negative.app/Contents/MacOS/Negative';
const IMAGE_ID  = '#negativeImage';
const TABS_ID   = '#tabs';
const REGEX_PNG = /^data:image\/png;base64,/;

describe.skip('Benchmark', function () {
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
	
	after(() => {
		if (app && app.isRunning()) {
			return app.stop();
		}
	});
	
	describe('Launch', () => {
		it('Launches in less than 2 seconds', () => {
			const startTime = Date.now();
			
			return app.start()
				.then(() => app.client.waitUntilWindowLoaded())
				.then(() => {
					const endTime = Date.now();
					const launchTime = endTime - startTime;
					
					return assert.isAtMost(launchTime, 2000, `Launched in ${launchTime}ms.`);
				});
		});
	})
});

describe('Negative', function () {
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

	describe('Menues', () => {
		describe('Negative -> Preferences', () => {
			describe('Preferences...', () => {
				it('Should open', () => {
					return app.electron.ipcRenderer.send('test-preferences')
						.then(() => app.client.getWindowCount())
						.then((count) => assert.strictEqual(count, 2));
				});
				
				it('Should toggle tips', () => {
					let windowHandles, originalIsChecked;
					
					// Focus the preferences window with `client.window`
					return app.client.windowHandles()
						.then((handles) => {
							windowHandles = handles.value;
							app.client.window(windowHandles[1])
						})
						.then(() => {
							return app.client.selectorExecute('#shouldShowTips', (elements) => {
								return elements[0].checked;
							});
						})
						.then((isChecked) => {
							originalIsChecked = isChecked;
							
							if (!isChecked) {
								return app.client.leftClick('#shouldShowTips');
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
						.then(() => app.client.leftClick('#shouldShowTips'))
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
			
			
		});
		
		describe('Negative -> Reset', () => {
			it('Reset Negative', () => {
				return reset()
					.then(() => app.client.getWindowCount())
					.then((count) => assert.strictEqual(count, 1));
			});
		});
		
		describe('Negative -> Quit', () => {
			after(() => app.start());
			
			it('Quit Negative', () => {
				return app.electron.ipcRenderer.send('test-quit-negative')
					.then(() => app.client.waitUntilWindowLoaded())
					.then(() => app.client.getWindowCount())
					.then((count) => assert.strictEqual(count, 0));
			});
		});
		
		describe('File -> Tabs', () => {
			it('New Tab', () => {
				return app.electron.ipcRenderer.send('test-new-tab')
					.then(() => {
						return app.client.selectorExecute(TABS_ID, (element) => {
							const el = element[0];
							
							return el.children && el.children.length;
						});
					})
					.then((tabCount) => assert.equal(tabCount, 2));
			});
			
			it('Close Tab', () => {
				return app.electron.ipcRenderer.send('test-close-tab')
					.then(() => {
						return app.client.selectorExecute(TABS_ID, (element) => {
							const el = element[0];
							
							return el.children && el.children.length;
						});
					})
					.then((tabCount) => assert.equal(tabCount, 1));
			});
		});
		
		describe('File -> Window', () => {
			after(() => app.restart());
			
			it('New Window', () => {
				return app.electron.ipcRenderer.send('test-new-window')
					.then(() => app.client.getWindowCount())
					.then((count) => assert.equal(count, 2));
			});
			
			it('Close Window', () => {
				// @TODO - This does not actually test that the menu item works, 
				// just that windows close without error
				return app.browserWindow.close()
					.then(() => app.client.getWindowCount())
					.then((count) => assert.equal(count, 1));
			});
			
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
					.then((src) => assert.isTrue(REGEX_PNG.test(src)));
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
					.then((src) => assert.isTrue(REGEX_PNG.test(src)));
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
					.then((src) => assert.isTrue(REGEX_PNG.test(src)));
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
		});
		
		describe('Window', () => {
			beforeEach(() => reset());
			
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
			
			it('Next Tab', () => {
				// Test circular
				return app.electron.ipcRenderer.send('test-new-tab')
					.then(() => app.electron.ipcRenderer.send('test-next-tab'))
					.then(() => {
						return app.client.selectorExecute(TABS_ID, (element) => {
							return Array.from(element[0].children).findIndex((child) => child.classList.contains('selected'));
						});
					})
					.then((selectedIndex) => assert.equal(selectedIndex, 0))
					.then(() => app.electron.ipcRenderer.send('test-next-tab'))
					.then(() => {
						return app.client.selectorExecute(TABS_ID, (element) => {
							return Array.from(element[0].children).findIndex((child) => child.classList.contains('selected'));
						});
					})
					.then((selectedIndex) => assert.equal(selectedIndex, 1))
			});
			
			it('Previous Tab', () => {
				return app.electron.ipcRenderer.send('test-new-tab')
					.then(() => app.electron.ipcRenderer.send('test-previous-tab'))
					.then(() => {
						return app.client.selectorExecute(TABS_ID, (element) => {
							return Array.from(element[0].children).findIndex((child) => child.classList.contains('selected'));
						});
					})
					.then((selectedIndex) => assert.equal(selectedIndex, 0))
					.then(() => app.electron.ipcRenderer.send('test-previous-tab'))
					.then(() => {
						return app.client.selectorExecute(TABS_ID, (element) => {
							return Array.from(element[0].children).findIndex((child) => child.classList.contains('selected'));
						});
					})
					.then((selectedIndex) => assert.equal(selectedIndex, 1))
			});
			
			it('Next Tab and Resize', () => {
				let origBounds;
				
				return app.electron.ipcRenderer.send('test-new-tab')
					.then(() => app.electron.ipcRenderer.send('test-capture'))
					.then(() => app.electron.ipcRenderer.send('test-next-tab'))
					.then(() => app.browserWindow.getBounds())
					.then((bounds) => {
						origBounds = bounds;
						
						let { width, height } = bounds;
						
						return app.browserWindow.setSize(width + 100, height + 100);
					})
					.then(() => app.electron.ipcRenderer.send('test-capture'))
					.then(() => app.electron.ipcRenderer.send('test-next-tab-and-resize'))
					.then(() => app.browserWindow.getBounds())
					.then((bounds) => {
						assert.strictEqual(origBounds.width, bounds.width);
						assert.strictEqual(origBounds.height, bounds.height);
					})
					.then(() => app.electron.ipcRenderer.send('test-next-tab-and-resize'))
					.then(() => app.browserWindow.getBounds())
					.then((bounds) => {
						assert.strictEqual(origBounds.width + 100, bounds.width);
						assert.strictEqual(origBounds.height + 100, bounds.height);
					});
			});
			
			it('Previous Tab and Resize', () => {
				let origBounds;
				
				return app.electron.ipcRenderer.send('test-new-tab')
					.then(() => app.electron.ipcRenderer.send('test-capture'))
					.then(() => app.electron.ipcRenderer.send('test-next-tab'))
					.then(() => app.browserWindow.getBounds())
					.then((bounds) => {
						origBounds = bounds;
						
						let { width, height } = bounds;
						
						return app.browserWindow.setSize(width + 100, height + 100);
					})
					.then(() => app.electron.ipcRenderer.send('test-capture'))
					.then(() => app.electron.ipcRenderer.send('test-previous-tab-and-resize'))
					.then(() => app.browserWindow.getBounds())
					.then((bounds) => {
						assert.strictEqual(origBounds.width, bounds.width);
						assert.strictEqual(origBounds.height, bounds.height);
					})
					.then(() => app.electron.ipcRenderer.send('test-previous-tab-and-resize'))
					.then(() => app.browserWindow.getBounds())
					.then((bounds) => {
						assert.strictEqual(origBounds.width + 100, bounds.width);
						assert.strictEqual(origBounds.height + 100, bounds.height);
					});
			});
		});
		
		describe('Window -> Move', () => {
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
		
		describe('Logs', () => {
			it('Log Output', () => {
				let mainProcessLogs = [];
				let rendererProcessLogs = [];
				
				return app.client.getMainProcessLogs()
					.then((logs) => {
						mainProcessLogs = logs;
						return app.client.getRenderProcessLogs();
					})
					.then((logs) => {
						rendererProcessLogs = logs;
						
						console.log('**MAIN PROCESS LOGS**');
						mainProcessLogs.forEach((log) => console.log(log));
						
						console.log('**RENDERER PROCESS LOGS**');
						rendererProcessLogs.forEach((log) => console.log(log));
						
						return assert.isTrue(true);
					});
			})
		})
	});
});

