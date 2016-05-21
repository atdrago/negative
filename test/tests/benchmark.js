'use strict';

const { Application } = require('spectron');
const { assert } = require('chai');

const APP_PATH  = './dist/Negative-darwin-x64/Negative.app/Contents/MacOS/Negative';

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
