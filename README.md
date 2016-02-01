# Negative

Use Negative to visually compare differences between two scenes. Negative is great for web and application development, when trying to match your build to the provided comp.

![Negative Demo](negative-demo.gif)

## Shortcuts
- <kbd>&#8984;G</kbd> - Take a screenshot
- <kbd>&larr;</kbd> <kbd>&uarr;</kbd> <kbd>&rarr;</kbd> <kbd>&darr;</kbd> - Move the window 1px
- <kbd>&#8679;&larr;</kbd> <kbd>&#8679;&uarr;</kbd> <kbd>&#8679;&rarr;</kbd> <kbd>&#8679;&darr;</kbd> - Move the window 10px
- <kbd>&#8984;F</kbd> - Fit window to image
- <kbd>&#8984;T</kbd> - New tab
- <kbd>&#8984;&rarr;</kbd> <kbd>&#8984;&larr;</kbd> - Select next or previous tab
- <kbd>&#8679;&#8984;&rarr;</kbd> <kbd>&#8679;&#8984;&larr;</kbd> - Select next or previous tab + fit window to image
- <kbd>&#8963;&#8984;H</kbd> - Hide or show Negative (from any app)

## Build Process

1. [Install Node.js](https://nodejs.org/en/) v4 or greater
2. `git clone https://github.com/atdrago/negative.git`
3. `git checkout tags/v0.6.0`
4. `cd negative`
5. `npm install`
6. `./node_modules/.bin/electron-rebuild`
7. `grunt`
8. Locate and copy `dist/Negative-darwin-x64/Negative.app` to your `Applications` folder

## Support
Currently only Mac OS X is supported.

## About
Created by [Adam Drago](http://adamdrago.com). Icon by [Tiffany Wang](mailto:wangtiff@gmail.com). Built on [Electron](http://electron.atom.io/).
