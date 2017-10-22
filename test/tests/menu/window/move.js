'use strict';

const { Application } = require('spectron');
const { assert }      = require('chai');

const config       = require('../../../config.json');
const { APP_PATH } = config;

describe('Window > Move', function () {
	this.timeout(60000);

	before(function () {
		this.app = new Application({
			path: APP_PATH,
			env: {
				ELECTRON_ENABLE_LOGGING: true,
				ELECTRON_ENABLE_STACK_DUMPING: true,
				NEGATIVE_IGNORE_SETTINGS: true,
				NEGATIVE_SKIP_RESET_DIALOG: true,
				NEGATIVE_VERBOSE: true,
				NODE_ENV: 'development'
			}
		});

		return this.app.start();
	});

	after(function () {
		if (this.app && this.app.isRunning()) {
			return this.app.stop();
		}
	});

	function testBounds(direction, amount) {
		return new Promise((resolve, reject) => {
			let oldBounds;

			return this.app.browserWindow.getBounds()
				.then((bounds) => {
					oldBounds = bounds;
					return this.app.electron.ipcRenderer.send(`test-move-${direction}-${amount}`);
				})
				.then(() => this.app.browserWindow.getBounds())
				.then((newBounds) => {
					resolve({
						oldBounds: oldBounds,
						newBounds: newBounds
					});
				});
		});
	}

	it('Left by 1px', function () {
		return testBounds.call(this, 'left', 1)
			.then((result) => assert.strictEqual(result.newBounds.x, result.oldBounds.x - 1));
	});

	it('Right by 1px', function () {
		return testBounds.call(this, 'right', 1)
			.then((result) => assert.strictEqual(result.newBounds.x, result.oldBounds.x + 1));
	});

	it('Up by 1px', function () {
		return testBounds.call(this, 'up', 1)
			.then((result) => assert.strictEqual(result.newBounds.y, result.oldBounds.y - 1));
	});

	it('Down by 1px', function () {
		return testBounds.call(this, 'down', 1)
			.then((result) => assert.strictEqual(result.newBounds.y, result.oldBounds.y + 1));
	});

	it('Left by 10px', function () {
		return testBounds.call(this, 'left', 10)
			.then((result) => assert.strictEqual(result.newBounds.x, result.oldBounds.x - 10));
	});

	it('Right by 10px', function () {
		return testBounds.call(this, 'right', 10)
			.then((result) => assert.strictEqual(result.newBounds.x, result.oldBounds.x + 10));
	});

	it('Up by 10px', function () {
		return testBounds.call(this, 'up', 10)
			.then((result) => assert.strictEqual(result.newBounds.y, result.oldBounds.y - 10));
	});

	it('Down by 10px', function () {
		return testBounds.call(this, 'down', 10)
			.then((result) => assert.strictEqual(result.newBounds.y, result.oldBounds.y + 10));
	});
});
