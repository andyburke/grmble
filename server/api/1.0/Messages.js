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
            message.senderId = request.user._id;
            message.nickname = request.user.nickname;
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
                query.gt( 'createdAt', request.param( 'since' ) );
            }
            
            if ( typeof( request.param( 'before' ) ) != 'undefined' )
            {
                query.lt( 'createdAt', request.param( 'before' ) );
            }
    
            query.sort( { 'createdAt': request.param( 'sort', 'asc' ) } );
            
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
