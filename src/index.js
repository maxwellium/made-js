import Made from './Made';
import madeConfigProvider from './configProvider';
import madeFileInput from './directives/fileInput';
import madeDropzone from './directives/dropzone';

angular
  .module( 'made-js', [] )
  .provider( 'madeConfig', madeConfigProvider )
  .service( 'Made', Made )
  .directive( 'madeFileInput', madeFileInput )
  .directive( 'madeDropzone', madeDropzone );
