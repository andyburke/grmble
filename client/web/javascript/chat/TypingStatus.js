var TypingStatus = function() {
    var self = this;
    
    self.app = null;
    self.typingTimeout = null;
    self.typingIdleTime = 1000 * 5;
    
    self.Bind = function( app ) {
        self.app = app;
        
        $( document ).on( 'keyup', '#message-entry-content', self.HandleChangedInput );
        $( document ).on( 'change', '#message-entry-content', self.HandleChangedInput );
        $( document ).on( 'paste', '#message-entry-content', self.HandleChangedInput );
        $( document ).on( 'cut', '#message-entry-content', self.HandleChangedInput );
        
        self.app.events.addListener( 'message sent', function() {
            self.SendUserTypingStatus( 'cancelledTyping' );
        });
    }
    
    self.HandleChangedInput = function( event ) {
        var inputLength = $.trim( $( '#message-entry-content' ).val() ).length;
        if ( inputLength > 0 )
        {
            if ( self.typingTimeout )
            {
                clearTimeout( self.typingTimeout );
                self.typingTimeout = null;
            }
            else
            {
                self.SendUserTypingStatus( 'startedTyping' );
            }
            
            self.typingTimeout = setTimeout( function() { 
                self.SendUserTypingStatus( 'stoppedTyping' );
                self.typingTimeout = null;
            }, self.typingIdleTime );
        }
        else 
        {
            if ( self.typingTimeout )
            {
                clearTimeout( self.typingTimeout );
                self.typingTimeout = null;
            }
            
            self.SendUserTypingStatus( 'cancelledTyping' );
        }
    }
    
    self.SendUserTypingStatus = function( status ) {
        self.app.GetMe( function( user ) {
            self.app.SendMessage({
                kind: status
            });
        });
    }
}


