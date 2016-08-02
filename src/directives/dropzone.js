export default function madeDropzone() {

  return {
    restrict: 'A',
    scope: {
      madeDropzone: '=',
      madeDropzoneSingle: '@'
    },
    link: function ( scope, element ) {


      let onDragOver = event => {
          event.preventDefault();
          element.addClass( 'dragOver' );
        },

        onDragEnd = event => {
          event.preventDefault();
          element.removeClass( 'dragOver' );
        },

        onDrop = event => {

          onDragEnd( event );

          if (!scope.madeDropzone && !scope.madeDropzoneSingle) {
            scope.madeDropzone = [];
          }

          if ( event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length ) {

            if ( scope.madeDropzoneSingle ) {

              scope.madeDropzone = event.dataTransfer.files[ 0 ];
            } else {

              for (let i = 0; i < event.dataTransfer.files.length; i++) {
                scope.madeDropzone.push( event.dataTransfer.files[ i ] );

              }
            }
          }

          scope.$apply();
        };

      element
        .on( 'dragover', onDragOver )
        .on( 'dragleave', onDragEnd )
        .on( 'drop', onDrop );
    }
  };
}
