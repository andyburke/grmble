var App = function( apiURL, router ) {
    var self = this;
    
    self.apiURL = apiURL;
    self.router = router;

    self.client = null;

    self.user = null;
    self.users = {};
    
    self.room = null;
    self.rooms = {};
    
    self.events = new EventEmitter();
    
    self.clientId = Math.uuid();

    self.subsystems = [
        new UserManager(),
        new Billing(),
	new ConnectionStatus(),
	
        // views
        
        new Home(),
        new Room(),
        new Rooms(),
        new MyRooms(),
        new CreateRoom(),
        new ManageRoom(),
        new SignUp(),
        new Settings(),
        new User(),
	new PasswordManagement(),
        
        // chat
        
        new IdleHandler(),
        new MessageRenderer(),
        new UserlistManager(),
        new MessageHistory(),
        new NameHighlighter(),
        new ScrollHandler(),
        new TypingStatus(),
        new TabCompletion()
    ];

    self.GetSubsystem = function( subsystemType ) {
        for ( var index = 0; index < self.subsystems.length; ++index )
        {
            if ( self.subsystems[ index ] instanceof subsystemType )
            {
                return self.subsystems[ index ];
            }
        }
        
        return null;
    }
    
    self.Bind = function() {
        for ( var index = 0; index < self.subsystems.length; ++index )
        {
            if ( typeof( self.subsystems[ index ].Bind ) == 'function' )
            {
                self.subsystems[ index ].Bind( self, self.router );
            }
        }
    }
    
    self.Start = function() {

	// TODO: should we be using pageshow/pagehide?
	window.onbeforeunload = function() {
	    if ( self.room )
	    {
		self.events.emit( 'leaving room', self.room );
                
                self.SendMessage({
                    kind: 'leave' 
                }, function( error, message ) {
                    if ( error )
                    {
			// do nothing, they're closing
                    }
                    else
                    {
                        self.events.emit( 'left room', message.roomId );
                    }
                    self.room = null;
                });
	    }
	}
	
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
                    $('.authenticated').hide();
                    $('.unauthenticated').show();
                }
            });
        });

        self.GetAPI( function( api ) {
	    var js = document.createElement( 'script' );
	    js.src = api.faye + '/client.js';
	    js.onload = function() {
		self.client = new Faye.Client( api.faye, {
		    timeout: 60,
		    retry: 10
		});
		self.events.emit( 'client created', self.client );
		
		self.client.subscribe( '/client/' + self.clientId, function( message ) {
		    if ( message.kind == 'error' )
		    {
			self.ShowError( message );
		    }
		});
	    };
	    document.getElementsByTagName( 'head' )[ 0 ].appendChild( js );
	});

        self.userManager = new UserManager( self );
        
        for ( var index = 0; index < self.subsystems.length; ++index )
        {
            if ( typeof( self.subsystems[ index ].Start ) == 'function' )
            {
                self.subsystems[ index ].Start();
            }
        }
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

    self.GetUser = function( userId, callback ) {
        if ( self.users[ userId ] )
        {
            callback( self.users[ userId ] );
            return;
        }
        
        self.GetAPI( function( api ) {
            jsonCall({
                url: api.user + '/' + userId,
                type: 'GET',
                success: function( user ) {
                    self.users[ user._id ] = user;
                    callback( user );
                },
                error: function( xhr ) {
                    callback( null, xhr.responseText );
                }
            });
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
    
    self.GetPricing = function( callback ) {
        self.GetAPI( function( api ) {
            jsonCall({
                url: api.pricing,
                type: 'GET',
                success: function( pricing ) {
                    callback( pricing );
                },
                error: function( xhr ) {
                    callback( null, xhr );
                }
            });
        });
    }
    
    self.SendMessage = function( message, callback ) {
	callback = callback || function() {};

	if ( !self.room )
	{
	    callback( { 'error': 'no room', 'message': 'You are not currently in a room.' }, message );
	    return;
	}

	var newMessage = $.extend({
	    _id: new ObjectId().toString(),
	    clientId: self.clientId,
	    createdAt: new Date(),
	    roomId: self.room._id,
	    senderId: self.user._id,
	    nickname: self.user.nickname,
	    userHash: self.user.hash,
	    avatar: self.user.avatar,
	    content: null
	}, message );
	
	var publication = self.client.publish( '/room/' + self.room._id, newMessage );
	publication.callback( function() {
	    callback( null, newMessage ); 
	});
	publication.errback( function( error ) {
	    callback( error, newMessage ); 
	});
    }
}
