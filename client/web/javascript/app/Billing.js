var Billing = function() {
    var self = this;

    self.app = null;
    self.router = null;
    
    self.Bind = function( app, router ) {
        self.app = app;
        self.router = router;

        $( document ).on( 'click', '.save-card-button', function( event ) {
            event.preventDefault();
            var button = this;
            var form = $( this ).parents( 'form:first' );
        
            var cardNumber = $( form ).find( "input[type=text][name=card-number]" ).val().trim();
            var cvc = $( form ).find( "input[type=text][name=card-cvc]" ).val().trim();
            var expiration = $( form ).find( "input[type=text][name=card-expiration]" ).val().trim();
            var expiry = expiration.split( '/' );
            
            if ( !Stripe.validateCardNumber( cardNumber ) )
            {
                alert( 'Invalid card number!' );
                return;
            }

            if ( !Stripe.validateCVC( cvc ) )
            {
                alert( 'Invalid CVC!' );
                return;
            }
            
            if ( expiry.length != 2 || !Stripe.validateExpiry( expiry[ 0 ], expiry[ 1 ] ) )
            {
                alert( 'Invalid expiration date!' );
                return;
            }
            
            $( form ).spin( 'large' );
            $( button ).button( 'loading' );
            
            Stripe.createToken({
                number: cardNumber,
                cvc: cvc,
                exp_month: expiry[ 0 ],
                exp_year: expiry[ 1 ]
            }, function( status, response) {
                if ( response.error )
                {
                    self.app.ShowError( response.error.message );
                }
                else
                {
                    self.app.GetMe( function( me ) {
                        jsonCall({
                            url: me.urls.self,
                            type: 'PUT',
                            data: {
                                stripe: response
                            },
                            success: function( user ) {
                                var oldUser = self.app.user;
                                self.app.user = user;
                                self.app.events.emit( 'user updated', self.app.user, oldUser );
                                self.app.events.emit( 'user billing updated', self.app.user );
                                
                                dust.render( 'cc_entry', self.app.user, function( error, output ) {
                                    if ( error )
                                    {
                                        self.app.ShowError( error );
                                        return;
                                    }
                                
                                    $( '#cc-entry-container' ).html( output );
                                });
                                $( form ).spin( false );
                                $( button ).button( 'complete' );
                                setTimeout( function() {
                                    $( button ).button( 'reset' );
                                }, 2000 );
                                
                            },
                            error: function( xhr ) {
                                self.app.ShowError( xhr.responseText );
                            }
                        });
                    });
                }
            });
        });
        
        $( document ).on( 'click', '.cancel-card-button', function( event ) {
            event.preventDefault();
            self.app.HideBillingModal();
        });        
    }

    self.Start = function() {
        // make sure we clear the form on hide
        $( '#cc-modal' ).on( 'hidden', self.HideBillingModal );
    }
    
    self.ShowBillingModal = function( reason ) {
        self.app.GetMe( function( me ) {
            $( '#cc-reason' ).html( reason );
            dust.render( 'cc_entry', me, function( error, output ) {
                if ( error )
                {
                    self.app.ShowError( error );
                    return;
                }
            
                $( '#cc-entry-container' ).html( output );
                $( '#cc-modal' ).modal( { 'backdrop': 'static' } );
            });
        });
    }
    
    self.HideBillingModal = function() {
        self.app.GetMe( function( me ) {
            dust.render( 'cc_entry', me, function( error, output ) {
                if ( error )
                {
                    self.app.ShowError( error );
                    return;
                }
            
                $( '#cc-entry-container' ).html( output );
            });
        });
        $( '#cc-modal' ).modal( 'hide' );
    }

}
