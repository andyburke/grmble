var UserlistManager = function() {
    var self = this;
    
    self.app = null;
    self.clientSubscription = null;
    self.roomSubscription = null;

    self.userlistUpdateTimeout = null;
    
    self.Bind = function( app ) {
        self.app = app;

        self.app.events.addListener( 'client created', function() {
            self.clientSubscription = self.app.client.subscribe( '/client/' + self.app.clientId, function( message ) {
                if ( message.kind == 'userlist' )
                {
                    $( '#userlist-container' ).spin( 'medium' );
                    $( '#userlist' ).html( '' );
                    for ( var index = 0; index < message.users.length; ++index )
                    {
                        dust.render( 'userlist_entry', message.users[ index ], function( error, output ) {
                            if ( error )
                            {
                                self.app.ShowError( error );
                                return;
                            }
                            
                            var newEntry = $( output );
                            $( '#userlist' ).append( newEntry );
                            if ( message.users[ index ].idle )
                            {
                                $( newEntry ).fadeTo( 'fast', 0.3 );
                            }
                        });
                    }
                    $( '#userlist-container' ).spin( false );
                    
                    if ( self.userlistUpdateTimeout )
                    {
                        clearTimeout( self.userlistUpdateTimeout );
                        self.userlistUpdateTimeout = null;
                    }
                    
                    self.userlistUpdateTimeout = setTimeout( function() {
                        self.app.SendClientMessage({
                            kind: 'userlist request'
                        });
                    }, 60000 );
                }
            });
        });
        
        self.app.events.addListener( 'joining room', function() {
            self.subscription = self.app.client.subscribe( '/room/' + self.app.room._id, function( message ) {
                switch( message.kind )
                {
                    case 'idle':
                        $( '#userlist-entry-' + message.senderId ).fadeTo( 'slow', 0.3 );
                        return;
                    case 'active':
                        $( '#userlist-entry-' + message.senderId ).fadeTo( 'fast', 1.0 );
                        return;
                    case 'startedTyping':
                        $( '#userlist-entry-typingstatus-' + message.senderId ).text('...');
                        $( '#userlist-entry-typingstatus-' + message.senderId ).addClass('typing');
                        $( '#userlist-entry-typingstatus-' + message.senderId ).removeClass('stoppedTyping');
                        return;
                    case 'stoppedTyping':
                        $( '#userlist-entry-typingstatus-' + message.senderId ).text('...');
                        $( '#userlist-entry-typingstatus-' + message.senderId ).addClass('stoppedTyping');
                        $( '#userlist-entry-typingstatus-' + message.senderId ).removeClass('typing');
                        return;
                    case 'cancelledTyping':
                        $( '#userlist-entry-typingstatus-' + message.senderId ).text('');
                        return;
                    case 'join':
                        if ( $( '#userlist-entry-' + message.senderId ).length == 0 )
                        {
                            dust.render( 'userlist_entry', message, function( error, output ) {
                                if ( error )
                                {
                                    self.app.ShowError( error );
                                    return;
                                }

                                var newEntry = $( output );
                                $( '#userlist' ).append( newEntry );
                                if ( message.idle )
                                {
                                    $( newEntry ).fadeTo( 'fast', 0.3 );
                                }
                            });
                        }
                        break;
                    case 'leave':
                        $( '#userlist-entry-' + message.senderId ).remove();
                        break;
                }
                
            });
        });

        self.app.events.addListener( 'leaving room', function() {
            if ( self.subscription )
            {
                self.subscription.cancel();
                self.subscription = null;
            }
            
            if ( self.userlistUpdateTimeout )
            {
                clearTimeout( self.userlistUpdateTimeout );
                self.userlistUpdateTimeout = null;
            }
        });
    }
}