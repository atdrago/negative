'use strict';

const changed       = require('gulp-changed');
const concat        = require('gulp-concat');
const del           = require('del');
const gulp          = require('gulp');
const gulpUglify    = require('gulp-uglify/minifier');
const minifyCss     = require('gulp-minify-css');
const runSequence   = require('run-sequence');
const sass          = require('gulp-sass');
const uglifyJs      = require('uglify-js');
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
const sassSrc       = 'view/**/*.scss';
const sassDest      = 'view';

function buildJs(src, dest, filename) {
	return gulp.src(src)
		.pipe(concat(filename))
		.pipe(wrap("(function (window, document, JSON) { <%= contents %> })(window, document, JSON);"))
		.pipe(gulpUglify({}, uglifyJs).on('error', (err) => console.log(err)))
		.pipe(changed(jsDest, {
			hasChanged: changed.compareSha1Digest
		}))
		.pipe(gulp.dest(dest));
}

gulp.task('sass', () => {
	return gulp.src(sassSrc)
		.pipe(sass())
		.pipe(minifyCss())
		.pipe(changed(sassDest, {
			hasChanged: changed.compareSha1Digest
		}))
		.pipe(gulp.dest(sassDest));
});

gulp.task('js-index',    () => buildJs(jsIndexSrc, jsDest, 'index.js'));
gulp.task('js-settings', () => buildJs(jsSettingsSrc, jsDest, 'settings.js'));

gulp.task('watch', () => {
	watch(sassSrc,       () => gulp.start('sass'));
	watch(jsIndexSrc,    () => gulp.start('js-index'));
	watch(jsSettingsSrc, () => gulp.start('js-settings'));
});

gulp.task('default', [ 'js-index', 'js-settings', 'sass', 'watch' ]);

gulp.task('release:clean', () => {
	return del(['release']);
})

gulp.task('release:root', () => {
	return gulp.src([
		'negative.icns',
		'package.json'
	]).pipe(gulp.dest('release'));
});

gulp.task('release:node_modules', () => {
	return gulp.src([
		'node_modules/**/*.*'
	], { dot: true }).pipe(gulp.dest('release/node_modules'));
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

gulp.task('release', () => {
	return runSequence('release:clean', ['release:node_modules', 'release:root', 'release:view', 'release:lib'])
});