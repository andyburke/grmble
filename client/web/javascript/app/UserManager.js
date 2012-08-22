var UserManager = function() {
    var self = this;

    self.app = null;
    self.router = null;
    
    self.Bind = function( app, router ) {
        self.app = app;
        self.router = router;

        $( document ).on( 'click', '.button-signin', function( event ) {
            event.preventDefault();    
            var form = $( this ).parents( 'form:first' );
        
            var email = $( form ).find( "input[type=text][name=email]" ).val().trim();
            var password = $( form ).find( "input[type=password][name=password]" ).val();
        
            if ( !email.length || !password.length )
            {
                alert( 'You must enter an email and a password to log in!' );
                return;
            }
            
            $( form ).spin( 'small' );
            
            var authString = 
            self.app.GetAPI( function( api ) {
                jsonCall({
                    url: api.session,
                    type: 'POST',
                    headers: {
                        'Authorization': 'Basic ' + Base64.encode( email + ':' + password )
                    },
                    cache: false,
                    success: function( data ) {
                        $(form).find( "input[type=text][name=email]" ).val( '' );
                        $(form).find( "input[type=password][name=password]" ).val( '' );
            
                        $( '#signup-modal' ).modal( 'hide' );
                        
                        self.app.user = data.user || data;
                        self.app.events.emit( 'logged in', self.app.user );

                        // cause a 'reload'
                        var lastHash = window.location.hash;
                        window.location.hash = '';
                        window.location.hash = lastHash;
            
                        $(form).spin( false );
                    },
                    error: function( response, status, error ) {
                        $(form).spin( false );
                        self.app.ShowError( response.responseText );
                    }
                });
            });
        });
        
        $( document ).on( 'click', '.button-signout', function( event ) {
            event.preventDefault();
            
            self.app.GetAPI( function( api ) {
                jsonCall({
                    url: api.session,
                    type: 'DELETE',
                    success: function( data ) {
                        var oldUser = self.app.user;
                        self.app.user = null;
                        self.app.events.emit( 'logged out', oldUser );
                    },
                    error: function( response, status, error ) {
                        self.app.ShowError( response.responseText );
                    }
                });    
            });
        });
    }
}
