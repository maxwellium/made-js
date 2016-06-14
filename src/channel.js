/**
 * @author Arne Simon [arne.simon@slice-dice.de]
 * @author Max Fielker [max.fielker@slice.dice.de]
 */

class Channel {

  constructor( Made, uri, context ) {
    'ngInject';
    Object.assign( this, {
      Made,
      uri,
      context,
      buffer: [],
      listener: null
    } );

    this.Made.contexts[ this.context ] = this;
    this.Made.send_with_context(
      'channel', {
        'type': 'open',
        'uri': uri
      },
      this.context
    );
  }

  send( data ) {
    return this.Made.send_with_context(
      'channel', {
        'type': 'package',
        'package': data
      },
      this.context
    );
  }

  recv() {
    return this.buffer.shift();
  }

  handleRecv( data ) {
    this.buffer.push( data );

    if ( this.listener ) {
      this.listener.resolve( this.buffer.shift() );
      this.listener = null;
    }
  }

  asyncRecv() {
    this.listener = this.Made.$q.defer();
    return this.listener.promise;
  }

  resolve( msg ) {
    console.log( 'channel-error', msg.error );
    this.handleClose();
  }

  handleClose() {
    console.log( 'close channel ' + this.context );

    delete this.Made.contexts[ this.context ];

    if ( this.listener ) {
      this.listener.resolve( null );
    }
  }

  close() {
    this.Made.send_with_context(
      'channel', {
        'type': 'close'
      },
      this.context
    );
    this.handleClose();
  }

}

export default Channel;
