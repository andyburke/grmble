var crypto = require( 'crypto' );
var passwordHash = require( 'password-hash' );

var Users = module.exports = function( options ) {
    var self = this;
    
    options.app.post( '/api/1.0/User', function( request, response ) {
    
        if ( !request.param( 'email' ) )
        {
            response.json( 'You must specify an email to sign up!', 400 );
            return;
        }

        options.models.User.findOne( { email: request.param( 'email' ).trim().toLowerCase() }, function( error, user ) {
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
            
            user = new options.models.User();
            user.email = request.param( 'email' ).trim().toLowerCase();
            user.hash = crypto.createHash( 'md5' ).update( user.email ).digest("hex");
            
            var emailParts = user.email.split( '@' );
            var emailUsername = emailParts[ 0 ];
            
            user.passwordHash = typeof( request.param( 'password' ) ) != 'undefined' ? passwordHash.generate( request.param( 'password' ) ) : null;
            user.nickname = request.param( 'nickname', emailUsername );
            user.location = request.param( 'location' );
            user.bio = request.param( 'bio' );
            
            user.save( function( error ) {
                if ( error )
                {
                    response.json( error, 500 );
                    return;
                }
        
                request.user = user;

                var expires = new Date();
                expires.setFullYear( expires.getFullYear() + 1 );
                var authToken = new options.models.AuthToken();
                authToken.token = utils.security.GenerateAuthToken( user );
                authToken.expires = expires;
                authToken.owner = user._id;
                authToken.save( function( error ) {
                    if ( error )
                    {
                        response.json( error, 500 );
                        return;
                    }
                    
                    user = user.toObject();
                    delete user[ 'passwordHash' ];
                    delete user[ 'stripeCustomer' ];
                    delete user[ 'stripeToken' ];
                    
                    response.cookie( 'authtoken', authToken.token, { maxAge: authToken.expires - new Date(), httpOnly: true, path: '/' } );
                    response.json( user );
                });
            });
        });
    });
    
    options.app.put( '/api/1.0/User/:userId', options.checks.user, function( request, response ) {

        if ( request.param( 'userId' ) != request.user._id )
        {
            response.json( { 'error': 'permission denied', 'message': 'You do not have permission to modify this user.' }, 500 );
            return;
        }

        var util = require( 'util' );    
        function save()
        {
            options.models.update( request.user, request.body, {
                'email': function( obj, params ) {
                    return params[ 'email' ] ? params[ 'email' ].trim().toLowerCase() : obj.email;
                },
                'hash': function( obj, params ) {
                    return crypto.createHash( 'md5' ).update( obj.email ).digest( 'hex' );
                },
                'passwordHash': function( obj, params ) {
                    return typeof( params[ 'password' ] ) != 'undefined' ? passwordHash.generate( params[ 'password' ] ) : obj.passwordHash;
                }
            });
            
            // mark stripeToken as modified, as it's a mixed datatype
            if ( typeof( request.body[ 'stripeToken' ] ) != 'undefined' )
            {
                request.user.markModified( 'stripeToken' );
            }
            
            request.user.save( function( error ) {
                if ( error )
                {
                    response.json( error, 500 );
                    return;
                }

                response.json( options.models.censor( options.app.WithURLs( request, request.user ), { 'passwordHash': true } ) );
            });
        }
        
        if ( request.param( 'email' ) )
        {
            options.models.User.findOne( { 'email': request.param( 'email' ).trim().toLowerCase() }, function( error, user ) {
                if ( error )
                {
                    response.json( error, 500 );
                    return;
                }
                
                if ( user )
                {
                    response.json( { 'error': 'email conflict', 'message': 'A user already exists with that email.' }, 409 );
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
    
    options.app.get( '/api/1.0/User/Me', options.checks.user, function( request, response ) {
        response.json( request.user.toObject() );
    });

    options.app.get( '/api/1.0/User/:userId', options.checks.user, function( request, response ) {
        
        if ( request.param( 'userId' ) != request.user._id )
        {
            options.models.User.findById( request.params.userId, function( error, user ) {
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
                
                response.json( options.models.censor( options.app.WithURLs( request, user ), { 'email': true, 'passwordHash': true, 'stripeToken': true, 'stripeCustomer': true } ) );
            });
        }
        else
        {
            response.json( options.models.censor( options.app.WithURLs( request, request.user ), { 'passwordHash': true, 'stripeCustomer': true } ) );
        }
    });
    
    options.app.get( '/api/1.0/UserByHash/:hash', options.checks.user, function( request, response ) {
        
        if ( request.param( 'hash' ) != request.user.hash )
        {
            options.models.User.findOne( { hash: request.param( 'hash' ) }, function( error, user ) {
                if ( error )
                {
                    response.json( error, 500 );
                    return;
                }
                
                if ( !user )
                {
                    response.json( 'No user found with hash: ' + request.param( 'hash' ), 404 );
                    return;
                }
                
                response.json( options.models.censor( options.app.WithURLs( request, user ), { 'email': true, 'passwordHash': true, 'stripeToken': true, 'stripeCustomer': true } ) );
            });
        }
        else
        {
            response.json( options.models.censor( options.app.WithURLs( request, request.user ), { 'passwordHash': true, 'stripeCustomer': true } ) );
        }
    });

    options.app.get( '/api/1.0/Users', function( request, response ) {
        var users = request.param( 'users' );
        var idList = users.split( ',' );
        
        options.models.User.find( { '_id': { $in: idList } }, function( error, users ) {
            if ( error )
            {
                response.json( error, 500 );
                return;
            }
            
            var result = [];
            for ( var index = 0; index < users.length; ++index )
            {
                result.push( options.models.censor( options.app.WithURLs( request, users[ index ] ), { 'email': true, 'passwordHash': true, 'stripeToken': true, 'stripeCustomer': true } ) );
            }
            
            response.json( result );
        });
    });
}

Users.prototype.Interface = {
    'user': '/api/1.0/User/{{userid}}',
    'userbyhash': '/api/1.0/UserByHash',
    'users': '/api/1.0/Users',
    'me': '/api/1.0/User/Me'
};