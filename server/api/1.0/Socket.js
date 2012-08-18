var mongoose = require( 'mongoose' );

var Socket = function() {
    var self = this;
    
    self.rooms = {};
    
    self.bind = function( app, io ) {
	io.sockets.on( 'connection', function( client ) {
	    
	    client.on( 'disconnect', function() {
		for ( var room in self.rooms )
		{
		    var index = self.rooms[ room ][ 'clients' ].indexOf( client );
		    if ( index != -1 )
		    {
			self.rooms[ room ][ 'clients' ].splice( index, 1 );
			var user = self.rooms[ room ][ 'users' ][ client.id ];
			delete self.rooms[ room ][ 'users' ][ client.id ];
    
			// we could handle quick rejoins here by using setTimeout and checking if the
			// user is back in the room's client list.  However, we'd then have to start
			// handling joins on the server as well, and see if they had left recently.
			// Overall, not worth it right now.
			
			var newMessage = new models.Message();
			newMessage.roomId = room;
			newMessage.senderId = user._id;
			newMessage.clientId = client.id;
			newMessage.nickname = user.nickname;
			newMessage.userHash = user.userHash;
			newMessage.avatar = user.avatar;
			newMessage.kind = 'leave';
			newMessage.content = 'Left the room.';
	
			newMessage.save( function( error ) {
			    if ( error )
			    {
				console.log( error );
				return;
			    }
    
			    // NOTE: use the newMessage.roomId to avoid scope issues
			    for ( var clientIndex = 0; clientIndex < self.rooms[ newMessage.roomId ][ 'clients' ].length; ++clientIndex )
			    {
				try
				{
				    var otherClient = self.rooms[ newMessage.roomId ][ 'clients' ][ clientIndex ];
				    otherClient.json.send( newMessage );
				}
				catch( exception )
				{
				    // TODO: drop this connection, possibly create a 'leave' message?
				}
			    }
			});
		    }
		}
	    });
	    
	    client.on( 'message', function( message ) {
	
		models.Room.findById( message.roomId, function( error, room ) {
		    if ( error )
		    {
			client.json.send({
			    kind: 'error',
			    error: error
			});
			return;
		    }
		    
		    if ( !room )
		    {
			client.json.send({
			    kind: 'error',
			    error: 'No room found with id: ' + message.roomId
			});
			return;
		    }
		    
		    var newMessage = new models.Message();
		    newMessage.roomId = message.roomId;
		    newMessage.senderId = message.senderId;
		    newMessage.clientId = client.id;
		    newMessage.nickname = message.nickname;
		    newMessage.userHash = message.userHash;
		    newMessage.avatar = message.avatar;
		    newMessage.kind = message.kind;
		    newMessage.content = message.content;
		    newMessage.createdAt = new Date();
    
		    if ( !newMessage.content )
		    {
			if ( newMessage.kind == 'join' )
			{
			    newMessage.content = 'Joined the room.';
			}
			else if ( newMessage.kind == 'leave' )
			{
			    newMessage.content = 'Left the room.';
			}
		    }
		    
		    if ( room.features.logs )
		    {
			newMessage.save( function( error ) {
			    if ( error )
			    {
				client.json.send({
				    kind: 'error',
				    errorobj: error,
				    error: 'message save failed',
				    message: 'Failed to save message into database.'
				});
				return;
			    }
			});
		    }
			
		    if ( !self.rooms[ room._id ] )
		    {
			self.rooms[ room._id ] = {
			    'users': {},
			    'clients': []
			};
		    }
    
		    // TODO: support for private messages? kind = private, need a target user id?
		    for ( var clientIndex = 0; clientIndex < self.rooms[ room._id ][ 'clients' ].length; ++clientIndex )
		    {
			try
			{
			    var otherClient = self.rooms[ room._id ][ 'clients' ][ clientIndex ];

			    if ( newMessage.kind == 'join' && otherClient == client )
			    {
				continue;
			    }
							
			    otherClient.json.send( newMessage );
			}
			catch( exception )
			{
			    // TODO: drop this connection, possibly create a 'leave' message?
			}
		    }
	
		    if ( message.kind == 'join' )
		    {
			self.rooms[ room._id ][ 'clients' ].push( client );
			self.rooms[ room._id ][ 'users' ][ client.id ] = {
			    clientId: client.id,
			    userid: newMessage.senderId,
			    nickname: newMessage.nickname,
			    userHash: newMessage.userHash,
			    avatar: newMessage.avatar
			};
			
			var users = [];
			for ( var id in self.rooms[ room._id ][ 'users' ] )
			{
			    users.push( self.rooms[ room._id ][ 'users' ][ id ] );
			}

			client.emit( 'userlist', { users: users } );
			
			// TODO: the performance on this will likely be terrible as rooms grow,
			//       we really need a better way to get the last N messages and send
			//       them to the client in the proper order
			
			// Send existing messages in room
			var kinds = [ 'say' ]; //, 'join', 'leave' ];
			models.Message.count( { roomId: room._id, kind: { $in: kinds } }, function( error, numMessages ) {
			    if ( error )
			    {
				client.json.send({
				    kind: 'error',
				    error: error
				});
				return;
			    }

			    var query = models.Message.find({
				roomId: room._id,
				kind: { $in: kinds }
			    });
			    
			    if ( numMessages > 100 )
			    {
				query.skip( numMessages - 100 );
			    }

			    query.sort( 'createdAt' );
			    
			    var stream = query.stream();
			    
			    stream.on( 'data', function( message ) {
				client.json.send( message );
			    });
			    
			    stream.on( 'error', function( error ) {
				client.json.send({
				    kind: 'error',
				    error: error
				});
			    });
			});
		    }
		});
	    });
	});
    }
}

module.exports = new Socket();