var Stripe = module.exports = function( options ) {
    var self = this;
    
    options.app.post( '/api/1.0/Stripe', function( request, response ) {
        var stripeEventRecord = new options.models.StripeEventRecord();
        stripeEventRecord.json = JSON.stringify( request.body );
        stripeEventRecord.save( function( error ) {
            if ( error )
            {
                options.logger.error( error.message || error, {
                    channel: 'db',
                    message: error.message || error,
                    stack: error.stack
                });
                response.send( error, 500 );
            }

            response.send( 'ok' );
        });
    });
}

Stripe.prototype.Interface = {
};