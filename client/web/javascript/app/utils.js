Date.prototype.getISOString = function() {
    function pad( n ) {
        return n < 10 ? '0'+ n : n;
    }
    var d = this;
    return d.getUTCFullYear() + '-' + pad( d.getUTCMonth() + 1 ) + '-' + pad( d.getUTCDate() ) + 'T' + pad( d.getUTCHours() ) + ':' + pad( d.getUTCMinutes() ) + ':' + pad( d.getUTCSeconds() ) + 'Z';
}

var GetQueryParams = function() {
    var result = {};
    
    if ( window.location.search )
    {
        var params = window.location.search.slice( 1 ).split( "&" );
        for ( var i = 0; i < params.length; ++i )
        {
            var tmp = params[ i ].split( "=" );
            result[ tmp[ 0 ] ] = unescape( tmp[ 1 ] );
        }
    }
    
    return result;
}

var jsonCall = function( options ) {
    var opts = $.extend({
            dataType: 'json'
        },
        options,
        ( ( typeof( options.data ) != 'undefined' && options.type && options.type.toLowerCase() != 'get' ) ? { data: JSON.stringify( options.data ), contentType: 'application/json' } : {} ));
    $.ajax( opts );
}