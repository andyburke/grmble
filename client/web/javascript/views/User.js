var User = function() {
    var self = this;
    
    self.app = null;
    self.router = null;
    
    self.Bind = function( app, router ) {
        self.app = app;
        self.router = router;
        
        self.router.on( '/User/:userId', function(userId) {
            mixpanel.track( "View: User" );
            self.app.events.emit( 'navigated', 'user' );
            
            self.app.GetMe( function( user ) {
                if ( !user )
                {
                    self.app.ShowError( 'You must be logged in.', function() {
                        window.location.hash = '/'; 
                    });
                    return;
                }

                dust.render( 'user', user, function( error, output ) {
                    if ( error )
                    {
                        self.app.ShowError( error );
                        return;
                    }
                
                    $( '#main' ).html( output );
                });
            });
        });
    }
}
