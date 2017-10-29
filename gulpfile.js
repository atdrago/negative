'use strict';

const changed       = require('gulp-changed');
const cleanCss      = require('gulp-clean-css');
const concat        = require('gulp-concat');
const del           = require('del');
const eslint        = require('gulp-eslint');
const fs            = require('fs');
const gulp          = require('gulp');
const packager      = require('electron-packager');
const runSequence   = require('run-sequence');
const sass          = require('gulp-sass');
const watch         = require('gulp-watch');
const wrap          = require('gulp-wrap');
const jsDest        = 'view';
const jsIndexSrc    = [
	'view/js/services/negative-undo.js',
	'view/js/controllers/negative-frame.js',
	'view/js/controllers/negative-tabs.js',
	'view/js/controllers/negative-traffic-lights.js',
	'view/js/negative.js'
];
const jsSettingsSrc = [
	'view/js/controllers/settings-form.js',
	'view/js/settings.js'
];
const jsLintSrc     = [ 'lib/**/*.js', 'view/**/*.js', '!view/index.js', '!view/settings.js' ];
const sassSrc       = 'view/**/*.scss';
const sassDest      = 'view';

function compileJs(src, dest, filename) {
	return gulp.src(src)
		.pipe(concat(filename))
		.pipe(wrap("(function (window, document, JSON) { <%= contents %> })(window, document, JSON);"))
		.pipe(changed(jsDest, {
			hasChanged: changed.compareSha1Digest
		}))
		.pipe(gulp.dest(dest));
}

// Sass

gulp.task('sass', () => {
	return gulp.src(sassSrc)
		.pipe(sass())
		.pipe(cleanCss())
		.pipe(changed(sassDest, {
			hasChanged: changed.compareSha1Digest
		}))
		.pipe(gulp.dest(sassDest));
});

// JavaScript

gulp.task('js:index',    () => compileJs(jsIndexSrc, jsDest, 'index.js'));
gulp.task('js:settings', () => compileJs(jsSettingsSrc, jsDest, 'settings.js'));

gulp.task('js:lint', () => {
	return gulp.src(jsLintSrc)
		.pipe(eslint())
		.pipe(eslint.format());
});

// Watch

gulp.task('watch', () => {
	watch(jsIndexSrc,    () => gulp.start('js:index'));
	watch(jsSettingsSrc, () => gulp.start('js:settings'));
	watch(jsLintSrc,     () => gulp.start('js:lint'));
	watch(sassSrc,       () => gulp.start('sass'));
});

// Release

gulp.task('release:clean', () => {
	return del(['release']);
})

gulp.task('release:root', () => {
	return gulp.src([
		'package.json',
		'.npmrc'
	]).pipe(gulp.dest('release'));
});

gulp.task('release:resources', () => {
	return gulp.src([
		'resources/**/*'
	]).pipe(gulp.dest('release/resources'));
});

gulp.task('release:view', () => {
	return gulp.src([
		'view/*.html',
		'view/*.css',
		'view/*.js'
	]).pipe(gulp.dest('release/view'));
});

gulp.task('release:lib', () => {
	return gulp.src([
		'lib/**/*.js'
	]).pipe(gulp.dest('release/lib'));
});

gulp.task('release:config', () => {
	return gulp.src([
		'config/**/*.js'
	]).pipe(gulp.dest('release/config'));
});

gulp.task('release:test', () => {
	return gulp.src([
		'test/**/*.js',
		'test/**/*.json'
	]).pipe(gulp.dest('release/test'));
});

gulp.task('release', () => {
	return runSequence(
		'release:clean',
		[ 'js:index', 'js:settings', 'sass'],
		['release:root', 'release:resources', 'release:view', 'release:lib', 'release:config', 'release:test']
	);
});

// Build

gulp.task('build', (done) => {
	const config          = JSON.parse(fs.readFileSync('package.json'));
	const appVersion      = config.version;
	const electronVersion = config.devDependencies['electron'].match(/[\d.]+/)[0];
	const options         = {
		arch: 'x64',
		asar: false,
		dir: 'release',
		icon: './resources/negative.icns',
		name: 'Negative',
		out: 'dist',
		overwrite: true,
		platform: 'darwin',
		prune: true,
		electronVersion: electronVersion,
		appBundleId: 'com.adamdrago.negative',
		helperBundleId: 'com.adamdrago.negative.helper',
		appVersion: appVersion,
		extendInfo: './resources-osx/Info.plist'
	};

	packager(options, (err, paths) => {
		if (err) {
			console.error(err);
		}

		done();
	});
});

gulp.task('bump', (done) => {
	const argv = require('yargs')
		.alias('v', 'version')
		.argv;

	const config     = JSON.parse(fs.readFileSync('package.json'));
	const appVersion = config.version;
	const newVersion = argv.version;

	config.version = newVersion;

	fs.writeFile('package.json', JSON.stringify(config, null, 2),  (err) => {
		if (err) {
			throw err;
		}

		const readme = fs.readFileSync('README.md').toString();

		fs.writeFile('README.md', readme.replace(new RegExp(appVersion, 'g'), newVersion), (err) => {
			if (err) {
				throw err;
			}

			done();
		});
	});
});

// Default

gulp.task('default', ['js:index', 'js:settings', 'js:lint', 'sass', 'watch']);
