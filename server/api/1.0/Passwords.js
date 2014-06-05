require( 'date-utils' );
var nodemailer = require( 'nodemailer' );
var dust = require( 'dustjs-linkedin' );
var fs = require( 'fs' );
var passwordHash = require( 'password-hash' );

dust.loadSource( dust.compile( fs.readFileSync( 'templates/password_reset_email_text.dust', 'ascii' ), 'password_reset_email_text' ) );
dust.loadSource( dust.compile( fs.readFileSync( 'templates/password_reset_email_html.dust', 'ascii' ), 'password_reset_email_html' ) );

var Passwords = module.exports = function( options ) {
    var self = this;

    var smtpTransport = nodemailer.createTransport( 'SES', {
        AWSAccessKeyID: options.config.aws.AccessKeyID,
        AWSSecretKey: options.config.aws.SecretKey
    });

    options.app.post( '/api/1.0/Passwords/RequestReset', function( request, response ) {
        options.models.User.findOne( { 'email': request.param( 'email' ).toLowerCase().trim() } ).select( '+email' ).exec( function( error, user ) {
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
            
            authToken = new options.models.AuthToken();
            authToken.token = options.utils.security.GenerateAuthToken( user );
            authToken.expires = new Date().addDays( 1 );
            authToken.owner = user._id;
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

    options.app.post( '/api/1.0/Passwords/Reset', function( request, response ) {
        options.models.AuthToken.findOne( { 'token': request.param( 'authToken' ) } ).populate({
            path: 'owner',
            select: '+passwordHash +email'
        }).exec( function( error, authToken ) {
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
            
            authToken.owner.passwordHash = passwordHash.generate( request.param( 'password' ) );
            authToken.owner.save( function( error ) {
                if ( error )
                {
                    response.json( error, 500 );
                    return;
                }
                
                var newAuthToken = new options.models.AuthToken();
                newAuthToken.token = options.utils.security.GenerateAuthToken( authToken.owner );
                newAuthToken.expires = new Date().addYears( 1 );
                newAuthToken.owner = authToken.owner._id;
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

    return self;
}

Passwords.prototype.Interface = {
    'passwords': {
        'requestreset': '/api/1.0/Passwords/RequestReset',
        'reset': '/api/1.0/Passwords/Reset'
    }
};