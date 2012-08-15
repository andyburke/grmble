var models = require( './models.js' );
var checks = require( './checks.js' );

var Stripe = function() {
    var self = this;
    
    self.GetURLs = function( obj ) {
        return {};
    };
    
    self.bind = function( app ) {
        app.post( '/api/1.0/Stripe', function( request, response ) {
            var stripeEventRecord = new models.StripeEventRecord();
            stripeEventRecord.json = JSON.stringify( request.body );
            stripeEventRecord.save( function( error ) {
                if ( error )
                {
                    console.error( error );
                    // TODO: need to log this into a central service
                    response.send( error, 500 );
                }

                response.send( 'ok' );
            });
        });
    }
}

module.exports = new Stripe();