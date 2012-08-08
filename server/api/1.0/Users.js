var models = require( './models.js' );
var checks = require( './checks.js' );
var passwordHash = require( 'password-hash' );

var Users = function() {
    var self = this;
    
    self.GetURLs = function( obj ) {
        if ( !obj )
        {
            return {
                'user': '/api/1.0/User',
                'users': '/api/1.0/Users'
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
                user.hash = md5( user.email );
                
                user.passwordHash = typeof( request.param( 'password' ) ) != 'undefined' ? passwordHash.generate( request.param( 'password' ) ) : null;
                user.nickname = request.param( 'nickname' );
                user.location = request.param( 'location' );
                user.bio = request.param( 'bio' );
                
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
        
        app.put( '/api/1.0/User/:userId', checks.user, function( request, response ) {
    
            if ( request.param( 'userId' ) != request.session.user._id )
            {
                response.json( { 'error': 'permission denied', 'message': 'You do not have permission to modify this user.' }, 500 );
                return;
            }
    
            function save()
            {
                models.User.findById( request.session.user._id, function( error, user ) {
                    user.email = request.param( 'email', user.email ).trim().toLowerCase();
                    user.hash = md5( user.email );
                    user.passwordHash = typeof( request.param( 'password' ) ) != 'undefined' ? passwordHash.generate( request.param( 'password' ) ) : user.passwordHash;
                    user.nickname = request.param( 'nickname', user.nickname );
                    user.location = request.param( 'location' , user.location );
                    user.bio = request.param( 'bio', user.bio );
                    user.avatar = request.param( 'avatar', user.avatar );
        
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
        
        app.get( '/api/1.0/User/:userId', checks.user, function( request, response ) {
            
            if ( request.param( 'userId' ) != request.session.user._id )
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
                    
                    response.json( models.censor( user, { 'email': true, 'passwordHash': true } ) );
                });
            }
            else
            {
                response.json( models.censor( request.session.user, { 'passwordHash': true } ) );
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
                    result.push( models.censor( users[ index ], { 'email': true, 'passwordHash': true } ) );
                }
                
                response.json( result );
            });
        });
    }
}

module.exports = new Users();