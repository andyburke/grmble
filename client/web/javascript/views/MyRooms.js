var MyRooms = function() {
    var self = this;
    
    self.app = null;
    self.router = null;
    
    self.Bind = function( app, router ) {
        self.app = app;
        self.router = router;
        
        self.router.on( '/MyRooms', function() {
            mixpanel.track( "View: MyRooms" );
            self.app.events.emit( 'navigated', 'myrooms' );
            
            self.app.GetAPI( function( api ) {
                jsonCall({
                    url: api.myrooms,
                    type: 'GET',
                    success: function( rooms ) {
                        dust.render( 'myrooms', { rooms: rooms }, function( error, output ) {
                            if ( error )
                            {
                                self.app.ShowError( error );
                                return;
                            }
                        
                            $( '#main' ).html( output );
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
