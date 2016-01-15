/**
 * @author Arne Simon [arne.simon@slice-dice.de]
 * @author Max Fielker [max.fielker@slice.dice.de]
 */
var made = angular.module('made')


function _arrayBufferToBase64( buffer ) {
    var binary = '';
    var bytes = new Uint8Array( buffer );
    var len = bytes.byteLength;
    for (var i = 0; i < len; i++) {
        binary += String.fromCharCode( bytes[ i ] );
    }
    return window.btoa( binary );
}


function _base64ToArrayBuffer(base64) {
    var binary_string =  window.atob(base64);
    var len = binary_string.length;
    console.log(len);
    var bytes = new Uint8Array( len );
    for (var i = 0; i < len; i++)        {
        bytes[i] = binary_string.charCodeAt(i);
    }
    // return bytes.buffer;
    return bytes;
}


/**
 * A constructor for file objects.
 */
function File(made, fctx) {
    var me = {
        made: made,
        ctx: fctx,
        seek: 0,
        data: null,
    };

    me.readAll = function() {
        var $injector = angular.injector(['ng']);
        var $q = $injector.get('$q');
        var defer = $q.defer();

        me.made.request('rpc://crm/file/read', [me.ctx.filename])
            .then(function(result){
                    me.data = _base64ToArrayBuffer(result.data);
                    // me.data = window.atob(result.data);
                    console.log(me.data.length);
                    defer.resolve(me.data);
            });

        return defer.promise;
    };

    me.read = function(pos, length) {
        var $injector = angular.injector(['ng']);
        var $q = $injector.get('$q');
        var defer = $q.defer();

        me.made.request('rpc://crm/file/read', [me.ctx.filename, pos, length])
            .then(function(result){
                defer.resolve(result.data);
            });

        return defer.promise;
    };

    me.append = function(data) {
        var $injector = angular.injector(['ng']);
        var $q = $injector.get('$q');
        var defer = $q.defer();

        me.made.request('rpc://crm/file/append', [me.ctx.filename, data])
            .then(function(result) {
                me.ctx = result.data;

                defer.resolve();
            });

        me.data += data;

        return defer.promise;
    };

    me.store = function() {
        var $injector = angular.injector(['ng']);
        var $q = $injector.get('$q');
        var defer = $q.defer();
        var channel = me.made.channel('file://crm/' + me.ctx.filename);

        // for(var idx = 0; idx < me.data.byteLength; idx += me.ctx.chunk_size) {
        //     var chunk =  me.data.slice(idx, idx+me.ctx.chunk_size);
        //     var encoded = _arrayBufferToBase64(chunk);

        //     channel.send(encoded);
        // }

        function upload(idx) {
            if(idx < me.data.byteLength) {
                var chunk =  me.data.slice(idx, idx+me.ctx.chunk_size);
                var encoded = _arrayBufferToBase64(chunk);

                channel.send(encoded);

                setTimeout(function(){upload(idx + me.ctx.chunk_size);}, 300);
            }
            else {
                channel.send('done-writing');

                channel.asyncRecv()
                    .then(function(data) {
                        if(LOGGING) console.log('finished uploading');

                        me.ctx = data;
                        defer.resolve();
                    });
            }
        }

        upload(0);

        return defer.promise;
    };

    /**
     * @fixme  Does not work with safarie
     */
    me.save = function() {
        // Thanks to: http://stackoverflow.com/questions/2897619/using-html5-javascript-to-generate-and-save-a-file

        function do_save() {
            var pom = document.createElement('a');
            var url = window.URL.createObjectURL(new Blob([me.data], {type: 'octet/stream'}));
            pom.setAttribute('href', url);
            pom.setAttribute('download', me.ctx.filename);

            if (document.createEvent) {
                var event = document.createEvent('MouseEvents');
                event.initEvent('click', true, true);
                pom.dispatchEvent(event);
            }
            else {
                pom.click();
            }
        }

        if(me.data) {
            do_save();
        }
        else {
            do_save();
        }
    };

    me.remove = function() {
        me.made.request('rpc://crm/file/remove', [me.ctx.filename]);
    };

    return me;
}


made.directive('madeStoreFile', function($q, Made) {
    return {
        restrict: 'A',
        scope: {
            madeStoreFile : '=',
            itemId        : '=mfsItemId',
            callback      : '&mfsCallback'
        },
        link: function(scope, element) {

            element.on('change', function(onChangeEvent) {

                var
                    filePromises = [],
                    element      = (onChangeEvent.srcElement || onChangeEvent.target);

                if ( 'object' !== typeof scope.madeStoreFile[scope.itemId] ) {
                    scope.madeStoreFile[scope.itemId] = [];
                }

                Array.prototype.slice.call(element.files).forEach(function(file){
                    var
                        deferred = $q.defer(),
                        reader   = new FileReader();

                    reader.onload = function(onLoadEvent) {
                        scope.madeStoreFile[scope.itemId].push( Made.fileFromData(file.name, onLoadEvent.target.result) );
                        scope.$apply();
                        deferred.resolve();
                    };
                    reader.onabort = reader.onerror = function(error){
                        console.log('madeStoreFileDirective, FileReader aborted:', error);
                        deferred.reject(error);
                    };

                    filePromises.push(deferred.promise);

                    reader.readAsArrayBuffer(file);
                });

                $q
                    .all(filePromises)
                    .then(function(){
                        scope.callback();
                    });

            });
        }
    };
});

