'use strict';

var grunt = require('grunt'),
	fs = require('fs'),
	packageJson = JSON.parse(fs.readFileSync('package.json')),
	version = packageJson['version'],
	devDependencies = Object.keys(packageJson['devDependencies']).join('|');

require('load-grunt-tasks')(grunt);

grunt.initConfig({
	electron: {
		osxBuild: {
			options: {
				name: 'Negative',
				icon: 'negative.icns',
				arch: 'x64',
				version: '0.35.5',
				platform: 'darwin',
				out: 'dist',
				dir: '.',
				overwrite: true,
				asar: true,
				'app-bundle-id': 'com.adamdrago.negative',
				'helper-bundle-id': 'com.adamdrago.negative.helper',
				'app-version': version,
				prune: true,
				ignore: `node_modules/(${devDependencies})`
			}
		}
	}
});

grunt.registerTask('default', ['electron']);
