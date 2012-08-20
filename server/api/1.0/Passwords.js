require( 'date-utils' );
var nodemailer = require( 'nodemailer' );
var dust = require( 'dustjs-linkedin' );
var fs = require( 'fs' );
var passwordHash = require( 'password-hash' );

dust.loadSource( dust.compile( fs.readFileSync( 'templates/password_reset_email_text.dust', 'ascii' ), 'password_reset_email_text' ) );
dust.loadSource( dust.compile( fs.readFileSync( 'templates/password_reset_email_html.dust', 'ascii' ), 'password_reset_email_html' ) );

var smtpTransport = nodemailer.createTransport("SES", {
    AWSAccessKeyID: config.aws.AccessKeyID,
    AWSSecretKey: config.aws.SecretKey
});

var Passwords = function() {
    var self = this;

    self.GetURLs = function( obj ) {
        return obj ? {} : {
            'passwords': {
                'requestreset': '/api/1.0/Passwords/RequestReset',
                'reset': '/api/1.0/Passwords/Reset'
            }
        };
    }

    self.bind = function( app ) {

        app.post( '/api/1.0/Passwords/RequestReset', function( request, response ) {
            models.User.findOne( { 'email': request.param( 'email' ).toLowerCase().trim() }, function( error, user ) {
                if ( error )
                {
                    response.json( error, 500 );
                    return;
                }
                
                if ( !user )
                {
                    response.json( { 'error': 'unknown user', 'message': 'Could not find a user with email: ' + request.param( 'email' ).toLowerCase().trim() }, 404 );
                    return;
                }
                
                authToken = new models.AuthToken();
                authToken.token = utils.security.GenerateAuthToken( user );
                authToken.expires = new Date().addDays( 1 );
                authToken.ownerId = user._id;
                authToken.save( function( error ) {
                    if ( error )
                    {
                        response.json( error, 500 );
                        return;
                    }

                    // TODO: https
                    var link = 'http://' + request.headers.host + '/#/Passwords/Reset/' + authToken.token
                    
                    dust.render( 'password_reset_email_text', { link: link }, function( error, text ) {
                        if ( error )
                        {
                            response.json( error, 500 )
                            return;
                        }
                        
                        dust.render( 'password_reset_email_html', { link: link }, function( error, html ) {
                            if ( error )
                            {
                                response.json( error, 500 )
                                return;
                            }

                            smtpTransport.sendMail({
                                from: "Grmble <support@grmble.com>",
                                to: user.email,
                                subject: "Password Reset Request",
                                text: text,
                                html: html
                            }, function( error, smtpResponse ) {
                                if ( error )
                                {
                                    response.json( error, 500 );
                                    return;
                                }

                                response.json( { 'sent': true } );
                            });
                        });
                    });
                });
            });
        });

        app.post( '/api/1.0/Passwords/Reset', function( request, response ) {
            models.AuthToken.findOne( { 'token': request.param( 'authToken' ) }, function( error, authToken ) {
                if ( error )
                {
                    response.json( error, 500 );
                    return;
                }
                
                if ( !authToken || ( authToken.expires < new Date() ) )
                {
                    response.json( { 'error': 'invalid authtoken', 'message': 'Invalid authtoken.  Maybe your reset link has expired?' }, 400 );
                    return;
                }
                
                models.User.findById( authToken.ownerId, function( error, user ) {
                    if ( error )
                    {
                        response.json( error, 500 );
                        return;
                    }
                    
                    if ( !user )
                    {
                        response.json( { 'error': 'invalid user id', 'message': 'Could not locate a user for this authToken.  This indicates a serious issue.  Please email support@grmble.com.' }, 500 );
                        return;
                    }
                    
                    user.passwordHash = passwordHash.generate( request.param( 'password' ) );
                    user.save( function( error ) {
                        if ( error )
                        {
                            response.json( error, 500 );
                            return;
                        }
                        
                        var newAuthToken = new models.AuthToken();
                        newAuthToken.token = utils.security.GenerateAuthToken( user );
                        newAuthToken.expires = new Date().addYears( 1 );
                        newAuthToken.ownerId = user._id;
                        newAuthToken.save( function( error ) {
                            if ( error )
                            {
                                response.json( error, 500 );
                                return;
                            }
                            
                            authToken.remove( function( error ) {
                                if ( error )
                                {
                                    response.json( error, 500 );
                                    return;
                                }
                                
                                response.cookie( 'authtoken', newAuthToken.token, { maxAge: newAuthToken.expires - new Date(), httpOnly: true, path: '/' } );
                                response.json( { 'reset': true } );
                            });
                        });
                    });
                });
            });
        });

    }

    return self;
}

module.exports = new Passwords();
