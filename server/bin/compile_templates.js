if ( process.argv.length != 4 )
{
    console.log( "Usage: node compile_templates.js <templates directory> <output file>" );
    process.exit( 1 );
}

var templatesPath = process.argv[ 2 ];
var outputPath = process.argv[ 3 ];

var fs = require( 'fs' );
var dust = require( 'dustjs-linkedin' );

var walk = function(dir, done) {
  var results = [];
  fs.readdir(dir, function(err, list) {
    if (err) return done(err);
    var i = 0;
    (function next() {
      var file = list[i++];
      if (!file) return done(null, results);
      file = dir + '/' + file;
      fs.stat(file, function(err, stat) {
        if (stat && stat.isDirectory()) {
          walk(file, function(err, res) {
            results = results.concat(res);
            next();
          });
        } else {
          results.push(file);
          next();
        }
      });
    })();
  });
};

var templateRegex = new RegExp( /\.dust$/i );
var templateNameRegex = new RegExp( /.*\/(.*?)\.dust$/i );

var templates = [];

walk( templatesPath, function( error, results ) {
    var processed = 0;

    function CheckComplete() {
        if ( processed != results.length )
        {
            return;
        }
        
        fs.writeFile( outputPath, templates.join( "\n\n" ), function ( err ) {
            if (err) throw err;
            console.log( 'Saved ' + outputPath );
        });
    }
    
    results.forEach( function( filename ) {
        if ( filename.match( templateRegex ) )
        {
            fs.readFile( filename, 'ascii', function ( err, data ) {
                if (err) throw err;
            
                var templateName = filename.match( templateNameRegex )[ 1 ];
                if ( !templateName )
                {
                    throw new Exception( 'Could not determine template name.' );
                }
                
                templates.push( dust.compile( data, templateName ) );
                ++processed;
                CheckComplete();
            });
        }
        else
        {
            ++processed;
            CheckComplete();
        }
    });
});
