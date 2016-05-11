'use strict';

const grunt   = require('grunt');
const fs      = require('fs');
const config  = JSON.parse(fs.readFileSync('package.json'));
const version = config['version'];
const devDeps = Object.keys(config['devDependencies']).join('|');

require('load-grunt-tasks')(grunt);

grunt.initConfig({
	electron: {
		osxBuild: {
			options: {
				name: 'Negative',
				icon: 'negative.icns',
				arch: 'x64',
				version: '1.0.1',
				platform: 'darwin',
				out: 'dist',
				dir: 'release',
				overwrite: true,
				asar: true,
				'app-bundle-id': 'com.adamdrago.negative',
				'helper-bundle-id': 'com.adamdrago.negative.helper',
				'app-version': version,
				prune: true
			}
		}
	}
});

grunt.registerTask('default', ['electron']);
