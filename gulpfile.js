var changed = require('gulp-changed'),
	gulp = require('gulp'),
	sass = require('gulp-sass'),
	watch = require('gulp-watch'),
	minifyCss = require('gulp-minify-css'),
	concat = require('gulp-concat'),
	wrap = require('gulp-wrap'),
	gulpUglify = require('gulp-uglify/minifier'),
	uglifyJs = require('uglify-js')

	sassSrc = 'view/**/*.scss',
	sassDest = 'view',
	jsSrcIndex = [
		'view/js/services/negative-undo.js',
		'view/js/controllers/negative-frame.js',
		'view/js/controllers/negative-tabs.js',
		'view/js/negative.js'
	],
	jsSrcSettings = [
		'view/js/controllers/settings-form.js',
		'view/js/settings.js'
	],
	jsDest = 'view';

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
	return gulp.src(jsSrcIndex)
		.pipe(concat('index.js'))
		.pipe(wrap("(function (window, document, JSON) { \n\n'use strict';\n\n<%= contents %>\n})(window, document, JSON);"))
		.pipe(gulpUglify({ mangle: false }, uglifyJs).on('error', function (err) { console.log(err) }))
		.pipe(changed(jsDest, {
			hasChanged: changed.compareSha1Digest
		}))
		.pipe(gulp.dest(jsDest));
});

gulp.task('js-settings', function () {
	return gulp.src(jsSrcSettings)
		.pipe(concat('settings.js'))
		.pipe(wrap("(function (window, document, JSON) { \n\n'use strict';\n\n<%= contents %>\n})(window, document, JSON);"))
		.pipe(gulpUglify({ mangle: false }, uglifyJs).on('error', function (err) { console.log(err) }))
		.pipe(changed(jsDest, {
			hasChanged: changed.compareSha1Digest
		}))
		.pipe(gulp.dest(jsDest));
});

gulp.task('watch', function () {
	watch(sassSrc, function () {
		gulp.start('sass');
	});
	watch(jsSrcIndex, function () {
		gulp.start('js-index');
	});
	watch(jsSrcSettings, function () {
		gulp.start('js-settings');
	});
});

gulp.task('default', [ 'js-index', 'js-settings', 'sass', 'watch' ]);
