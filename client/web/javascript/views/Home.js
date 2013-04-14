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
                    url: api.rooms.searchdynamics,
                    type: 'GET',
                    data: {
                        'sortBy': 'users',
                        'sort': 'desc'
                    },
                    success: function( roomDynamics ) {
                        dust.render( 'home', {
                            subtitle: 'List of all public rooms.',
                            roomDynamics: roomDynamics
                        }, function( error, output ) {
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
