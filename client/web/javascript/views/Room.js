var Room = function() {
    var self = this;
    
    self.app = null;
    self.router = null;
    
    self.Bind = function( app, router ) {
        self.app = app;
        self.router = router;
        
        self.router.on( '/Room/:roomId', function( roomId ) {
            mixpanel.track( "View: Room", {
                roomId: roomId
            });
            self.app.events.emit( 'navigated', 'room' );

            self.app.GetMe( function( user ) {
                if ( !user )
                {
                    $( '#signup-modal' ).modal( { 'backdrop': 'static' } );
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
                    document.title = room.name + ' on Grmble';

                    self.app.socket.emit( 'message', {
                        kind: 'join',
                        roomId: room._id,
                        senderId: user._id,
                        nickname: user.nickname,
                        userHash: user.hash,
                        avatar: user.avatar,
                        content: null
                    });
                    self.app.events.emit( 'joined room', room );

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
                
                var oldestMessageDate = $( '#chatlog' ).find( '.message:first' ).attr( 'time' );
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
    }
    
    self.SendMessage = function() {
        if ( $.trim( $( '#message-entry-content' ).val() ).length > 0 )
        {
            self.app.GetMe( function( user ) {
                var message = {
                    kind: 'say',
                    roomId: self.app.room._id,
                    senderId: user._id,
                    nickname: user.nickname,
                    userHash: user.hash,
                    avatar: user.avatar,
                    content: $( '#message-entry-content' ).val()
                };
    
                self.app.socket.emit( 'message', message );
                self.app.events.emit( 'message sent', message );
                $( '#submit-message' ).button( 'loading' );
                $( '#message-entry-content' ).val( '' );
                mixpanel.track( "Message: Sent", {
                    roomId: self.app.room._id
                });
            });
        }
    }
    
}
