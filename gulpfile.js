'use strict';

var changed = require('gulp-changed'),
	gulp = require('gulp'),
	sass = require('gulp-sass'),
	watch = require('gulp-watch'),
	minifyCss = require('gulp-minify-css'),
	concat = require('gulp-concat'),
	wrap = require('gulp-wrap'),
	gulpUglify = require('gulp-uglify/minifier'),
	uglifyJs = require('uglify-js'),

	sassSrc = 'view/**/*.scss',
	sassDest = 'view',
	jsIndexSrc = [
		'view/js/services/negative-undo.js',
		'view/js/controllers/negative-frame.js',
		'view/js/controllers/negative-tabs.js',
		'view/js/negative.js'
	],
	jsSettingsSrc = [
		'view/js/controllers/settings-form.js',
		'view/js/settings.js'
	],
	jsDest = 'view',

	buildJs = function (src, dest, filename) {
		return gulp.src(src)
			.pipe(concat(filename))
			.pipe(wrap("(function (window, document, JSON) { 'use strict'; <%= contents %> })(window, document, JSON);"))
			.pipe(gulpUglify({ mangle: false }, uglifyJs).on('error', function (err) { console.log(err) }))
			.pipe(changed(jsDest, {
				hasChanged: changed.compareSha1Digest
			}))
			.pipe(gulp.dest(dest));
	};

gulp.task('sass', function () {
	return gulp.src(sassSrc)
		.pipe(sass())
		.pipe(minifyCss())
		.pipe(changed(sassDest, {
			hasChanged: changed.compareSha1Digest
		}))
		.pipe(gulp.dest(sassDest));
});

gulp.task('js-index', function () {
	return buildJs(jsIndexSrc, jsDest, 'index.js');
});

gulp.task('js-settings', function () {
	return buildJs(jsSettingsSrc, jsDest, 'settings.js');
});

gulp.task('watch', function () {
	watch(sassSrc, function () {
		gulp.start('sass');
	});
	watch(jsIndexSrc, function () {
		gulp.start('js-index');
	});
	watch(jsSettingsSrc, function () {
		gulp.start('js-settings');
	});
});

gulp.task('default', [ 'js-index', 'js-settings', 'sass', 'watch' ]);
