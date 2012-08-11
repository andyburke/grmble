var App = function( apiURL ) {
    var self = this;
    
    self.apiURL = apiURL;

    self.socket = null;

    self.user = null;
    
    self.room = null;
    self.rooms = {};
    
    self.events = new EventEmitter();
    
    self.Start = function() {

        self.events.addListener( 'navigated', function( view ) {
            $('.navItem').removeClass( 'active' );
            var activeItem = $( '#nav-' + view );
            $(activeItem).addClass( 'active' );
            $(activeItem).parents( '.dropdown' ).addClass( 'active' );
        });
    
        self.events.addListener( 'logged in', function( user ) {
            $('.authenticated').show();
            $('.unauthenticated').hide();
            mixpanel.track( "Logged In", {
                userId: user._id
            })
            mixpanel.identify( user._id );
            mixpanel.name_tag( user.email );
        });

        self.events.addListener( 'logged out', function( user ) {
            $('.authenticated').hide();
            $('.unauthenticated').show();
            window.location.hash = '/';
            mixpanel.track( "Logged Out", {
                userId: user._id
            });
        });
    
        self.events.addListener( 'API loaded', function( api ) {
            self.GetMe( function( user ) {
                if ( user )
                {
                    self.events.emit( 'logged in', user );
                }
                else
                {
                    self.events.emit( 'logged out', null );
                }
            });
        });

        self.GetAPI( function() {} );

        self.userManager = new UserManager( self );
        
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
        
        self.connectionStatus = new ConnectionStatus( self.socket, '#server-connection-status' );
    }
    
    self.ShowError = function( error ) {
        // TODO: improve this
        alert( error );
    }
    
    self.api = null;
    self.GetAPI = function( callback ) {
        if ( self.api )
        {
            callback( self.api );
            return;
        }
        
        jsonCall({
            url: self.apiURL,
            type: 'GET',
            success: function( apiInfo ) {
                self.api = apiInfo.urls;
                callback( self.api );
                self.events.emit( 'API loaded', self.api );
            },
            error: function( xhr ) {
                // TODO: better way to handle this?
                self.ShowError( xhr.responseText );
                mixpanel.track( 'Error', {
                    action: 'Loading API',
                    error: xhr.responseText
                });
            }
        });
    }
    
    self.GetMe = function( callback ) {
        if ( self.user )
        {
            callback( self.user );
            return;
        }
        
        if ( !self.api )
        {
            setTimeout( function() {
                self.GetMe( callback );
            }, 500 );
            return;
        }

        jsonCall({
            url: self.api.me,
            type: 'GET',
            success: function( user ) {
                self.user = user;
                //self.nicknameRegex = new RegExp( user.nickname + '[\W\s$]', "ig" );
                callback( self.user );
                self.events.emit( 'got me', self.user );
            },
            error: function( xhr ) {
                callback( null );
            }
        });        
    }
    
    self.GetRoom = function( roomId, callback ) {
        if ( self.rooms[ roomId ] )
        {
            callback( self.rooms[ roomId ] );
            return;
        }
        
        self.GetAPI( function( api ) {
            jsonCall({
                url: api.room + '/' + roomId,
                type: 'GET',
                success: function( room ) {
                    self.rooms[ room._id ] = room;
                    callback( room );
                },
                error: function( xhr ) {
                    callback( null, xhr.responseText );
                }
            });
        });
    }
}
