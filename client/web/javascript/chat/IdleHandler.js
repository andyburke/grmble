var IdleHandler = function() {
    var self = this;
    
    self.idleTimeout = 1 * 1000;

    self.app = null;
    self.unreadMessages = 0;
    self.subscription = null;
    self.idle = false;
    
    self.normalIcon = null;
    self.icons = {};
    self.canvas = null;
    self.context = null;
    
    self.Bind = function( app ) {
        self.app = app;

        self.app.events.addListener( 'API loaded', function( api ) {
            var favIcon = document.getElementById( 'favicon' );
            if ( favIcon )
            {
                self.normalIcon = favIcon.getAttribute( 'href' );
            }
            
            if ( api.icons )
            {
                function CreateCanvas() {
                    self.canvas = document.createElement( 'canvas' );
                    if ( !self.canvas.getContext )
                    {
                        self.canvas = null;
                        return;
                    }

                    self.canvas.height = self.canvas.width = 16; // set the size
                    self.context = self.canvas.getContext( '2d' );
                    self.context.font = 'bold 10px sans-serif';
                }
                
                var activeImg = document.createElement( 'img' );
                activeImg.onload = function() {
                    self.icons[ 'active' ] = this;
                    if ( self.icons[ 'active' ] && self.icons[ 'inactive' ] )
                    {
                        CreateCanvas();
                    }
                }
                activeImg.src = api.icons.active;

                var inactiveImg = document.createElement( 'img' );
                inactiveImg.onload = function() {
                    self.icons[ 'inactive' ] = this;
                    if ( self.icons[ 'active' ] && self.icons[ 'inactive' ] )
                    {
                        CreateCanvas();
                    }
                }
                inactiveImg.src = api.icons.inactive;
            }
        });
        
        self.app.events.addListener( 'joined room', self.Watch );

        $.idleTimer( self.idleTimeout, document, {
            events: 'mousemove keydown mousewheel mousedown touchstart touchmove' // DOMMouseScroll, nope, scroll to bottom emits this
        });
    
        $( document ).bind( 'idle.idleTimer', function() {
            if ( self.app.client && self.app.room && self.app.user )
            {
                self.idle = true;

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

                var favIcon = document.getElementById( 'favicon' );
                if ( favIcon )
                {
                    self.DrawFavicon( favIcon, 'inactive', self.unreadMessages );
                }

                self.idle = false;

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
             
                if ( !self.activityIndicatorTimeout )
                {
                    self.IndicateActivity();
                }
            }
        });
    }
    
    self.IndicateActivity = function() {
        var favIcon = document.getElementById( 'favicon' );
        if ( self.canvas && favIcon )
        {
            if ( $.data( document, 'idleTimer' ) == 'idle' )
            {
                var state = favIcon.getAttribute( 'data-icon' ) == 'active' ? 'inactive' : 'active';
                favIcon.setAttribute( 'data-icon', state );
                self.DrawFavicon( favIcon, state, self.unreadMessages );

                self.activityIndicatorTimeout = setTimeout( self.IndicateActivity, 1000 );
            }
            else
            {
                self.activityIndicatorTimeout = null;
            }
        }
    }
    
    self.DrawFavicon = function( favIcon, state, unread ) {
        self.context.clearRect( 0, 0, 16, 16 );
        self.context.drawImage( self.icons[ state ], 0, 0, 16, 16 );
        if ( unread )
        {
            //self.context.fillText( unread, 2, 9 );
            self.context.fillStyle = '#000000';
            self.context.fillText( '22', 3, 10 );
            
            self.context.fillStyle = '#FFFFFF';
            self.context.fillText( '22', 2, 9 );
        }
        favIcon.setAttribute( 'href', self.canvas.toDataURL( 'image/png' ) );
    }
}