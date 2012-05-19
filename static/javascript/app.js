var App = function() {
    var self = this;
    
    self.socket = null;

    self.user = null;
    self.nicknameRegex = null;
    
    self.rooms = {};
    
    self.Start = function() {

        // TODO: get the api first

        self.GetUser( function( user ) {
            if ( user )
            {
                $('.authenticated').show();
                $('.unauthenticated').hide();
            }
            else
            {
                $('.authenticated').hide();
                $('.unauthenticated').show();
            }
        });

        self.socket = io.connect( window.location.origin, {
            'connect timeout': 1000, // this timeout might be a bit low... we'll see
            'sync disconnect on unload': false, // we will handle disconnect ourselves
            'reconnect': true,
            'reconnection limit': 10000,
            'max reconnection attempts': 30
        });

        self.socket.on( 'reconnect_failed', function() {
            alert( 'Could not reconnect to the server.  Try reloading the page.' ); 
        });

        self.socket.on( 'message', function( message ) {
            
            switch( message.kind )
            {
                case 'idle':
                    $( '#userlist-entry-' + message.clientId ).fadeTo( 'slow', 0.3 );
                    return;
                case 'active':
                    $( '#userlist-entry-' + message.clientId ).fadeTo( 'fast', 1.0 );
                    return;
                case 'startedTyping':
                    $( '#userlist-entry-typingstatus-' + message.clientId ).text('...');
                    $( '#userlist-entry-typingstatus-' + message.clientId ).addClass('typing');
                    $( '#userlist-entry-typingstatus-' + message.clientId ).removeClass('stoppedTyping');
                    return;
                case 'stoppedTyping':
                    $( '#userlist-entry-typingstatus-' + message.clientId ).text('...');
                    $( '#userlist-entry-typingstatus-' + message.clientId ).addClass('stoppedTyping');
                    $( '#userlist-entry-typingstatus-' + message.clientId ).removeClass('typing');
                    
                    return;
                case 'cancelledTyping':
                    $( '#userlist-entry-typingstatus-' + message.clientId ).text('');
                    return;
            }

            // avoid duplicates
            if ( $( '#' + message._id ).length == 0 ) {
            
                // TODO: move this to a handler
                message.processed = message.content == null ? null : linkify( message.content,  {
                    callback: function(text, href) {
                        return processTextHref(text, href);
                    }
                });

                var newMessage = ich.message( message );
                
                if ( message.content.match( myNicknameRegex ) )
                {
                    $( newMessage ).addClass( 'message-references-me' );
                }
                
                $( newMessage ).appendTo( '#chatlog' );
                
                ScrollToBottom();

                $( '#submit-message' ).button( 'reset' );
                
                var now = new Date();
                if ( now.getTime() - g_ReceivedUserlistAt.getTime() > 5000 )
                {
                    switch( message.kind )
                    {
                        case 'join':
                            if ( $( 'userlist-entry-' + message.clientid ).length == 0 )
                            {
                                $( '#userlist' ).append( ich.userlist_entry( message ) );
                            }
                            break;
                        
                        case 'leave':
                            $( '#userlist-entry-' + message.clientId ).remove();
                            break;
                    }
                }
                
                if ( $.data( document, 'idleTimer' ) == 'idle' )
                {
                    $( '#message-sound' )[ 0 ].play();
                    
                    ++g_UnreadMessages;
                    document.title = '(' + g_UnreadMessages + ') ' + room.name + ' on Grmble';
                }
            }
        });
        
        var connectionStatusView = new ConnectionStatusView({
            model: new ConnectionStatus({
                socket: self.socket 
            })
        });
        
        var roomRouter = new RoomRouter();
        
        if ( Backbone.history )
        {
            Backbone.history.start();
        }
    }
    
    self.GetUser = function( callback ) {
        if ( self.user )
        {
            callback( self.user );
            return;
        }
        
        JSONRequest({
            url: '/api/1.0/User',
            type: 'GET',
            success: function( user ) {
                self.user = user;
                self.nicknameRegex = new RegExp( user.nickname + '[\W\s$]', "ig" );
                callback( self.user );
            },
            error: function( xhr ) {
                callback( null );
            }
        });        
    }
}

var theApp = new App();
