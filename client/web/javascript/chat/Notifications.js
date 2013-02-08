var Notifications = function() {
    var self = this;
    
    self.app = null;
    self.subscription = null;
    self.idle = false;
    
    self.icon = '/images/icons/chat.png';
    
    self.notificationFrequency = 1000 * 20;
    self.lastNotification = new Date();
    
    self.messagesFrom = {};
    
    self.Bind = function( app ) {
        self.app = app;

        self.app.events.addListener( 'idle', function() {
            self.idle = true; 
        });
        
        self.app.events.addListener( 'active', function() {
            self.idle = false;
            self.messagesFrom = {};
        });

        self.app.events.addListener( 'joined room', function() {
            if ( !self.app.room || !window.webkitNotifications )
            {
                return;
            }
            
            if ( window.webkitNotifications.checkPermission() > 0 )
            {
                $( '#notificationsPermission' ).show();
            }
    
            if ( self.subscription )
            {
                self.subscription.cancel();
                self.subscription = null;
            }
            
            self.subscription = self.app.client.subscribe( '/room/' + self.app.room._id, function( message ) {
                
                if ( message.kind != 'say' || !self.idle )
                {
                    return;
                }
                
                self.messagesFrom[ message.nickname ] = true;
                
                if ( window.webkitNotifications.checkPermission() == 0 )
                {
                    if ( new Date() - self.lastNotification > self.notificationFrequency )
                    {
                        var popup = window.webkitNotifications.createNotification(
                            self.icon,
                            self.app.room.name,
                            'New messages from ' + Object.keys( self.messagesFrom ).join( ', ' )    
                        );
                 
                        //Show the popup
                        popup.show();
                 
                        //set timeout to hide it
                        setTimeout( function(){
                            popup.cancel();
                        }, '4000');
                        
                        self.lastNotification = new Date();
                    }
                }
            });
        });
        
        $( 'body' ).on( 'click', '.enableNotificationsButton', function( event ) {
            event.preventDefault();
            event.stopPropagation();
            
            window.webkitNotifications.requestPermission( function() {
                $( '#notificationsPermission' ).hide();
            });
        });
    }
}