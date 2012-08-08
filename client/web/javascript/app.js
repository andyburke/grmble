var App = function() {
    var self = this;
    
    self.socket = null;

    self.user = null;
    
    self.rooms = {};
    
    self.events = new EventEmitter();
    
    self.Start = function() {

        // TODO: get the api first

        self.GetUser( function( user ) {
            if ( user )
            {
                $('.authenticated').show();
                $('.unauthenticated').hide();
            }
            else
            {
                $('.authenticated').hide();
                $('.unauthenticated').show();
            }
        });

        self.socket = io.connect( window.location.origin, {
            'connect timeout': 1000, // this timeout might be a bit low... we'll see
            'sync disconnect on unload': false, // we will handle disconnect ourselves
            'reconnect': true,
            'reconnection limit': 10000,
            'max reconnection attempts': 30
        });

        self.socket.on( 'reconnect_failed', function() {
            alert( 'Could not reconnect to the server.  Try reloading the page.' ); 
        });
    }
    
    self.GetUser = function( callback ) {
        if ( self.user )
        {
            callback( self.user );
            return;
        }
        
        JSONRequest({
            url: '/api/1.0/User',
            type: 'GET',
            success: function( user ) {
                self.user = user;
                //self.nicknameRegex = new RegExp( user.nickname + '[\W\s$]', "ig" );
                callback( self.user );
            },
            error: function( xhr ) {
                callback( null );
            }
        });        
    }
}

var theApp = new App();
