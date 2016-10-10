export default function madeFileInput() {

  return {
    restrict: 'A',
    scope: {
      madeFileInput: '=',
      madeFileSingle: '@',
      madeFileOnChange: '&'
    },
    link: function ( scope, element ) {


      element.on( 'change', function () {

        if (!scope.madeFileInput && !scope.madeFileSingle) {
          scope.madeFileInput = [];
        }

        if ( element[ 0 ].files.length ) {

          if ( scope.madeFileSingle ) {

            scope.madeFileInput = element[ 0 ].files[ 0 ];

          } else {

            for (let i = 0; i < element[ 0 ].files.length; i++) {
              scope.madeFileInput.push( element[ 0 ].files[ i ] );
            }

          }
        }

        scope.$apply();

        if (scope.madeFileOnChange) {
          scope.madeFileOnChange();
        }

      } );
    }
  };
}
