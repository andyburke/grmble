var MessageHistory = function() {
    var self = this;
    
    self.app = null;

    // currently an empty array on start .. might want to fill it with historical messages
    self.message_history = [];
    self.current_message_index = 0;
    
    self.Bind = function( app ) {
        self.app = app;
        
        self.app.events.addListener( 'message sent', self.AddSentMessageToHistory );

        $( document ).on( 'keyup', '#message-entry-content', function( event ) {
            var keyCode = event.keyCode || event.which;
            var arrow = {
                left: 37,
                up: 38,
                right: 39,
                down: 40
            };
            
            if ( keyCode === arrow.up )
            {
                self.SetToPreviousMessage();
            } 
            else if ( keyCode === arrow.down )
            {
                self.SetToNextMessage();
            } 
            else 
            {
                self.SetCurrentMessage();
            }
        });
    }

    self.AddSentMessageToHistory = function ( message ) {
        self.message_history[ self.message_history.length ] = message.content;
        self.current_message_index = self.message_history.length + 1;
    }    
        
    self.SetToPreviousMessage = function() {
        if ( self.current_message_index > 0 )
        {
            self.current_message_index--;
            $( '#message-entry-content' ).val( self.message_history[ self.current_message_index ] );
        }
    }
    
    self.SetToNextMessage = function() {
        if ( self.current_message_index < self.message_history.length - 1 )
        {
            self.current_message_index++;
            $( '#message-entry-content' ).val( self.message_history[ self.current_message_index ] );
        }
    }
    
    self.SetCurrentMessage = function() {
        self.current_message_index = self.message_history.length - 1;
        if ( self.current_message_index < 0 )
        {
            self.current_message_index = 0;
        }
        self.message_history[ self.current_message_index ] = $( '#message-entry-content' ).val();
    }
}
