var MlkshkHandler = function() {
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
        
        if ( href.match( /(?:https?:\/\/)?(?:www\.)?mlkshk\.com\/[rp]\/.*?/i ) ) 
        {
            var imgUrl = href.replace( 'com/p/', 'com/r/' );
            var pageUrl = href.replace( 'com/r/', 'com/p/');
            result = '<a href="' + pageUrl + '" target="_blank"><img class="dynamic-embed" src="' + imgUrl + '" /></a>';
        }
       
        return result;
    }
}