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
            return ctx.buffer.shift();
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
            console.log('channel-error', msg.error);
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
