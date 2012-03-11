var models = require( './models.js' );

var sha1 = require( 'sha1' );

exports.user = function( request, response, next )
{
    if ( request.session.user )
    {
        next();
        return;
    }

    var email = null;
    var password = null;
    
    var authorization = request.headers.authorization;
    if ( authorization )
    {
        var parts = authorization.split(' ');
        var scheme = parts[0];
        var credentials = new Buffer( parts[ 1 ], 'base64' ).toString().split( ':' );
    
        if ( 'Basic' != scheme )
        {
            response.send( 'Basic authorization is the only supported authorization scheme.', 400 );
            return;
        }
        
        email = credentials[ 0 ];
        password = credentials[ 1 ];
    }
    else
    {
        email = request.param( 'email' );
        password = request.param( 'password' );
    }
    
    if ( !email )
    {
        response.json( "You must specify an email for authentication.", 400 );
        return;
    }

    models.User.findOne( { 'email': email.trim().toLowerCase() }, function( error, user ) {
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
        
        if ( user.passwordHash && user.passwordHash != sha1( password ) )
        {
            response.json( 'Invalid password.', 403 );
            return;
        }
        
        request.session.user = user;
        request.session.save();
        next();
        return;
    });
}

exports.ownsRoom = function( request, response, next ) {

    if ( !request.session.user )
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
        
        if ( room.owners.indexOf( request.session.user._id ) == -1 )
        {
            response.json( 'You are not authorized to access this resource.', 403 );
            return;
        }

        request.room = room;
        next();
    });
}
