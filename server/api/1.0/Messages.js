var models = require( './models.js' );
var checks = require( './checks.js' );

var Messages = function() {
    var self = this;

    self.GetURLs = function( obj ) {
        if ( obj instanceof models.Room )
        {
            return {
                'message': '/api/1.0/Room/' + obj._id + '/Message',
                'messages': '/api/1.0/Room/' + obj._id + '/Messages'
            };
        }

        return {};
    };


    self.bind = function( app ) {
        app.post( '/api/1.0/Room/:roomId/Message', checks.user, function( request, response ) {
            
            var message = new models.Message();
            message.roomId = request.params.roomId;
            message.senderId = request.session.user._id;
            message.nickname = request.session.user.nickname;
            message.kind = typeof( request.param( 'kind' ) ) != undefined ? request.param( 'kind' ) : 'say';
            message.content = request.param( 'content' );
        
            message.save( function( error ) {
                if ( error )
                {
                    response.json( error.message ? error.message : error, 500 );
                    return;
                }
        
                response.json( message );
            });
        });
        
        app.get( '/api/1.0/Room/:roomId/Messages', checks.user, function( request, response ) {
            var criteria = {
                roomId: request.params.roomId
            };
            
            if ( request.param( 'kinds' ) )
            {
                criteria[ 'kind' ] = { $in: request.param( 'kinds' ).split( ',' ) };
            }
            
            var query = models.Message.find( criteria );
            
            query.limit( request.param( 'limit', 100 ) );
    
            if ( typeof( request.param( 'skip' ) ) != 'undefined' )
            {
                query.skip( request.param( 'skip' ) );
            }
            
            if ( typeof( request.param( 'since' ) ) != 'undefined' )
            {
                query.$gt( 'createdAt', request.param( 'since' ) );
            }
            
            if ( typeof( request.param( 'before' ) ) != 'undefined' )
            {
                query.$lt( 'createdAt', request.param( 'before' ) );
            }
    
            var sort = request.param( 'sort', 'asc' );
            switch( sort )
            {
                case 'asc':
                    query.asc( 'createdAt' );
                    break;
                case 'desc':
                    query.desc( 'createdAt' );
                    break;
                default:
                    response.json( 'Sort order must be \'asc\' or \'desc\'.', 400 );
                    return;
            }
            
            query.exec( function( error, messages ) {
                if ( error )
                {
                    response.json( error.message ? error.message : error, 500 );
                    return;
                }
                response.json( messages );
            });
        });
    }
}

module.exports = new Messages();
