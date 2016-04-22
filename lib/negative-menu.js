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
	canMove: true
};

let template = null;

module.exports = {
	init(negative) {
		ipcMain.on('refresh-menu', (evt, menuStates) => this.refresh(menuStates));
		
		template = [
			{
				label: 'Negative',
				submenu: [
					{ label: 'About Negative', role: 'about' },
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
					{ label: 'Paste',   accelerator: 'Command+V',         enabled: false, click: negative.paste }
				]
			},
			{
				label: 'View',
				submenu: [
					{ label: 'Capture',         accelerator: 'Command+G',         enabled: true,  click: negative.captureRegionBehindWindow },
					{ label: 'Clear',           accelerator: 'Command+Backspace', enabled: false, click: negative.removeImage },
					MENU_SEPARATOR,
					{ label: 'Actual Size',     accelerator: 'Command+0',         enabled: false, click: () => negative.zoomTo(1) },
					{ label: 'Zoom In',         accelerator: 'Command+Plus',      enabled: false, click: negative.zoomIn },
					{ label: 'Zoom Out',        accelerator: 'Command+-',         enabled: false, click: negative.zoomOut },
					MENU_SEPARATOR,
					{ label: 'Reload',          accelerator: 'Command+R',         click: () => BrowserWindow.getFocusedWindow().reload() },
					{ label: 'Toggle DevTools', accelerator: 'Alt+Command+I',     click: () => BrowserWindow.getFocusedWindow().toggleDevTools() }
				]
			},
			{
				label: 'Window',
				submenu: [
					{ label: 'Minimize',                accelerator: 'Command+M',     role: 'minimize' },
					{ label: 'Fit Window to Image',     accelerator: 'Command+F',     click: negative.fitWindowToImage, enabled: false },
					{ label: 'Next Tab',                accelerator: 'Command+}',     click: negative.selectNextTab },
					{ label: 'Previous Tab',            accelerator: 'Command+{',     click: negative.selectPreviousTab },
					{ label: 'Next Tab and Resize',     accelerator: 'Alt+Command+}', click: negative.selectNextTabAndResizeWindowToFitImage },
					{ label: 'Previous Tab and Resize', accelerator: 'Alt+Command+{', click: negative.selectPreviousTabAndResizeWindowToFitImage },
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

	refresh(menuStates, isSettingsWindow) {
		const menus = [ 'File', 'Edit', 'View', 'Window' ];
		
		menuStates = Object.assign(defaultMenuStates, menuStates);
		
		if (menuStates) {
			for (const item of template) {
				if (menus.indexOf(item.label) !== -1) {
					for (const submenuItem of item.submenu) {
						switch (submenuItem.label) {
							// File
							case 'New Tab': 
								submenuItem.enabled = menuStates.canAddTab; 
								break;
							case 'Close Tab':
								submenuItem.enabled = menuStates.canCloseTab;
								submenuItem.visible = !isSettingsWindow;
								break;
							case 'Close Window':
								submenuItem.enabled = menuStates.canCloseWindow;
								submenuItem.visible = !isSettingsWindow;
								break;
							case 'Close':
								submenuItem.visible = isSettingsWindow;
								break;
							// Edit
							case 'Undo':
								submenuItem.enabled = menuStates.canUndo; 
								break;
							case 'Redo': 
								submenuItem.enabled = menuStates.canRedo; 
								break;
							case 'Copy': 
								submenuItem.enabled = !menuStates.isImageEmpty; 
								break;
							case 'Paste': 
								submenuItem.enabled = !clipboard.readImage().isEmpty(); 
								break;
							// View
							case 'Capture': 
								submenuItem.enabled = menuStates.canCapture; 
								break;
							case 'Clear': 
								submenuItem.enabled = !menuStates.isImageEmpty; 
								break;
							case 'Actual Size':
								submenuItem.enabled = !menuStates.isImageEmpty;
								break;
							case 'Zoom In':
								submenuItem.enabled = menuStates.canZoomIn;
								break;
							case 'Zoom Out':
								submenuItem.enabled = menuStates.canZoomOut;
								break;
							case 'Reload': 
								submenuItem.enabled = menuStates.canReload; 
								break;
							case 'Toggle DevTools': 
								submenuItem.enabled = menuStates.canToggleDevTools; 
								break;
							// Window
							case 'Minimize': 
								submenuItem.enabled = menuStates.canMinimize; 
								break;
							case 'Fit Window to Image': 
								submenuItem.enabled = !menuStates.isImageEmpty; 
								break;
							case 'Move':
								for (const moveItem of submenuItem.submenu) {
									moveItem.enabled = menuStates.canMove;
								}
								break;
						}
					}
				}
			}
		}
		
		const menu = Menu.buildFromTemplate(template);
		Menu.setApplicationMenu(menu);
	},

	refreshForSettingsWindow() {
		this.refresh({
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
			canMove: false
		}, true);
	},

	refreshForNoWindow() {
		this.refresh({
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
			canMove: false
		}, false);
	}
};
