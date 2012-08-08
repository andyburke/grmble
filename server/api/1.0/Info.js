var express = require( 'express' );
var util = require( 'util' );

var Info = function() {
    var self = this;

    self.GetURLs = function( obj ) {
        return obj ? {} : {
            'info': '/api/1.0'
        };
    }

    self.bind = function( app ) {

        app.get( '/api/1.0', function( request, response ) {
            var urls = app.GetURLs ? app.GetURLs() : {};
            
            for ( var urlKey in urls )
            {
                if ( urls[ urlKey ][ 0 ] == '/' )
                {
                    urls[ urlKey ] = 'http://' + request.headers.host + urls[ urlKey ];
                }
            }
            
            var result = {
                urls: urls,
                time: new Date(),
                version: "1.0"
            };

            response.json( result );
        });
    }

    return self;
}

module.exports = new Info();
