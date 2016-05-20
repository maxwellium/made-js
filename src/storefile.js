/**
 * @author Arne Simon [arne.simon@slice-dice.de]
 * @author Max Fielker [max.fielker@slice.dice.de]
 */

function storeFile( $q, Made ) {
  return {
    restrict: 'E',
    template: '<input type="file">',
    transclude: true,
    scope: false,
    link: function ( scope, element, attrs ) {

      element.on( 'change', function ( onChangeEvent ) {

        var filePromises = [],
          element = (onChangeEvent.srcElement || onChangeEvent.target);

        var bucket = [];

        Array.prototype.slice.call( element.files ).forEach( function ( file ) {
          var deferred = $q.defer(),
            reader = new FileReader();

          reader.onload = function ( onLoadEvent ) {
            bucket.push( Made.fileFromData( file.name, onLoadEvent.target.result ) );
            scope.$apply();
            deferred.resolve();
          };
          reader.onabort = reader.onerror = function ( error ) {
            console.log( 'madeStoreFileDirective, FileReader aborted:', error );
            deferred.reject( error );
          };

          filePromises.push( deferred.promise );

          reader.readAsArrayBuffer( file );
        } );

        $q
          .all( filePromises )
          .then( function () {
            scope.$parent[ attrs.callback ]( scope, bucket );
          } );

      } );
    }
  };
}

export default storeFile;
