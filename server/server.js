// do not crash on uncuaght exceptions
process.on( 'uncaughtException', function ( error ) {
    console.log( error.stack );
});

var express = require( 'express' );
var sha1 = require( 'sha1' );
var events = require( 'events' );

var dbHost = process.env[ 'MONGO_HOST' ] != null ? process.env[ 'MONGO_HOST' ] : 'localhost';
var dbPort = process.env[ 'MONGO_PORT' ] != null ? process.env[ 'MONGO_PORT' ] : 27017;
var dbName = process.env[ 'GRUMBLE_DB' ] != null ? process.env[ 'GRUMBLE_DB' ] : 'grumble';

var mongoose = require( 'mongoose' );
mongoose.connect( dbHost, dbName, dbPort );

var mongo = require( 'mongodb' );
var sessionDb = new mongo.Db( dbName, new mongo.Server( dbHost, dbPort, { auto_reconnect: true } ), {} );
var mongoStore = require( 'connect-mongodb' );

var sessionSecret = process.env[ 'GRUMBLE_SECRET' ] != null ? sha1( process.env[ 'GRUMBLE_SECRET' ] ) : sha1( __dirname + __filename + process.env[ 'USER' ] );

var Io = require('socket.io')

var app = express.createServer(
    express.static( __dirname + '/static' ),
    express.bodyParser(),
    express.cookieParser(),
    express.session({
        cookie: { maxAge: 1000 * 60 * 60 * 24 * 365 },
        secret: sessionSecret,
        store: new mongoStore( { db: sessionDb } )
    })
);

var io = Io.listen( app );
io.configure( function(){ 
    io.set( 'transports', [
        'websocket',
        'flashsocket',
        'htmlfile',
        'xhr-polling',
        'jsonp-polling'
    ] );
});

app.eventEmitter = new events.EventEmitter();

app.subsystems = [
    // api
    require( './api/1.0/Info.js' ),
    require( './api/1.0/Sessions.js' ),
    require( './api/1.0/Users.js' ),
    require( './api/1.0/Socket.js' ),
    require( './api/1.0/Messages.js' ),
    require( './api/1.0/Rooms.js' )
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

app.use( express.static( __dirname + '/client/web' ) );

// prebindings for any use statements
for ( var index = 0; index < app.subsystems.length; ++index )
{
    if ( typeof( app.subsystems[ index ].prebind ) != 'undefined' )
    {
        app.subsystems[ index ].prebind( app, __dirname );
    }
}

app.use( express.staticCache() ); // cache our static files

app.WithURLs = function( request, ref, postprocess ) {
    function AddURLs( obj ) {
        var result = obj._doc ? obj._doc.clone() : obj.clone();
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

for ( var index = 0; index < app.subsystems.length; ++index )
{
    app.subsystems[ index ].bind( app, io );
}

var port = process.env[ 'GRUMBLE_PORT' ] || 8000;
console.log( 'Server loaded, listening on port ' + port + ' ...' );
app.listen( port );