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
    let currentWindow = electronWindow.windows[mainWindowId];

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
            let windows = electronWindow.windows;

            for (let key in windows) {
                if (windows.hasOwnProperty(key) && settingsWindowId != key) {
                    let _window = windows[key];
                    isAppHidden ? _window.show() : _window.hide();
                }
            }

            isAppHidden = !isAppHidden;
        });

        // globalShortcut.register('Command+Control+L', function () {
        //     let windows = electronWindow.windows;
        //
        //     for (let key in windows) {
        //         if (windows.hasOwnProperty(key) && settingsWindowId != key) {
        //             let _window = windows[key];
        //
        //             _window.setIgnoreMouseEvents(!isAppLocked);
        //         }
        //     }
        //
        //     if (isAppLocked) {
        //         changeFocusToWindow(windows[mainWindowId])
        //     } else {
        //         changeFocusToWindow(null)
        //     }
        //
        //     isAppLocked = !isAppLocked;
        // })

        this.initIpcEvents();
    },

    initIpcEvents() {
        ipcMain.on('fit-window-to-image', (evt, dimensions) => {
            let focusedWindow = BrowserWindow.getFocusedWindow();

            if (focusedWindow && dimensions) {
                focusedWindow.setSize(dimensions[0] + WIDTH_COMPENSATION, dimensions[1] + HEIGHT_COMPENSATION);
            }
        });

        ipcMain.on('set-settings-request', (evt, settings) => {
            for (let key in settings) {
                negativeSettings.set(key, settings[key]);
            }

            negativeSettings.save();

            let windows = electronWindow.windows;

            for (let key in windows) {
                if (windows.hasOwnProperty(key) && settingsWindowId != key) {
                    let shouldShowTips = negativeSettings.get('shouldShowTips');
                    let _window        = windows[key];
                    
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
        let newWindow = electronWindow.createWindow({
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
        
        newWindow.webContents.on('dom-ready', function() {
            changeFocusToWindow(newWindow);
        });

        newWindow.showUrl(path.resolve(__dirname, '../view/index.html'), function() {
            newWindow.on('focus', function() {
                changeFocusToWindow(this);
            });

            newWindow.on('blur', function () {
                changeFocusToWindow(null);
            });

            newWindow.on('closed', function () {
                if (Object.keys(electronWindow.windows).length === 0) {
                    negativeMenu.refreshForNoWindow();
                }
            });
        });
    },

    initSettingsWindow() {
        if (!settingsWindowId) {
            // @TODO - Move default window options to a central file
            let settingsWindow = electronWindow.createWindow({
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

            settingsWindow.showUrl(path.resolve(__dirname, '../view/settings.html'), function () {
                settingsWindowId = settingsWindow.id;

                settingsWindow.on('closed', function () {
                    settingsWindowId = null;

                    if (Object.keys(electronWindow.windows).length === 0) {
                        negativeMenu.refreshForNoWindow();
                    }
                });

                settingsWindow.on('focus', function () {
                    negativeMenu.refreshForSettingsWindow();
                });

                negativeMenu.refreshForSettingsWindow();
            });
        } else {
            electronWindow.windows[settingsWindowId].focus();
        }
    },

    addTab() {
        let focusedWindow = BrowserWindow.getFocusedWindow();

        if (focusedWindow) {
            focusedWindow.webContents.executeJavaScript(
                `negative.tabsController.addTab(${focusedWindow.tabIndex});`
            );
        }
    },

    closeTab() {
        let focusedWindow = BrowserWindow.getFocusedWindow();

        if (focusedWindow) {
            focusedWindow.webContents.executeJavaScript(
                `negative.tabsController.closeTab(${focusedWindow.tabIndex});`
            );
        }
    },

    selectNextTab() {
        let focusedWindow = BrowserWindow.getFocusedWindow();

        if (focusedWindow) {
            focusedWindow.webContents.executeJavaScript('negative.tabsController.selectNextTab();');
        }
    },

    selectNextTabAndResizeWindowToFitImage() {
        let focusedWindow = BrowserWindow.getFocusedWindow();

        if (focusedWindow) {
            focusedWindow.webContents.executeJavaScript(
                'negative.tabsController.selectNextTab();' +
                'negative.tabsController.fitWindowToImage();'
            );
        }
    },

    selectPreviousTab() {
        let focusedWindow = BrowserWindow.getFocusedWindow();

        if (focusedWindow) {
            focusedWindow.webContents.executeJavaScript('negative.tabsController.selectPreviousTab();');
        }
    },

    selectPreviousTabAndResizeWindowToFitImage() {
        let focusedWindow = BrowserWindow.getFocusedWindow();

        if (focusedWindow) {
            focusedWindow.webContents.executeJavaScript(
                'negative.tabsController.selectPreviousTab();' +
                'negative.tabsController.fitWindowToImage();'
            );
        }
    },

    captureRegionBehindWindow() {
        let focusedWindow = BrowserWindow.getFocusedWindow();

        if (focusedWindow) {
            let bounds = focusedWindow.getBounds(),
                newImageX = bounds.x + FRAME_WIDTH,
                newImageY = bounds.y + TAB_HEIGHT,
                newImageWidth = bounds.width - WIDTH_COMPENSATION,
                newImageHeight = bounds.height - HEIGHT_COMPENSATION,

                pool = objc.NSAutoreleasePool('alloc')('init'),
                rect = objc.NSMakeRect(newImageX, newImageY, newImageWidth, newImageHeight),
                windowId = objc.NSApplication('sharedApplication')('keyWindow')('windowNumber'),
                cgImage = objc.CGWindowListCreateImage(rect, objc.kCGWindowListOptionOnScreenBelowWindow, windowId, objc.kCGWindowImageDefault),
                newRep = objc.NSBitmapImageRep('alloc')('initWithCGImage', cgImage);

            newRep('setSize', rect.size);

            let pngData = newRep('representationUsingType', objc.NSPNGFileType, 'properties', null);
            let uri = `data:image/png;base64,${pngData('base64EncodedStringWithOptions', 0)}`;

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
        let focusedWindow = BrowserWindow.getFocusedWindow();

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
        let focusedWindow = BrowserWindow.getFocusedWindow();

        if (focusedWindow) {
            focusedWindow.webContents.executeJavaScript('negative.tabsController.undo();');
        }
    },

    redo() {
        let focusedWindow = BrowserWindow.getFocusedWindow();

        if (focusedWindow) {
            focusedWindow.webContents.executeJavaScript('negative.tabsController.redo();');
        }
    },

    copy() {
        let focusedWindow = BrowserWindow.getFocusedWindow();

        if (focusedWindow) {
            focusedWindow.webContents.executeJavaScript('negative.tabsController.copy();');
        }
    },

    paste() {
        let focusedWindow = BrowserWindow.getFocusedWindow();

        if (focusedWindow) {
            focusedWindow.webContents.executeJavaScript('negative.tabsController.paste();');
        }
    },

    move(direction, amount) {
        let focusedWindow = BrowserWindow.getFocusedWindow();

        if (focusedWindow) {
            let currentPosition = focusedWindow.getPosition();

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
        let focusedWindow = BrowserWindow.getFocusedWindow();

        if (focusedWindow) {
            focusedWindow.webContents.executeJavaScript('negative.tabsController.fitWindowToImage();');
        }
    }
};
