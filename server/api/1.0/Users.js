var models = require( './models.js' );
var checks = require( './checks.js' );
var crypto = require( 'crypto' );
var passwordHash = require( 'password-hash' );

var Users = function() {
    var self = this;
    
    self.GetURLs = function( obj ) {
        if ( !obj )
        {
            return {
                'user': '/api/1.0/User',
                'userbyhash': '/api/1.0/UserByHash',
                'users': '/api/1.0/Users',
                'me': '/api/1.0/User/Me'
            };
        }

        if ( obj instanceof models.User )
        {
            return {
                'self': '/api/1.0/User/' + obj._id
            };
        }

        return {};
    };

    self.bind = function( app ) {
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
                    var authToken = new models.AuthToken();
                    authToken.token = utils.security.GenerateAuthToken( user );
                    authToken.expires = expires;
                    authToken.owner = user._id;
                    authToken.save( function( error ) {
                        if ( error )
                        {
                            response.json( error, 500 );
                            return;
                        }
                        
                        response.cookie( 'authtoken', authToken.token, { maxAge: authToken.expires - new Date(), httpOnly: true, path: '/' } );
                        response.json( models.censor( app.WithURLs( request, user ), { 'passwordHash': true } ) );
                    });
                });
            });
        });
        
        app.put( '/api/1.0/User/:userId', checks.user, function( request, response ) {
    
            if ( request.param( 'userId' ) != request.user._id )
            {
                response.json( { 'error': 'permission denied', 'message': 'You do not have permission to modify this user.' }, 500 );
                return;
            }

            var util = require( 'util' );    
            function save()
            {
                console.log( util.inspect( request.user ) );
                models.update( request.user, request.body, {
                    'email': function( obj, params ) {
                        return params[ 'email' ] ? params[ 'email' ].trim().toLowerCase() : obj.email;
                    },
                    'hash': function( obj, params ) {
                        return crypto.createHash( 'md5' ).update( obj.email ).digest( 'hex' );
                    },
                    'passwordHash': function( obj, params ) {
                        return typeof( params[ 'password' ] ) != 'undefined' ? passwordHash.generate( params[ 'password' ] ) : obj.passwordHash;
                    },
                    'stripe': function( obj, params ) {
                        return obj.stripe; // can only be set by the server
                    }
                });
        
                request.user.save( function( error ) {
                    if ( error )
                    {
                        response.json( error, 500 );
                        return;
                    }

                    console.log( util.inspect( request.user ) );
                    response.json( models.censor( app.WithURLs( request, request.user ), { 'passwordHash': true } ) );
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
        
        app.get( '/api/1.0/User/Me', checks.user, function( request, response ) {
            response.json( models.censor( app.WithURLs( request, request.user ), { 'passwordHash': true } ) );
        });

        app.get( '/api/1.0/User/:userId', checks.user, function( request, response ) {
            
            if ( request.param( 'userId' ) != request.user._id )
            {
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
                    
                    response.json( models.censor( app.WithURLs( request, user ), { 'email': true, 'passwordHash': true, 'stripe': true } ) );
                });
            }
            else
            {
                response.json( models.censor( app.WithURLs( request, request.user ), { 'passwordHash': true } ) );
            }
        });
        
        app.get( '/api/1.0/UserByHash/:hash', checks.user, function( request, response ) {
            
            if ( request.param( 'hash' ) != request.user.hash )
            {
                models.User.findOne( { hash: request.param( 'hash' ) }, function( error, user ) {
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
                    
                    response.json( models.censor( app.WithURLs( request, user ), { 'email': true, 'passwordHash': true, 'stripe': true } ) );
                });
            }
            else
            {
                response.json( models.censor( app.WithURLs( request, request.user ), { 'passwordHash': true } ) );
            }
        });

        app.get( '/api/1.0/Users', function( request, response ) {
            var users = request.param( 'users' );
            var idList = users.split( ',' );
            
            models.User.find( { '_id': { $in: idList } }, function( error, users ) {
                if ( error )
                {
                    response.json( error, 500 );
                    return;
                }
                
                var result = [];
                for ( var index = 0; index < users.length; ++index )
                {
                    result.push( models.censor( app.WithURLs( request, users[ index ] ), { 'email': true, 'passwordHash': true, 'stripe': true } ) );
                }
                
                response.json( result );
            });
        });
    }
}

module.exports = new Users();