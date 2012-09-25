var AudioHandler = function() {
    var self = this;
    
    self.app = null;
    self.messageRenderer = null;
    
    self.Bind = function( app ) {
        self.app = app;
        
        self.messageRenderer = self.app.GetSubsystem( MessageRenderer );
        if ( self.messageRenderer )
        {
            self.messageRenderer.AddHandler( self );
        }
        
        self.app.events.addListener( 'message rendered', function( message, messageElement ) {
            var audioElements = $( messageElement ).find( 'audio' );
            
            for ( var index = 0; index < audioElements.length; ++index )
            {
                audiojs.create( audioElements[ index ] ); 
            }
        });        
    }
    
    self.Handle = function( href ) {
        var result = null;
        
        if ( href.match( /(?:mp3|wav|ogg)$/i ) )
        {
            result = '<audio src="' + href + '" preload="auto" /> [<a href="' + href + '" target="_blank">' + self.messageRenderer.EscapeHTML( href ) + '</a>]';
        }
       
        return result;
    }
}