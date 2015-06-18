var madejs = angular.module('madejs', ['uuid4', 'ngCookies'], function($compileProvider) {
    // configure new 'made-compile' directive by passing a directive
    // factory function. The factory function injects the '$compile'
    $compileProvider.directive('madeCompile', function($compile) {
        // directive factory creates a link function
        return function(scope, element, attrs) {
            scope.$watch(
                function(scope) {
                    // watch the 'compile' expression for changes
                    return scope.$eval(attrs.madeCompile);
                },
                function(value) {
                    // when the 'compile' expression changes
                    // assign it into the current DOM
                    element.html(value);

                    // compile the new DOM and link it to the current
                    // scope.
                    // NOTE: we only compile .childNodes so that
                    // we don't get into infinite loop compiling ourselves
                    $compile(element.contents())(scope);
                }
            );
        };
    });
});

var LOGGING = true;

/**
 * Returns the websocket url.
 */
function url() {
    var prot = 'ws://';

    if(window.location.protocol === 'https:') {
        prot = 'wss://'
    }

    return prot + window.location.host + '/ws';
}


function buildhtml(obj, path) {
    var data = '<div class="row responsiv-md list">';

    for (name in obj) {
        var val = obj[name];
        data += '<div class="col">';

        if (typeof(val) != 'object') {
            data += '<label class="item item-input">';
            data += '    <span class="input-label">' + name + '</span>';
            data += '    <input type="text" ng-model="' + path + name + '" />';
            data += '</label>';
        } else {
            data += buildhtml(val, path + name + '.');
        }
        data += '</div>';
    }

    data += '</div>';
    return data;
}


