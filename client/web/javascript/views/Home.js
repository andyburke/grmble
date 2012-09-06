var Home = function() {
    var self = this;
    
    self.app = null;
    self.router = null;
    
    self.Bind = function( app, router ) {
        self.app = app;
        self.router = router;
        
        self.router.on( '/', function() {
            mixpanel.track( "View: Home" );
            self.app.events.emit( 'navigated', 'home' );
            
            $( '#main' ).spin( 'large' );
            self.app.GetAPI( function( api ) {
                jsonCall({
                    url: api.rooms,
                    type: 'GET',
                    data: {
                        'sortBy': 'users',
                        'sort': 'desc'
                    },
                    success: function( rooms ) {
                        dust.render( 'home', { subtitle: 'List of all public rooms.', rooms: rooms }, function( error, output ) {
                            if ( error )
                            {
                                self.app.ShowError( error );
                                return;
                            }
                        
                            $( '#main' ).html( output );
                            $( '#main' ).spin( false );
                        });
                    },
                    error: function( response, status, error ) {
                        $( '#main' ).spin( false );
                        self.app.ShowError( response.responseText );
                    }
                });
            });
        });
    }
}
