var IdleHandler = function() {
    var self = this;
    
    self.idleTimeout = 120 * 1000;

    self.app = null;
    self.unreadMessages = 0;
    self.subscription = null;

    self.Bind = function( app ) {
        self.app = app;
        
        $.idleTimer( self.idleTimeout, document, {
            events: 'mousemove keydown mousewheel mousedown touchstart touchmove' // DOMMouseScroll, nope, scroll to bottom emits this
        });
    
        $( document ).bind( 'idle.idleTimer', function() {
            if ( self.app.client && self.app.room && self.app.user )
            {
                self.app.SendMessage({
                    kind: 'idle'
                });
            }
        });
        
        $( document ).bind( 'active.idleTimer', function() {
            if ( self.app.client && self.app.room && self.app.user )
            {
                self.unreadMessages = 0;
                document.title = self.app.room.name + ' on Grmble';

                self.app.SendMessage({
                    kind: 'active'
                });
            }
        });
    }
    
    self.Watch = function() {
        if ( !self.app.room )
        {
            return;
        }
        
        self.unreadMessages = 0;
        
        if ( self.subscription )
        {
            self.subscription.cancel();
            self.subscription = null;
        }
        
        self.subscription = self.app.client.subscribe( '/room/' + self.app.room._id, function( message ) {
            
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