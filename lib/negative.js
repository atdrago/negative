'use strict';

const {
	app,
	BrowserWindow,
	globalShortcut,
	ipcMain,
	nativeImage
} = require('electron');

const dataUri          = require('datauri');
const electronWindow   = require('electron-window');
const { exec }         = require('child_process');
const fs               = require('fs');
const path             = require('path');
const objc             = require('nodobjc');
const negativeMenu     = require('./negative-menu');
const negativeSettings = require('./negative-settings');

const FRAME_WIDTH         = 10;
const TAB_HEIGHT          = 37;
const HEIGHT_COMPENSATION = FRAME_WIDTH + TAB_HEIGHT;
const WIDTH_COMPENSATION  = FRAME_WIDTH * 2;

let isAppHidden      = false;
let isAppLocked      = false;
let mainWindowId     = null;
let settingsWindowId = null;

function changeFocusToWindow(newWindow) {
	const currentWindow = electronWindow.windows[mainWindowId];

	// @TODO - Should these really be `null` checks?
	if (currentWindow != null) {
		currentWindow.webContents.executeJavaScript(`
			negative.frameController.unsetFocused();
		`);
	}

	if (newWindow != null) {
		if (currentWindow != null) {
			currentWindow.webContents.executeJavaScript(`
				negative.frameController.unsetPrimary();
			`);
		}
		newWindow.webContents.executeJavaScript(`
			negative.frameController.setFocused();
			negative.frameController.setPrimary();
			negative.tabsController.refreshMenu();
		`);

		mainWindowId = newWindow.id;
	}
}

objc.framework('Cocoa');

