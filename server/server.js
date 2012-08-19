process.on( 'uncaughtException', function ( error ) {
    console.error( error.stack ? error.stack : error );
    if ( typeof( log ) != 'undefined' && log.channels && log.channels.server )
    {
        log.channels.server.log( 'error', error );
    }
    process.exit( 1 );
});

global.config = require( './config/server.config.js' )

var Logging = require( './lib/logging.js' );
global.log = new Logging.Logger( config.logging );

global.utils = require( './lib/utils.js' );

process.env.TZ = 'UTC';
log.channels.server.info( 'Server Timezone: ' + process.env.TZ );

var express = require( 'express' );
var events = require( 'events' );
var extend = require( 'node.extend' );

var Io = require('socket.io')

global.models = require( './lib/models.js' );
global.checks = require( './lib/checks.js' );

express.logger.token( 'bytes-written', function( request, response ) {
    return response.req.client.bytesWritten;
});

var app = express.createServer(
    express.logger({
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
    }),
    express.bodyParser(),
    express.cookieParser(),
    express.static( __dirname + '/../client/web' )
);

var RedisStore = require( 'socket.io/lib/stores/redis' );

var io = Io.listen( app );
io.configure( function(){ 
    io.set( 'transports', [
        'websocket',
        'flashsocket',
        'htmlfile',
        'xhr-polling',
        'jsonp-polling'
    ]);
    
    io.set('store', new RedisStore({
        redisPub: redis.createClient( config.redis.port, config.redis.host ),
        redisSub: redis.createClient( config.redis.port, config.redis.host ),
        redisClient : redis.createClient( config.redis.port, config.redis.host )
    }));
});

app.eventEmitter = new events.EventEmitter();

app.subsystems = [
    // api
    require( './api/1.0/Info.js' ),
    require( './api/1.0/Sessions.js' ),
    require( './api/1.0/Users.js' ),
    require( './api/1.0/Socket.js' ),
    require( './api/1.0/Messages.js' ),
    require( './api/1.0/Rooms.js' ),
    require( './api/1.0/Stripe.js' ),
    require( './api/1.0/Pricing.js' )
];

app.GetURLs = function() {
    var result = {};
    for ( var subsystem in app.subsystems )
    {
        if ( app.subsystems[ subsystem ].GetURLs )
        {
            result = extend( result, app.subsystems[ subsystem ].GetURLs() );
        }
    }
    
    return result;
}

app.WithURLs = function( request, ref, postprocess ) {
    function AddURLs( obj ) {
        var result = obj._doc ? obj.toObject().clone() : obj.clone();
        result.urls = {};
        for ( var subsystem in app.subsystems )
        {
            if ( app.subsystems[ subsystem ].GetURLs )
            {
                result.urls = extend( result.urls, app.subsystems[ subsystem ].GetURLs( obj ) );
            }
        }
        
        for ( var urlKey in result.urls )
        {
            if ( result.urls[ urlKey ][ 0 ] == '/' )
            {
                result.urls[ urlKey ] = 'http://' + request.headers.host + result.urls[ urlKey ];
            }
        }

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

// prebindings for any use statements
for ( var index = 0; index < app.subsystems.length; ++index )
{
    if ( typeof( app.subsystems[ index ].prebind ) != 'undefined' )
    {
        app.subsystems[ index ].prebind( app, __dirname );
    }
}

for ( var index = 0; index < app.subsystems.length; ++index )
{
    app.subsystems[ index ].bind( app, io );
}

console.log( 'Server loaded, listening on port ' + config.server.port + ' ...' );
app.listen( config.server.port );