var passwordHash = require( 'password-hash' );

var crypto = require( 'crypto' );

function HandleAuthToken( authToken, request, response, next ) {
    models.AuthToken.findOne( { 'token': authToken }, function( error, auth ) {
        if ( error )
        {
            response.json( error, 500 );
            return;
        }
        
        if ( !auth || ( auth.expires < new Date() ) )
        {
            response.json( 'Invalid AuthToken', 400 );
            return;
        }
        
        models.User.findById( auth.ownerId, function( error, user ) {
            if ( error )
            {
                response.json( error, 500 );
                return;
            }
            
            if ( !user )
            {
                response.cookie( 'authtoken', '', { maxAge: -100000, httpOnly: true, path: '/' } );
                response.json( 'Unkown user.', 404 );
                return;
            }
            
            request.user = user;
            next();
            return;
        });
    });
}

exports.user = function( request, response, next )
{
    if ( request.user )
    {
        next();
        return;
    }

    var authToken = request.param( 'authtoken', request.cookies.authtoken );
    if ( authToken )
    {
        HandleAuthToken( authToken, request, response, next );
        return;
    }
    
    var authorization = request.headers.authorization;
    if ( authorization )
    {
        var parts = authorization.split(' ');
        var scheme = parts[ 0 ];
    
        switch( scheme )
        {
            case 'Basic':
                var credentials = new Buffer( parts[ 1 ], 'base64' ).toString().split( ':' );
                var email = credentials[ 0 ];
                var password = credentials[ 1 ];

                models.User.findOne( { 'email': email.toLowerCase() }, function( error, user ) {
                    if ( error )
                    {
                        response.json( error, 500 );
                        return;
                    }
                    
                    if ( !user )
                    {
                        response.json( 'Could not locate a user with email: ' + email, 404 );
                        return;
                    }
                    
                    // LEGACY SUPPORT
                    if ( !passwordHash.isHashed( user.passwordHash ) )
                    {
                        if ( crypto.createHash( 'sha1' ).update( password ).digest( "hex" ) != user.passwordHash )
                        {
                            response.json( 'Invalid password.', 403 );
                            return;
                        }
                    }
                    else if ( !passwordHash.verify( password, user.passwordHash ) )
                    {
                        response.json( 'Invalid password.', 403 );
                        return;
                    }

                    request.user = user;
                    next();
                    return;
                });

                break;
            case 'AuthToken':
                var authToken = parts[ 1 ];
                HandleAuthToken( authToken, request, response, next );
                break;
            default:
                response.send( 'Authorization scheme \'' + scheme + '\' is not supported.', 400 );
                break;
        }
        
        return;
    }
    
    response.json( { 'error': 'invalid authentication', 'message': 'You must use an AuthToken, or log in using your email and pasword.' }, 400 );
}

exports.ownsRoom = function( request, response, next ) {

    if ( !request.user )
    {
        response.json( 'Server error: user session does not exist.  Please report this problem.', 500 );
        return;
    }
    
    models.Room.findById( request.params.roomId, function( error, room ) {
        if ( error )
        {
            response.json( error, 500 );
            return;
        }
        
        if ( !room )
        {
            response.json( 'No room for id: ' + request.params.roomId, 404 );
            return;
        }
        
        if ( !room.ownerId.equals( request.user._id ) )
        {
            response.json( 'You are not authorized to access this resource.', 403 );
            return;
        }

        request.room = room;
        next();
    });
}
