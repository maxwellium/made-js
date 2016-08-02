export default class madeConfigProvider {

  constructor() {

    this.url = {
      protocol: 'ws://',
      host: window.location.host,
      path: '/ws'
    };

    if ( 'https:' === window.location.protocol ) {
      this.url.protocol = 'wss://';
    }

    this.store = window.localStorage;

  }


  $get() {
    return this;
  }

}
