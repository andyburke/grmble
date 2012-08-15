function GetTotal() {
    var total = 0;
    var logs = $( '#logs-slider' ).noUiSlider( 'value' )[ 1 ];
    var users = Math.round( $( '#users-slider' ).noUiSlider( 'value' )[ 1 ] / 10 ) * 10;
    users = users > 100 ? -1 : users;
    total += logs ? 1 : 0;
    total += users > 0 ? ( ( users - 10 ) / 10 ) : 25;
    return total;
}

function UpdateTotal() {
    var total = GetTotal();
    total = total > 0 ? ( '$' + total + ' / Month' ) : 'Free!';
    $( '#total-cost' ).html( total );
}

function UpdateLogs() {
    var logs = $( '#logs-slider' ).noUiSlider( 'value' )[ 1 ];
    if ( logs )
    {
        $( '#logs-setting' ).html( 'Enabled ( $1/month )' );
    }
    else
    {
        $( '#logs-setting' ).html( 'No Logs ( Free! )' );
    }
    UpdateTotal();
}

function UpdateUserCount() {
    var users = Math.round( $( '#users-slider' ).noUiSlider( 'value' )[ 1 ] / 10 ) * 10;
    if ( users > 100 )
    {
        $( '#users-setting' ).html( 'Unlimited! ( $25/month )' );
    }
    else
    {
        if ( users < 10 )
        {
            users = 10;
            $( '#users-slider' ).noUiSlider( 'move', {
                knob: 1,
                to: 10,
                scale: [ 0, 110 ]
            });
        }
        var cost = ( users - 10 ) / 10;
        cost = ( cost > 0 ) ? ( cost + '$/month' ) : 'Free!';
        $( '#users-setting' ).html( users + ' ( ' + cost + ' ) ' );
    }

    UpdateTotal();
}


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

                    $( '#logs-slider' ).noUiSlider( 'init', {
                        knobs: 1,
                        connect: "lower",
                        scale: [ 0, 1 ],
                        start: [ room.features.logs ? 1 : 0 ],
                        step: 1,
                        change: UpdateLogs,
                        end: UpdateLogs
                    });

                    $( '#users-slider' ).noUiSlider( 'init', {
                        knobs: 1,
                        connect: "lower",
                        scale: [ 0, 110 ],
                        start: [ room.features.users ],
                        step: 10,
                        change: UpdateUserCount,
                        end: UpdateUserCount
                    });

                    UpdateLogs();
                    UpdateUserCount();
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
                
                var isPublic = $(form).find( "#protection" ).val() == 'Public';
                if ( isPublic != room.isPublic )
                {
                    toBeUpdated.isPublic = isPublic;
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
                    
                        var total = GetTotal();
                        if ( total > 0 && !user.stripe )
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
                
                $( '#users-slider' ).noUiSlider( 'move', {
                    knob: 1,
                    to: room.features.users,
                    scale: [ 0, 110 ]
                });
                UpdateUserCount();

                $( '#logs-slider' ).noUiSlider( 'move', {
                    knob: 1,
                    to: room.features.logs ? 1 : 0,
                    scale: [ 0, 1 ]
                });
                UpdateLogs();
            });
        });
    }
}
