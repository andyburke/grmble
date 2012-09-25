var ImagesHandler = function() {
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
        
        if ( href.match( /(?:png|gif|jpg)$/i ) )
        {
            result = '<a href="' + href + '" target="_blank"><img class="dynamic-embed" src="' + href + '" /></a>';
        }
        
        return result;
    }
}