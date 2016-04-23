'use strict';

const { 
	app,
	BrowserWindow, 
	clipboard, 
	Menu, 
	ipcMain 
} = require('electron');

const MENU_SEPARATOR = { type: 'separator' };

const defaultMenuStates = {
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

module.exports = {
	init(negative) {
		ipcMain.on('refresh-menu', (evt, menuStates) => this.createMenu(menuStates));
		
		this.negative = negative;
		this.createMenu();
	},
	
	createMenu(menuStates, isSettingsWindow) {
		menuStates       = Object.assign({}, defaultMenuStates, menuStates);
		isSettingsWindow = !!isSettingsWindow;
		
		const negative = this.negative;
		
		const {
			canAddTab,
			canCloseTab,
			canCloseWindow,
			canUndo,
			canRedo,
			canCapture,
			isImageEmpty,
			canReload,
			canToggleDevTools,
			canMinimize,
			canMove,
			canInteractWithTabs,
			canZoomIn,
			canZoomOut
		} = menuStates;
		
		const template = [
			{
				label: 'Negative',
				submenu: [
					{ label: 'About Negative', role: 'about' },
					MENU_SEPARATOR,
					{ label: 'Preferences...', accelerator: 'Command+,', click: negative.initSettingsWindow },
					MENU_SEPARATOR,
					{ label: 'Quit Negative', accelerator: 'Command+Q', click: app.quit }
				]
			},
			{
				label: 'File',
				submenu: [
					{ label: 'New Tab', accelerator: 'Command+T', click: negative.addTab, enabled: canAddTab },
					{ label: 'New Window', accelerator: 'Command+N', click: negative.initNegativeWindow },
					MENU_SEPARATOR,
					{ label: 'Close Tab', accelerator: 'Command+W', click: negative.closeTab, enabled: canCloseTab, visible: !isSettingsWindow },
					{ label: 'Close Window', accelerator: 'Shift+Command+W', selector: 'performClose:', enabled: canCloseWindow, visible: !isSettingsWindow },
					{ label: 'Close', accelerator: 'Command+W', selector: 'performClose:', visible: isSettingsWindow }
				]
			},
			{
				label: 'Edit',
				submenu: [
					{ label: 'Undo',  accelerator: 'Command+Z', click: negative.undo, enabled: canUndo },
					{ label: 'Redo',  accelerator: 'Shift+Command+Z', click: negative.redo, enabled: canRedo },
					MENU_SEPARATOR,
					{ label: 'Copy',  accelerator: 'Command+C', click: negative.copy, enabled: !isImageEmpty },
					{ label: 'Paste', accelerator: 'Command+V', click: negative.paste, enabled: !clipboard.readImage().isEmpty() }
				]
			},
			{
				label: 'View',
				submenu: [
					{ label: 'Capture', accelerator: 'Command+G', click: negative.captureRegionBehindWindow, enabled: canCapture },
					{ label: 'Clear', accelerator: 'Command+Backspace', click: negative.removeImage, enabled: !isImageEmpty },
					MENU_SEPARATOR,
					{ label: 'Actual Size', accelerator: 'Command+0', click: () => negative.zoomTo(1), enabled: !isImageEmpty },
					{ label: 'Zoom In', accelerator: 'Command+=', click: negative.zoomIn, enabled: canZoomIn },
					{ label: 'Zoom Out', accelerator: 'Command+-', click: negative.zoomOut, enabled: canZoomOut },
					MENU_SEPARATOR,
					{ label: 'Reload', accelerator: 'Command+R', click: () => BrowserWindow.getFocusedWindow().reload(), enabled: canReload },
					{ label: 'Toggle DevTools', accelerator: 'Alt+Command+I', click: () => BrowserWindow.getFocusedWindow().toggleDevTools(), enabled: canToggleDevTools }
				]
			},
			{
				label: 'Window',
				submenu: [
					{ label: 'Minimize', accelerator: 'Command+M', role: 'minimize' },
					{ label: 'Fit Window to Image', accelerator: 'Command+F', click: negative.fitWindowToImage, enabled: canMinimize },
					{ label: 'Next Tab', accelerator: 'Command+}', click: negative.selectNextTab, enabled: canInteractWithTabs },
					{ label: 'Previous Tab', accelerator: 'Command+{', click: negative.selectPreviousTab, enabled: canInteractWithTabs },
					{ label: 'Next Tab and Resize', accelerator: 'Alt+Command+}', click: negative.selectNextTabAndResizeWindowToFitImage, enabled: canInteractWithTabs },
					{ label: 'Previous Tab and Resize', accelerator: 'Alt+Command+{', click: negative.selectPreviousTabAndResizeWindowToFitImage, enabled: canInteractWithTabs },
					{
						label: 'Move',
						submenu: [
							{ label: 'Right by 1px', accelerator: 'Right', click: () => negative.move('right', 1), enabled: canMove },
							{ label: 'Left by 1px', accelerator: 'Left', click: () => negative.move('left', 1), enabled: canMove },
							{ label: 'Up by 1px', accelerator: 'Up', click: () => negative.move('up', 1), enabled: canMove },
							{ label: 'Down by 1px', accelerator: 'Down', click: () => negative.move('down', 1), enabled: canMove },
							MENU_SEPARATOR,
							{ label: 'Right by 10px', accelerator: 'Shift+Right', click: () => negative.move('right', 10), enabled: canMove },
							{ label: 'Left by 10px', accelerator: 'Shift+Left',  click: () => negative.move('left', 10), enabled: canMove },
							{ label: 'Up by 10px', accelerator: 'Shift+Up', click: () => negative.move('up', 10), enabled: canMove },
							{ label: 'Down by 10px', accelerator: 'Shift+Down', click: () => negative.move('down', 10), enabled: canMove }
						]
					}
				]
			}
		];
		
		const menu = Menu.buildFromTemplate(template);
		Menu.setApplicationMenu(menu);
	},

	refreshForSettingsWindow() {
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
	}
};
