var datetime = require( 'datetime' );

var winston = require( 'winston' );
require( 'winston-loggly' );

var fs = require( 'node-fs' );

var Logger = exports.Logger = function( options ) {
    var self = this;
    
    self.channels = {
        server: new ( winston.Logger )({
            transports: [
                new ( winston.transports.Console )(),
                new ( winston.transports.Loggly )({
                    subdomain: options.loggly.subdomain,
                    inputToken: options.loggly.inputToken,
                    json: true
                })
            ]
        }),
        
        db: new ( winston.Logger )({
            transports: [
                new ( winston.transports.Console )(),
                new ( winston.transports.Loggly )({
                    subdomain: options.loggly.subdomain,
                    inputToken: options.loggly.inputToken,
                    json: true
                })
            ]
        }),
        
        access: new ( winston.Logger )({
            transports: [
                new ( winston.transports.Loggly )({
                    subdomain: options.loggly.subdomain,
                    inputToken: options.loggly.inputToken,
                    json: true
                })
            ]
        })
    };
    
    var logDate = null;    
    self.RotateLogFiles = function() {
        var curDate = datetime.format( new Date(), "%Y-%m-%d" );
        if ( curDate != logDate )
        {
            logDate = curDate;
    
            for ( var target in self.channels )
            {
                var logger = self.channels[ target ];
    
                try
                {
                    logger.remove( winston.transports.File );
                }
                catch( e )
                {
                    // do nothing, it's ok if there was no file transport
                }
                
                var filename = options.directory + '/' + target + '-' + logDate + '.log';
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
                self.channels.server.info( "Logging " + target + " to: " + filename );
            }
        }
        setTimeout( self.RotateFileLogs, 1000 );
    };
    self.RotateLogFiles();
    
}
