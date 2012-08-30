var InlineAds = function() {
    var self = this;
    
    self.app = null;

    self.minimumMessageTimeDelta = 500; // messages must be at least this many ms apart to count toward the count
    self.displayFrequency = 25;
    
    self.messageCount = 0;
    self.lastMessageTime = new Date();
    
    self.Bind = function( app ) {
        self.app = app;

        self.app.events.addListener( 'message rendered', function( message ) {
            if ( self.app.room && self.app.room.features && self.app.room.features.advertising )
            {
                var now = new Date();
                
                if ( ( now - self.lastMessageTime > self.minimumMessageTimeDelta ) && ( ++self.messageCount == self.displayFrequency ) )
                {
                    self.messageCount = 0;
                    
                    // add ads inline
                    var adBlock = $( "<iframe style='margin: 4px auto 4px auto; display: block; border: 0px;' src='/adsense/ad.html' width='468' height='60' scrolling='no'></iframe>" );
                    $( '#chatlog' ).append( adBlock );
                    self.app.events.emit( 'chatlog modified' );
                }
                
                self.lastMessageTime = now;
            }
        });
    }
}

