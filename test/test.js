'use strict';

const { Application } = require('spectron');
const { assert } = require('chai');

const APP_PATH = './dist/Negative-darwin-x64/Negative.app/Contents/MacOS/Negative';

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
		});
		
		describe('View', function () {
			it('Clear', function () {
				// Capture first, then test that clearing works
				return app.electron.ipcRenderer.send('test-capture')
					.then(function () {
						return app.electron.ipcRenderer.send('test-clear')
					})
					.then(function () {
						return app.client.selectorExecute('#negativeImage', function (element) {
							return element[0].getAttribute('src');
						});
					})
					.then(function (src) {
						assert.equal(src, '');
					});
			});
			
			it('Capture', function () {
				// Clear first, then test that capturing works
				return app.electron.ipcRenderer.send('test-clear')
					.then(function () {
						return app.electron.ipcRenderer.send('test-capture');
					})
					.then(function () {
						return app.client.selectorExecute('#negativeImage', function (element) {
							return element[0].getAttribute('src');
						});
					})
					.then(function (src) {
						assert.notEqual(src, '');
					})
			});
		});
		
		describe('Window', function () {
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

