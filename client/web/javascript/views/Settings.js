var Settings = function() {
    var self = this;
    
    self.app = null;
    self.router = null;
    
    self.Bind = function( app, router ) {
        self.app = app;
        self.router = router;
        
        self.router.on( '/Settings', function() {
            mixpanel.track( "View: Settings" );
            self.app.events.emit( 'navigated', 'settings' );
            
            self.app.GetMe( function( user ) {
                if ( !user )
                {
                    self.app.ShowError( 'You must be logged in.', function() {
                        window.location.hash = '/'; 
                    });
                    return;
                }

                dust.render( 'settings', user, function( error, output ) {
                    if ( error )
                    {
                        self.app.ShowError( error );
                        return;
                    }
                
                    $( '#main' ).html( output );
                });
            });
        });
        
        $( document ).on( 'click', '.update-account-button', function( event ) {
            event.preventDefault();
            var button = this;
            var form = $(this).parents( 'form:first' );
        
            self.app.GetMe( function( user ) {
                var toBeUpdated = {};
                var avatar = $(form).find( "#avatar" ).val();
                if ( avatar != user.avatar )
                {
                    toBeUpdated.avatar = avatar;
                }
            
                var email = $(form).find( "#email" ).val();
                if ( email != user.email )
                {
                    toBeUpdated.email = email;
                }
                
                var password = $(form).find( "#password" ).val();
                if ( password && password.length )
                {
                    toBeUpdated.password = password;
                }
                
                var nickname = $(form).find( "#nickname" ).val();
                if ( nickname != user.nickname )
                {
                    toBeUpdated.nickname = nickname;
                }
                
                var location = $(form).find( "#location" ).val();
                if ( location != user.location )
                {
                    toBeUpdated.location = location;
                }
            
                var bio = $(form).find( "#bio" ).val();
                if ( bio != user.bio )
                {
                    toBeUpdated.bio = bio;
                }
                
                // only send if toBeUpdated has at least one key
                for ( var key in toBeUpdated )
                {
                    $(button).button( 'loading' );
                    $(form).spin( 'medium' );
            
                    jsonCall({
                        url: user.urls.self,
                        type: 'PUT',
                        data: toBeUpdated,
                        success: function( updatedUser ) {
                            var oldUser = self.app.user;
                            self.app.user = updatedUser;
                            self.app.events.emit( 'user updated', self.app.user, oldUser );

                            $(form).find( '#password' ).val( '' );
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
                    break; // we break, no matter what, because we just wanted to see if there was a key in toBeUpdated
                }
            });
        });

        $( document ).on( 'click', '.reset-account-button', function( event ) {
            event.preventDefault();    
            var form = $( this ).parents( 'form:first' );

            // TODO: prompt for confirmation, maybe use bootstrap-modal.js?
        
            self.app.GetMe( function( user ) {
                $( form ).find( 'input[type=text]' ).each( function( index, input ) {
                    $( input ).val( input.id in user ? user[ input.id ] : '' );
                    $( input ).html( input.id in user ? user[ input.id ] : '' );
                    
                    if ( input.id == 'avatar' )
                    {
                        $(form).find( "#user-avatar-preview" ).attr( 'src', user.avatar ? user.avatar : '/images/icons/user_64x64.png' );
                    }
                });
            });
        });

        $( document ).on( 'click', '#use-avatar-gravatar', function( event ) {
            event.preventDefault();
            event.stopPropagation();
            
            var button = this;
            var form = $(this).parents( 'form:first' );
            
            self.app.GetMe( function( user ) {
                var gravatar = 'http://www.gravatar.com/avatar/' + md5( user.email ) + '?s=64';
                
                $(form).find( "#avatar" ).val( gravatar );
                $(form).find( "#user-avatar-preview" ).attr( 'src', gravatar );
            });
        });
    }
}
