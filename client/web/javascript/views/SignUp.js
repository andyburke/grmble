var SignUp = function() {
    var self = this;
    
    self.app = null;
    self.router = null;
    
    self.Bind = function( app, router ) {
        self.app = app;
        self.router = router;
        
        self.router.on( '/SignUp', function() {
            mixpanel.track( "View: SignUp" );
            self.app.events.emit( 'navigated', 'signup' );
            
            dust.render( 'signup', {}, function( error, output ) {
                if ( error )
                {
                    self.app.ShowError( error );
                    return;
                }
            
                $( '#main' ).html( output );
            });
        });
        
        $( document ).on( 'click', '.button-signup', function( event ) {
            event.preventDefault();
            mixpanel.track( "SignUp: Started" );
            var form = $( this ).parents( 'form:first' );
        
            var info = {};
            info.email = $( form ).find( "input[type=text][name=email]" ).val();
            info.nickname = $( form ).find( "input[type=text][name=nickname]" ).val();
            info.password = $( form ).find( "input[type=password][name=password]" ).val();
        
            if ( !info.email.length || !info.nickname.length || !info.password.length )
            {
                self.app.ShowError( 'You must enter an email, a nickname and a password to sign up!' );
                mixpanel.track( "SignUp: Input Error", {
                    email: !!info.email.length,
                    nickname: !!info.nickname.length,
                    password: !!info.password.length
                });
                return;
            }
            
            $( form ).spin( 'small' );
            
            self.app.GetAPI( function( api ) {
                jsonCall({
                    url: api.user,
                    type: 'POST',
                    data: info,
                    cache: false,
                    success: function( data ) {
                        $(form).find( "input[type=text][name=email]" ).val( '' );
                        $(form).find( "input[type=text][name=nickname]" ).val( '' );
                        $(form).find( "input[type=password][name=password]" ).val( '' );
            
                        self.app.user = data.user || data;
                        self.app.events.emit( 'logged in', self.app.user );
            
                        $(form).spin( false );
                        window.location.hash = '/Settings';
                        mixpanel.track( "SignUp: Success" );
                        mixpanel.identify( self.app.user._id );
                        mixpanel.name_tag( self.app.user.email );
                        mixpanel.register( { email: self.app.user.email, nickname: self.app.user.nickname } );
                    },
                    error: function( response, status, error ) {
                        $(form).spin( false );
                        self.app.ShowError( response.responseText );
                        mixpanel.track( 'Error', {
                            action: 'SignUp',
                            error: xhr.responseText
                        });
                    }
                });
            });
        });
    }
}
