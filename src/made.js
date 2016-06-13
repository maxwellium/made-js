/**
 * @author Arne Simon [arne.simon@slice-dice.de]
 * @author Max Fielker [max.fielker@slice.dice.de]
 */

import madeChannel from './channel';
import madeFile from './file';

class Made {

  constructor( $q, $cookieStore, $rootScope, uuid4, madeUrlService ) {
    'ngInject';
    Object.assign( this, {
      $q,
      $cookieStore,
      $rootScope,
      uuid4,
      madeUrlService,
      contexts: {},
      reconnectTimeout: 1000,
      user: null,
      wss: null
    } );

    this.setupSocket();

    this.afterConnect = this.whenConnected;
  }

  setupSocket() {
    this.wss = new WebSocket( this.madeUrlService );

    if ( !this.user ) {
      this.user = this.$cookieStore.get( 'user' );
    }
    if ( undefined === this.user ) {
      this.user = null;
    }

    this.wss.onopen = () => {
      this.$rootScope.$broadcast('made-connection-open');
      console.log( 'socket open!' );
    };

    this.wss.onerror = ( errorEvent ) => {
      this.$rootScope.$broadcast('made-connection-error');
      console.log( 'socket error, event:', errorEvent );
    };

    this.wss.onclose = ( closeEvent ) => {
      this.$rootScope.$broadcast('made-connection-closed');
      console.log( 'socket close, event:', closeEvent );
      setTimeout( this.setupSocket, this.reconnectTimeout );

      if ( this.reconnectTimeout < 1000 * 60 * 2 ) {
        this.reconnectTimeout *= 2;
      }
    };

    this.wss.onmessage = function ( msg ) {
      msg = JSON.parse( msg.data );


      switch (msg.action) {
        case 'answer':
          if ( msg.context in this.contexts ) {
            if ( msg.success ) {
              this.contexts[ msg.context ].resolve( msg );
              if ( 'schema' === this.contexts[ msg.context ].action ) {
                console.log( '++ received schema ++', this.contexts[ msg.context ].uri, msg.data.schema );
              } else {
                console.log( '++ received ++', this.contexts[ msg.context ].uri, msg.data, msg.error );
              }
            } else {
              console.log( '-- received --' + (msg.error ? 'ERROR' : ''), this.contexts[ msg.context ].uri, msg );
              if ( this.contexts[ msg.context ].reject ) {
                this.contexts[ msg.context ].reject( msg );
                this.$rootScope.$broadcast( 'made-error', msg );
              }

              // UnknownIssuer exception: because key from the login is not longer valid.
              if ( '15c3ad4d828c5937a721893351c767fd' === msg.error.id ) {
                this.logout();
                this.$rootScope.$broadcast( 'made-logout' );
              }
            }
            delete this.contexts[ msg.context ];
          } else {
            console.log( 'made-js error: message for unknown context' );
          }
          break;
        case 'channel':
          console.log( '-- received --' + (msg.error ? 'ERROR' : ''), msg );
          switch (msg.data.type) {
            case 'open':
              console.log( '!!!FATAL!!! Opening channel to browser not allowed!' );
              break;
            case 'package':
              if ( msg.context in this.contexts ) {
                this.contexts[ msg.context ].handleRecv( msg.data.package );
              } else {
                console.log( 'package for unknown channel' );
              }
              break;
            case 'close':
              if ( msg.context in this.contexts ) {
                this.contexts[ msg.context ].handleClose();
              } else {
                console.log( 'close for unknown channel' );
              }
              break;
          }
      }

    };
  }

  message( action, data ) {
    return {
      'user': this.user,
      'context': 0,
      'action': action,
      'data': data,
      'error': null,
      'success': true,
    };
  }


  whenConnected( callback ) {
    function wait() {
      console.log( 'made-js - wait for connect' );
      setTimeout( function () {
        this.whenConnected( callback );
      }, 750 );
    }

    if ( this.wss ) {
      switch (this.wss.readyState) {
        case WebSocket.CONNECTING:
          wait();
          break;
        case WebSocket.OPEN:
          this.reconnectTimeout = 1000;
          callback();
          break;
        default:
          console.log( 'made-js: try to send over a closed socket!' );
          this.setupSocket();
          wait();
          break;
      }
    } else {
      wait();
    }
  }





  send( action, data ) {
    var defer = this.$q.defer();
    var context = this.uuid4.generate();

    this.contexts[ context ] = defer;

    this.send_with_context( action, data, context );

    return defer.promise;
  }

  send_with_context( action, data, context ) {
    var msg = this.message( action, data );
    msg.context = context;

    if ( msg.action == 'request' ) {
      this.contexts[ context ].uri = msg.data.uri;
      console.log( '-- sending --', msg.data.uri, msg.data.args, msg.data.kwargs );
    } else if ( 'schema' === msg.action ) {
      this.contexts[ context ].uri = msg.data;
      this.contexts[ context ].action = msg.action;
      console.log( '-- schema --', msg.data );
    } else {
      console.log( '-- sending --', msg.action, context );
    }

    var encoded = angular.toJson( msg );

    this.whenConnected( () => {
      this.wss.send( encoded );
    } );
  }

  request( uri, kwargs ) {
    if ( typeof kwargs === 'undefined' ) {
      kwargs = {};
    }

    var data = {
      uri: uri,
      kwargs: kwargs
    };

    return this.send( 'request', data );
  }

  channel( uri ) {
    return new madeChannel( this, uri, this.uuid4.generate() );
  }

  topology() {
    return this
      .send( 'topology', {} )
      .then( result => result.data );
  }

  capabilities() {

    return this
      .send( 'capabilities' )
      .then( result => result.data );
  }

  schema( url ) {
    return this
      .send( 'schema', url )
      .then( result => result.data );
  }

  fileFromData( name, data ) {
    let ctx = {
        filename: name,
        chunk_size: 255 * 1024,
        length: data.byteLength,
        md5: '',
        encoding: 'utf-8',
        meta: {}
      },
      file = new madeFile( this, ctx );
    file.data = data;

    return file;
  }

  file( ctx ) {
    return new madeFile( this, ctx );
  }

  loginByName( user, password ) {

    return this
      .request( 'rpc://crm/user/login', [], {
        user,
        password
      } )
      .then( result => this.login( result.data ) );
  }

  loginByEmail( email, password ) {

    return this
      .request( 'rpc://crm/user/login', [], {
        email,
        password
      } )
      .then( result => this.login( result.data ) );
  }

  login( user ) {
    this.user = user;
    this.$cookieStore.put( 'user', this.user );
    this.$rootScope.$broadcast( 'made-login' );
  }

  logout() {
    if ( this.user ) {
      this.request( 'rpc://crm/user/logout' );
      this.user = null;

      this.$cookieStore.put( 'user', null );
      this.$rootScope.$broadcast( 'made-logout' );
    }
  }

  isLoggedin() {
    return null !== this.user;
  }
}

export default Made;
