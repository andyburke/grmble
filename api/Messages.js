var models = require( './models.js' );
var checks = require( './checks.js' );

exports.bind = function( app ) {
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
        var query = models.Message.find( {} );
        
        query.where( 'roomId', request.params.roomId );
        query.limit( request.param( 'limit', 100 ) );

        if ( typeof( request.param( 'skip' ) ) != 'undefined' )
        {
            query.skip( request.param( 'skip' ) );
        }
        
        if ( typeof( request.param( 'since' ) ) != 'undefined' )
        {
            query.$gte( 'createdAt', request.param( 'since' ) );
        }
        
        if ( typeof( request.param( 'until' ) ) != 'undefined' )
        {
            query.$lte( 'createdAt', request.param( 'until' ) );
        }

        query.desc( 'createdAt' );

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
