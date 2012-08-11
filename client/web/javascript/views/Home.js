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
            
            dust.render( 'home', {}, function( error, output ) {
                if ( error )
                {
                    self.app.ShowError( error );
                    return;
                }
            
                $( '#main' ).html( output );
            });
        });
    }
}
