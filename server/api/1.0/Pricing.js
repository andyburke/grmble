
var Pricing = function() {
    var self = this;

    self.GetURLs = function( obj ) {
        return obj ? {} : {
            'pricing': '/api/1.0/Pricing'
        };
    }

    self.bind = function( app ) {

        app.get( '/api/1.0/Pricing', function( request, response ) {
            response.json( {} );
        });
    }

    return self;
}

module.exports = new Pricing();
