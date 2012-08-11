var NameHighlighter = function() {
    var self = this;

    self.app = null;
    self.nicknameRegex = null;
    
    self.Bind = function( app ) {
        self.app = app;
        
        self.app.events.addListener( 'logged in', function( user ) {
            self.nicknameRegex = new RegExp( user.nickname + '[\W\s$]', "ig" );
        });

        self.app.events.addListener( 'logged out', function( user ) {
            self.nicknameRegex = null;
        });

        self.app.events.addListener( 'message rendered', function( message, messageElement ) {
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
}