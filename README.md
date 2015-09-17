made-js
=======

**Author:** Arne Simon [arne.simon@slice-dice.de]
**Author:** Max Fielker [max.fielker@slice-dice.de]

A thin made node for the made cluster.

Install
-------

Add the following line to your *bower.json*:

    bower install made-js

Example
-------

```javascript
    var module = angula.module('myModule', ['made-js']);

    module.controller('TestCtrl', function ($scope, $sce, Made) {

        Made.request('rpc://crm/systemstats')
            .then(function(result){
                // ...
            });
    });

```

Made Service
------------

The AngularJS made service, which provides access to the made cluster.

### Attributes

+ user

    The logged in user or *null*.

### Functions

+ afterConnect(callback)

    Executes the callback only **after** the class is connected to the made cluster.

    + **callback** The callback function which will be executed.

+ request(uri, args, kwargs)

    Starts a request into the made network.

    + **uri** The resource url.
    + **args** An array of parameters.
    + **kwargs** A dictonary of keyword arguments.

    Example:

        Made.request('rpc://crm/file/list')
            .then(function(result) {
                // ...
            });

+ channel(uri, args, kwargs)

    Creates a channel to the requested resource in the made network.


    + **uri** The resource url.
    + **args** An array of parameters.
    + **kwargs** A dictonary of keyword arguments.

    Example:

        var channel = Made.channel('file://crm/myfile');

+ topology()

    Returns a JSON which describes the topology of the made service network.

    Result:

        {
            "nodes": [{"id": "", "type": "", "host": "", "port": 9090}],
            "links": [{"source": 0, "target": 1}]
        }

+ capabilities()

    Returns a JSON which describes the capabilites of the made service network.

    Result:

        [{
            "id": "",
            "doc": "",
            "type": "",
            "workflows": [],
            "subspaces": [{
                "name": "",
                "brief": "",
                "doc": "",
                "type": "rpc",
                "params": "",
                "version": ""
            }, {
                "name": "",
                "brief": "",
                "doc": "",
                "type": "namespace",
                "subspaces": "",
            }],
        }]

+ loginByName(name, password)

    Logs in as a user.

    + **name** The user name.
    + **password** The user password.

    Example:

        Made.loginByName('hans', 'l34d')
            .then(function(result) {

            });

+ loginByEmail(email, password)

    Logs in as a user.

    + **email** The email of the user.
    + **password** The user password.

    Example:

        Made.loginByEmail('hans@funky.net', 'l34d')
            .then(function(result) {

            });

+ logout()

    Logs the current logged in user, out.

+ isLoggedin()

    Returns **true** if the user is logged in.


File
----

### Attributes

+ fctx

    + filename
    + chunk_size
    + length
    + md5
    + encoding

### Functions

+ readAll()

    Example:

        file.readAll()
            .then(function(data) {

        });

+ read(pos, length)

    Reads a chunk of data

+ store()

    Stores the file in the made cluster, with the *fctx.filename*.

    Example:

        file.store()
            .then(function() {
                // finished uploading.
            });

+ save()

    Opens the file save dialog in the browser, to save the file.


Channel
-------

### Attributes

+ uri

    The used resource uri.

+ context

    The context of the channel.

### Functions

+ send(data)

    Broadcasts the data over the channel.

+ recv()

    If there is data in the buffer it is returned, else null.

+ asyncRecv()

    Returns an Angular-Js promis.

    Example:

        channel.asyncRecv()
            .then(function(data) {

            });

