//////////////////////
// Object cloning, see: http://stackoverflow.com/questions/728360/copying-an-object-in-javascript

Object.defineProperty( Object.prototype, "__clone", {
    value: function() {
        if ( this.cloneNode )
        {
            return this.cloneNode( true );
        }
        
        var copy = this instanceof Array ? [] : {};
        for( var attr in this )
        {
            if ( typeof this[ attr ] == "function" || this[ attr ] == null || ( typeof( this[ attr ] ) != 'object' && !this[ attr ].hasOwnProperty( 'clone' ) ) )
            {
                copy[ attr ] = this[ attr ];
            }
            else if ( this[ attr ] == this )
            {
                copy[ attr ] = copy;
            }
            else
            {
                copy[ attr ] = this[ attr ].__clone();
            }
        }
        return copy;
    }
});

Object.defineProperty( Date.prototype, "__clone", {
    value: function() {
        var copy = new Date();
        copy.setTime( this.getTime() );
        return copy;
    }
});

Object.defineProperty( Number.prototype, "__clone", { value: function() { return this; } } );
Object.defineProperty( Boolean.prototype, "__clone", { value: function() { return this; } } );
Object.defineProperty( String.prototype, "__clone", { value: function() { return this; } } );


// end cloning
///////////////////////

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