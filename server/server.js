var config = require( './config/config.js' )

var Logger = require( './lib/Logger.js' );
var logger = Logger.Create({
    directoy: config.logging[ 'directory' ],
    loggly: {
        subdomain: config.logging.loggly.subdomain,
        token: config.logging.loggly.inputTokens[ process.env[ 'NODE_ENVIRONMENT' ] || 'dev' ]
    }
});

var domain = require( 'domain' );
var topLevelDomain = domain.create();

topLevelDomain.on( 'error', function( error ) {
    logger.error( error.message || error, {
        channel: 'server',
        error: error.name || error,
        message: error.message || error,
        stack: error.stack
    });

    process.exit( 1 );
});

topLevelDomain.run( function() {
    
    var utils = require( './lib/utils.js' );
    
    process.env.TZ = 'UTC';
    logger.info( 'Server Timezone: ' + process.env.TZ, { channel: 'server' } );
    
    var express = require( 'express' );
    var events = require( 'events' );
    var devents = require( 'devents' );
    var fs = require( 'fs' );
    var http = require( 'http' );
    var https = require( 'https' );
    var Mixpanel = require( 'mixpanel' );
    var mongoose = require( 'mongoose' );
    var net = require( 'net' );
    var uuid = require( 'node-uuid' );
    
    var models = require( './lib/models.js' );
    var checks = require( './lib/checks.js' );

    var mixpanel = Mixpanel.init( config.mixpanel.tokens[ process.env[ 'NODE_ENVIRONMENT' ] || 'dev' ] );
    
    ///////////////////
    // init db
    
    var dbURI = 'mongodb://' + config.mongo.host + ':' + config.mongo.port + '/' + config.mongo.name;
    logger.info( 'DB URI: ' + dbURI, { channel: 'server' } );

    var dbConnection = mongoose.createConnection();
    
    dbConnection.on( 'error', function( error ) {
        logger.error( error, { channel: 'db' } );
    });
    
    dbConnection.on( 'connected', function() {
        logger.info( 'Connected to db.', { channel: 'db' } );
    });
    
    dbConnection.on( 'disconnected', function() {
        logger.info( 'Disconnected from db.', { channel: 'db' } );
    });
    
    dbConnection.on( 'open', function() {
        logger.info( 'DB connection open.', { channel: 'db' } );
    });
    
    dbConnection.on( 'close', function() {
        logger.info( 'DB connection closed.', { channel: 'db' } );
    });

    dbConnection.open( dbURI );
    
    models.Init( dbConnection );
    
    //
    ///////////////////
    
    var SSL = {
        key: fs.readFileSync( 'ssl/grmble.key' ),
        cert: fs.readFileSync( 'ssl/grmble.crt' )
    };
    
    var app = express();
    app.enable( 'trust proxy' );
    app.use( function( request, response, next ) {
        request._startTime = new Date();
        
        response.on( 'finish', function() {
            var socket = request.socket.socket ? request.socket.socket : request.socket;

            var date = new Date().toUTCString();
            var ip = request.ip ? request.ip : socket.remoteAddress;
            var version = "HTTP" + ( !!request.connection.encrypted ? 'S' : '' ) + '/' + request.httpVersionMajor + '.' + request.httpVersionMinor;
            var responseTime = new Date() - request._startTime;
            
            logger.info( ip + ' ' + request.headers[ 'user-agent' ] + ' [' + date + ']' + ' "' + request.method + ' ' + request.url + ' ' + version + '" ' + response.statusCode + ' ' + socket.bytesWritten + ' ' + responseTime + 'ms', {
                ip: ip,
                date: date,
                request: {
                    method: request.method,
                    url: request.url,
                    version: version
                },
                status: response.statusCode,
                'response-time': responseTime,
                'bytes-sent': socket.bytesWritten,
                referrer: request.headers[ 'referer' ] || request.headers[ 'referrer' ],
                'user-agent': request.headers[ 'user-agent' ],
                id: uuid.v4(),
                ssl: !!request.connection.encrypted,
                channel: 'access'
            });
        });
        
        next();
    });
    app.use( express.bodyParser() );
    app.use( express.cookieParser() );
    app.use( express.static( __dirname + '/../client/web' ) );

    // fix for iOS6 caching POSTs (wtf?)
    app.post( '*', function( request, response, next ) {
        response.header( 'Cache-Control', 'private, no-cache, no-store, must-revalidate' );
    
        next();
    });    

    app.events = new events.EventEmitter();
    app.devents = new devents.DistributedEventEmitter({
        host: config.redis.host,
        port: config.redis.port
    });

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
    
    logger.info( 'Environment: ' + ( process.env[ 'NODE_ENVIRONMENT' ] || 'dev' ), { channel: 'server' } );

    var httpServer = http.createServer( app ).listen( config.server.port );
    logger.info( 'HTTP listening on port ' + config.server.port + ' ...', { channel: 'server' } );

    var httpsServer = https.createServer( SSL, app ).listen( config.server.sslport );
    logger.info( 'HTTPS listening on port ' + config.server.sslport + ' ...', { channel: 'server' } );

    var RecursiveRequire = require( './lib/recursiverequire' );
    var requires = RecursiveRequire.require( './api' );
    
    var subsystems = [];
    
    var options = {
        config: config,
        logger: logger,
        mixpanel: mixpanel,
        models: models,
        checks: checks,
        utils: utils,
        app: app,
        subsystems: subsystems,
        servers: [
            httpServer,
            httpsServer
        ]
    };
    
    for ( var req in requires )
    {
        var system = requires[ req ];
        subsystems.push( new ( system )( options ) );
    }
});