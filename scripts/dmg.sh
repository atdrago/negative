#!/bin/bash

NEGATIVE_VERSION=$(node -p -e "require('./package.json').version") 
APPDMG_JSON="./resources-osx/appdmg.json"
RESULT_PATH="./dist/Negative-darwin-x64/Negative-v$NEGATIVE_VERSION.dmg"

appdmg $APPDMG_JSON $RESULT_PATH
open $RESULT_PATH