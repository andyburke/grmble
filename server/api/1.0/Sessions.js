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

            models.AuthToken.findOne( { 'owner': request.user._id }, function( error, authToken ) {
                if ( error )
                {
                    response.json( error, 500 );
                    return;
                }
                
                if ( !authToken|| ( authToken.expires < new Date() ) )
                {
                    var expires = new Date();
                    expires.setFullYear( expires.getFullYear() + 1 );
                    authToken = new models.AuthToken();
                    authToken.token = utils.security.GenerateAuthToken( request.user );
                    authToken.expires = expires;
                    authToken.ownerId = request.user._id;
                    authToken.save( function( error ) {
                        if ( error )
                        {
                            response.json( error, 500 );
                            return;
                        }
                        
                        response.cookie( 'authtoken', authToken.token, { maxAge: authToken.expires - new Date(), httpOnly: true, path: '/' } );
                        response.json( { 'created': true, 'user': models.censor( app.WithURLs( request, request.user ), { 'passwordHash': true } ) } );
                    });
                    return;
                }

                response.cookie( 'authtoken', authToken.token, { maxAge: authToken.expires - new Date(), httpOnly: true, path: '/' } );
                response.json( { 'created': true, 'user': models.censor( app.WithURLs( request, request.user ), { 'passwordHash': true } ) } );
            });
        });
        
        app.del( '/api/1.0/Session', checks.user, function( request, response ) {
            if ( !request.user )
            {
                response.json( 'No current session.', 404 );
                return;
            }
        
            delete request.user;
            response.cookie( 'authtoken', '', { maxAge: -100000, httpOnly: true, path: '/' } );
            response.json( { 'removed': true } );
        });    
    }
    
}

module.exports = new Sessions();