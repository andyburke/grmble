var Room = function() {
    var self = this;
    
    self.app = null;
    self.router = null;
    
    self.heartbeatTimeout = null;

    self.consistencyCheckTimeout = null;
    self.lastConsistencyCheck = null;
    self.consistencyCheckThreshold = 45000;
    self.consistencyCheckFrequency = 30000;
    
    self.debugSubscription = null;

    self.Bind = function( app, router ) {
        self.app = app;
        self.router = router;
        
        self.router.on( 'after', '/Room/:roomId', function( roomId ) {
            if ( self.app.room )
            {
                self.app.events.emit( 'leaving room', self.app.room );

                if ( self.heartbeatTimeout )
                {
                    clearTimeout( self.heartbeatTimeout );
                    self.heartbeatTimeout = null;
                }
                
                if ( self.consistencyCheckTimeout )
                {
                    clearTimeout( self.consistencyCheckTimeout );
                    self.consistencyCheckTimeout = null;
                    self.lastConsistencyCheck = null;
                }
                
                self.app.SendMessage({
                    kind: 'leave' 
                }, function( error, message ) {

                    if ( self.debugSubscription )
                    {
                        self.debugSubscription.cancel();
                        self.debugSubsription = null;
                    }
                    
                    self.app.room = null;

                    if ( error )
                    {
                        self.app.ShowError( error );
                        return;
                    }

                    self.app.events.emit( 'left room', message.roomId );
                });

            }
        });
        
        self.router.on( '/Room/:roomId', function( roomId ) {
            mixpanel.track( "View: Room", {
                roomId: roomId
            });
            self.app.events.emit( 'navigated', 'room' );

            self.app.GetMe( function( user ) {
                if ( !user )
                {
                    $( '#signup-modal' ).modal( { 'backdrop': 'static' } );
                    mixpanel.track( "View: SignUp Modal" );
                    return;
                }
                
                $( '#main' ).spin( 'large' );
                self.app.GetRoom( roomId, function( room, error ) {
                    if ( error )
                    {
                        self.app.ShowError( error );
                        return;
                    }
                    
                    self.app.room = room;

                    if ( self.app.debug )
                    {
                        self.debugSubscription = self.app.client.subscribe( '/room/' + self.app.room._id, function( message ) {
                            console.log( message );
                        });
                    }

                    document.title = room.name + ' on Grmble';

                    self.app.events.emit( 'joining room', self.app.room );

                    self.SendHeartbeat();
                    self.app.SendMessage({
                        kind: 'join'
                    }, function( error, message ) {
                        
                        if ( error )
                        {
                            self.app.ShowError( error );
                            return;
                        }
                        
                        self.app.SendClientMessage({
                            kind: 'userlist request'
                        });

                        self.app.SendClientMessage({
                            kind: 'recent messages request'
                        });

                        self.CheckConsistency();
    
                        self.app.events.emit( 'joined room', self.app.room );
                    });

                    dust.render( 'room', { room: room }, function( error, output ) {
                        if ( error )
                        {
                            self.app.ShowError( error );
                            return;
                        }
                        
                        $( '#main' ).html( output );
                        
                        if ( self.app.room.features.logs )
                        {
                            $( '#load-more-button' ).show();
                        }
                        else
                        {
                            $( '#load-more-button' ).hide();
                        }
                        
                        $( '#main' ).spin( false );
                    });
                });
            });
        });
        
        $( document ).on( 'click', '#submit-message', function( event ) {
            event.preventDefault();
            event.stopPropagation();
            self.SendMessage();
        });
        
        $( document ).on( 'submit', '#message-entry-form', function( event ) {
            event.preventDefault();
            event.stopPropagation();
            self.SendMessage();
        });
        
        $( document ).on( 'keydown', '#message-entry-content', function( event ) {
            if ( event.which == 13 && !( event.shiftKey || event.ctrlKey || event.altKey ) )
            {
                event.preventDefault();
                event.stopPropagation();
                self.SendMessage();
            }
        });

        $( document ).on( 'click', '#load-more-button', function( event ) {
            event.preventDefault();
            event.stopPropagation();
            
            if ( self.app.room && self.app.room.features.logs )
            {
                $( '#load-more-button' ).button( 'loading' );
                
                var oldestMessageDate = $( '#chatlog' ).find( '.message:first' ).data( 'time' );
                jsonCall({
                    url: self.app.room.urls.messages,
                    type: 'GET',
                    data: {
                        sort: 'desc',
                        before: oldestMessageDate,
                        kinds: 'say'
                    },
                    success: function( messages ) {
                        
                        var messageRenderer = self.app.GetSubsystem( MessageRenderer );
                        if ( messageRenderer )
                        {
                            for ( var index = 0; index < messages.length; ++index )
                            {
                                messageRenderer.RenderMessage( messages[ index ], false );
                            }
                        }

                        $( '#load-more-button' ).button( 'reset' );
                    },
                    error: function( xhr ) {
                        $( '#load-more-button' ).button( 'reset' );
                    }
                });
            }
        });
        
        $( document ).on( 'click', '.invite-to-room-button', function( event ) {
            event.preventDefault();
            
            if ( self.app.room )
            {
                mixpanel.track( "Invite: Shown", {
                    roomId: self.app.room._id
                });

                $( '#invite-modal' ).modal( { 'backdrop': 'static' } );
            }
        });


        $( document ).on( 'click', '.invite-button', function( event ) {
            event.preventDefault();
            
            if ( !self.app.room )
            {
                self.app.ShowError( 'You must be in a room to send an invite.' );
                $( '#invite-modal' ).modal( 'hide' );
                return;
            }
        
            mixpanel.track( "Invite: Sending", {
                roomId: self.app.room._id
            });

            var button = this;
            var form = $(this).parents( 'form:first' );

            var email = $( form ).find( 'input[name=email]' ).val();
            var message = $( form ).find( 'textarea[name=message]' ).val();
            
            if ( !email.length )
            {
                self.app.ShowError( 'You must enter an email address!' );
                mixpanel.track( "Invite: Error", {
                    error: 'No email entered.'
                });
                return;
            }

            $(button).button( 'loading' );
            $(form).spin( 'medium' );
            
            jsonCall({
                url: self.app.room.urls.invite,
                type: 'POST',
                data: {
                    email: email,
                    message: message,
                    roomId: self.app.room._id
                },
                success: function() {
                    $( form ).spin( false );
                    $( button ).button( 'complete' );
                    setTimeout( function() {
                        $( form ).find( 'input[name=email]' ).val( '' );
                        $( form ).find( 'textarea[name=message]' ).val( '' );
                        $( button ).button( 'reset' );
                        $( '#invite-modal' ).modal( 'hide' );
                    }, 1000 );

                    mixpanel.track( "Invite: Sent", {
                        roomId: self.app.room._id
                    });
                },
                error: function( xhr ) {
                    $(form).spin( false );
                    self.app.ShowError( xhr.responseText );
                    $(button).button( 'reset' );

                    mixpanel.track( "Invite: Error", {
                        error: xhr.responseText
                    });
                }
            });
        });

    }
    
    self.SendMessage = function() {
        mixpanel.track( "Message: Sending", {
            roomId: self.app.room._id
        });

        if ( $.trim( $( '#message-entry-content' ).val() ).length > 0 )
        {
            self.app.GetMe( function( user ) {
    
                $( '#message-entry-content' ).attr( 'readonly','readonly' );
                $( '#submit-message' ).button( 'loading' );

                self.app.SendMessage({
                    kind: 'say',
                    content: $( '#message-entry-content' ).val()
                }, function( error, message ) {
                    if ( error )
                    {
                        self.app.ShowError( error );
                        $( '#submit-message' ).button( 'reset' );
                        $( '#message-entry-content' ).removeAttr( 'readonly' );
                        mixpanel.track( "Message: Error", {
                            error: error
                        });
                        return;
                    }

                    $( '#submit-message' ).button( 'reset' );
                    $( '#message-entry-content' ).val( '' );
                    $( '#message-entry-content' ).removeAttr( 'readonly' );
                    self.app.events.emit( 'message sent', message );
                    mixpanel.track( "Message: Sent", {
                        roomId: self.app.room._id
                    });
                });
            });
        }
    }
    
    self.SendHeartbeat = function() {
        var idle = false;
        if ( typeof( IdleHandler ) != 'undefined' )
        {
            var idleHandler = self.app.GetSubsystem( IdleHandler );
            idle = idleHandler && idleHandler.idle;
        }

        self.app.SendClientMessage({
            kind: 'heartbeat',
            idle: idle
        }, function( error, heartbeat ) {
            if ( error )
            {
                self.app.ShowError( error );
                return;
            }
            
            self.heartbeatTimeout = setTimeout( self.SendHeartbeat, 30000 );
        });
    }
    
    self.CheckConsistency = function() {
        if ( self.lastConsistencyCheck )
        {
            if ( new Date() - self.lastConsistencyCheck > self.consistencyCheckThreshold )
            {
                self.app.SendMessage({
                    kind: 'join'    
                }, function( error, message ) {

                    self.lastConsistencyCheck = new Date();
                    self.consistencyCheckTimeout = setTimeout( self.CheckConsistency, self.consistencyCheckFrequency );

                    if ( error )
                    {
                        self.app.ShowError( error );
                        return;
                    }
                    
                    self.app.SendClientMessage({
                        kind: 'userlist request'
                    });
                    
                    self.app.SendClientMessage({
                        kind: 'recent messages request' 
                    });
                });
            }
        }
        
        self.lastConsistencyCheck = new Date();
        self.consistencyCheckTimeout = setTimeout( self.CheckConsistency, self.consistencyCheckFrequency );
    }
}
