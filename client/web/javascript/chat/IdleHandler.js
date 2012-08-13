var IdleHandler = function() {
    var self = this;
    
    self.idleTimeout = 30 * 1000;

    self.app = null;
    self.unreadMessages = 0;

    self.Bind = function( app ) {
        self.app = app;
        
        $.idleTimer( self.idleTimeout, document, {
            events: 'mousemove keydown mousewheel mousedown touchstart touchmove' // DOMMouseScroll, nope, scroll to bottom emits this
        });
    
        $( document ).bind( 'idle.idleTimer', function() {
            if ( self.app.socket && self.app.room && self.app.user )
            {
                self.app.socket.emit( 'message', {
                    kind: 'idle',
                    roomId: self.app.room._id,
                    senderId: self.app.user._id,
                    nickname: self.app.user.nickname,
                    userHash: self.app.user.hash,
                    avatar: self.app.user.avatar,
                    content: null
                });
            }
        });
        
        $( document ).bind( 'active.idleTimer', function() {
            if ( self.app.socket && self.app.room && self.app.user )
            {
                self.unreadMessages = 0;
                document.title = self.app.room.name + ' on Grmble';
                
                self.app.socket.emit( 'message', {
                    kind: 'active',
                    roomId: self.app.room._id,
                    nickname: self.app.user.nickname,
                    userHash: self.app.user.hash,
                    avatar: self.app.user.avatar,
                    content: null
                });
            }
        });
    }
    
    self.Start = function() {
        self.app.socket.on( 'message', function( message ) {
                
            if ( message.kind != 'say' )
            {
                return;
            }
            
            if ( $.data( document, 'idleTimer' ) == 'idle' )
            {
                $( '#message-sound' )[ 0 ].play();
                
                ++self.unreadMessages;
                document.title = '(' + self.unreadMessages + ') ' + self.app.room.name + ' on Grmble';
            }
        });
    }
}