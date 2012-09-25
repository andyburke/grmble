var VimeoHandler = function() {
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
        
        if ( href.match( /(?:https?:\/\/)?(?:www\.)?vimeo\.com\/.*?/i ) )
        {
            var matched = href.match( /(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(\w[\w|-]*)/i);
            if ( matched && matched.length == 2 )
            {
                result = '<iframe class="dynamic-embed" src="http://player.vimeo.com/video/' + matched[1] + '?autoplay=0&amp;api=1" width="640" height="360" frameborder="0" webkitAllowFullScreen mozallowfullscreen allowFullScreen></iframe>';
            }
        }
       
        return result;
    }
}