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

const {
	NEGATIVE_IGNORE_SETTINGS,
	NEGATIVE_SKIP_RESET_DIALOG,
	NODE_ENV
} = process.env;

const DEFAULT_WINDOW_HEIGHT = 600;
const DEFAULT_WINDOW_WIDTH  = 800;
const FRAME_WIDTH           = 10;
const TAB_HEIGHT            = 37;
const HEIGHT_COMPENSATION   = FRAME_WIDTH + TAB_HEIGHT;
const WIDTH_COMPENSATION    = FRAME_WIDTH + FRAME_WIDTH;

let isAppHidden      = false;
let isDarkMode       = true;
// let isAppLocked   = false;
let mainWindowId     = null;
let settingsWindowId = null;

objc.framework('Cocoa');

module.exports = {
	get isDarkMode() {
		return isDarkMode;
	},
	
	init() {
		this.negativeMenu = require('./negative-menu');
		this.negativeSettings = require('./negative-settings');
		
		this.negativeMenu.init(this);
		this.negativeSettings.init(() => {
			isDarkMode = this.negativeSettings.get('isDarkMode');
			
			const negativeWindows = this.negativeSettings.get('windowSettings');
			
			if (!negativeWindows || negativeWindows.length === 0 || NEGATIVE_IGNORE_SETTINGS === 'true') {
				this.initNegativeWindow();
			} else {
				negativeWindows.forEach((_window) => this.initNegativeWindow(_window));
			}
		});

		this.initGlobalShortcuts();
		this.initIpcEvents();
		
		if (NODE_ENV === 'development') {
			require('./negative-test').init();
		}
		
		app.on('before-quit', () => {
			// Save settings before quitting.
			const negativeWindows = [];
			const windowsKeys     = Object.keys(electronWindow.windows).filter((key) => key !== settingsWindowId);
			const windowCount     = windowsKeys.length;

			if (windowCount > 0) {
				for (const key of windowsKeys) {
					const _window = electronWindow.windows[key];
					const windowSettings = {
						bounds: _window.getBounds(),
						// Always set the last focused window as the window to be focused
						// on next launch. All others should not be focused.
						isFocused: (key === mainWindowId),
						undoManagers: _window.undoManagers,
						zoomLevel: _window.zoomLevel
					};
					
					negativeWindows.push(windowSettings);
				}
			}
			
			this.negativeSettings.set('windowSettings', negativeWindows);
			this.negativeSettings.save();
		});
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
					this.negativeSettings.set(key, settings[key]);
				}
			}

			this.negativeSettings.save();

			const windows = electronWindow.windows;

			for (const key in windows) {
				if (windows.hasOwnProperty(key) && settingsWindowId !== key) {
					const shouldShowTips = this.negativeSettings.get('shouldShowTips');
					const _window        = windows[key];
					
					_window.webContents.executeJavaScript(`negative.frameController.setShouldShowTips(${shouldShowTips})`);
				}
			}
		});

		ipcMain.on('get-settings-request', (evt) => {
			evt.sender.send('get-settings-response', this.negativeSettings.settings);
		});
		
		ipcMain.on('set-undo-managers-request', (evt, undoManagers) => {
			electronWindow.windows[evt.sender.id].undoManagers = undoManagers;
		});
		
		ipcMain.on('set-zoom-level-request', (evt, zoomLevel) => {
			electronWindow.windows[evt.sender.id].zoomLevel = zoomLevel;
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
		
		const newWindow = electronWindow.createWindow({
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
		
		newWindow.setSheetOffset(TAB_HEIGHT);
		
		return newWindow;
	},

	initNegativeWindow(_window) {
		const newWindow = this.getNewNegativeWindow(_window);
		const isFocused = _window && _window.isFocused !== false;
	
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
		
		// @TODO - This is not great. Will templating work??
		newWindow.showUrl(path.resolve(__dirname, this.isDarkMode ? '../view/index.html' : '../view/light-mode.html'), () => {
			const self = this;
			
			newWindow.on('focus', function () {
				self.changeFocusToWindow(this);
			});

			newWindow.on('blur', () => {
				this.changeFocusToWindow(null);
			});

			newWindow.on('closed', () => {
				if (Object.keys(electronWindow.windows).length === 0) {
					this.negativeMenu.refreshForNoWindow();
				}
			});
		});
		
		const {
			undoManagers,
			zoomLevel
		} = _window || {};
		
		let setupJs = '';
		
		if (!undoManagers) {
			// New empty window
			setupJs += 'negative.tabsController.addTab(true);';
		} else {
			undoManagers.forEach((undoManager) => {
				setupJs += `negative.addTabForUndoManager(${JSON.stringify(undoManager)});`;
			});
			
			setupJs += 'negative.tabsController.deselectTab();';
		}
		
		setupJs += 'negative.tabsController.selectTabByIndex(0);';
		
		if (typeof zoomLevel !== 'undefined') {
			setupJs += `negative.frameController.zoomTo(${zoomLevel});`;
		}
		
		newWindow.webContents.executeJavaScript(setupJs);
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
						this.negativeMenu.refreshForNoWindow();
					}
				});

				settingsWindow.on('focus', () => this.negativeMenu.refreshForSettingsWindow());

				this.negativeMenu.refreshForSettingsWindow();
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

			mainWindowId = `${newWindow.id}`;
		}
	},
	
	setWindowFocused(_window) {
		if (_window) {
			_window.webContents.executeJavaScript(`
				negative.frameController.setFocused();
				negative.frameController.setPrimary();
				negative.refreshMenu();
			`);

			mainWindowId = `${_window.id}`;
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
	
	executeJavaScriptInAllWindows(js) {
		const windows = electronWindow.windows;
		
		for (const key in windows) {
			if (windows.hasOwnProperty(key) && key !== settingsWindowId) {
				windows[key].webContents.executeJavaScript(js);
			}
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
	},
	
	reset() {
		const _reset = function _reset() {
			const windows = electronWindow.windows;
			
			for (const key in windows) {
				if (windows.hasOwnProperty(key)) {
					windows[key].close();
				}
			}
			
			this.initNegativeWindow();
		}.bind(this);
		
		if (NEGATIVE_SKIP_RESET_DIALOG === 'true') {
			_reset();
		} else {
			ipcMain.once('confirm-reset-response', (event, shouldReset) => {
				if (shouldReset) {
					_reset();
				}
			});
			
			this.executeJavaScriptInFocusedWindow(`
				negative.confirmReset();
			`);
		}
		
	},

	toggleDarkMode() {
		isDarkMode = !isDarkMode;
		this.negativeSettings.set('isDarkMode', isDarkMode);
		this.negativeSettings.save();
		
		this.executeJavaScriptInAllWindows(`
			negative.toggleDarkMode();
		`);
	}
};
