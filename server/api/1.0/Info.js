var express = require( 'express' );
var util = require( 'util' );

var Info = function() {
    var self = this;

    self.GetURLs = function( obj ) {
        return obj ? {} : {
            'info': '/api/1.0',
            'icons': {
                'active': '/images/icons/chat_highlighted.png',
                'inactive': '/images/icons/chat.png'
            }
        };
    }

    self.bind = function( app ) {

        app.get( '/api/1.0', function( request, response ) {
            var urls = app.GetURLs ? app.GetURLs( request ) : {};
            app.FixURLs( request, urls );
            
            var result = {
                urls: urls,
                time: new Date(),
                version: "1.0",
                stripe: {
                    publishablekey: config.stripe.publishable[ process.env[ 'GRMBLE_ENVIRONMENT' ] || 'test' ]
                },
                amazon: {
                    AWSAccessKeyID: config.aws.AccessKeyID
                }
            };

            response.json( result );
        });
    }

    return self;
}

module.exports = new Info();