function Workflow(made, modtype, flow) {
    return {
        name: flow.name,
        doc: flow.doc,
        states: flow.states,
        transitions: flow.transitions,
        init: function() {
            var me = {
                ctx: null,
                name: flow.name,
                doc: flow.doc,
                states: flow.states,
                transitions: flow.transitions,
                onupdate: null
            };
            var rpcs = made.services[modtype].rpcs;

            me.step = function() {
                rpcs.workflow_step(me.ctx)
                    .then(function(result) {
                        if(LOGGING) console.log('made-workflow-ctx:', result['data']);

                        me.ctx = result['data'];

                        if(me.onupdate) {
                            me.onupdate(result);
                        }
                    });
            };

            me.start = function() {
                rpcs.workflow_start(flow.name)
                    .then(function(result) {
                        if(LOGGING) console.log('made-workflow-ctx:', result['data']);

                        me.ctx = result['data'];

                        if(me.onupdate) {
                            me.onupdate(result);
                        }
                    });
            };

            me.html = function(prefix) {
                if(me.ctx) {
                    if(me.ctx.template) {
                        return me.ctx.template;
                    }
                    else {
                        return buildhtml(me.ctx['data'], prefix + '.ctx.data.');
                    }
                }

                return '';
            };

            return me;
        }
    };
}


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
    }

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

    me.save = function() {
        // Thanks to: http://stackoverflow.com/questions/2897619/using-html5-javascript-to-generate-and-save-a-file

        function do_save() {
            var pom = document.createElement('a');
            var url = window.URL.createObjectURL(new Blob([me.data], {type: "octet/stream"}));
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


function FileFromData(made, name, data) {
    // data = new Uint8Array(data);
    // var words = CryptoJS.lib.WordArray.create(data);
    // var md5 = CryptoJS.MD5(words);
    var fctx = {
        'filename': name,
        'chunk_size': 255*1024,
        'length': data.byteLength,
        'md5': '', //md5.toString(CryptoJS.enc.Hex),
        'encoding': 'utf-8',
        'meta': {}
    };
    var file = File(made, fctx);
    file.data = data;

    return file;
}


function Channel(made, uri, context) {
    var $injector = angular.injector(['ng']);
    var ctx = {
        made: made,
        uri: uri,
        context: context,
        buffer: [],
        q: $injector.get('$q'),
        listener: null,
        send: function(data) {
            return ctx.made.send_with_context(
                'channel',
                {'type': 'package', 'package': data},
                ctx.context
            );
        },
        recv: function() {
            return buffer.shift();
        },
        handleRecv: function(data) {
            ctx.buffer.push(data);

            if(ctx.listener) {
                ctx.listener.resolve(ctx.buffer.shift());
                ctx.listener = null;
            }
        },
        asyncRecv: function() {
            ctx.listener = ctx.q.defer();
            return ctx.listener.promise;
        },
        resolve: function(msg) {
            if(LOGGING) console.log('channel-error', msg['error']);
            ctx.handleClose();
        },
        handleClose: function() {
            console.log('close channel ' + ctx.context);

            delete ctx.made.contexts[ctx.context];

            if(ctx.listener) {
                ctx.listener.resolve(null);
            }
        },
        close: function() {
            ctx.made.send_with_context(
                'channel',
                {'type': 'close'},
                ctx.context
            );
            ctx.handleClose();
        }
    };

    made.contexts[ctx.context] = ctx;
    made.send_with_context(
        'channel',
        {'type': 'open', 'uri': uri},
        ctx.context
    );

    return ctx;
}


madejs.service('Made', function($http, $q, $cookieStore, uuid4) {
    var contexts = {};
    var made = this;
    var wss = new WebSocket(url());
    var user = $cookieStore.get('user')

    this.user = null;
    this.contexts = contexts;

    if(user) {
        this.user = user;
    }

    function message(action, data) {
        return {
            'user': made.user,
            'context': 0,
            'action': action,
            'data': data,
            'error': null,
            'success': true,
        };
    }

    wss.onopen = function() {
        if(LOGGING) console.log("socket has made opened!");
    };

    wss.onerror = function (error) {
        console.log('madejs error: ', error);
    };

    wss.onmessage = function(msg) {
        msg = JSON.parse(msg.data);

        if(LOGGING) console.log('-- received --', msg);

        switch (msg['action']) {
            case 'answer':
                if(msg.context in contexts) {
                    contexts[msg.context].resolve(msg);
                    delete contexts[msg.context];
                }
                else {
                    if(LOGGING) console.log('madejs error: message for unknown context');
                }
                break;
            case 'request':
                var path = msg.data.path.join('.');
                var callback = subspaces[path];
                var result = callback(msg.data.args, msg.data.kwargs);

                answer(msg, result, null);
                break;
            case 'channel':
                switch(msg.data.type) {
                    case 'open':
                        console.log('!!!FATAL!!! Opening channel to browser not allowed!')
                        break;
                    case 'package':
                        if(msg.context in contexts) contexts[msg.context].handleRecv(msg.data.package);
                        else if(LOGGING) console.log('package for unknown channel');
                        break;
                    case 'close':
                        if(msg.context in contexts) contexts[msg.context].handleClose();
                        else if(LOGGING) console.log('close for unknown channel');
                        break;
                }
        }

    };

    function when_connected(callback) {
        function wait() {
            if(LOGGING) console.log('made - wait for connect');
            setTimeout(function(){ when_connected(callback); }, 500);
        }

        switch (wss.readyState) {
            case WebSocket.CONNECTING:
                wait();
            break;
            case WebSocket.OPEN:
                callback();
            break;
            default:
                if(LOGGING) console.log('madejs: BÄHM, tring to send over a closed socket!');
                break;
        }
    }

    this.afterConnect = when_connected;

    this.send = function(action, data) {
        var defer = $q.defer();
        var context = uuid4.generate();

        contexts[context] = defer;

        made.send_with_context(action, data, context);

        return defer.promise;
    };

    this.send_with_context = function(action, data, context) {
        var msg = message(action, data);
        msg['context'] = context;

        if(LOGGING) console.log('-- sending --', msg);

        var encoded = angular.toJson(msg);

        when_connected(function(){
            wss.send(encoded);
        });
    };

    this.request = function(uri, args, kwargs) {
        if(args == undefined) {
            args = [];
        }

        if(kwargs == undefined) {
            kwargs = {};
        }

        var data = {
            'uri': uri,
            'args': args,
            'kwargs': kwargs
        };

        return made.send('request', data);
    }

    this.channel = function(uri) {
        var channel = Channel(made, uri, uuid4.generate());

        return channel;
    };

    this.topology = function() {
        var defer = $q.defer();

        made.send('topology', {})
        .then(function(result) {
            var data = result['data'];

            defer.resolve(data);
        });

        return defer.promise;
    };

    this.capabilities = function() {
        var defer = $q.defer();

        made.send('capabilities')
        .then(function(result) {
            var data = result['data'];

            defer.resolve(data);
        });

        return defer.promise;
    }

    this.loginByName = function(username, password) {
        var defer = $q.defer();

        made.request('rpc://crm/user/login',[], {'user': username, 'password': password})
            .then(function(result) {
                if(result['success']) {
                    made.user = result['data'];
                    $cookieStore.put('user', made.user);
                }

                defer.resolve(result);
            });

        return defer.promise;
    };

    this.loginByEmail = function(email, password) {
        var defer = $q.defer();

        made.request('rpc://crm/user/login', [], {'email': email, 'password': password})
            .then(function(result) {
                made.user = result['data'];
                $cookieStore.put('user', made.user);

                defer.resolve(result);
            });

        return defer.promise;
    };

    this.logout = function() {
        if (made.user) {
            made.request('rpc://crm/user/logout');
            made.user = null;

            $cookieStore.remove('user');
        }
    };

    this.isLoggedin = function() {
        return made.user != null;
    };

});


madejs.directive('madeStoreFile', function($parse, Made) {
    return {
        restrict: 'A',
        scope: false,
        link: function(scope, element, attrs) {

            element.on('change', function(onChangeEvent) {
                var element = (onChangeEvent.srcElement || onChangeEvent.target);
                var cmd = 'scope.' + attrs.madeStoreFile + ' = [];';
                if(LOGGING) console.log(cmd);
                eval(cmd);

                for (var i = element.files.length - 1; i >= 0; i--) {
                    var current = element.files[i];
                    var reader = new FileReader();

                    reader.onload = function(onLoadEvent) {
                        // console.log('scope.' + attrs.madeStoreFile + ' = btoa(onLoadEvent.target.result);');
                        // eval('scope.' + attrs.madeStoreFile + ' = btoa(onLoadEvent.target.result);');
                        cmd = 'scope.' + attrs.madeStoreFile + '.push(FileFromData(Made, current.name, onLoadEvent.target.result));';
                        if(LOGGING) console.log(cmd);
                        eval(cmd);
                    };

                    reader.readAsArrayBuffer(current);
                };

            });
        }
    };
});


/**
 * http://briantford.com/blog/angular-d3
 * https://www.dashingd3js.com/d3-resources/d3-and-angular
 */
madejs.directive('madeTopology', function() {
    var width = 640;
    var height = 480;
    var color = d3.scale.category20();
    var force = d3.layout.force()
        .charge(-120)
        .linkDistance(60)
        .size([width, height]);


    return {
        restrict: 'E',
        scope: {
          data: '='
        },
        link: function (scope, element, attrs) {
            var svg = d3.select(element[0])
                .append('svg')
                .attr('width', width)
                .attr('height', height);
            var nodes = null;
            var links = null;

            scope.$watch('data', function (newVal, oldVal) {
                if(LOGGING) console.log('made-topology nodes', newVal);
                svg.selectAll('*').remove();

                if (!newVal) {
                    return;
                }

                nodes = newVal['nodes'];
                links = newVal['links'];

                force.nodes(nodes);
                force.links(links);
                force.start();

                var link = svg.selectAll(".topology-link")
                  .data(links)
                .enter().append("line")
                  .attr("class", "topology-link");

                var node = svg
                    .selectAll('.topology-node')
                    .data(nodes)
                    .enter().append('circle')
                    .attr("class", "topology-node")
                    .attr("r", 15)
                    .style("fill", function(d) { return color(d.type); })
                    .call(force.drag);

                force.on("tick", function() {
                    link.attr("x1", function(d) { return d.source.x; })
                        .attr("y1", function(d) { return d.source.y; })
                        .attr("x2", function(d) { return d.target.x; })
                        .attr("y2", function(d) { return d.target.y; });

                    node.attr("cx", function(d) { return d.x; })
                        .attr("cy", function(d) { return d.y; });
                });

            });

        }
    }
});


madejs.directive('madeTopologyLegend', function() {
    var color = d3.scale.category20();

    return {
        restrict: 'E',
        scope: {
          data: '='
        },
        link: function (scope, element, attrs) {
            var list = d3.select(element[0]).append('div');

            scope.$watch('data', function (newVal, oldVal) {
                if(LOGGING) console.log('made-topology-legend nodes', newVal);
                list.selectAll('*').remove();

                if (!newVal) {
                    return;
                }

                var node = list
                    .selectAll('div')
                    .data(newVal['nodes'])
                    .enter().append('div')
                    .text(function(d){ return d.type; })
                    .append('div')
                    .attr('class', 'topology-legend-box')
                    .style('background-color', function(d){ return color(d.type); });
            });
        }
    }
});
