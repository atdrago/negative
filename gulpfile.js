var changed = require('gulp-changed'),
	gulp = require('gulp'),
	log = require('gulp-pd-log'),
	sass = require('gulp-sass'),
	watch = require('gulp-watch'),
	minifyCss = require('gulp-minify-css'),
	uglify = require('gulp-uglify'),
	concat = require('gulp-concat'),
	wrap = require('gulp-wrap'),

	sassSrc = 'view/**/*.scss',
	sassDest = 'view',
	jsSrc = [
		'view/js/services/negative-undo.js',
		'view/js/controllers/negative-frame.js',
		'view/js/controllers/negative-tabs.js',
		'view/js/negative.js'
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

gulp.task('js', function () {
	return gulp.src(jsSrc)
		.pipe(concat('index.js'))
		.pipe(wrap("(function (window, document, JSON) { \n\n'use strict';\n\n<%= contents %>\n})(window, document, JSON);"))
		.pipe(changed(sassDest, {
			hasChanged: changed.compareSha1Digest
		}))
		.pipe(gulp.dest(jsDest));
});


gulp.task('watch', function () {
	watch(sassSrc, function () {
		gulp.start('sass');
	});
	watch(jsSrc, function () {
		gulp.start('js')
	});
});

gulp.task('default', [ 'js', 'sass', 'watch' ]);
