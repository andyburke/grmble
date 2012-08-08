var NameHighlighter = function( messageRenderer ) {
    var self = this;

    self.nicknameRegex = null;
    self.SetNickname = function( nickname ) {
        self.nicknameRegex = new RegExp( nickname + '[\W\s$]', "ig" );
    }

    self.messageRenderer = messageRenderer;
    self.messageRenderer.events.addListener( 'message rendered', function( message, messageElement ) {
        if ( !self.nicknameRegex )
        {
            return;
        }
        
        if ( message.content.match( self.nicknameRegex ) )
        {
             $( messageElement ).addClass( 'message-references-me' );
        }
    });
}