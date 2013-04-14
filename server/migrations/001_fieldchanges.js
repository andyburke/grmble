db.authtokens.update( {}, { $rename: { 'ownerId': 'owner' } }, false, true );
db.rooms.update( {}, { $rename: { 'ownerId': 'owner' } }, false, true );
db.messages.update( {}, { $rename: { 'roomId': 'room', 'senderId': 'sender' } }, false, true );
db.invites.update( {}, { $rename: { 'senderId': 'sender', 'roomId': 'room' } }, false, true );
