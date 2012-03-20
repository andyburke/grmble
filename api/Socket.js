var models = require( './models.js' );
var checks = require( './checks.js' );

var rooms = {};

exports.bind = function( app, io ) {
    io.sockets.on( 'connection', function( client ) {
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
                
                if ( !rooms[ message.roomId ] )
                {
                    rooms[ message.roomId ] = [];
                }

                rooms[ room._id ].push( client );

                var newMessage = new models.Message();
                newMessage.roomId = message.roomId;
                newMessage.senderId = message.senderId;
                newMessage.nickname = message.nickname;
                newMessage.userHash = message.userHash;
                newMessage.facebookId = message.facebookId;
                newMessage.twitterId = message.twitterId;
                newMessage.avatar = message.avatar;
                newMessage.kind = message.kind;
                newMessage.content = message.content;

                if ( !newMessage.content )
                {
                    if ( newMessage.kind == 'join' )
                    {
                        newMessage.content = newMessage.nickname + ' joined the room.';
                    }
                    else if ( newMessage.kind == 'part' )
                    {
                        newMessage.content = newMessage.nickname + ' left the room.';
                    }
                }
    
                newMessage.save( function( error ) {
                    if ( error )
                    {
                        client.json.send({
                            kind: 'error',
                            error: error
                        });
                        return;
                    }
                    
                    // TODO: support for private messages? kind = private, need a target user id?
                    for ( var clientIndex = 0; clientIndex < rooms[ message.roomId ].length; ++clientIndex )
                    {
                        try
                        {
                            var otherClient = rooms[ message.roomId ][ clientIndex ];

                            if ( newMessage.kind == 'join' && otherClient == client )
                            {
                                continue;
                            }

                            otherClient.json.send( newMessage );
                        }
                        catch( exception )
                        {
                            // TODO: drop this connection, possibly create a 'part' message?
                        }
                    }
    
                    if ( message.kind == 'join' )
                    {
                        // TODO: the performance on this will likely be terrible as rooms grow,
                        //       we really need a better way to get the last N messages and send
                        //       them to the client in the proper order
                        
                        // Send existing messages in room
                        models.Message.count( { roomId: room._id }, function( error, numMessages ) {
                            if ( error )
                            {
                                client.json.send({
                                    kind: 'error',
                                    error: error
                                });
                                return;
                            }

                            var query = models.Message.find( {} );
                            
                            query.where( 'roomId', room._id );
                            if ( numMessages > 100 )
                            {
                                query.skip( numMessages - 100 );
                            }

                            query.asc( 'createdAt' );
                            
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

        client.on( 'disconnect', function() {
            // TODO: find all the rooms that contain this client and send a 'part'?
        });
    });
}
