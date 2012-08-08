var ScrollHandler = function( app ) {
    var self = this;
    
    self.app = app;
    self.nearBottom = true;
    
    $( window ).scroll( function() {
        self.nearBottom = ( ( $( window ).scrollTop() + $( window ).height() ) > ( $( document ).height() - 80 ) );
    });
    
    self.scrollRequests = 0;

    function ScrollToBottom() {
        if ( self.nearBottom )
        {
            ++scrollRequests;
            if ( scrollRequests == 1 )
            {
                $( 'html, body' ).animate({ 
                        scrollTop: $( document ).height() - $( window ).height()
                    }, 
                    50,
                    "linear",
                    function() {
                        var outstandingRequests = scrollRequests > 1;
                        scrollRequests = 0;
                        if ( outstandingRequests )
                        {
                            ScrollToBottom();
                        }
                    }
                );
            }
        }
        else
        {
            function IndicateNewMessages() {
                if ( self.nearBottom )
                {
                    $( '#new-messages-indicator' ).addClass( 'hide' );
                    return;
                }
                
                $( '#new-messages-indicator' ).removeClass( 'hide' );
                $( '#new-messages-indicator' ).animate( { opacity: 0.2 }, 500, function() {
                    $( '#new-messages-indicator' ).animate( { opacity: 1.0 }, 500, function() {
                        IndicateNewMessages();
                    });
                });
            }
            
            IndicateNewMessages();
        }
    }

    self.app.events.addListener( 'message rendered', function() {
        ScrollToBottom(); 
    });
}