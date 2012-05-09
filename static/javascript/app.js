var App = function() {
    var self = this;
    
    self.router = new Backbone.Router();

    self.Start = function() {

        // TODO: get the api first
        
        JSONRequest({
            url: '/api/1.0/User',
            type: 'GET',
            success: function( data ) {
                $('.authenticated').show();
                $('.unauthenticated').hide();
            },
            error: function( response, status, error ) {
                $('.authenticated').hide();
                $('.unauthenticated').show();
            }
        });

        if ( Backbone.history )
        {
            Backbone.history.start();
        }
    }
}

var theApp = new App();
