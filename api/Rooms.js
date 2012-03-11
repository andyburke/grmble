var models = require( './models.js' );
var checks = require( './checks.js' );

exports.bind = function( app, io ) {
    app.post( '/api/1.0/Room', checks.user, function( request, response ) {
        
        var room = new models.Room();
        room.name = request.param( 'name' );
        room.owners = [ request.session.user._id ];
        room.isPublic = typeof( request.param( 'isPublic' ) ) != undefined ? request.param( 'isPublic' ) : true;
    
        room.save( function( error ) {
            if ( error )
            {
                response.json( error.message ? error.message : error, 500 );
                return;
            }
    
            response.json( room );
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

            response.json( room );           
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
            
            response.json( rooms );
        });
    });

    app.get( '/api/1.0/MyRooms', checks.user, function( request, response ) {
        models.Room.find( { 'owners': request.session.user._id }, function( error, rooms ) {
            if ( error )
            {
                response.json( error, 500 );
                return;
            }
            
            response.json( rooms );
        });
    });

    app.put( '/api/1.0/Room/:roomId', checks.user, checks.ownsRoom, function( request, response ) {
            
        request.room.name = typeof( request.param( 'name' ) ) != undefined ? request.param( 'name' ) : request.room.name;
        request.room.owners = typeof( request.param( 'owners' ) ) != undefined ? request.param( 'owners' ) : request.room.owners;
        request.room.isPublic = typeof( request.param( 'isPublic' ) ) != undefined ? request.param( 'isPublic' ) : true;
    
        request.room.save( function( error ) {
            if ( error )
            {
                response.json( error.message ? error.message : error, 500 );
                return;
            }
    
            response.json( request.room );
        });
    });
}
