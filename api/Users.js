var models = require( './models.js' );
var checks = require( './checks.js' );

var sha1 = require( 'sha1' );

exports.bind = function( app, io ) {
    app.post( '/api/1.0/User', function( request, response ) {
    
        if ( !request.param( 'email' ) )
        {
            response.json( 'You must specify an email to sign up!', 400 );
            return;
        }

        models.User.findOne( { 'email': request.param( 'email' ).trim().toLowerCase() }, function( error, user ) {
            if ( error )
            {
                response.json( error, 500 );
                return;
            }
            
            if ( user )
            {
                response.json( 'A user with email "' + request.param( 'email' ) + '" already exists.', 403 );
                return;
            }
            
            user = new models.User();
            user.email = request.param( 'email' ).trim().toLowerCase();
            user.passwordHash = request.param( 'password' ) ? sha1( request.param( 'password' ) ) : null;
            user.nickname = request.param( 'nickname' );
            
            user.save( function( error ) {
                if ( error )
                {
                    response.json( error, 500 );
                    return;
                }
        
                request.session.user = user;
                request.session.save();
                
                response.json( models.censor( user, { 'passwordHash': true } ) );
            });
        });
    });
    
    app.put( '/api/1.0/User', checks.user, function( request, response ) {

        function save()
        {
            models.User.findById( request.session.user._id, function( error, user ) {
                user.email = typeof( request.param( 'email' ) ) != undefined ? request.param( 'email' ).trim().toLowerCase() : user.email;
                user.nickname = typeof( request.param( 'nickname' ) ) != undefined ? request.param( 'nickname' ) : user.nickname;
                user.passwordHash = typeof( request.params.password ) != undefined ? sha1( request.params.password ) : user.passwordHash;
  
                user.save( function( error ) {
                    if ( error )
                    {
                        response.json( error, 500 );
                        return;
                    }
                                        
                    request.session.user = user;
                    request.session.save();
                    
                    response.json( models.censor( user, { 'passwordHash': true } ) );
                });
            });
        }
        
        if ( request.param( 'email' ) )
        {
            models.User.findOne( { 'email': request.param( 'email' ).trim().toLowerCase() }, function( error, user ) {
                if ( error )
                {
                    response.json( error, 500 );
                    return;
                }
                
                if ( user )
                {
                    response.json( 'A user already exists with that email.', 409 );
                    return;
                }
                
                save();
            });
        }
        else
        {
            save();
        }
    });
    
    app.get( '/api/1.0/User', checks.user, function( request, response ) {
        response.json( models.censor( request.session.user, { 'passwordHash': true } ) );
    });
    
    app.get( '/api/1.0/User/:userId', function( request, response ) {
        models.User.findById( request.params.userId, function( error, user ) {
            if ( error )
            {
                response.json( error, 500 );
                return;
            }
            
            if ( !user )
            {
                response.json( 'No user found with id: ' + request.params.userId, 404 );
                return;
            }
            
            response.json( models.censor( user, { 'email': true, 'passwordHash': true } ) );
        });
    });
}
