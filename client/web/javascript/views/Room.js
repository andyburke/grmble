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
            });
        }
    }
    
}
