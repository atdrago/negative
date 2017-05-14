'use strict';

const { Application } = require('spectron');
const { assert } = require('chai');

const config = require('../config.json');
const { APP_PATH } = config;

describe('Benchmark', function () {
	this.timeout(60000);

	beforeEach(function () {
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
	});

	afterEach(function () {
		if (this.app && this.app.isRunning()) {
			return this.app.stop();
		}
	});

	it('Launches in less than 2 seconds', function () {
		const startTime = Date.now();

		return this.app.start()
			.then(() => this.app.client.waitUntilWindowLoaded())
			.then(() => {
				const endTime = Date.now();
				const launchTime = endTime - startTime;

				return assert.isAtMost(launchTime, 2000, `Launched in ${launchTime}ms.`);
			});
	});
});
