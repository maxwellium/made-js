made-js
=======

**Author:** Arne Simon [arne.simon@slice-dice.de]

A thin made node for the made cluster.

Example
-------

```
#!javascript

    Made.request('rpc://crm/systemstats')
        .then(function(result){
            // ...
        });

```

Made Service
------------

The AngularJS made service, which provides access to the made cluster.

### Attributes

+ **user**

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

    ```
    #!javascript

        Made.request('rpc://crm/file/list')
            .then(function(result) {
                // ...
            });
    ```

+ loginByName(name, password)

    Logs in as a user.

    + **name** The user name.
    + **password** The user password.

    ```
    #!javascript

        Made.loginByName('hans', 'l34d')
            .then(function(result) {

            });
    ```

+ loginByEmail(email, password)

    Logs in as a user.

    + **email** The email of the user.
    + **password** The user password.

    ```
    #!javascript

        Made.loginByEmail('hans@funky.net', 'l34d')
            .then(function(result) {

            });
    ```

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

    ```
    #!javascript

        file.readAll(function(data) {

        });
    ```

+ append(data)
+ store()
+ save()