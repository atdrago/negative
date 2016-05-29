'use strict';

const { Application } = require('spectron');
const { assert } = require('chai');

const APP_PATH = './dist/Negative-darwin-x64/Negative.app/Contents/MacOS/Negative';

describe('Window > Move', function () {
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
	
	before(() => {
		return app.start();
	});

	after(() => {
		if (app && app.isRunning()) {
			return app.stop();
		}
	});
	
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
