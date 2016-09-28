export default class madeConfigProvider {

  constructor() {

    this.url = {
      protocol: 'ws://',
      host: window.location.host,
      path: '/ws',
      gridProtocol: 'http://'
    };

    if ( 'https:' === window.location.protocol ) {
      this.url.protocol = 'wss://';
      this.url.gridProtocol = 'https://';
    }

    this.store = window.localStorage;

  }


  $get() {
    return this;
  }

}
