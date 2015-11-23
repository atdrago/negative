'use strict';

let app = require('app');

app.commandLine.appendSwitch('enable-transparent-visuals');

app.on('window-all-closed', function() {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('ready', function() {
    require('./negative').init();
});
