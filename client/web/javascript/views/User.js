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
            
            self.app.GetMe( function( me ) {
                if ( !me )
                {
                    $( '#signup-modal' ).modal( { 'backdrop': 'static' } );
                    return;
                }

                $( '#main' ).spin( 'large' );
                self.app.GetUser( userId, function( user, error ) {
                    $( '#main' ).spin( false );
					
					if ( error )
                    {
                        self.app.ShowError( error );
                        return;
                    }

                    document.title = user.nickname + "'s Public Profile on Grmble";

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
        });
    }
}