var
  gulp          = require('gulp'),
  // uglify        = require('gulp-uglify'),
  concat        = require('gulp-concat');


gulp.task('default', function() {

  return gulp
    .src(['src/**/*.js'])
    .pipe( concat('made.js') )
    .pipe( gulp.dest('dist/'));
});

gulp.task('watch', ['default'], function() {
  gulp.watch('src/**/*.js', ['default']);
});
