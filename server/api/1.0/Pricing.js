var Pricing = module.exports = function( options ) {
    var self = this;

    options.app.get( '/api/1.0/Pricing', function( request, response ) {
        response.json( options.config.pricing );
    });

    return self;
}

Pricing.prototype.Interface = {
    'pricing': '/api/1.0/Pricing'
};