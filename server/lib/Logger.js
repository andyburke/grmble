var datetime = require( 'datetime' );
var winston = require( 'winston' );
var fs = require( 'node-fs' );

var Create = module.exports.Create = function( opts ) {
    
    var options = opts || {};
    options[ 'console' ] = typeof( options[ 'console' ] ) !== 'undefined' ? options[ 'console' ] : true;

    var transports = [];
    
    if ( options[ 'console' ] )
    {
        transports.push( new ( winston.transports.Console )() );
    }

    if ( options[ 'loggly' ] )
    {
        require( 'winston-loggly' );
        transports.push( new ( winston.transports.Loggly )({
            subdomain: options.loggly.subdomain,
            inputToken: options.loggly.token,
            json: true
        }) );
    }

    var logger = new ( winston.Logger )({
        transports: transports
    });

    var logDate = null;    
    function RotateLogFiles() {
        var curDate = datetime.format( new Date(), "%Y-%m-%d" );
        if ( curDate != logDate )
        {
            logDate = curDate;

            try
            {
                logger.remove( winston.transports.File );
            }
            catch( e )
            {
                // do nothing, it's ok if there was no file transport
            }
            
            var filename = options.directory + '/' + logDate + '.log';
            try
            {
                fs.mkdirSync( options.directory, "0777", true );
            }
            catch( e )
            {
                if ( !e.code || e.code != 'EEXIST' )
                {
                    throw e;
                }
            }
    
            logger.add( winston.transports.File, {
                filename: filename,
                json: true
            });
            logger.info({
                channel: 'server',
                message: "Logging " + target + " to: " + filename
            });
        }
        setTimeout( RotateFileLogs, 1000 );
    }

    if ( options[ 'directory' ] )
    {
        RotateLogFiles();
    }
    
    return logger;
}
