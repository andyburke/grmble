var ManageRoom = function() {
    var self = this;
    
    self.app = null;
    self.router = null;
    
    self.Bind = function( app, router ) {
        self.app = app;
        self.router = router;
        
        self.router.on( '/ManageRoom/:roomId', function( roomId ) {
            mixpanel.track( "View: ManageRoom", {
                roomId: roomId
            });
            self.app.events.emit( 'navigated', 'manageroom' );

            self.app.GetRoom( roomId, function( room, error ) {
                if ( error )
                {
                    self.app.ShowError( error );
                    return;
                }

                room.joinedTags = room.tags.join( ', ' );

                dust.render( 'manage_room', room, function( error, output ) {
                    if ( error )
                    {
                        self.app.ShowError( error );
                        return;
                    }
    
                    $( '#main' ).html( output );

                    $( '#privacy-slider' ).noUiSlider( 'init', {
                        knobs: 1,
                        connect: "lower",
                        scale: [ 0, 1 ],
                        start: [ room.features.privacy ? 1 : 0 ],
                        step: 1,
                        change: self.UpdatePrices,
                        end: self.UpdatePrices
                    });

                    $( '#logs-slider' ).noUiSlider( 'init', {
                        knobs: 1,
                        connect: "lower",
                        scale: [ 0, 1 ],
                        start: [ room.features.logs ? 1 : 0 ],
                        step: 1,
                        change: self.UpdatePrices,
                        end: self.UpdatePrices
                    });

                    $( '#advertising-slider' ).noUiSlider( 'init', {
                        knobs: 1,
                        connect: "lower",
                        scale: [ 0, 1 ],
                        start: [ room.features.advertising ? 0 : 1 ],
                        step: 1,
                        change: self.UpdatePrices,
                        end: self.UpdatePrices
                    });

                    self.UpdatePrices();
                });
            });
        });
        
        $( document ).on( 'click', '.update-room-button', function( event ) {
            event.preventDefault();
            var button = this;
            var form = $(this).parents( 'form:first' );
        
            var toBeUpdated = {};
        
            var roomId = $(form).find( '#_id' ).val();
            self.app.GetRoom( roomId, function( room, error ) {
                if ( error )
                {
                    self.app.ShowError( error );
                    return;
                }
    
                var name = $(form).find( "#name" ).val();
                if ( name != room.name )
                {
                    toBeUpdated.name = name;
                }
                
                var description = $(form).find( "#description" ).val();
                if ( description != room.description )
                {
                    toBeUpdated.description = description;
                }
            
                var tags = $(form).find( "#tags" ).val().split( new RegExp( '[,;]' ) ).map( function( tag ) { return tag.trim() } );
                if ( tags != room.tags )
                {
                    toBeUpdated.tags = tags;
                }
                
                var privacy = $( '#privacy-slider' ).noUiSlider( 'value' )[ 1 ];
                if ( privacy != room.features.privacy )
                {
                    toBeUpdated.features = toBeUpdated.features || room.features;
                    toBeUpdated.features.privacy = privacy;
                }
            
                var advertising = $( '#advertising-slider' ).noUiSlider( 'value' )[ 1 ];
                if ( advertising != room.features.advertising )
                {
                    toBeUpdated.features = toBeUpdated.features || room.features;
                    toBeUpdated.features.advertising = advertising;
                }

                var logs = $( '#logs-slider' ).noUiSlider( 'value' )[ 1 ];
                if ( logs != room.features.logs )
                {
                    toBeUpdated.features = toBeUpdated.features || room.features;
                    toBeUpdated.features.logs = logs;
                }
                
                // only send if toBeUpdated has at least one key
                for ( var key in toBeUpdated )
                {
                    self.app.GetMe( function( user ) {

                        function UpdateRoom() {
                            $(button).button( 'loading' );
                            $(form).spin( 'medium' );

                            jsonCall({
                                url: room.urls.self,
                                type: 'PUT',
                                data: toBeUpdated,
                                success: function( room ) {
                                    self.app.rooms[ room._id ] = room;
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
                        }
                    
                        self.GetPrices( function( prices, error ) {
                            if ( error )
                            {
                                self.app.ShowError( error );
                                return;
                            }
                            
                            if ( prices.total > 0 && !user.stripe )
                            {
                                var billing = self.app.GetSubsystem( Billing );
                                function HandleBillingUpdated() {
                                    billing.HideBillingModal();
                                    UpdateRoom();
                                    self.app.events.removeListener( 'user billing updated', HandleBillingUpdated );
                                }
                                self.app.events.addListener( 'user billing updated', HandleBillingUpdated )
                                billing.ShowBillingModal( 'We need your billing info for the changes you\'ve made to your plan.  Please enter it below.' );
                                return;
                            }
                            else
                            {
                                UpdateRoom();
                            }
                            
                        });
                    });
                    break; // we break, no matter what, because we just wanted to see if there was a key in toBeUpdated
                }
            });
        });
        
        $( document ).on( 'click', '.reset-room-button', function( event ) {
            event.preventDefault();
            var form = $(this).parents( 'form:first' );
        
            // TODO: prompt for confirmation, maybe use bootstrap-modal.js?
            
            var roomId = $(form).find( '#_id' ).val();
            self.app.GetRoom( roomId, function( room, error ) {
                if ( error )
                {
                    self.app.ShowError( error );
                    return;
                }

                $( form ).find( 'input[type=text]' ).each( function( index, input ) {
                    
                    if ( input.id == 'tags' )
                    {
                        $( input ).val( input.id in room ? room[ input.id ].join( ', ' ) : '' );
                        return;
                    }
                    
                    $( input ).val( input.id in room ? room[ input.id ] : '' );
                    $( input ).html( input.id in room ? room[ input.id ] : '' );
                });
                
                $( '#privacy-slider' ).noUiSlider( 'move', {
                    knob: 1,
                    to: room.features.privacy ? 1 : 0,
                    scale: [ 0, 1 ]
                });

                $( '#advertising-slider' ).noUiSlider( 'move', {
                    knob: 1,
                    to: room.features.advertising ? 0 : 1,
                    scale: [ 0, 1 ]
                });

                $( '#logs-slider' ).noUiSlider( 'move', {
                    knob: 1,
                    to: room.features.logs ? 1 : 0,
                    scale: [ 0, 1 ]
                });

                self.UpdatePrices();
            });
        });
    }
    
    self.GetPrices = function( callback ) {
        self.app.GetPricing( function( pricing, error ) {
            if ( error )
            {
                callback( null, error );
                return;
            }
            
            var prices = {};

            var privacy = $( '#privacy-slider' ).noUiSlider( 'value' )[ 1 ];
            prices.privacy = privacy ? pricing.privacy : 0;

            var advertising = $( '#advertising-slider' ).noUiSlider( 'value' )[ 1 ];
            prices.advertising = advertising ? pricing.advertising : 0;

            var logs = $( '#logs-slider' ).noUiSlider( 'value' )[ 1 ];
            prices.logs = logs ? pricing.logs : 0;

            prices.total = prices.advertising + prices.logs + prices.privacy;
            callback( prices );
        });
    }
    
    self.UpdatePrices = function() {
        self.GetPrices( function( prices, error ) {
            if ( error )
            {
                self.app.ShowError( error );
                return;
            }

            $( '#privacy-setting' ).spin( 'small' );
            $( '#advertising-setting' ).spin( 'small' );
            $( '#logs-setting' ).spin( 'small' );
            $( '#total-cost' ).spin( 'small' );
            
            var privacy = $( '#privacy-slider' ).noUiSlider( 'value' )[ 1 ];
            $( '#privacy-setting' ).html( privacy ? 'Private ( $' + prices.privacy + ' / Month )' : 'Public ( Free! )' );
            $( '#privacy-setting' ).spin( false );
            
            var advertising = $( '#advertising-slider' ).noUiSlider( 'value' )[ 1 ];
            $( '#advertising-setting' ).html( advertising ? 'Ads: Off ( $' + prices.advertising + ' / Month )' : 'Ads: On ( Free! )' );
            $( '#advertising-setting' ).spin( false );
            
            var logs = $( '#logs-slider' ).noUiSlider( 'value' )[ 1 ];
            $( '#logs-setting' ).html( logs ? 'Enabled ( $' + prices.logs + ' / Month )' : 'No Logs ( Free! )' );
            $( '#logs-setting' ).spin( false );

            $( '#total-cost' ).html( prices.total > 0 ? ( '$' + prices.total + ' / Month' ) : 'Free!' );
            $( '#total-cost' ).spin( false );
        });
    }
}
