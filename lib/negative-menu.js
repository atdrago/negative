'use strict';

const { 
	app,
	BrowserWindow, 
	clipboard, 
	Menu, 
	ipcMain 
} = require('electron');

const MENU_SEPARATOR = { type: 'separator' };

let template = null;

module.exports = {
	init(negative) {
		ipcMain.on('refresh-menu', (evt, menuStates) => this.refresh(menuStates));

		template = [
			{
				label: 'Negative',
				submenu: [
					{ label: 'About Negative', selector: 'orderFrontStandardAboutPanel:' },
					MENU_SEPARATOR,
					{ label: 'Preferences...', accelerator: 'Command+,', click: negative.initSettingsWindow },
					MENU_SEPARATOR,
					{ label: 'Quit Negative',  accelerator: 'Command+Q', click: app.quit }
				]
			},
			{
				label: 'File',
				submenu: [
					{ label: 'New Tab',      accelerator: 'Command+T',       click: negative.addTab },
					{ label: 'New Window',   accelerator: 'Command+N',       click: negative.initNegativeWindow },
					MENU_SEPARATOR,
					{ label: 'Close Tab',    accelerator: 'Command+W',       click: negative.closeTab },
					{ label: 'Close Window', accelerator: 'Shift+Command+W', selector: 'performClose:' },
					{ label: 'Close',        accelerator: 'Command+W',       selector: 'performClose:', visible: false }
				]
			},
			{
				label: 'Edit',
				submenu: [
					{ label: 'Undo',    accelerator: 'Command+Z',         enabled: false, click: negative.undo },
					{ label: 'Redo',    accelerator: 'Shift+Command+Z',   enabled: false, click: negative.redo },
					MENU_SEPARATOR,
					{ label: 'Copy',    accelerator: 'Command+C',         enabled: false, click: negative.copy },
					{ label: 'Paste',   accelerator: 'Command+V',         enabled: false, click: negative.paste },
					{ label: 'Capture', accelerator: 'Command+G',         enabled: true,  click: negative.captureRegionBehindWindow },
					{ label: 'Delete',  accelerator: 'Command+Backspace', enabled: false, click: negative.removeImage }
				]
			},
			{
				label: 'View',
				submenu: [
					{ label: 'Reload',          accelerator: 'Command+R',     click: () => BrowserWindow.getFocusedWindow().reload() },
					{ label: 'Toggle DevTools', accelerator: 'Alt+Command+I', click: () => BrowserWindow.getFocusedWindow().toggleDevTools() }
				]
			},
			{
				label: 'Window',
				submenu: [
					{ label: 'Minimize',                accelerator: 'Command+M',           role: 'minimize' },
					{ label: 'Fit Window to Image',     accelerator: 'Command+F',           enabled: false, click: negative.fitWindowToImage },
					{ label: 'Next Tab',                accelerator: 'Command+Right',       enabled: false, click: negative.selectNextTab },
					{ label: 'Previous Tab',            accelerator: 'Command+Left',        enabled: false, click: negative.selectPreviousTab },
					{ label: 'Next Tab and Resize',     accelerator: 'Shift+Command+Right', enabled: false, click: negative.selectNextTabAndResizeWindowToFitImage },
					{ label: 'Previous Tab and Resize', accelerator: 'Shift+Command+Left',  enabled: false, click: negative.selectPreviousTabAndResizeWindowToFitImage },
					{
						label: 'Move',
						submenu: [
							{ label: 'Right by 1px',    accelerator: 'Right',       click: () => negative.move('right', 1) },
							{ label: 'Left by 1px',     accelerator: 'Left',        click: () => negative.move('left', 1) },
							{ label: 'Up by 1px',       accelerator: 'Up',          click: () => negative.move('up', 1) },
							{ label: 'Down by 1px',     accelerator: 'Down',        click: () => negative.move('down', 1) },
							MENU_SEPARATOR,
							{ label: 'Right by 10px',   accelerator: 'Shift+Right', click: () => negative.move('right', 10) },
							{ label: 'Left by 10px',    accelerator: 'Shift+Left',  click: () => negative.move('left', 10) },
							{ label: 'Up by 10px',      accelerator: 'Shift+Up',    click: () => negative.move('up', 10) },
							{ label: 'Down by 10px',    accelerator: 'Shift+Down',  click: () => negative.move('down', 10) }
						]
					}
				]
			}
		];
		
		const menu = Menu.buildFromTemplate(template);
		Menu.setApplicationMenu(menu);
	},
	
	_processFileSubmenuItems(menuStates, fileSubmenuItems, isSettingsWindow) {
		if (fileSubmenuItems) {
			isSettingsWindow = !!isSettingsWindow;
			
			for (const fileItem of fileSubmenuItems) {
				switch (fileItem.label) {
					case 'New Tab': 
						fileItem.enabled = menuStates.canAddTab; 
						break;
					case 'Close Tab':
						fileItem.enabled = menuStates.canCloseTab;
						fileItem.visible = !isSettingsWindow;
						break;
					case 'Close Window':
						fileItem.enabled = menuStates.canCloseWindow;
						fileItem.visible = !isSettingsWindow;
						break;
					case 'Close':
						fileItem.visible = isSettingsWindow;
						break;
				}
			}
		}
	},
	
	_processEditSubmenuItems(menuStates, editSubmenuItems) {
		if (editSubmenuItems) {
			for (const editItem of editSubmenuItems) {
				switch (editItem.label) {
					case 'Undo':
						editItem.enabled = menuStates.canUndo; 
						break;
					case 'Redo': 
						editItem.enabled = menuStates.canRedo; 
						break;
					case 'Capture': 
						editItem.enabled = menuStates.canCapture; 
						break;
					case 'Copy': 
						editItem.enabled = !menuStates.isImageEmpty; 
						break;
					case 'Paste': 
						editItem.enabled = !clipboard.readImage().isEmpty(); 
						break;
					case 'Delete': 
						editItem.enabled = !menuStates.isImageEmpty; 
						break;
				}
			}
		}
	},
	
	_processViewSubmenuItems(menuStates, viewSubmenuItems) {
		if (viewSubmenuItems) {
			for (const viewItem of viewSubmenuItems) {
				switch (viewItem.label) {
					case 'Reload': 
						viewItem.enabled = menuStates.canReload; 
						break;
					case 'Toggle DevTools': 
						viewItem.enabled = menuStates.canToggleDevTools; 
						break;
				}
			}
		}
	},
	
	_processWindowSubmenuItems(menuStates, windowSubmenuItems) {
		if (windowSubmenuItems) {
			for (const windowItem of windowSubmenuItems) {
				switch (windowItem.label) {
					case 'Minimize': 
						windowItem.enabled = menuStates.canMinimize; 
						break;
					case 'Fit Window to Image': 
						windowItem.enabled = !menuStates.isImageEmpty; 
						break;
					case 'Next Tab': 
						windowItem.enabled = menuStates.canSelectNextTab; 
						break;
					case 'Previous Tab': 
						windowItem.enabled = menuStates.canSelectPreviousTab; 
						break;
					case 'Next Tab and Resize': 
						windowItem.enabled = menuStates.canSelectNextTab; 
						break;
					case 'Previous Tab and Resize': 
						windowItem.enabled = menuStates.canSelectPreviousTab; 
						break;
					case 'Move':
						const moveSubmenuItems = windowItem.submenu;
						for (const moveItem of moveSubmenuItems) {
							moveItem.enabled = menuStates.canMove;
						}
						break;
				}
			}
		}
	},

	refresh(menuStates, isSettingsWindow) {
		if (menuStates) {
			for (const item of template) {
				switch (item.label) {
					case 'File':
						this._processFileSubmenuItems(menuStates, item.submenu, isSettingsWindow);
						break;
					case 'Edit':
						this._processEditSubmenuItems(menuStates, item.submenu);
						break;
					case 'View':
						this._processViewSubmenuItems(menuStates, item.submenu);
						break;
					case 'Window':
						this._processWindowSubmenuItems(menuStates, item.submenu);
						break;
				}
			}
		}
		
		const menu = Menu.buildFromTemplate(template);
		Menu.setApplicationMenu(menu);
	},

	refreshForSettingsWindow() {
		// @TODO - Move default Menu settings to a central file
		this.refresh({
			canAddTab: false,
			canCloseTab: false,
			canCloseWindow: false,
			canUndo: false,
			canRedo: false,
			canCapture: false,
			isImageEmpty: true,
			canSelectPreviousTab: false,
			canSelectNextTab: false,
			canReload: true,
			canToggleDevTools: true,
			canMinimize: true,
			canMove: false
		}, true);
	},

	refreshForNoWindow() {
		// @TODO - Move default Menu settings to a central file
		this.refresh({
			canAddTab: false,
			canCloseTab: false,
			canCloseWindow: false,
			canUndo: false,
			canRedo: false,
			canCapture: false,
			isImageEmpty: true,
			canSelectPreviousTab: false,
			canSelectNextTab: false,
			canReload: false,
			canToggleDevTools: false,
			canMinimize: false,
			canMove: false
		}, false);
	}
};
