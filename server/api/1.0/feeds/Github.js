var mongoose = require( 'mongoose' );
var dust = require( 'dustjs-linkedin' );
var fs = require( 'fs' );

dust.loadSource( dust.compile( fs.readFileSync( 'templates/messages/github_commit.dust', 'ascii' ), 'github_commit' ) );

var FeedGithub = module.exports = function( options ) {
    var self = this;

    options.app.post( '/api/1.0/Room/:roomId/Feed/Github', function( request, response ) {
        options.models.Room.findById( request.params.roomId, function( error, room ) {
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

                    console.log( "TODO: getsubsystem" );
                    if ( false ) // TODO: getsubsystem
                    {
                        var message = {
                            _id: new mongoose.Types.ObjectId(),
                            kind: 'say',
                            clientId: options.app.bayeux.getClient().getClientId(),
                            createdAt: new Date(),
                            roomId: request.params.roomId,
                            senderId: null,
                            nickname: 'github',
                            userHash: null,
                            avatar: 'http://' + request.headers.host + '/images/services/github.png',
                            content: output
                        };
                        
                        options.app.bayeux.getClient().publish( '/room/' + request.params.roomId, message );

                        if ( room.features.logs )
                        {
                            var newMessage = new options.models.Message();
                            options.models.update( newMessage, message );
                            newMessage._id = message._id;
                            newMessage.createdAt = message.createdAt.toJSON();
                            
                            newMessage.save( function( error ) {
                                if ( error )
                                {
                                    logger.error( error.message || error, {
                                        channel: 'db',
                                        message: error.message || error,
                                        stack: error.stack
                                    });
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
                logger.error( e.message || e, {
                    channel: 'server',
                    message: e.message || e,
                    stack: e.stack
                });
            }
        });
    });
}

FeedGithub.prototype.Interface = {
    feeds: {
        github: '/api/1.0/Room/{{roomid}}/Feed/Github'
    }
};