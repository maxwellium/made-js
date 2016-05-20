var
  gulp          = require('gulp'),
  babel         = require("gulp-babel"),
  uglify        = require('gulp-uglify'),
  concat        = require('gulp-concat');


gulp.task('default', function() {

  return gulp
    .src(['src/**/*.js'])
    .pipe(babel({presets: [ 'es2015' ]}))
    .pipe(concat('made.js'))
    .pipe( uglify({'mangle': false}) )
    .pipe(gulp.dest('dist/'));
});

gulp.task('watch', ['default'], function() {
  gulp.watch('src/**/*.js', ['default']);
});
