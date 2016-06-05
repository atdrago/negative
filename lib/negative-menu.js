'use strict';

const {
	app,
	BrowserWindow, 
	clipboard, 
	Menu, 
	ipcMain 
} = require('electron');

const negative = require('./negative');

const { NEGATIVE_VERBOSE } = process.env;

const MENU_SEPARATOR = { type: 'separator' };

const DEFAULT_ZOOM_LEVEL = 1;
const DEFAULT_NUDGE_AMOUNT = 1;
const DEFAULT_SHIFT_AMOUNT = 10;
const DEFAULT_NEGATIVE_MENU_STATES = {
	canAddTab: true,
	canCloseTab: true,
	canCloseWindow: true,
	canUndo: false,
	canRedo: false,
	canCapture: true,
	isImageEmpty: true,
	canReload: true,
	canToggleDevTools: true,
	canMinimize: true,
	canMove: true,
	canInteractWithTabs: true,
	canZoomIn: true,
	canZoomOut: true
};

const DEFAULT_SETTINGS_MENU_STATES = {
	canAddTab: false,
	canCloseTab: false,
	canCloseWindow: false,
	canUndo: false,
	canRedo: false,
	canCapture: false,
	isImageEmpty: true,
	canReload: false,
	canToggleDevTools: true,
	canMinimize: true,
	canMove: false,
	canInteractWithTabs: false,
	canZoomIn: false,
	canZoomOut: false
};

let lastNegativeMenuStates = {};

