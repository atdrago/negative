'use strict';

var grunt = require('grunt'),
	fs = require('fs'),
	devDependencies = Object.keys(JSON.parse(fs.readFileSync('package.json'))['devDependencies']).join('|');

require('load-grunt-tasks')(grunt);

grunt.initConfig({
	electron: {
		osxBuild: {
			options: {
				name: 'Negative',
				icon: 'negative.icns',
				arch: 'x64',
				version: '0.35.1',
				platform: 'darwin',
				out: 'dist',
				dir: '.',
				overwrite: true,
				asar: true,
				'app-bundle-id': 'com.adamdrago.negative',
				'helper-bundle-id': 'com.adamdrago.negative.helper',
				'app-version': '0.5.0',
				prune: true,
				ignore: `node_modules/(${devDependencies})`
			}
		}
	}
});

grunt.registerTask('default', ['electron']);
