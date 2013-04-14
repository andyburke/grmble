var faye = require( 'faye' );
var fayeRedis = require( 'faye-redis' );

var mongoose = require( 'mongoose' );
var extend = require( 'node.extend' );

var Messaging = module.exports = function( options ) {
    var self = this;

    self.bayeux = new faye.NodeAdapter({
        mount: '/faye',
        timeout: 45,
        engine: {
            type: fayeRedis,
            host: options.config.redis.host,
            port: options.config.redis.port,
            password: options.config.redis.password
        }
    });

    self.rooms = {};
    self.timeouts = {};
    self.subscriptions = {};

    for ( var serverIndex = 0; serverIndex < options.servers.length; ++serverIndex )
    {
        self.bayeux.attach( options.servers[ serverIndex ] );
    }
        
    // we listen for joins/leaves across any of our servers so that all servers have full lists
    // of users in rooms
    //
    // TODO: figure out what to do with servers that have just come up
    //
    self.bayeux.getClient().subscribe( '/room/*', function( message ) {
        if ( !self.rooms[ message.room ] )
        {
            self.rooms[ message.room ] = {};
        }

        switch( message.kind )
        {
            case 'join':
                self.rooms[ message.room ][ message.senderId ] = {
                    senderId: message.senderId,
                    nickname: message.nickname,
                    userHash: message.userHash,
                    avatar: message.avatar,
                    idle: message.idle || false
                };
                break;
            case 'leave':
                delete self.rooms[ message.room ][ message.senderId ];
                break;
            case 'idle':
                if ( self.rooms[ message.room ][ message.senderId ] )
                {
                    self.rooms[ message.room ][ message.senderId ].idle = true;
                }
                break;
            case 'active':
                if ( self.rooms[ message.room ][ message.senderId ] )
                {
                    self.rooms[ message.room ][ message.senderId ].idle = false;
                }
                break;
        }
        
        var empty = true;
        for ( var key in self.rooms[ message.room ] )
        {
            if ( self.rooms[ message.room ].hasOwnProperty( key ) )
            {
                empty = false;
                break;
            }
        }
        
        if ( empty )
        {
            delete self.rooms[ message.room ];
        }
    });
    
    self.bayeux.getClient().subscribe( '/client/*', function( message ) {
        switch( message.kind )
        {
        case 'heartbeat':
            if ( !self.rooms[ message.room ] )
            {
                self.rooms[ message.room ] = {};
            }
            
            if ( !self.rooms[ message.room ][ message.senderId ] )
            {
                self.rooms[ message.room ][ message.senderId ] = {
                    senderId: message.senderId,
                    nickname: message.nickname,
                    userHash: message.userHash,
                    avatar: message.avatar,
                    idle: message.idle || false
                };
            }
            break;
        }
    });

    // we listen only on the local server using 'bind' for handling logging and initial message emission
    //
    // if we were to subscribe, we'd end up trying to log the message from every app server and
    // emitting ( N * initial message count ) messages on the client channel where N is the number
    // of app servers
    
    self.bayeux.bind( 'publish', function( clientId, channel, message ) {
        if ( self.bayeux.getClient().getClientId() == clientId )
        {
            return;
        }

        options.models.Room.findById( message.room, function( error, room ) {
            if ( error )
            {
                self.bayeux.getClient().publish( '/client/' + message.clientId, {
                    kind: 'error',
                    error: error
                });
                return;
            }
            
            if ( !room )
            {
                self.bayeux.getClient().publish( '/client/' + message.clientId, {
                    kind: 'error',
                    error: 'No room found with id: ' + message.room
                });
                return;
            }

            (function() {
                var capturedMessage = message;
                var capturedRoom = room;
                
                if ( !self.timeouts[ capturedMessage.clientId ] )
                {
                    self.timeouts[ capturedMessage.clientId ] = {};
                }
                
                if ( self.timeouts[ capturedMessage.clientId ][ capturedMessage.room ] )
                {
                    clearTimeout( self.timeouts[ capturedMessage.clientId ][ capturedMessage.room ] );
                    self.timeouts[ capturedMessage.clientId ][ capturedMessage.room ] = null;
                }
                
                self.timeouts[ capturedMessage.clientId ][ capturedMessage.room ] = setTimeout( function() {
                    var newMessage = extend( capturedMessage, {
                        _id: new mongoose.Types.ObjectId(),
                        kind: 'leave',
                        createdAt: new Date(),
                        content: 'timeout'
                    });
                    self.bayeux.getClient().publish( '/room/' + capturedMessage.room, newMessage );
                    delete self.timeouts[ capturedMessage.clientId ][ capturedMessage.room ];

                    options.models.RoomDynamics.update( { room: capturedRoom._id }, { $inc: { users: -1 } }, function( error ) {
                        if ( error )
                        {
                            log.channels.db.error( error );
                        }
                    });
                    
                    if ( capturedRoom.features.logs )
                    {
                        var loggedMessage = new options.models.Message();
                        options.models.update( loggedMessage, capturedMessage );
                        loggedMessage._id = capturedMessage._id;
                        loggedMessage.createdAt = capturedMessage.createdAt.toJSON();
                        
                        loggedMessage.save( function( error ) {
                            if ( error )
                            {
                                log.channels.db.error( error );
                                return;
                            }
                        });
                    }

                }, 61000 );
            })();
            
            
            switch( message.kind )
            {
            case 'heartbeat':
            case 'startedTyping':
            case 'stoppedTyping':
            case 'cancelledTyping':
            case 'idle':
            case 'active':
                // don't log
                return;

            case 'userlist request':
                
                var users = [];
                for ( var id in self.rooms[ message.room ] )
                {
                    users.push( self.rooms[ message.room ][ id ] );
                }

                self.bayeux.getClient().publish( '/client/' + message.clientId, {
                    kind: 'userlist',
                    room: message.room,
                    users: users
                });

                // don't log
                return;

            case 'recent messages request':

                // TODO: the performance on this will likely be terrible as rooms grow,
                //       we really need a better way to get the last N messages and send
                //       them to the client in the proper order
                
                // TODO: let client decide kinds?
                // Send existing messages in room
                var kinds = [ 'say' ]; //, 'join', 'leave' ];
                options.models.Message.count( { room: room._id, kind: { $in: kinds } }, function( error, numMessages ) {
                    if ( error )
                    {
                        self.bayeux.getClient().publish( '/client/' + message.clientId, {
                            kind: 'error',
                            error: error
                        });
                        return;
                    }

                    var query = options.models.Message.find({
                        room: room._id,
                        kind: { $in: kinds }
                    });
                    
                    if ( numMessages > 100 )
                    {
                        query.skip( numMessages - 100 );
                    }

                    query.sort( 'createdAt' );
                    
                    var stream = query.stream();
                    
                    stream.on( 'data', function( storedMessage ) {
                        storedMessage = storedMessage.toObject();
                        storedMessage.createdAt = storedMessage.createdAt.toISOString();
                        storedMessage.updatedAt = storedMessage.updatedAt.toISOString();
                        self.bayeux.getClient().publish( '/client/' + message.clientId, storedMessage );
                    });
                    
                    stream.on( 'error', function( error ) {
                        self.bayeux.getClient().publish( '/client/' + message.clientId, {
                            kind: 'error',
                            error: error
                        });
                    });
                });

                // don't log
                return;

            case 'join':
                options.models.RoomDynamics.update( { room: room._id }, { $inc: { users: 1 } }, function( error ) {
                    if ( error )
                    {
                        log.channels.db.error( error );
                    }
                });
                break;

            case 'leave':
                if (  self.timeouts[ message.clientId ] && self.timeouts[ message.clientId ][ message.room ] )
                {
                    clearTimeout( self.timeouts[ message.clientId ][ message.room ] );
                    delete self.timeouts[ message.clientId ][ message.room ];
                }

                options.models.RoomDynamics.update( { room: room._id }, { $inc: { users: -1 } }, function( error ) {
                    if ( error )
                    {
                        log.channels.db.error( error );
                    }
                });

                break;
            }
            
            if ( room.features.logs )
            {
                var newMessage = new models.Message();
                models.update( newMessage, message );
                newMessage._id = message._id;
                
                newMessage.save( function( error ) {
                    if ( error )
                    {
                        log.channels.db.error( error );
                        self.bayeux.getClient().publish( '/client/' + message.clientId, {
                            kind: 'error',
                            errorobj: error,
                            error: 'message save failed',
                            message: 'Failed to save message into database.'
                        });
                        return;
                    }
                });
            }
        });
    });
}

Messaging.prototype.Interface = {
    'faye': '/faye'
}