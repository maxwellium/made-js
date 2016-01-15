angular.module('raupy').service('raupy', function() {
    var wss = WebSocket('http://vsp.sliceanddice.de:7854')
    var raupy = this

    wss.onopen = function() {
        console.log("raupy open!")
    }

    wss.onerror = function (error) {
        console.log('raupy error: ', error)
    }

    wss.onclose = function(){

    }

    wss.onmessage = function(msg) {
    }

    this.LogLevel = {
        DEBUG: 10,
        INFO: 20,
        WARN: 30,
        ERROR: 40,
        FATAL: 50
    }

    this.logger = function(name) {
        return function() {
            var me = this
            this.name = name
            this.debug = function(message) {
                err = Error('')
                var line = err.stack.split('\n')[4]
                var start = line.indexOf('(')
                var end = line.indexOf(')')
                var result = line.slice(start+1, end).split(':')

                record = {
                    'created': '' + new Date,
                    'context': '',
                    'level': raupy.LogLevel.DEBUG,
                    'hostname': window.location.host,
                    'logname': me.name,
                    'file': result[0],
                    'lineno': result[1],
                    'message': message
                }

                wss.send(angular.toJson(record))
            }
        }
    }


})