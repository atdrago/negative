'use strict';

const { Application } = require('spectron');
const { assert }      = require('chai');

const config = require('../../../config.json');
const { 
	APP_PATH,
	TABS_ID
} = config;

describe('File > New Tab', function () {
	const app = new Application({
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
	
	this.timeout(60000);
	
	beforeEach(() => {
		return app.start();
	});

	afterEach(() => {
		if (app && app.isRunning()) {
			return app.stop();
		}
	});
	
	it('Should add a tab', () => {
		return app.client.waitUntilWindowLoaded()
			.then(() => app.electron.ipcRenderer.send('test-new-tab'))
			.then(() => {
				return app.client.selectorExecute(TABS_ID, (element) => {
					const el = element[0];
					
					return el.children && el.children.length;
				});
			})
			.then((tabCount) => assert.equal(tabCount, 2))
			.catch((err) => {
				return app.client.getMainProcessLogs()
					.then((logs) => {
						console.log('*** MAIN PROCESS LOGS ***');
						logs.forEach((log) => console.log(log));
						
						return app.client.getRenderProcessLogs();
					})
					.then((logs) => {
						console.log('*** RENDER PROCESS LOGS ***');
						logs.forEach((log) => console.log(log));
						
						throw err;
					});
			});
	});
});
