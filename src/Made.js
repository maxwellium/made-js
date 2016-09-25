import uuid4 from './lib/uuid4';
import Emitter from './lib/Emitter';


export default class Made extends Emitter {

  constructor( $q, $http, madeConfig ) {
    'ngInject';

    super();

    this.$q = $q;
    this.$http = $http;
    this.madeConfig = madeConfig;

    this.contexts = {};
    this.reconnectTimeout = Math.round( Math.random() * 500 + 500 );
    this.wss = false;
    this.store = madeConfig.store;
    this.user = {};

    let user = this.store.getItem( 'made-user' );
    if ( user ) {
      this.user = JSON.parse( user );
    }

    this.setupSocket();

    //TODO: wrap in config/debug block
    this.registerMessages();

  }


  setupSocket() {

    this.wss = new WebSocket( this.madeConfig.url.protocol + this.madeConfig.url.host + this.madeConfig.url.path );

    this.wss.onopen = open => this.trigger( 'socket:open', open );
    this.wss.onerror = error => this.trigger( 'socket:error', error );

    this.wss.onmessage = message => this.receiveMessage( message );

    this.wss.onclose = close => {

      this.trigger( 'socket:close', close );

      setTimeout(
        () => this.setupSocket(),
        this.reconnectTimeout
      );

      if ( this.reconnectTimeout < 1000 * 60 * 2 ) {
        this.reconnectTimeout *= 2;
      }
    };


  }


  receiveMessage( message ) {

    message = JSON.parse( message.data );

    if ( 'answer' !== message.action ) {
      console.log( 'made-js dropping message that\’s not an answer', message );
      return;
    }

    if ( !(message.context in this.contexts) ) {
      console.error( 'made-js error: message for unknown context', message );
      return;
    }

    if ( message.success ) {

      this.trigger( 'message:success', message );
      this.contexts[ message.context ].resolve( message );
    } else {

      this.trigger( 'message:error', message );
      this.contexts[ message.context ].reject( message );
    }

    delete this.contexts[ message.context ];
  }


  message( action, data ) {
    return {
      user: this.user,
      context: 0,
      action: action,
      data: data,
      error: null,
      success: true,
    };
  }


  whenConnected( callback ) {

    let wait = () => {
      this.trigger( 'connection:waiting' );
      setTimeout( () => {
        this.whenConnected( callback );
      }, 750 );
    };

    if ( this.wss ) {
      switch (this.wss.readyState) {
        case WebSocket.OPEN:
          this.reconnectTimeout = 1000;
          callback();
          break;
        case WebSocket.CONNECTING:
          wait();
          break;
        default:
          this.trigger( 'connection:closed' );
          this.setupSocket();
          wait();
      }
    } else {
      wait();
    }
  }


  send( action, data ) {

    let deferred = this.$q.defer(),
      context = uuid4();

    this.contexts[ context ] = deferred;

    this.sendWithContext( action, data, context );

    return deferred.promise;
  }


  sendWithContext( action, data, context ) {

    let msg = this.message( action, data );

    msg.context = context;

    if ( 'request' === msg.action ) {

      this.contexts[ context ].uri = msg.data.uri;

    } else if ( 'schema' === msg.action ) {

      this.contexts[ context ].uri = msg.data;
      this.contexts[ context ].action = msg.action;
    }

    this.trigger( 'message:send', msg );

    this.whenConnected( () => this.wss.send( JSON.stringify( msg ) ) );
  }


  request( uri, kwargs = {}, refine = 'data' ) {

    let promise = this
      .send( 'request', {
        uri,
        kwargs
      } );

    if ( refine ) {
      promise = promise
        .then( response => response[ refine ] );
    }

    return promise;
  }


  schema( url, refine = 'data' ) {

    let promise = this.send( 'schema', url );

    if ( refine ) {
      promise = promise
        .then( response => response[ refine ] );
    }

    return promise;
  }


  upload( file, tags = [], userId = this.user._id ) {

    let formData = new FormData(),
      request = {
        method: 'POST',
        url: '/gridfs',
        data: formData,
        headers: {
          'Content-Type': undefined
        }
      };

    formData.append( 'user', userId );
    formData.append( 'session', this.user.session );
    formData.append( 'file', file );
    formData.append( 'filename', file.name );

    for (let i = 0; i < tags.length; i++) {
      formData.append( 'tag', tags[ i ] );
    }

    return this.$http( request );
  }


  isLoggedIn() {
    return Object.keys( this.user ).length > 0;
  }


  login( email, name, password ) {
    return this
      .request( 'rpc://crm/user/login', {
        email,
        name,
        password
      } )
      .then( user => {

        this.user = user;
        this.store.setItem( 'made-user', JSON.stringify( this.user ) );
        this.trigger( 'login' );

        return user;
      } );
  }


  logout() {

    this.request( 'rpc://crm/user/logout' );

    this.user = {};
    this.store.removeItem( 'made-user' );
    this.trigger( 'logout' );
  }


  registerMessages() {

    this.on( 'socket:open', () => console.log( 'socket open' ) );
    this.on( 'socket:error', error => console.error( 'socket error', error ) );
    this.on( 'socket:close', closeEvent => console.log( 'socket close', closeEvent ) );

    this.on( 'connection:waiting', () => console.log( 'made-js - waiting for connection' ) );
    this.on( 'connection:closed', () => console.log( 'made-js: tried sending over closed socket!' ) );

    this.on( 'message:success', message => {
      if ( 'schema' === this.contexts[ message.context ].action ) {
        console.log( '++ received schema ++', this.contexts[ message.context ].uri, message.data.schema );
      } else {
        console.log( '++ received ++', this.contexts[ message.context ].uri, message.data, message.error );
      }
    } );

    this.on( 'message:error', message => console.error(
      '-- received --' + (message.error ? 'ERROR' : ''),
      this.contexts[ message.context ].uri, message
    ) );

    this.on( 'message:send', message => {
      if ( 'request' === message.action ) {
        console.log( '-- sending --', message.data.uri, message.data.kwargs );
      } else if ( 'schema' === message.action ) {
        console.log( '-- schema --', message.data );
      } else {
        console.log( '-- sending --', message.action );
      }
    } );
  }

}
