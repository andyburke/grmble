var ConnectionStatus = function() {
    var self = this;

    self.element = '#server-connection-status';
    self.app = null;
    self.connected = false;

    self.Bind = function( app ) {
        self.app = app;
        
        self.app.events.addListener( 'client created', function() {
            self.app.client.bind( 'transport:up', function() {
                self.connected = true;
                $( self.element ).attr( 'class', 'icon-signal icon-white' );
                $( self.element ).css( 'opacity', 1.0 );
            });
        
            self.app.client.bind( 'transport:down', function() {
                self.connected = false;
        
                $( self.element ).attr( 'class', 'icon-ban-circle icon-white' );
                
                function ShowDisconnected() {
                    if ( self.connected )
                    {
                        return;
                    }
                    
                    $( self.element ).animate( { opacity: 0.2 }, 500, function() {
                        $( self.element ).animate( { opacity: 1.0 }, 500, function() {
                            ShowDisconnected(); 
                        });
                    });
                }
                
                ShowDisconnected();
            });

        });
    }
}
