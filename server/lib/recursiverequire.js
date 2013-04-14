var path = require( 'path' );
var fs = require( 'fs' );

module.exports.require = function( directory, results ) {
    results = results || {};
    
    var parentDirectory = path.dirname( module.parent.filename );
    var resolvedDirectory = ( directory[ 0 ] === '/' ) ? directory : ( parentDirectory + '/' + directory );
    
    fs.readdirSync( resolvedDirectory ).forEach( function( file ) {
        var filename = resolvedDirectory + '/' + file;
        var stats = fs.statSync( filename );
        
        if ( stats.isDirectory() )
        {
            exports.require( filename, results );
        }
        else if ( filename.match( /\.js$/i ) )
        {
            results[ filename ] = module.require( filename );
        }
    });
    
    return results;
}
