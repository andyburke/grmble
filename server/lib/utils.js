var oldest = "1970-01-01";
var newest = "2100-01-01";
var query = exports.query = {
    HandleSearchParams: function( request, response, next ) {
        request.query.createdSince = request.param( 'createdSince', oldest );
        request.query.createdUntil = request.param( 'createdUntil', newest );
        
        request.query.updatedSince = request.param( 'updatedSince', oldest );
        request.query.updatedUntil = request.param( 'updatedUntil', newest );

        request.query.deletedSince = request.param( 'deletedSince', oldest );
        request.query.deletedUntil = request.param( 'deletedUntil', newest );

        request.query.startedSince = request.param( 'startedSince', oldest );
        request.query.startedUntil = request.param( 'startedUntil', newest );
        
        request.query.endedSince = request.param( 'endedSince', oldest );
        request.query.endedUntil = request.param( 'endedUntil', newest );

        request.query.offset = request.param( 'offset', 0 );
        request.query.limit = request.param( 'limit', 100 );

        request.query.sortBy = request.param( 'sortBy', 'createdAt' );
        request.query.sort = request.param( 'sort', 'asc' );

        next();
    }
}

var SmartBool = exports.SmartBool = function( obj ) {
    switch( ( typeof( obj ) == 'string' ) ? obj.toLowerCase() : obj )
    {
        case "true":
        case "yes":
        case "1":
            return true;
        case "false":
        case "no":
        case "0":
            return false;
        default:
            return Boolean( obj );
    }
}

var crypto = require( 'crypto' );

var security = exports.security = {
    MakeSalt: function() {
        return Math.round( ( new Date().valueOf() * Math.random() ) ) + '';
    },

    GenerateAuthToken: function ( user ) {
        return crypto.createHash( 'sha256' ).update( ( user ? ( user.email + user.passwordHash ) : security.MakeSalt() ) + security.MakeSalt() ).digest( 'hex' );
    }
}