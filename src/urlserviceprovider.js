/**
 * @author Arne Simon [arne.simon@slice-dice.de]
 * @author Max Fielker [max.fielker@slice.dice.de]
 */

class UrlServiceProvider {

  constructor() {
    this.protocol = 'ws://';

    if ( window.location.protocol === 'https:' ) {
      this.protocol = 'wss://';
    }

    this.host = window.location.host;
    this.path = '/ws';
  }


  $get() {
    if ( !this.url ) {
      this.url = this.protocol + this.host + this.path;
    }
    return this.url;
  }

}

export default UrlServiceProvider;
