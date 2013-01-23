var domain = require( 'domain' );
var topLevelDomain = domain.create();

topLevelDomain.on( 'error', function( error ) {
    if ( typeof( log ) != 'undefined' && log.channels && log.channels.server )
    {
        log.channels.server.log( 'error', error );
    }
    else
    {
        console.error( error.stack ? error.stack : error );
    }
    process.exit( 1 );
});

topLevelDomain.run( function() {
    
    global.config = require( './config/server.config.js' )
    
    var Logging = require( './lib/logging.js' );
    global.log = new Logging.Logger( config.logging );
    
    global.utils = require( './lib/utils.js' );
    
    process.env.TZ = 'UTC';
    log.channels.server.info( 'Server Timezone: ' + process.env.TZ );
    
    var express = require( 'express' );
    var events = require( 'events' );
    var extend = require( 'node.extend' );
    var fs = require( 'fs' );
    var http = require( 'http' );
    var https = require( 'https' );
    
    global.models = require( './lib/models.js' );
    global.checks = require( './lib/checks.js' );
    
    var SSL = {
        key: fs.readFileSync( 'ssl/grmble.key' ),
        cert: fs.readFileSync( 'ssl/grmble.crt' )
    };
    
    var app = express();

    express.logger.token( 'bytes-written', function( request, response ) {
        console.log( response.req.connection.bytesWritten );
        return isNaN( response.req.connection.bytesWritten ) ? -1 : response.req.connection.bytesWritten;
    });
    app.use( express.logger({
        format: '{ "ip": ":remote-addr", "date": ":date", "request": { "method": ":method", "url": ":url", "version": "HTTP/:http-version" }, "status": :status, "response-time": :response-time, "bytes-sent": :bytes-written, "referrer": ":referrer", "user-agent": ":user-agent" }',
        stream: {
            write: function( str ) {
                try
                {
                    log.channels.access.info( JSON.parse( str ) );
                }
                catch( e )
                {
                    log.channels.access.error( e.toString() );
                }
            }
        }
    }) );

    app.use( express.bodyParser() );
    app.use( express.cookieParser() );
    app.use( express.static( __dirname + '/../client/web' ) );

    app.eventEmitter = new events.EventEmitter();
    
    app.subsystems = [
        // api
        require( './api/1.0/Info.js' ),
        require( './api/1.0/Sessions.js' ),
        require( './api/1.0/Users.js' ),
        require( './api/1.0/Messages.js' ),
        require( './api/1.0/Rooms.js' ),
        require( './api/1.0/Stripe.js' ),
        require( './api/1.0/Pricing.js' ),
        require( './api/1.0/Passwords.js' ),
        
        // sockets
        require( './lib/Messaging.js' ),
        
        // feeds
        
        require( './api/1.0/feeds/Github.js' )
    ];
    
    app.GetSubsystem = function( subsystemType ) {
        for ( var index = 0; index < app.subsystems.length; ++index )
        {
            if ( app.subsystems[ index ] instanceof subsystemType )
            {
                return app.subsystems[ index ];
            }
        }
        
        return null;
    }
    
    app.GetURLs = function( request ) {
        var result = {};
        for ( var subsystem in app.subsystems )
        {
            if ( app.subsystems[ subsystem ].GetURLs )
            {
                result = extend( result, app.subsystems[ subsystem ].GetURLs( null, request ) );
            }
        }
        
        return result;
    }
    
    app.WithURLs = function( request, ref, postprocess ) {
        function AddURLs( obj ) {
            var result = obj._doc ? obj.toObject().clone() : obj.clone();
            result.urls = {};
            
            if ( obj._doc )
            {
                for ( var field in obj._doc )
                {
                    if ( result[ field ] )
                    {
                        if ( obj._doc[ field ]._doc )
                        {
                            result[ field ] = AddURLs( obj[ field ] );
                        }
                        else if ( typeof( obj._doc[ field ] === 'array' ) && obj._doc[ field ].length && obj._doc[ field ][ 0 ]._doc )
                        {
                            result[ field ] = [];
                            for ( var i = 0; i < obj._doc[ field ].length; ++i )
                            {
                                result[ field ].push( AddURLs( obj[ field ][ i ] ) );
                            }
                        }
                    }
                }
            }
            
            for ( var subsystem in app.subsystems )
            {
                if ( app.subsystems[ subsystem ].GetURLs )
                {
                    result.urls = extend( result.urls, app.subsystems[ subsystem ].GetURLs( obj, request ) );
                }
            }
            
            app.FixURLs( request, result.urls );
    
            return postprocess ? postprocess( result ) : result;
        }
        
        if ( ref instanceof Array )
        {
            var result = [];
            for ( var index = 0; index < ref.length; ++index )
            {
                result.push( AddURLs( ref[ index ] ) );
            }
            return result;
        }
        else
            return AddURLs( ref );
    }
    
    app.FixURLs = function( request, urls ) {
        urls = urls || {};
        for ( var urlKey in urls )
        {
            if ( urls[ urlKey ] instanceof Array || urls[ urlKey ] instanceof Object )
            {
                app.FixURLs( request, urls[ urlKey ] );
            }
            else if ( urls[ urlKey ][ 0 ] == '/' )
            {
                urls[ urlKey ] = 'http' + ( request.connection.encrypted ? 's' : '' ) + '://' + request.headers.host + urls[ urlKey ];
            }
        }
    }

    
    for ( var index = 0; index < app.subsystems.length; ++index )
    {
        if ( typeof( app.subsystems[ index ].bind ) == 'function' )
        {
            app.subsystems[ index ].bind( app );
        }
    }
    
    log.channels.server.info( 'Grmble Environment: ' + ( process.env[ 'GRMBLE_ENVIRONMENT' ] || 'test' ) );
    log.channels.server.info( 'Server loaded...' );

    log.channels.server.info( 'HTTP listening on port ' + config.server.port + ' ...' );
    var httpServer = http.createServer( app ).listen( config.server.port );

    log.channels.server.info( 'HTTPS listening on port ' + config.server.sslport + ' ...' );
    var httpsServer = https.createServer( SSL, app ).listen( config.server.sslport );

    for ( var index = 0; index < app.subsystems.length; ++index )
    {
        if ( typeof( app.subsystems[ index ].postbind ) == 'function' )
        {
            app.subsystems[ index ].postbind( app, [ httpServer, httpsServer ] );
        }
    }
});