module.exports = {
	init() {
		ipcMain.on('refresh-menu', (evt, menuStates) => this.createMenu(menuStates));
		
		this.createMenu();
	},
	
	createMenu(menuStates, isSettingsWindow) {
		if (NEGATIVE_VERBOSE === 'true') {
			/* eslint-disable no-console */
			console.log('negativeMenu.createMenu() called');
			console.log(`\tmenuStates = ${JSON.stringify(menuStates, null, '\t')}`);
			/* eslint-enable no-console */
		}
		
		isSettingsWindow = !!isSettingsWindow;
		
		if (isSettingsWindow) {
			menuStates = DEFAULT_SETTINGS_MENU_STATES;
		} else {
			menuStates = Object.assign({}, DEFAULT_NEGATIVE_MENU_STATES, lastNegativeMenuStates, menuStates);
		}
		
		menuStates.isDarkMode  = negative.isDarkMode;
		menuStates.isAppHidden = negative.isAppHidden;
		menuStates.isAppLocked = negative.isAppLocked;
		
		if (!isSettingsWindow) {
			lastNegativeMenuStates = menuStates;
		}
		
		if (NEGATIVE_VERBOSE === 'true') {
			/* eslint-disable no-console */
			console.log(`\tisSettingsWindow = ${isSettingsWindow}`);
			console.log(`\tDEFAULT_NEGATIVE_MENU_STATES = ${JSON.stringify(DEFAULT_NEGATIVE_MENU_STATES, null, '\t')}`);
			console.log(`\tlastNegativeMenuStates = ${JSON.stringify(lastNegativeMenuStates, null, '\t')}`);
			console.log(`\tmenuStates = ${JSON.stringify(menuStates, null, '\t')}\n`);
			/* eslint-enable no-console */
		}
		
		const {
			canAddTab,
			canCloseTab,
			canCloseWindow,
			canUndo,
			canRedo,
			canCapture,
			isAppHidden,
			isAppLocked,
			isDarkMode,
			isImageEmpty,
			canReload,
			canToggleDevTools,
			canMinimize,
			canMove,
			canInteractWithTabs,
			canZoomIn,
			canZoomOut
		} = menuStates;
		
		this.template = [
			{
				label: 'Negative',
				submenu: [
					{ label: 'About Negative', role: 'about' },
					MENU_SEPARATOR,
					{ label: 'Preferences...', accelerator: 'Command+,', click: () => negative.initSettingsWindow() },
					MENU_SEPARATOR,
					{ label: 'Reset...', click: () => negative.reset() },
					MENU_SEPARATOR,
					{ label: 'Lock Negative', accelerator: 'Command+Control+L', click: () => negative.toggleLocking(), type: 'checkbox', checked: isAppLocked },
					{ label: 'Hide Negative', accelerator: 'Command+Control+H', click: () => negative.toggleHiding(), type: 'checkbox', checked: isAppHidden },
					MENU_SEPARATOR,
					{ label: 'Quit Negative', accelerator: 'Command+Q', click: () => app.quit() }
				]
			},
			{
				label: 'File',
				submenu: [
					{ label: 'New Tab', accelerator: 'Command+T', click: () => negative.addTab(), enabled: canAddTab },
					{ label: 'New Window', accelerator: 'Command+N', click: () => negative.initNegativeWindow() },
					MENU_SEPARATOR,
					{ label: 'Close Tab', accelerator: 'Command+W', click: () => negative.closeTab(), enabled: canCloseTab, visible: !isSettingsWindow },
					{ label: 'Close Window', accelerator: 'Shift+Command+W', selector: 'performClose:', enabled: canCloseWindow, visible: !isSettingsWindow },
					{ label: 'Close', accelerator: 'Command+W', selector: 'performClose:', visible: isSettingsWindow }
				]
			},
			{
				label: 'Edit',
				submenu: [
					{ label: 'Undo',  accelerator: 'Command+Z', click: () => negative.undo(), enabled: canUndo },
					{ label: 'Redo',  accelerator: 'Shift+Command+Z', click: () => negative.redo(), enabled: canRedo },
					MENU_SEPARATOR,
					{ label: 'Copy',  accelerator: 'Command+C', click: () => negative.copy(), enabled: !isImageEmpty },
					{ label: 'Paste', accelerator: 'Command+V', click: () => negative.paste(), enabled: !clipboard.readImage().isEmpty() }
				]
			},
			{
				label: 'View',
				submenu: [
					{ label: 'Capture', accelerator: 'Command+G', click: () => negative.captureRegionBehindWindow(), enabled: canCapture },
					{ label: 'Clear', accelerator: 'Command+Backspace', click: () => negative.removeImage(), enabled: !isImageEmpty },
					MENU_SEPARATOR,
					{ label: 'Dark Mode', accelerator: 'Command+D', click: () => negative.toggleDarkMode(), type: 'checkbox', checked: isDarkMode },
					MENU_SEPARATOR,
					{ label: 'Actual Size', accelerator: 'Command+0', click: () => negative.zoomTo(DEFAULT_ZOOM_LEVEL), enabled: !isImageEmpty },
					{ label: 'Zoom In', accelerator: 'Command+Plus', click: () => negative.zoomIn(), enabled: canZoomIn },
					{ label: 'Zoom Out', accelerator: 'Command+-', click: () => negative.zoomOut(), enabled: canZoomOut },
					MENU_SEPARATOR,
					{ label: 'Reload', accelerator: 'Command+R', click: () => BrowserWindow.getFocusedWindow().reload(), enabled: canReload },
					{ label: 'Toggle DevTools', accelerator: 'Alt+Command+I', click: () => BrowserWindow.getFocusedWindow().toggleDevTools(), enabled: canToggleDevTools }
				]
			},
			{
				label: 'Window',
				submenu: [
					{ label: 'Minimize', accelerator: 'Command+M', role: 'minimize' },
					MENU_SEPARATOR,
					{ label: 'Fit Window to Image', accelerator: 'Command+F', click: () => negative.fitWindowToImage(), enabled: canMinimize },
					MENU_SEPARATOR,
					{ label: 'Next Tab', accelerator: 'Command+}', click: () => negative.selectNextTab(), enabled: canInteractWithTabs },
					{ label: 'Previous Tab', accelerator: 'Command+{', click: () => negative.selectPreviousTab(), enabled: canInteractWithTabs },
					{ label: 'Next Tab and Resize', accelerator: 'Alt+Command+}', click: () => negative.selectNextTabAndResizeWindowToFitImage(), enabled: canInteractWithTabs },
					{ label: 'Previous Tab and Resize', accelerator: 'Alt+Command+{', click: () => negative.selectPreviousTabAndResizeWindowToFitImage(), enabled: canInteractWithTabs },
					MENU_SEPARATOR,
					{
						label: 'Move',
						submenu: [
							{ label: 'Right by 1px', accelerator: 'Right', click: () => negative.move('right', DEFAULT_NUDGE_AMOUNT), enabled: canMove },
							{ label: 'Left by 1px', accelerator: 'Left', click: () => negative.move('left', DEFAULT_NUDGE_AMOUNT), enabled: canMove },
							{ label: 'Up by 1px', accelerator: 'Up', click: () => negative.move('up', DEFAULT_NUDGE_AMOUNT), enabled: canMove },
							{ label: 'Down by 1px', accelerator: 'Down', click: () => negative.move('down', DEFAULT_NUDGE_AMOUNT), enabled: canMove },
							MENU_SEPARATOR,
							{ label: 'Right by 10px', accelerator: 'Shift+Right', click: () => negative.move('right', DEFAULT_SHIFT_AMOUNT), enabled: canMove },
							{ label: 'Left by 10px', accelerator: 'Shift+Left',  click: () => negative.move('left', DEFAULT_SHIFT_AMOUNT), enabled: canMove },
							{ label: 'Up by 10px', accelerator: 'Shift+Up', click: () => negative.move('up', DEFAULT_SHIFT_AMOUNT), enabled: canMove },
							{ label: 'Down by 10px', accelerator: 'Shift+Down', click: () => negative.move('down', DEFAULT_SHIFT_AMOUNT), enabled: canMove }
						]
					}
				]
			}
		];
		
		const menu = Menu.buildFromTemplate(this.template);
		Menu.setApplicationMenu(menu);
	},
	
	refreshForSettingsWindow() {
		if (NEGATIVE_VERBOSE === 'true') {
			// eslint-disable-next-line no-console
			console.log('negativeMenu.refreshForSettingsWindow() called');
		}
		
		this.createMenu({
			canAddTab: false,
			canCloseTab: false,
			canCloseWindow: false,
			canUndo: false,
			canRedo: false,
			canCapture: false,
			isImageEmpty: true,
			canReload: true,
			canToggleDevTools: true,
			canMinimize: true,
			canMove: false,
			canInteractWithTabs: false,
			canZoomIn: false,
			canZoomOut: false
		}, true);
	},

	refreshForNoWindow() {
		if (NEGATIVE_VERBOSE === 'true') {
			// eslint-disable-next-line no-console
			console.log('negativeMenu.refreshForNoWindow() called\n');
		}
		
		this.createMenu({
			canAddTab: false,
			canCloseTab: false,
			canCloseWindow: false,
			canUndo: false,
			canRedo: false,
			canCapture: false,
			isImageEmpty: true,
			canReload: false,
			canToggleDevTools: false,
			canMinimize: false,
			canMove: false,
			canInteractWithTabs: false,
			canZoomIn: false,
			canZoomOut: false
		}, false);
	},
	
	refreshForNewWindow() {
		if (NEGATIVE_VERBOSE === 'true') {
			// eslint-disable-next-line no-console
			console.log('negativeMenu.refreshForNewWindow() called\n');
		}
		
		this.createMenu(DEFAULT_NEGATIVE_MENU_STATES, false);
	},
	
	refreshForDarkMode() {
		if (NEGATIVE_VERBOSE === 'true') {
			// eslint-disable-next-line no-console
			console.log('negativeMenu.refreshForDarkMode() called\n');
		}
		
		this.createMenu();
	},
	
	refreshForHiding() {
		if (NEGATIVE_VERBOSE === 'true') {
			// eslint-disable-next-line no-console
			console.log('negativeMenu.refreshForHiding() called\n');
		}
		
		this.createMenu();
	},
	
	refreshForLocking() {
		if (NEGATIVE_VERBOSE === 'true') {
			// eslint-disable-next-line no-console
			console.log('negativeMenu.refreshForLocking() called\n');
		}
		
		this.createMenu();
	}
};
