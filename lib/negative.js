'use strict';

const {
	app,
	BrowserWindow,
	globalShortcut,
	ipcMain
} = require('electron');

const electronWindow   = require('electron-window');
const path             = require('path');
const objc             = require('nodobjc');
const negativeMenu     = require('./negative-menu');
const negativeSettings = require('./negative-settings');

const DEFAULT_WINDOW_HEIGHT = 600;
const DEFAULT_WINDOW_WIDTH  = 800;
const FRAME_WIDTH           = 10;
const TAB_HEIGHT            = 37;
const HEIGHT_COMPENSATION   = FRAME_WIDTH + TAB_HEIGHT;
const WIDTH_COMPENSATION    = FRAME_WIDTH + FRAME_WIDTH;

let isAppHidden      = false;
// let isAppLocked      = false;
let mainWindowId     = null;
let settingsWindowId = null;

objc.framework('Cocoa');

module.exports = {
	init() {
		negativeMenu.init(this);
		negativeSettings.init(() => {
			const negativeWindows = negativeSettings.get('windowSettings');
			
			if (!negativeWindows || negativeWindows.length === 0) {
				this.initNegativeWindow();
			} else {
				negativeWindows.forEach((_window) => this.initNegativeWindow(_window));
			}
		});

		this.initGlobalShortcuts();
		this.initIpcEvents();
	},
	
	quit() {
		const windowsKeys     = Object.keys(electronWindow.windows).filter((key) => key !== settingsWindowId);
		const windowCount     = windowsKeys.length;
		const negativeWindows = [];

		if (windowCount > 0) {
			ipcMain.on('window-settings-response', (evt, _window) => {
				negativeWindows.push(_window);
				
				if (negativeWindows.length === windowCount) {
					negativeSettings.set('windowSettings', negativeWindows);
					negativeSettings.save(() => app.quit());
				}
			});
			
			for (const key of windowsKeys) {
				const _window = electronWindow.windows[key];
				const windowSettings = { 
					bounds: _window.getBounds(),
					isFocused: _window.isFocused()
				};
				
				_window.webContents.send('window-settings-request', windowSettings);
			}
		} else {
			negativeSettings.set('windowSettings', []);
			negativeSettings.save(() => app.quit());
		}
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
				if (settings.hasOwnProperty(key)) {
					negativeSettings.set(key, settings[key]);
				}
			}

			negativeSettings.save();

			const windows = electronWindow.windows;

			for (const key in windows) {
				if (windows.hasOwnProperty(key) && settingsWindowId !== key) {
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
	
	initGlobalShortcuts() {
		globalShortcut.register('Command+Control+H', () => {
			const windows = electronWindow.windows;

			for (const key in windows) {
				if (windows.hasOwnProperty(key) && settingsWindowId !== key) {
					const _window = windows[key];
					
					if (isAppHidden) {
						_window.show();
					} else {
						_window.hide();
					}
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
	},
	
	getNewNegativeWindow(_window) {
		const bounds = _window ? _window.bounds : {};
		
		return electronWindow.createWindow({
			acceptFirstMouse: true,
			alwaysOnTop: true,
			enableLargerThanScreen: true,
			fullscreen: false,
			hasShadow: false,
			height: bounds.height || DEFAULT_WINDOW_HEIGHT,
			frame: false,
			title: 'Negative',
			transparent: true,
			webPreferences: {
				webgl: false,
				webaudio: false,
				experimentalFeatures: true,
				experimentalCanvasFeatures: true
			},
			width: bounds.width || DEFAULT_WINDOW_WIDTH,
			x: bounds.x,
			y: bounds.y
		});
	},

	initNegativeWindow(_window) {
		const newWindow = this.getNewNegativeWindow(_window);
		const isFocused = _window && _window.isFocused;
	
		newWindow.webContents.on('dom-ready', () => {
			const delayBeforeWindowFocus = 100;
			
			setTimeout(() => {
				if (_window) {
					if (isFocused) {
						this.setWindowFocused(newWindow);
						newWindow.focus();
					} else {
						this.setWindowBlurred(newWindow);
						newWindow.blur();
					}
				} else {
					this.changeFocusToWindow(newWindow);
				}
			}, delayBeforeWindowFocus);
		});
		
		newWindow.showUrl(path.resolve(__dirname, '../view/index.html'), () => {
			const self = this;
			
			newWindow.on('focus', function () {
				self.changeFocusToWindow(this);
			});

			newWindow.on('blur', () => {
				this.changeFocusToWindow(null);
			});

			newWindow.on('closed', () => {
				if (Object.keys(electronWindow.windows).length === 0) {
					negativeMenu.refreshForNoWindow();
				}
			});
		});
		
		const undoManagers = _window && _window.undoManagers;
		
		if (!undoManagers) {
			// New empty window
			newWindow.webContents.executeJavaScript(`
				negative.tabsController.addTab(true);
				negative.tabsController.selectTabByIndex(0);
			`);
		} else {
			let addTabsString = '';
			undoManagers.forEach((undoManager) => {
				const undoManagerString = JSON.stringify(undoManager);
				addTabsString += `negative.addTabForUndoManager(${undoManagerString});`;
			});
			newWindow.webContents.executeJavaScript(`
				${addTabsString}
				negative.tabsController.deselectTab();
				negative.tabsController.selectTabByIndex(0);
			`);
		}
	},

	initSettingsWindow() {
		if (!settingsWindowId) {
			const settingsWindow = electronWindow.createWindow({
				acceptFirstMouse: true,
				alwaysOnTop: true,
				fullscreen: false,
				height: 92,
				resizable: false,
				title: 'Negative - Preferences',
				webPreferences: {
					webgl: false,
					webaudio: false,
					experimentalFeatures: false,
					experimentalCanvasFeatures: false
				},
				width: 320
			});

			settingsWindow.showUrl(path.resolve(__dirname, '../view/settings.html'), () => {
				settingsWindowId = `${settingsWindow.id}`;

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

	changeFocusToWindow(newWindow) {
		const currentWindow = electronWindow.windows[mainWindowId];
		
		if (currentWindow) {
			let currentWindowScript = 'negative.frameController.unsetFocused();';
			
			if (newWindow) {
				currentWindowScript += 'negative.frameController.unsetPrimary();';
			}
			
			currentWindow.webContents.executeJavaScript(currentWindowScript);
		}

		if (newWindow) {
			newWindow.webContents.executeJavaScript(`
				negative.frameController.setFocused();
				negative.frameController.setPrimary();
				negative.refreshMenu();
			`);

			mainWindowId = newWindow.id;
		}
	},
	
	setWindowFocused(_window) {
		if (_window) {
			_window.webContents.executeJavaScript(`
				negative.frameController.setFocused();
				negative.frameController.setPrimary();
				negative.refreshMenu();
			`);

			mainWindowId = _window.id;
		}
	},

	setWindowBlurred(_window) {
		if (_window) {
			_window.webContents.executeJavaScript(`
				negative.frameController.unsetFocused();
				negative.frameController.unsetPrimary();
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

			/* eslint-disable new-cap */
			const pool     = objc.NSAutoreleasePool('alloc')('init');
			const rect     = objc.NSMakeRect(newImageX, newImageY, newImageWidth, newImageHeight);
			const windowId = objc.NSApplication('sharedApplication')('keyWindow')('windowNumber');
			const cgImage  = objc.CGWindowListCreateImage(rect, objc.kCGWindowListOptionOnScreenBelowWindow, windowId, objc.kCGWindowImageDefault);
			const newRep   = objc.NSBitmapImageRep('alloc')('initWithCGImage', cgImage);
			/* eslint-enable new-cap */

			newRep('setSize', rect.size);

			const pngData = newRep('representationUsingType', objc.NSPNGFileType, 'properties', null);
			const base64  = pngData('base64EncodedStringWithOptions', 0);
			const uri     = `data:image/png;base64,${base64}`;

			focusedWindow.webContents.executeJavaScript(`
				negative.frameController.setImageAndSize('${uri}', ${newImageWidth}, ${newImageHeight});
				negative.saveForUndo({
					imageDimensions: [${newImageWidth}, ${newImageHeight}],
					imageSrc: '${uri}'
				});
			`);

			pool('drain');
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
				default:
					return;
			}

			focusedWindow.setPosition(currentPosition[0], currentPosition[1]);
		}
	},
	
	executeJavaScriptInFocusedWindow(js) {
		const focusedWindow = BrowserWindow.getFocusedWindow();
		
		if (focusedWindow) {
			focusedWindow.webContents.executeJavaScript(js);
		}
	},
	
	removeImage() {
		this.executeJavaScriptInFocusedWindow(`
			negative.frameController.removeImage();
			negative.saveForUndo({
				imageDimensions: null,
				imageSrc: null
			});
		`);
	},

	undo() {
		this.executeJavaScriptInFocusedWindow(`
			negative.undo();
		`);
	},

	redo() {
		this.executeJavaScriptInFocusedWindow(`
			negative.redo();
		`);
	},

	copy() {
		this.executeJavaScriptInFocusedWindow(`
			negative.tabsController.copy();
		`);
	},

	paste() {
		this.executeJavaScriptInFocusedWindow(`
			negative.tabsController.paste();
		`);
	},
	
	addTab() {
		this.executeJavaScriptInFocusedWindow(`
			negative.tabsController.addTab(true);
		`);
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
		this.executeJavaScriptInFocusedWindow(`
			negative.tabsController.selectNextTab();
		`);
	},

	selectNextTabAndResizeWindowToFitImage() {
		this.executeJavaScriptInFocusedWindow(`
			negative.tabsController.selectNextTab();
			negative.tabsController.fitWindowToImage();
		`);
	},

	selectPreviousTab() {
		this.executeJavaScriptInFocusedWindow(`
			negative.tabsController.selectPreviousTab();
		`);
	},

	selectPreviousTabAndResizeWindowToFitImage() {
		this.executeJavaScriptInFocusedWindow(`
			negative.tabsController.selectPreviousTab();
			negative.tabsController.fitWindowToImage();
		`);
	},

	fitWindowToImage() {
		this.executeJavaScriptInFocusedWindow(`
			negative.tabsController.fitWindowToImage();
		`);
	},
	
	zoomIn() {
		this.executeJavaScriptInFocusedWindow(`
			negative.frameController.zoomIn();
		`);
	},
	
	zoomOut() {
		this.executeJavaScriptInFocusedWindow(`
			negative.frameController.zoomOut();
		`);
	},
	
	zoomTo(zoomLevel) {
		this.executeJavaScriptInFocusedWindow(`
			negative.frameController.zoomTo(${zoomLevel});
		`);
	}
	
	
};
