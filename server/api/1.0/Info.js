var extend = require( 'node.extend' );

var Info = module.exports = function( options ) {
    var self = this;
    
    options.app.get( '/api/1.0', function( request, response ) {
        var result = {
            data: {
                stripe: {
                    publishablekey: options.config.stripe.publishable[ process.env[ 'NODE_ENVIRONMENT' ] || 'test' ]
                },
                amazon: {
                    AWSAccessKeyID: options.config.aws.AccessKeyID
                },
                mixpanel: {
                    token: options.config.mixpanel.tokens[ process.env[ 'NODE_ENVIRONMENT' ] || 'dev' ]
                }
            }
        };

        for ( var i = 0; i < options.subsystems.length; ++i )
        {
            var subsystem = options.subsystems[ i ];
            if ( subsystem.Interface )
            {
                result = extend( result, subsystem.Interface );
            }
        }

        response.json( result );
    });

    return self;
}
