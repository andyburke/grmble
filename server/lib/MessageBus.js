var redis = require( 'redis' );
var util = require( 'util' );
var events = require( 'events' );

var MessageBus = function() {
    var self = this;
    events.EventEmitter.call( self );
    
    self.connected = false;
    self.errorEmitted = false;
    
    self.client = redis.createClient( config.redis.port, config.redis.host );
    if ( config.redis.password )
    {
        self.client.auth( config.redis.password );
    }

    // TODO: should this be .once?
    self.client.on( 'connect', function() {
        self.client.subscribe( config.redis.channel );
        self.connected = true;
    });
    
    self.client.on( 'end', function() {
        self.connected = false; 
    });

    self.client.on( 'error', function( error ) {
        if ( !self.errorEmitted )
        {
            log.channels.server.log( 'error', error );
            self.errorEmitted = true;
            setTimeout( function() {
                self.errorEmitted = false;
            }, 1000 * 60 * 10 );
        }
    });
    
    self.client.on( 'message', function( channel, messageJSON ) {
        try
        {
            var message = JSON.parse( messageJSON );
            self.emit( 'message', message );
        }
        catch( SyntaxError )
        {
            return;
        }
    });
}

util.inherits( MessageBus, events.EventEmitter );

MessageBus.prototype.Publish = function( message ) {
    var self = this;
    
    if ( self.connected )
    {
        self.client.publish( config.redis.channel, JSON.stringify( message ) );
    }
}

module.exports = new MessageBus();
