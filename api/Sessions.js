var models = require( './models.js' );
var checks = require( './checks.js' );

var sha1 = require( 'sha1' );

exports.bind = function( app ) {
    
    app.post( '/api/1.0/Session', checks.user, function( request, response ) {
        response.json( { 'created': true } );
    });
    
    app.del( '/api/1.0/Session', checks.user, function( request, response ) {
        if ( !request.session )
        {
            response.json( 'No current session.', 404 );
            return;
        }
    
        request.session.destroy( function() {
            response.json( { 'removed': true } );
        });
    });    
}
