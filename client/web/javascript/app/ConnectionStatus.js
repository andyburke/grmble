var ConnectionStatus = function( socket, element ) {
    var self = this;

    self.socket = socket;
    self.element = element;
    
    self.connected = false;
    
    self.socket.on( 'connect', function() {
        self.connected = true;
        $( self.element ).attr( 'class', 'icon-signal icon-white' );
        $( self.element ).css( 'opacity', 1.0 );
    });

    self.socket.on( 'disconnect', function() {
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
    
}
