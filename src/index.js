/**
 * @author Arne Simon [arne.simon@slice-dice.de]
 * @author Max Fielker [max.fielker@slice.dice.de]
 */

import 'angular-uuid4'

import Made from "./made"
import UrlServiceProvider from "./urlserviceprovider"
import storeFile from "./storefile"
import * as topology from "./topology"

angular
  .module('made-js', [
    'uuid4',
    'ngCookies'
  ])
  .provider('madeUrlService', UrlServiceProvider)
  .service('Made', Made)
  .directive('madeStoreFile', storeFile)
  .directive('madeTopology', topology.topology)
  .directive('madeTopologyLegend', topology.topologyLegend);
