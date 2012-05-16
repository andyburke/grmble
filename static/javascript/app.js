var App = function() {
    var self = this;
    
    self.Start = function() {

        // TODO: get the api first
        
        JSONRequest({
            url: '/api/1.0/User',
            type: 'GET',
            success: function( data ) {
                $('.authenticated').show();
                $('.unauthenticated').hide();
            },
            error: function( response, status, error ) {
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
        
        var connectionStatusView = new ConnectionStatusView({
            model: new ConnectionStatus({
                socket: self.socket 
            })
        });
        
        var roomRouter = new RoomRouter();
        
        if ( Backbone.history )
        {
            Backbone.history.start();
        }
    }
}

var theApp = new App();
