var SpotifyHandler = function() {
    var self = this;
    
    self.app = null;
    
    self.Bind = function( app ) {
        self.app = app;
        
        var messageRenderer = self.app.GetSubsystem( MessageRenderer );
        if ( messageRenderer )
        {
            messageRenderer.AddHandler( self );
        }
    }
    
    self.Handle = function( href ) {
        var result = null;
        
        if ( href.match( /(?:http?:\/\/)?(?:open\.)?spotify\.com\/track\/(\w*)/i ) )
        {
            var matched = href.match( /(?:http?:\/\/)?(?:open\.)?spotify\.com\/track\/(\w*)/i );

            if ( matched && matched.length == 2 )
            {
                result = '<iframe class="dynamic-embed" src="https://embed.spotify.com/?theme=white&view=coverart&uri=spotify:track:' + matched[1] + '" width="250" height="80" frameborder="0" allowtransparency="true"></iframe>';
            }
        }
       
        return result;
    }
}