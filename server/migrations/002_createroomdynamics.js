db.rooms.find().map( function( room ) {
    var messageCount = db.runCommand( { count: 'messages', query: { room: room._id } } );
    
    var roomDynamics = db.roomdynamics.findOne( { room: room._id } );
    roomDynamics = roomDynamics || {
        room: room._id,
        users: 0,
        messages: 0,
        createdAt: new Date()
    };
    
    roomDynamics.tags = room.tags;
    roomDynamics.privacy = room.features.privacy;
    roomDynamics.messages = messageCount.n;
    roomDynamics.updatedAt = new Date();

    db.roomdynamics.save( roomDynamics );
    
} );
