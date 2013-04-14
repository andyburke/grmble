var Messages = module.exports = function( options ) {
    var self = this;    
    
    options.app.post( '/api/1.0/Room/:roomId/Message', options.checks.user, function( request, response ) {
        
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
    
    options.app.get( '/api/1.0/Room/:roomId/Messages', options.checks.user, function( request, response ) {
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

Messages.prototype.Interface = {
    message: '/api/1.0/Room/{{roomid}}/Message',
    messages: '/api/1.0/Room/{{roomid}}/Messages'
}
