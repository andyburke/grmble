var models = require( './models.js' );
var checks = require( './checks.js' );

var mongoose = require( 'mongoose' );

var Rooms = function() {
    var self = this;

    self.GetURLs = function( obj ) {
        if ( !obj )
        {
            return {
                'room': '/api/1.0/Room',
                'rooms': '/api/1.0/Rooms',
                'myrooms': '/api/1.0/MyRooms'
            };
        }

        if ( obj instanceof models.Room )
        {
            return {
                'self': '/api/1.0/Room/' + obj._id,
                'owners': '/api/1.0/Room/' + obj._id + '/Owners'
            };
        }

        return {};
    };
    
    self.bind = function( app ) {
        app.post( '/api/1.0/Room', checks.user, function( request, response ) {
            
            var room = new models.Room();
            room.name = request.param( 'name' );
            room.description = request.param( 'description', '' );
            room.tags = request.param( 'tags' ) || [];
            room.owners = [ request.user._id ];
            room.isPublic = request.param( 'isPublic', true );
        
            room.save( function( error ) {
                if ( error )
                {
                    response.json( error.message ? error.message : error, 500 );
                    return;
                }
        
                response.json( app.WithURLs( request, room ) );
            });
        });
            
        app.get( '/api/1.0/Room/:roomId', function( request, response ) {
            models.Room.findById( request.params.roomId, function( error, room ) {
                if ( error )
                {
                    response.json( error, 500 );
                    return;
                }
                
                if ( !room )
                {
                    response.json( 'No room found with id: ' + request.params.roomId, 404 );
                    return;
                }
    
                response.json( app.WithURLs( request, room ) );           
            });
        });
    
        app.put( '/api/1.0/Room/:roomId', checks.user, checks.ownsRoom, function( request, response ) {
                
            request.room.name = request.param( 'name', request.room.name );
            request.room.description = request.param( 'description', request.room.description );
            request.room.tags = request.param( 'tags', request.room.tags );
            request.room.isPublic = request.param( 'isPublic', true );
            request.room.owners = request.param( 'owners', request.room.owners );
        
            request.room.save( function( error ) {
                if ( error )
                {
                    response.json( error.message ? error.message : error, 500 );
                    return;
                }
        
                response.json( app.WithURLs( request, request.room ) );
            });
        });

        app.post( '/api/1.0/Room/:roomId/Owners/:userId', checks.user, checks.ownsRoom, function( request, response ) {
            
            for ( var index = 0; index < request.room.owners.length; ++index )
            {
                if ( request.room.owners[ index ] == request.param( 'userId' ) )
                {
                    response.json( app.WithURLs( request, request.room ) );
                    return;
                }
            }
            
            models.User.findById( request.param( 'userId' ), function( error, user ) {
                if ( error )
                {
                    response.json( error, 500 );
                    return;
                }
                
                if ( !user )
                {
                    response.json( { 'error': 'unknown user', 'message': 'No user could be located with id: ' + request.param( 'userId' ) }, 404 );
                    return;
                }
                
                request.room.owners.push( user._id );        
                request.room.save( function( error ) {
                    if ( error )
                    {
                        response.json( error, 500 );
                        return;
                    }
            
                    response.json( app.WithURLs( request, request.room ) );
                });
            });
        });
        
        app.del( '/api/1.0/Room/:roomId/Owners/:userId', checks.user, checks.ownsRoom, function( request, response ) {
            
            request.room.owners.remove( request.param( 'userId' ) );
            request.room.save( function( error ) {
                if ( error )
                {
                    response.json( error, 500 );
                    return;
                }
        
                response.json( app.WithURLs( request, request.room ) );
            });
        });
        
        // TODO: we will need some kind of filtering/cursoring here
        app.get( '/api/1.0/Rooms', function( request, response ) {
            models.Room.find( { 'isPublic': true }, function( error, rooms ) {
                if ( error )
                {
                    response.json( error, 500 );
                    return;
                }
                
                response.json( app.WithURLs( request, rooms ) );
            });
        });
    
        app.get( '/api/1.0/MyRooms', checks.user, function( request, response ) {
            models.Room.find( { 'owners': request.user._id }, function( error, rooms ) {
                if ( error )
                {
                    response.json( error, 500 );
                    return;
                }
                
                response.json( app.WithURLs( request, rooms ) );
            });
        });
    }
    
}

module.exports = new Rooms();