
var MessageRenderer = function( app ) {
    var self = this;
    
    self.app = app;
    
    self.app.socket.on( 'message', function( message ) {
            
        switch( message.kind )
        {
            case 'idle':
            case 'active':
            case 'startedTyping':
            case 'stoppedTyping':
            case 'cancelledTyping':
                return;
        }

        // avoid duplicates
        if ( $( '#' + message._id ).length != 0 )
        {
            return;
        }
        
        // TODO: move this to a handler
        message.processed = message.content == null ? null : linkify( message.content,  {
            callback: function(text, href) {
                return processTextHref(text, href);
            }
        });

        var renderedMessage = ich.message( message );
        $( renderedMessage ).appendTo( '#chatlog' );

        self.app.events.emit( 'message rendered', message, newMessage );
            
        ScrollToBottom();

        $( '#submit-message' ).button( 'reset' );
        
    });
    
}