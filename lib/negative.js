'use strict';

let app = require('app'),
    BrowserWindow = require('browser-window'),
    dataUri = require('datauri'),
    electronWindow = require('electron-window'),
    exec = require('child_process').exec,
    fs = require('fs'),
    globalShortcut = require('global-shortcut'),
    path = require('path'),
    nativeImage = require('electron').nativeImage,
    negativeMenu = require('./negative-menu'),
    negativeSettings = require('./negative-settings'),
    ipc = require('electron').ipcMain,
    objc = require('nodobjc'),

    isAppHidden = false,
    isAppLocked = false,
    mainWindowId = null,
    settingsWindowId = null;

const FRAME_WIDTH = 10,
    TAB_HEIGHT = 37,
    WIDTH_COMPENSATION = FRAME_WIDTH * 2,
    HEIGHT_COMPENSATION = FRAME_WIDTH + TAB_HEIGHT;

function changeFocusToWindow(newWindow) {
    let currentWindow = electronWindow.windows[mainWindowId];

    if (currentWindow != null) {
        currentWindow.webContents.executeJavaScript('negative.frameController.unsetFocused();');
    }

    if (newWindow != null) {
        newWindow.webContents.executeJavaScript(
            'negative.frameController.setFocused();' +
            'negative.tabsController.refreshMenu();'
        );

        mainWindowId = newWindow.id;
    }
}

objc.framework('Cocoa');

module.exports = {
    init() {
        negativeMenu.init(this);
        negativeSettings.init();

        this.initNegativeWindow();

        globalShortcut.register('Command+Control+H', function() {
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
        ipc.on('close-window', function () {
            let focusedWindow = BrowserWindow.getFocusedWindow();

            if (focusedWindow) {
                focusedWindow.close();
            }
        });

        ipc.on('fit-window-to-image', function (evt, dimensions) {
            let focusedWindow = BrowserWindow.getFocusedWindow();

            if (focusedWindow && dimensions) {
                focusedWindow.setSize(dimensions[0] + WIDTH_COMPENSATION, dimensions[1] + HEIGHT_COMPENSATION);
            }
        });

        ipc.on('set-settings-request', function (evt, settings) {
            for (let key in settings) {
                negativeSettings.set(key, settings[key]);
            }

            negativeSettings.save();

            let windows = electronWindow.windows;

            for (let key in windows) {
                if (windows.hasOwnProperty(key) && settingsWindowId != key) {
                    let _window = windows[key];
                    _window.webContents.executeJavaScript(`negative.frameController.setShouldShowTips(${negativeSettings.get('shouldShowTips')})`);
                }
            }
        });

        ipc.on('get-settings-request', function (evt) {
            evt.sender.send('get-settings-response', negativeSettings.settings);
        })
    },

    initNegativeWindow() {
        let newWindow = electronWindow.createWindow({
            width: 800,
            height: 600,
            transparent: true,
            titleBarStyle: 'hidden',
            alwaysOnTop: true,
            enableLargerThanScreen: true,
            fullscreen: false,
            title: 'Negative',
            acceptFirstMouse: true,
            webPreferences: {
                webgl: false,
                webaudio: false,
                experimentalFeatures: false,
                experimentalCanvasFeatures: false
            }
        });

        newWindow.showUrl(path.resolve(__dirname, '../view/index.html'), function() {
            changeFocusToWindow(newWindow);

            newWindow.on('focus', function() {
                changeFocusToWindow(this);
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
