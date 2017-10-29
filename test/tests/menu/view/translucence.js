'use strict';

const { Application } = require('spectron');
const { assert } = require('chai');

const config = require('../../../config.json');
const {
	APP_PATH,
	WAIT_UNTIL_TIMEOUT
} = config;

describe('View > Translucence', function () {
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

		return this.app.start();
	});

	afterEach(function () {
		if (this.app && this.app.isRunning()) {
			return this.app.stop();
		}
	});

	it('Should toggle translucence', function () {
		return this.app.client.waitUntilWindowLoaded()
			.then(() => {
				return this.app.client.selectorExecute('//body', (elements) => {
					return elements[0].classList.contains('translucence-off');
				});
			})
			.then((hasTranslucenceOffClass) => assert.isFalse(hasTranslucenceOffClass, 'The body element should not have the .translucence-off class when on startup.'))
			.then(() => this.app.electron.ipcRenderer.send('test-translucence'))
			.then(() => {
				return this.app.client.waitUntil(() => {
					return this.app.client.selectorExecute('//body', (elements) => {
						return elements[0].classList.contains('translucence-off');
					});
				}, WAIT_UNTIL_TIMEOUT);
			})
			.then((hasTranslucenceOffClass) => assert.isTrue(hasTranslucenceOffClass, 'The body element should have the .translucence-off class when Translucence is off.'))
			.catch((err) => {
				return this.app.client.getMainProcessLogs()
					.then((logs) => {
						console.log('*** MAIN PROCESS LOGS ***');
						logs.forEach((log) => console.log(log));

						return this.app.client.getRenderProcessLogs();
					})
					.then((logs) => {
						console.log('*** RENDER PROCESS LOGS ***');
						logs.forEach((log) => console.log(log));

						throw err;
					});
			});
	});
});
