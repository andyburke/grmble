var UserlistManager = function() {
    var self = this;
    
    self.app = null;
    self.clientSubscription = null;
    self.roomSubscription = null;

    self.lastUserShown = null;
    
    self.Bind = function( app ) {
        self.app = app;

        self.app.events.addListener( 'client created', function() {
            self.clientSubscription = self.app.client.subscribe( '/client/' + self.app.clientId, function( message ) {
                if ( message.kind == 'userlist' )
                {
                    $( '#userlist-container' ).spin( 'medium' );
                    $( '#userlist' ).html( '' );
                    var index = 0;
                    function InsertNextUser() {
                        self.InsertUserlistEntry( message.users[ index ], function( error, newEntry ) {
                            ++index;
                            
                            if ( error )
                            {
                                self.app.ShowError( error );
                            }
                            
                            if ( index == message.users.length )
                            {
                                $( '#userlist-container' ).spin( false );
                            }
                            else
                            {
                                InsertNextUser();
                            }
                        });
                    }
                    InsertNextUser();
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
                        self.InsertUserlistEntry( message );
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
        });

        $( document ).on( 'click', '#close-userinfo-area', function( event ) {
            event.preventDefault();
            $( '#userinfo' ).css( 'height', '0px' );
            $( '#userlist' ).css( 'bottom', '0px' );
        });

        $( document ).on( 'click', '.userlist-entry', function( event ) {
            event.preventDefault();
            event.stopPropagation();
            var userlistElement = this;

            var userId = $( userlistElement ).data( 'userid' );
            
            if ( self.lastUserShown == userId && $( '#userinfo' ).css( 'height' ) != '0px' )
            {
                $( '#userinfo' ).css( 'height', '0px' );
                $( '#userlist' ).css( 'bottom', '0px' );
                return;
            }
            
            
            $( '#userinfo' ).css( 'height', '200px' );
            $( '#userlist' ).css( 'bottom', '200px' );
            
            if ( self.lastUserShown != userId )
            {
                self.lastUserShown = userId;
                $( '#userinfoarea' ).spin( 'medium' );
                self.app.GetAPI( function( api ) {
                    jsonCall({
                        url: api.user + '/' + userId,
                        type: 'GET',
                        success: function( user ) {
                            dust.render( 'short_profile', user, function( error, output ) {
                                if ( error )
                                {
                                    self.app.ShowError( error );
                                    return;
                                }
                                
                                $( '#userinfoarea' ).html( output );
                                $( '#userinfoarea' ).spin( false );
                            });
                        },
                        error: function( xhr ) {
                            self.app.ShowError( xhr.responseText );
                        }
                    });
                });
            }
        });
        
        self.InsertUserlistEntry = function( message, callback ) {
            callback = callback || function() {};
            if ( $( '#userlist-entry-' + message.senderId ).length > 0 )
            {
                callback( null, $( '#userlist-entry-' + message.senderId ) );
                return;
            }

            dust.render( 'userlist_entry', message, function( error, output ) {
                if ( error )
                {
                    callback( error, null );
                    return;
                }
                
                var elements = $( '#userlist' ).find( '.userlist-entry' );
                var inserted = false;
                var newEntry = $( output );
                
                for ( var index = 0; index < elements.length; ++index )
                {
                    var nickname = $( elements[ index ] ).data( 'nickname' ).toLowerCase();
                    if ( nickname > message.nickname.toLowerCase() )
                    {
                        $( elements[ index ] ).before( newEntry );
                        inserted = true;
                        break;
                    }
                }
                
                if ( !inserted )
                {
                    $( '#userlist' ).append( newEntry );
                }
                
                if ( message.idle )
                {
                    $( newEntry ).fadeTo( 'fast', 0.3 );
                }
                
                callback( null, newEntry );
            });
        }
    }
}