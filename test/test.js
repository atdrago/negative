'use strict';

const Application = require('spectron').Application;
const assert = require('chai').assert;

const APP_PATH = './dist/Negative-darwin-x64/Negative.app/Contents/MacOS/Negative';

describe('application launch', () => {
	beforeEach(function () {
		this.app = new Application({
			path: APP_PATH
		});
		
		return this.app.start();
	});

	afterEach(function () {
		if (this.app && this.app.isRunning()) {
			return this.app.stop();
		}
	});

	it('shows an initial window', function () {
		console.log(this.app);
		
		return this.app.client.getWindowCount().then(function (count) {
			assert.equal(count, 1);
		});
	});
});