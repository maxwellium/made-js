/**
 * @author Arne Simon [arne.simon@slice-dice.de]
 * @author Max Fielker [max.fielker@slice.dice.de]
 */
var madejs = angular.module('made', ['uuid4', 'ngCookies'])

/**
 * Returns the websocket url.
 */
function url() {
    var prot = 'ws://';

    if(window.location.protocol === 'https:') {
        prot = 'wss://';
    }

    return prot + window.location.host + '/ws';
}


madejs.service('made', function($q, $cookieStore, uuid4) {
    var contexts          = {};             // made message contexts
    var made              = this;
    var reconnect_timeout = 1000;

    this.user             = null;           // the logged in user
    this.contexts         = contexts;
    this.wss              = null;
    this.nonce            = 0;


    function setup_socket() {
        made.wss = new WebSocket(url());

        made.user = $cookieStore.get('user');

        if(undefined === made.user) {
            made.user = null;
        }

        made.wss.onopen = function() {
            console.log("made socket open!");
        };

        made.wss.onerror = function (error) {
            console.log('socket error: ', error);
        };

        made.wss.onclose = function(){
            setTimeout(setup_socket, made.reconnect_timeout);

            if(made.reconnect_timeout < 1000*60*5) {
                made.reconnect_timeout * 2;
            }
        };

        made.wss.onmessage = function(msg) {
            msg = JSON.parse(msg.data);

            console.log('-- received --'+ (msg.error ? 'ERROR' : ''), msg);

            switch (msg.action) {
                case 'answer':
                    if(msg.context in contexts) {
                        if (msg.success) {
                            contexts[msg.context].resolve(msg);
                        } else {
                            if (contexts[msg.context].reject) {
                                contexts[msg.context].reject(msg);
                            }

                            // UnknownIssuer exception: because key from the login is not longer valid.
                            if ('15c3ad4d828c5937a721893351c767fd' == msg.error.id) {
                                made.logout();
                            }
                        }
                        delete contexts[msg.context];
                    }
                    else {
                        console.log('made error: message for unknown context');
                    }
                    break;
                case 'channel':
                    switch(msg.data.type) {
                        case 'open':
                            console.log('!!!FATAL!!! Opening channel to browser not allowed!');
                            break;
                        case 'package':
                            if(msg.context in contexts) contexts[msg.context].handleRecv(msg.data.package);
                            else console.log('package for unknown channel');
                            break;
                        case 'close':
                            if(msg.context in contexts) contexts[msg.context].handleClose();
                            else console.log('close for unknown channel');
                            break;
                    }
            }

        };
    }


    function message(type, data) {
        var issuer = null

        if(made.user) {
            issuer = {
                'id': made.user._id,
                'token': made.user.key,
                'type': 'user',
                'name': made.user.emails[0],
            }
        }
        else {
            issuer = {
                'id': null,
                'token': null,
                'type': 'client',
                'name': 'made-js'
            }
        }

        return {
            'issuer': issuer,
            'version': '2.1',
            'nonce': 0,
            'sign': null,
            'context': null,
            'type': type,
            'data': data,
            'error': null,
            'success': true,
        }
    }


    function sign(message) {
        var tokens = ''

        tokens += message.issuer.id
        tokens += message.issuer.type
        tokens += message.issuer.token
        tokens += message.context
        tokens += message.nonce
        tokens += message.data

        var hash = CryptoJS.HmacSHA256(tokens, made.user.secret)
        return hash.toString(CryptoJS.enc.Hex)
    }


    function when_connected(callback) {
        function wait() {
            console.log('made - wait for connect');
            setTimeout(function(){ when_connected(callback); }, 750);
        }

        if(made.wss) {
            switch (made.wss.readyState) {
                case WebSocket.CONNECTING:
                    wait();
                break;
                case WebSocket.OPEN:
                    made.reconnect_timeout = 1000;
                    callback();
                break;
                default:
                    console.log('made: try to send over a closed socket!');
                    break;
            }
        }
        else {
            wait();
        }
    }

    setup_socket();

    this.afterConnect = when_connected;

    this.send = function(action, data) {
        var defer = $q.defer();
        var context = uuid4.generate();

        contexts[context] = defer;

        made.send_with_context(action, data, context);

        return defer.promise;
    };

    this.send_with_context = function(action, data, context) {
        var msg = message(action, data)
        msg.context = context
        msg.data = angular.toJson(msg.data)

        msg['sign'] = sign(msg)

        if(msg.action == 'request')
            console.log('-- sending --', msg.data.uri, msg)
        else
            console.log('-- sending --', msg.action, msg)


        var encoded = angular.toJson(msg)

        when_connected(function(){
            made.wss.send(encoded)
        })
    };

    this.request = function(uri, args, kwargs) {
        if(typeof args === 'undefined') {
            args = [];
        }

        if(typeof kwargs === 'undefined') {
            kwargs = {};
        }

        var data = {
            uri    : uri,
            args   : args,
            kwargs : kwargs
        };

        return made.send('request', data);
    };

    this.channel = function(uri) {
        var channel = Channel(made, uri, uuid4.generate());

        return channel;
    };

    this.topology = function() {
        var defer = $q.defer();

        made.send('topology', {})
        .then(function(result) {
            var data = result.data;

            defer.resolve(data);
        });

        return defer.promise;
    };

    this.capabilities = function() {
        var defer = $q.defer();

        made.send('capabilities')
            .then(function(result) {
                var data = result.data;

                defer.resolve(data);
            });

        return defer.promise;
    };

    this.schema = function(url) {
        var defer = $q.defer();

        made.send('schema', url)
            .then(function(result) {
                defer.resolve(result.data);
            });

        return defer.promise;
    };

    this.fileFromData = function(name, data) {
        // data = new Uint8Array(data);
        // var words = CryptoJS.lib.WordArray.create(data);
        // var md5 = CryptoJS.MD5(words);
        var fctx = {
            filename  : name,
            chunk_size: 255 * 1024,
            length    : data.byteLength,
            md5       : '', //md5.toString(CryptoJS.enc.Hex),
            encoding  : 'utf-8',
            meta      : {}
        };

        var file = File(made, fctx);
        file.data = data;

        return file;
    };

    this.loginByName = function(username, password) {

        if(username && password) {
            defer = $q.defer();

            made.request('rpc://crm/user/login', [], {'user': username, 'password': password})
                .then(function(result) {
                    if(result['success']) {
                        made.user = result['data'];
                        $cookieStore.put('user', made.user);
                    }

                    defer.resolve(result);
                });

            return defer.promise;
        }
        else {
            throw 'username and password are requiered to not be empty';
        }
    };

    this.loginByEmail = function(email, password) {

        if(email && password) {
            defer = $q.defer();

            made.request('rpc://crm/user/login', [], {'email': email, 'password': password})
                .then(function(result) {
                    made.user = result['data'];
                    $cookieStore.put('user', made.user);

                    defer.resolve(result);
                });

            return defer.promise;
        }
        else {
            throw 'email and password are requiered to not be empty';
        }
    };

    this.logout = function() {
        if (made.user) {
            made.request('rpc://crm/user/logout');
            made.user = null;

            $cookieStore.put('user', null);
        }
    };

    this.isLoggedin = function() {
        return null !== made.user;
    };
});

