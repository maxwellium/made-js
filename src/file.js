/**
 * @author Arne Simon [arne.simon@slice-dice.de]
 * @author Max Fielker [max.fielker@slice.dice.de]
 */


function _arrayBufferToBase64( buffer ) {
  var binary = '';
  var bytes = new Uint8Array( buffer );
  var len = bytes.byteLength;
  for (var i = 0; i < len; i++) {
    binary += String.fromCharCode( bytes[ i ] );
  }
  return window.btoa( binary );
}


function _base64ToArrayBuffer( base64 ) {
  var binary_string = window.atob( base64 );
  var len = binary_string.length;
  console.log( len );
  var bytes = new Uint8Array( len );
  for (var i = 0; i < len; i++) {
    bytes[ i ] = binary_string.charCodeAt( i );
  }
  return bytes;
}


class File {

  constructor( Made, ctx ) {
    'ngInject';
    Object.assign( this, {
      Made,
      ctx,
      seek: 0,
      data: null
    } );
  }

  readAll() {

    return this.Made
      .request( 'rpc://crm/file/read', [
        this.ctx.filename
      ] )
      .then( result => this.data = _base64ToArrayBuffer( result.data ) );
  }

  read( pos, length ) {

    return this.Made
      .request( 'rpc://crm/file/read', [
        this.ctx.filename,
        pos,
        length
      ] )
      .then( result => result.data );
  }

  store() {
    let me = this,
      defer = this.Made.$q.defer(),
      channel = this.Made.channel( 'file://crm/' + this.ctx.filename );

    function upload( idx ) {
      if ( idx < me.data.byteLength ) {
        var chunk = me.data.slice( idx, idx + me.ctx.chunk_size );
        var encoded = _arrayBufferToBase64( chunk );

        channel.send( encoded );

        setTimeout( function () {
          upload( idx + me.ctx.chunk_size );
        }, 300 );
      } else {
        channel.send( 'done-writing' );

        channel.asyncRecv()
          .then( function ( data ) {
            console.log( 'finished uploading' );

            me.ctx = data;
            defer.resolve();
          } );
      }
    }

    upload( 0 );

    return defer.promise;
  }

  save() {
    var pom = document.createElement( 'a' );
    var url = window.URL.createObjectURL( new Blob( [
      this.data
    ], {
      type: 'octet/stream'
    } ) );
    pom.setAttribute( 'href', url );
    pom.setAttribute( 'download', this.ctx.filename );

    if ( document.createEvent ) {
      var event = document.createEvent( 'MouseEvents' );
      event.initEvent( 'click', true, true );
      pom.dispatchEvent( event );
    } else {
      pom.click();
    }

  }

  remove() {
    return this.Made.request( 'rpc://crm/file/remove', [
      this.ctx.filename
    ] );
  }

}

export default File;
