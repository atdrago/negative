#!/bin/bash

# Setup some generic variables
NEGATIVE_VERSION=$(node -p -e "require('./package.json').version")
DIST_PATH="./dist/Negative-darwin-x64"

# Create DMG
DMG_CONFIG="./resources-osx/appdmg.json"
DMG_PATH="$DIST_PATH/Negative-v$NEGATIVE_VERSION.dmg"

appdmg $DMG_CONFIG $DMG_PATH

# Create ZIP
APP_PATH="Negative.app"
ZIP_PATH="Negative-v$NEGATIVE_VERSION-mac.zip"

## We `cd` first so we don't get "./dist/Negative-darwin-x64" included in our ZIP
cd $DIST_PATH
zip -r $ZIP_PATH $APP_PATH
