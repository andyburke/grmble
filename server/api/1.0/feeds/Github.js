var mongoose = require( 'mongoose' );
var dust = require( 'dustjs-linkedin' );
var fs = require( 'fs' );

dust.loadSource( dust.compile( fs.readFileSync( 'templates/messages/github_commit.dust', 'ascii' ), 'github_commit' ) );

var FeedGithub = function() {
    var self = this;

    self.GetURLs = function( obj ) {
        if ( !obj )
        {
            return {
            };
        }

        if ( obj instanceof models.Room )
        {
            return {
                'feed_github': '/api/1.0/Room/' + obj._id + '/Feed/Github'
            };
        }

        return {};
    };
    
    self.bind = function( app ) {
        app.post( '/api/1.0/Room/:roomId/Feed/Github', function( request, response ) {
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

                try
                {
                    var data = JSON.parse( request.param( 'payload' ) );
                    dust.render( 'github_commit', data, function( error, output ) {
                        if ( error )
                        {
                            response.json( error, 500 )
                            return;
                        }
    
                        if ( app.bayeux )
                        {
                            var message = {
                                _id: new mongoose.Types.ObjectId(),
                                kind: 'say',
                                clientId: app.bayeux.getClient().getClientId(),
                                createdAt: new Date(),
                                roomId: request.params.roomId,
                                senderId: null,
                                nickname: 'github',
                                userHash: null,
                                avatar: 'http://' + request.headers.host + '/images/services/github.png',
                                content: output
                            };
                            
                            app.bayeux.getClient().publish( '/room/' + request.params.roomId, message );
    
                            if ( room.features.logs )
                            {
                                var newMessage = new models.Message();
                                models.update( newMessage, message );
                                newMessage._id = message._id;
                                newMessage.createdAt = message.createdAt.toJSON();
                                
                                newMessage.save( function( error ) {
                                    if ( error )
                                    {
                                        log.channels.db.error( error );
                                        return;
                                    }
                                });
                            }
                        }
                        
                        response.json( {} );
                    });
                }
                catch( e )
                {
                    log.channels.server.error( e.toString () );
                }
            });
        });
    }
}

module.exports = new FeedGithub();