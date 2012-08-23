var Stripe = function() {
    var self = this;
    
    self.GetURLs = function( obj ) {
        return obj ? {} : {
        };
    };
    
    self.bind = function( app ) {
        app.post( '/api/1.0/Stripe', function( request, response ) {
            var stripeEventRecord = new models.StripeEventRecord();
            stripeEventRecord.json = JSON.stringify( request.body );
            stripeEventRecord.save( function( error ) {
                if ( error )
                {
                    log.channels.server.error( error );
                    response.send( error, 500 );
                }

                response.send( 'ok' );
            });
        });
    }
}

module.exports = new Stripe();