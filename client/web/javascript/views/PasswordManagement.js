var PasswordManagement = function() {
    var self = this;
    
    self.app = null;
    self.router = null;
    
    self.Bind = function( app, router ) {
        self.app = app;
        self.router = router;
        
        self.router.on( '/Passwords/RequestReset', function( authToken ) {
            mixpanel.track( "View: PasswordResetRequest" );
            self.app.events.emit( 'navigated', 'passwordresetrequest' );
            
            dust.render( 'password_reset_request', {}, function( error, output ) {
                if ( error )
                {
                    self.app.ShowError( error );
                    return;
                }
            
                $( '#main' ).html( output );
            });
        });

        $( document ).on( 'click', '.send-reset-button', function( event ) {
            event.preventDefault();
            var button = this;
            var form = $(this).parents( 'form:first' );
        
            var email = $( form ).find( "#email" ).val();

            if ( !email.length )
            {
                self.app.ShowError( 'You must enter your email address.' );
                return;
            }
            
            $(button).button( 'loading' );
            $(form).spin( 'medium' );
            
            self.app.GetAPI( function( api ) {
                jsonCall({
                    url: api.passwords.requestreset,
                    type: 'POST',
                    data: {
                        email: email
                    },
                    success: function( result ) {
                        self.app.events.emit( 'password reset request sent' );
                        self.app.ShowError( 'Reset request email sent.' );

                        $(form).find( '#email' ).val( '' );
                        $(form).spin( false );
                        $(button).button( 'complete' );
                        setTimeout( function() {
                            $(button).button( 'reset' );
                        }, 2000 );

                        window.location.hash = '/';
                    },
                    error: function( response, status, error ) {
                        $(form).spin( false );
                        self.app.ShowError( response.responseText );
                        $(button).button( 'reset' );
                    }
                });
            });
        });

        self.router.on( '/Passwords/Reset/:authToken', function( authToken ) {
            mixpanel.track( "View: PasswordReset" );
            self.app.events.emit( 'navigated', 'passwordreset' );
            
            dust.render( 'password_reset', { authToken: authToken }, function( error, output ) {
                if ( error )
                {
                    self.app.ShowError( error );
                    return;
                }
            
                $( '#main' ).html( output );
            });
        });

        $( document ).on( 'click', '.reset-password-button', function( event ) {
            event.preventDefault();
            var button = this;
            var form = $(this).parents( 'form:first' );
        
            var authToken = $( form ).find( '#authToken' ).val();
            var password = $( form ).find( "#password" ).val();
            var verifyPassword = $( form ).find( "#verify-password" ).val();
            
            if ( !password.length )
            {
                self.app.ShowError( 'You must enter a new password.' );
                return;
            }
            
            if ( password != verifyPassword )
            {
                self.app.ShowError( 'Your passwords do not match!' );
                return;
            }
                
            $(button).button( 'loading' );
            $(form).spin( 'medium' );
            
            self.app.GetAPI( function( api ) {
                jsonCall({
                    url: api.passwords.reset,
                    type: 'POST',
                    data: {
                        authToken: authToken,
                        password: password
                    },
                    success: function( result ) {
                        self.app.events.emit( 'password reset' );
                        self.app.GetMe( function( me ) {
                            if ( me )
                            {
                                self.app.events.emit( 'logged in', me );
                                window.location.hash = '/Settings';
                            }
                            else
                            {
                                self.app.ShowError( 'Error Authenticating, try reloading.' );
                                $('.authenticated').hide();
                                $('.unauthenticated').show();
                                window.location.hash = '/';
                            }
                        });
    
                        $(form).find( '#password' ).val( '' );
                        $(form).find( '#verify-password' ).val( '' );
                        $(form).spin( false );
                        $(button).button( 'complete' );
                        setTimeout( function() {
                            $(button).button( 'reset' );
                        }, 2000 );
                    },
                    error: function( response, status, error ) {
                        $(form).spin( false );
                        self.app.ShowError( response.responseText );
                        $(button).button( 'reset' );
                    }
                });
            });
        });
    }
}
