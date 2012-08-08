var models = require( './models.js' );
var checks = require( './checks.js' );

var Sessions = function() {
    var self = this;
    
    self.GetURLs = function( obj ) {
        if ( !obj )
        {
            return {
                'session': '/api/1.0/Session'
            };
        }

        return {};
    };

    self.bind = function( app ) {
        
        app.post( '/api/1.0/Session', checks.user, function( request, response ) {
            response.json( { 'created': true, 'user': models.censor( request.session.user, { 'passwordHash': true } ) } );
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
    
}

module.exports = new Sessions();