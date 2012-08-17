var mongoose = require( 'mongoose' );

var stripe = require( 'stripe' )( config.stripe.keys.test );

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
                'self': '/api/1.0/Room/' + obj._id
            };
        }

        return {};
    };
    
    self.bind = function( app ) {
        app.post( '/api/1.0/Room', checks.user, function( request, response ) {
            
            var room = new models.Room();
            models.update( room, request.body, {
                ownerId: function( obj, params ) {
                    return request.user._id;
                }
            });
        
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
            
            var oldCost = 0;
            oldCost += request.room.features.logs ? config.pricing.logging : 0;
            oldCost += config.pricing.users[ request.room.features.users ];
            oldCost += request.room.features.search ? config.pricing.search : 0;
            
            models.update( request.room, request.body );
            
            var totalCost = 0;
            totalCost += request.room.features.logs ? config.pricing.logging : 0;
            totalCost += config.pricing.users[ request.room.features.users ];
            totalCost += request.room.features.search ? config.pricing.search : 0;

            if ( totalCost > 0 && !request.user.stripe )
            {
                response.json( { 'error': 'no billing info', 'message': 'You must have billing info associated with your account to add these settings to your room.' }, 403 );
                return;
            }

            if ( !request.user.stripeCustomer )
            {
                // TODO: create the customer
            }

            if ( oldCost > 0 )
            {
                // TODO: unsub from old plan
            }
            
            // TODO: update to new plan
            
            request.room.save( function( error ) {
                if ( error )
                {
                    response.json( error.message ? error.message : error, 500 );
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
            models.Room.find( { 'ownerId': request.user._id }, function( error, rooms ) {
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