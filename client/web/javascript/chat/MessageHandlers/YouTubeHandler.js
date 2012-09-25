var YouTubeHandler = function() {
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
        
        if ( href.match( /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?.*?v=\S+/i ) )
        {
            var matched = href.match( /[\?|\&]v=(\w[\w|-]*)/i );
            if ( matched && matched.length == 2 )
            {
                result = '<iframe class="youtube-player dynamic-embed" type="text/html" width="640" height="360" src="http://www.youtube.com/embed/' + matched[ 1 ] + '?wmode=transparent" frameborder="0"></iframe>';
            }
        }
        else if ( href.match( /(?:https?:\/\/)?(?:www\.)?youtu\.be\/.*?/i ) )
        {
            var matched = href.match( /(?:https?:\/\/)?(?:www\.)?youtu\.be\/(\w[\w|-]*)/i );
            if ( matched && matched.length == 2 )
            {
                result = '<iframe class="youtube-player dynamic-embed" type="text/html" width="640" height="360" src="http://www.youtube.com/embed/' + matched[ 1 ] + '?wmode=transparent" frameborder="0"></iframe>';
            }
        }
        
        return result;
    }
}