module.exports = {
	init() {
		negativeMenu.init(this);
		negativeSettings.init();

		this.initNegativeWindow();

		globalShortcut.register('Command+Control+H', () => {
			const windows = electronWindow.windows;

			for (const key in windows) {
				if (windows.hasOwnProperty(key) && settingsWindowId != key) {
					const _window = windows[key];
					isAppHidden ? _window.show() : _window.hide();
				}
			}

			isAppHidden = !isAppHidden;
		});

		// globalShortcut.register('Command+Control+L', function () {
		//	 let windows = electronWindow.windows;
		//
		//	 for (let key in windows) {
		//		 if (windows.hasOwnProperty(key) && settingsWindowId != key) {
		//			 let _window = windows[key];
		//
		//			 _window.setIgnoreMouseEvents(!isAppLocked);
		//		 }
		//	 }
		//
		//	 if (isAppLocked) {
		//		 changeFocusToWindow(windows[mainWindowId])
		//	 } else {
		//		 changeFocusToWindow(null)
		//	 }
		//
		//	 isAppLocked = !isAppLocked;
		// })

		this.initIpcEvents();
	},

	initIpcEvents() {
		ipcMain.on('fit-window-to-image', (evt, dimensions) => {
			const focusedWindow = BrowserWindow.getFocusedWindow();

			if (focusedWindow && dimensions) {
				focusedWindow.setSize(dimensions[0] + WIDTH_COMPENSATION, dimensions[1] + HEIGHT_COMPENSATION, true);
			}
		});

		ipcMain.on('set-settings-request', (evt, settings) => {
			for (const key in settings) {
				negativeSettings.set(key, settings[key]);
			}

			negativeSettings.save();

			const windows = electronWindow.windows;

			for (const key in windows) {
				if (windows.hasOwnProperty(key) && settingsWindowId != key) {
					const shouldShowTips = negativeSettings.get('shouldShowTips');
					const _window        = windows[key];
					
					_window.webContents.executeJavaScript(`negative.frameController.setShouldShowTips(${shouldShowTips})`);
				}
			}
		});

		ipcMain.on('get-settings-request', (evt) => {
			evt.sender.send('get-settings-response', negativeSettings.settings);
		});
	},

	initNegativeWindow() {
		// @TODO - Move default window options to a central file
		const newWindow = electronWindow.createWindow({
			acceptFirstMouse: true,
			alwaysOnTop: true,
			enableLargerThanScreen: true,
			fullscreen: false,
			hasShadow: false,
			height: 600,
			frame: false,
			title: 'Negative',
			transparent: true,
			webPreferences: {
				webgl: false,
				webaudio: false,
				experimentalFeatures: true,
				experimentalCanvasFeatures: true
			},
			width: 800
		});
		
		newWindow.webContents.on('dom-ready', () => changeFocusToWindow(newWindow));

		newWindow.showUrl(path.resolve(__dirname, '../view/index.html'), () => {
			newWindow.on('focus', function () {
				changeFocusToWindow(this);
			});

			newWindow.on('blur', () => changeFocusToWindow(null));

			newWindow.on('closed', () => {
				if (Object.keys(electronWindow.windows).length === 0) {
					negativeMenu.refreshForNoWindow();
				}
			});
		});
	},

	initSettingsWindow() {
		if (!settingsWindowId) {
			// @TODO - Move default window options to a central file
			const settingsWindow = electronWindow.createWindow({
				width: 320,
				height: 92,
				alwaysOnTop: true,
				fullscreen: false,
				title: 'Negative - Preferences',
				acceptFirstMouse: true,
				resizable: false,
				webPreferences: {
					webgl: false,
					webaudio: false,
					experimentalFeatures: false,
					experimentalCanvasFeatures: false
				}
			});

			settingsWindow.showUrl(path.resolve(__dirname, '../view/settings.html'), () => {
				settingsWindowId = settingsWindow.id;

				settingsWindow.on('closed', () => {
					settingsWindowId = null;

					if (Object.keys(electronWindow.windows).length === 0) {
						negativeMenu.refreshForNoWindow();
					}
				});

				settingsWindow.on('focus', () => negativeMenu.refreshForSettingsWindow());

				negativeMenu.refreshForSettingsWindow();
			});
		} else {
			electronWindow.windows[settingsWindowId].focus();
		}
	},

	addTab() {
		const focusedWindow = BrowserWindow.getFocusedWindow();

		if (focusedWindow) {
			focusedWindow.webContents.executeJavaScript(`
				negative.tabsController.addTab(${focusedWindow.tabIndex});
			`);
		}
	},

	closeTab() {
		const focusedWindow = BrowserWindow.getFocusedWindow();

		if (focusedWindow) {
			focusedWindow.webContents.executeJavaScript(`
				negative.tabsController.closeTab(${focusedWindow.tabIndex});
			`);
		}
	},

	selectNextTab() {
		const focusedWindow = BrowserWindow.getFocusedWindow();

		if (focusedWindow) {
			focusedWindow.webContents.executeJavaScript(`
				negative.tabsController.selectNextTab();
			`);
		}
	},

	selectNextTabAndResizeWindowToFitImage() {
		const focusedWindow = BrowserWindow.getFocusedWindow();

		if (focusedWindow) {
			focusedWindow.webContents.executeJavaScript(`
				negative.tabsController.selectNextTab();
				negative.tabsController.fitWindowToImage();
			`);
		}
	},

	selectPreviousTab() {
		const focusedWindow = BrowserWindow.getFocusedWindow();

		if (focusedWindow) {
			focusedWindow.webContents.executeJavaScript(`
				negative.tabsController.selectPreviousTab();
			`);
		}
	},

	selectPreviousTabAndResizeWindowToFitImage() {
		const focusedWindow = BrowserWindow.getFocusedWindow();

		if (focusedWindow) {
			focusedWindow.webContents.executeJavaScript(`
				negative.tabsController.selectPreviousTab();
				negative.tabsController.fitWindowToImage();
			`);
		}
	},

	captureRegionBehindWindow() {
		const focusedWindow = BrowserWindow.getFocusedWindow();

		if (focusedWindow) {
			const bounds         = focusedWindow.getBounds();
			const newImageX      = bounds.x + FRAME_WIDTH;
			const newImageY      = bounds.y + TAB_HEIGHT;
			const newImageWidth  = bounds.width - WIDTH_COMPENSATION;
			const newImageHeight = bounds.height - HEIGHT_COMPENSATION;

			const pool     = objc.NSAutoreleasePool('alloc')('init');
			const rect     = objc.NSMakeRect(newImageX, newImageY, newImageWidth, newImageHeight);
			const windowId = objc.NSApplication('sharedApplication')('keyWindow')('windowNumber');
			const cgImage  = objc.CGWindowListCreateImage(rect, objc.kCGWindowListOptionOnScreenBelowWindow, windowId, objc.kCGWindowImageDefault);
			const newRep   = objc.NSBitmapImageRep('alloc')('initWithCGImage', cgImage);

			newRep('setSize', rect.size);

			const pngData = newRep('representationUsingType', objc.NSPNGFileType, 'properties', null);
			const base64  = pngData('base64EncodedStringWithOptions', 0);
			const uri     = `data:image/png;base64,${base64}`;

			focusedWindow.webContents.executeJavaScript(`
				negative.frameController.setImageAndSize('${uri}', ${newImageWidth}, ${newImageHeight});
				negative.tabsController.saveForUndo({
					imageDimensions: [${newImageWidth}, ${newImageHeight}],
					imageSrc: '${uri}'
				});
			`);

			pool('drain');
		}
	},

	removeImage() {
		const focusedWindow = BrowserWindow.getFocusedWindow();

		if (focusedWindow) {
			focusedWindow.webContents.executeJavaScript(`
				negative.frameController.removeImage();
				negative.tabsController.saveForUndo({
					imageDimensions: null,
					imageSrc: null
				});
			`);
		}
	},

	undo() {
		const focusedWindow = BrowserWindow.getFocusedWindow();

		if (focusedWindow) {
			focusedWindow.webContents.executeJavaScript(`
				negative.tabsController.undo();
			`);
		}
	},

	redo() {
		const focusedWindow = BrowserWindow.getFocusedWindow();

		if (focusedWindow) {
			focusedWindow.webContents.executeJavaScript(`
				negative.tabsController.redo();
			`);
		}
	},

	copy() {
		const focusedWindow = BrowserWindow.getFocusedWindow();

		if (focusedWindow) {
			focusedWindow.webContents.executeJavaScript(`
				negative.tabsController.copy();
			`);
		}
	},

	paste() {
		const focusedWindow = BrowserWindow.getFocusedWindow();

		if (focusedWindow) {
			focusedWindow.webContents.executeJavaScript(`
				negative.tabsController.paste();
			`);
		}
	},

	move(direction, amount) {
		const focusedWindow = BrowserWindow.getFocusedWindow();

		if (focusedWindow) {
			const currentPosition = focusedWindow.getPosition();

			switch (direction) {
				case 'up':
					currentPosition[1] -= amount;
					break;
				case 'right':
					currentPosition[0] += amount;
					break;
				case 'down':
					currentPosition[1] += amount;
					break;
				case 'left':
					currentPosition[0] -= amount;
					break;
			}

			focusedWindow.setPosition(currentPosition[0], currentPosition[1]);
		}
	},

	fitWindowToImage() {
		const focusedWindow = BrowserWindow.getFocusedWindow();

		if (focusedWindow) {
			focusedWindow.webContents.executeJavaScript(`
				negative.tabsController.fitWindowToImage();
			`);
		}
	}
};
