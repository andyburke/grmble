var apiServer = '';

function QueryParameters()
{
    var result = {};

    if (window.location.search)
    {
        // split up the query string and store in an associative array
        var params = window.location.search.slice(1).split("&");
        for (var i = 0; i < params.length; i++)
        {
            var tmp = params[i].split("=");
            result[tmp[0]] = unescape(tmp[1]);
        }
    }

    return result;
}

function SetActivePage( page )
{
    $('.navItem').removeClass( 'active' );
    var activeItem = $('#nav-' + page );
    $(activeItem).addClass( 'active' );
    $(activeItem).parents( '.dropdown' ).addClass( 'active' );
}

var g_IdleTimeout = 1000 * 60 * 2;

var g_RoomCache = {};
var g_ReceivedUserlistAt = new Date( -10000 );
var g_Socket = null;
var g_Room = null;
var g_UnreadMessages = 0;
var g_NearBottom = true;

var currentRoomId = null;

var g_InitialUserCheckComplete = false;
var g_CurrentUser = null;

function GetCurrentUser( callback ) {
    if ( !g_InitialUserCheckComplete )
    {
        setTimeout( function() { GetCurrentUser( callback ); }, 100 );
        return;
    }

    callback( g_CurrentUser );
}

function LeaveRoom() {
    if ( g_Socket && g_Room )
    {
        g_Socket.emit( 'disconnect', {} );    
    }

    g_Socket = null;
    g_Room = null;
}

var app = Sammy( function() {
    var theApp = this;
    theApp.debug = true;
    
    theApp.get( '#/', function() {
        SetActivePage( 'about' );
        $( '#main' ).html( ich.home() );
    });
    
    theApp.get( '#/Rooms', function() {
        SetActivePage( 'rooms' );
        $( '#main' ).spin( 'large' );
        $.ajax({
            url: apiServer + '/api/1.0/Rooms',
            type: 'GET',
            dataType: 'json',
            success: function( rooms ) {
                $( '#main' ).html( ich.rooms( { 'rooms': rooms } ) );
                $('#main').spin( false );
            },
            error: function( response, status, error ) {
                $('#main').spin( false );
                console.log( error );
            }
        });
    });
    
    theApp.get( '#/SignUp', function() {
        SetActivePage( 'signup' );
        $( '#main' ).html( ich.signup() );
    });
    
    theApp.get( '#/Settings', function() {
        SetActivePage( 'settings' );
        if ( !g_CurrentUser )
        {
            $('#main').spin( 'large' );
            $.ajax({
                url: apiServer + '/api/1.0/User',
                type: 'GET',
                dataType: 'json',
                success: function( data ) {
                    g_CurrentUser = data;
                    $( '#main' ).html( ich.settings( g_CurrentUser ) );
                    $('#main').spin( false );
                },
                error: function( response, status, error ) {
                    $('#main').spin( false );
                    console.log( error );
                }
            });
        }
        else
        {
            $( '#main' ).html( ich.settings( g_CurrentUser ) );
        }
    });
    
    theApp.get( '#/User/:hash', function() {
        $('#main').spin( 'large' );

        var userHash = this.params[ 'hash' ];
        
        function render( user )
        {
            $( '#main' ).html( ich.user( { 'user': user } ) );
            $( '#main' ).spin( false );
        }
        
        $.ajax({
            url: apiServer + '/api/1.0/User/' + userHash,
            type: 'GET',
            dataType: 'json',
            success: function( user ) {
                render( user );
            },
            error: function( response, status, error ) {
                if ( response.status == 404 )
                {
                    render( { 'hash': userHash  } );
                }
                else
                {
                    $( '#main' ).spin( false );
                    console.log( error );
                }
            }
        });
    });

    theApp.get( '#/MyRooms', function() {
        SetActivePage( 'myrooms' );
        $( '#main' ).spin( 'large' );
        $.ajax({
            url: apiServer + '/api/1.0/MyRooms',
            type: 'GET',
            dataType: 'json',
            success: function( rooms ) {
                $( '#main' ).html( ich.rooms( { 'rooms': rooms } ) );
                $( '#main' ).spin( false );
            },
            error: function( response, status, error ) {
                $( '#main' ).spin( false );
                console.log( error );
            }
        });
    });

    theApp.get( '#/CreateRoom', function() {
        SetActivePage( 'createroom' );
        $( '#main' ).html( ich.createroom() );
    });
    
    theApp.get( '#/ManageRoom/:roomId', function () {
        $( '#main' ).spin( 'large' );
        
        var roomId = this.params[ 'roomId' ];

        $.ajax({
            url: apiServer + '/api/1.0/Room/' + roomId,
            type: 'GET',
            dataType: 'json',
            success: function( room ) {
                g_RoomCache[ room._id ] = room;
                room.joinedTags = room.tags.join( ', ' );
                $( '#main' ).html( ich.manageroom( room ) );

                $( '#ownerlist' ).spin( 'medium' );
                $( '#ownerlist' ).html( ich.ownerlist( { 'owners': room.owners, 'room': room } ) );

                $.ajax({
                    url: apiServer + '/api/1.0/Users',
                    type: 'POST',
                    data: JSON.stringify( { 'users': room.owners } ),
                    contentType: 'application/json',
                    dataType: 'json',
                    success: function( owners ) {
                        for ( var index = 0; index < owners.length; ++index )
                        {
                            $( '#' + owners[ index ]._id + '-nickname' ).html( owners[ index ].nickname );
                        }
                        $( '#ownerlist' ).spin( false ); 
                    },
                    error: function( response, status, error ) {
                        $( '#ownerlist' ).spin( false );
                        console.log( error );
                    }
                });
            },
            error: function( response, status, error ) {
                $( '#main' ).spin( false );
                console.log( error );
            }
        });
    });

    theApp.get( '#/Room/:roomId', function () {
        $( '#main' ).spin( 'large' );

        currentRoomId = this.params[ 'roomId' ];

        GetCurrentUser( function( currentUser ) {
            if ( !currentUser )
            {
                $( '#signup-modal' ).modal( { 'backdrop': 'static' } );
                return;
            }
            
            $.ajax({
                url: apiServer + '/api/1.0/Room/' + currentRoomId,
                type: 'GET',
                dataType: 'json',
                success: function( room ) {
    
                    /* I am not a fan of Sammy anymore, based on how heinous it's been trying to get this to work (which it doesn't):
                    theApp.bind( 'location-changed', function() {
                        LeaveRoom();
                        theApp._unlisten( 'location-changed', this ); // this is dirty, why doesn't sammy have .unbind?
                    });
                    */
                    
                    g_RoomCache[ room._id ] = g_Room = room;
                    
                    document.title = room.name + ' on Grmble';
                    
                    $( '#main' ).html( ich.room( { 'room': g_Room } ) );
                    $( '#main' ).spin( false );
    
                    g_ReceivedUserlistAt = new Date(); // reset because we just joined this room
    
                    g_UnreadMessages = 0;
                    
                    var scrollRequests = 0;
                    function ScrollToBottom() {
                        if ( g_NearBottom )
                        {
                            ++scrollRequests;
                            if ( scrollRequests == 1 )
                            {
                                $( 'html, body' ).animate({ 
                                        scrollTop: $( document ).height() - $( window ).height()
                                    }, 
                                    50,
                                    "linear",
                                    function() {
                                        var outstandingRequests = scrollRequests > 1;
                                        scrollRequests = 0;
                                        if ( outstandingRequests )
                                        {
                                            ScrollToBottom();
                                        }
                                    }
                                );
                            }
                        }
                        else
                        {
                            function IndicateNewMessages() {
                                if ( g_NearBottom )
                                {
                                    $( '#new-messages-indicator' ).addClass( 'hide' );
                                    return;
                                }
                                
                                $( '#new-messages-indicator' ).removeClass( 'hide' );
                                $( '#new-messages-indicator' ).animate( { opacity: 0.2 }, 500, function() {
                                    $( '#new-messages-indicator' ).animate( { opacity: 1.0 }, 500, function() {
                                        IndicateNewMessages();
                                    });
                                });
                            }
                            
                            IndicateNewMessages();
                        }
                    }
    
                    if ( g_Socket )
                    {
                        // TODO: eh, is this right?
                        g_Socket.disconnect();
                        g_Socket = null;
                    }
                    
                    g_Socket = io.connect( window.location.origin, {
                        'sync disconnect on unload': false, // we will handle disconnect ourselves
                        'reconnect': true,
                        'reconnection limit': 10000,
                        'max reconnection attempts': 30
                    });
                    
                    var connected = false;
                    g_Socket.on( 'connect', function() {
                        connected = true;
                        
                        $( '#server-connection-status' ).attr( 'class', 'icon-signal' );
                        
                        g_Socket.emit( 'message', {
                            kind: 'join',
                            roomId: g_Room._id,
                            senderId: g_CurrentUser ? g_CurrentUser._id : null,
                            nickname: g_CurrentUser ? g_CurrentUser.nickname : 'Anonymous',
                            userHash: g_CurrentUser ? g_CurrentUser.hash : null,
                            facebookId: g_CurrentUser ? g_CurrentUser.facebookId : null,
                            twitterId: g_CurrentUser ? g_CurrentUser.twitterId : null,
                            avatar: g_CurrentUser ? g_CurrentUser.avatar : null,
                            content: null
                        });
                    });
                    
                    function IndicateDisconnected() {
                        if ( connected == true )
                        {
                            return;
                        }
                        
                        $( '#server-connection-status' ).animate( { opacity: 0.2 }, 500, function() {
                            $( '#server-connection-status' ).animate( { opacity: 1.0 }, 500, function() {
                                IndicateDisconnected();
                            });
                        });
                    }
                    
                    g_Socket.on( 'disconnect', function() {
                        $( '#server-connection-status' ).attr( 'class', 'icon-ban-circle' );
                        wasDisconnected = true;
                        connected = false;
                        IndicateDisconnected();
                    });
                    
                    g_Socket.on( 'reconnect_failed', function() {
                        alert( 'Could not reconnect to the server.  Maybe try reloading?' ); 
                    });
    
                    // FIXME: ugh, just require accounts
                    var myNicknameRegex = new RegExp( g_CurrentUser != null ? g_CurrentUser.nickname : 'Anonymous', "ig" );
                    g_Socket.on( 'message', function( message ) {
                        
                        switch( message.kind )
                        {
                            case 'idle':
                                $( '#userlist-entry-' + message.clientId ).fadeTo( 'slow', 0.3 );
                                return;
                            case 'active':
                                $( '#userlist-entry-' + message.clientId ).fadeTo( 'fast', 1.0 );
                                return;
							case 'isTyping':
								
								return;
							case 'isNotTyping':
								
								return;
                        }
    
                        // avoid duplicates
                        if ( $( '#' + message._id ).length == 0 ) {
                        
                            function escapeHTML( text ) {
                                return text.replace( /&/g, "&amp;" ).replace( />/g, "&gt;" ).replace( /</g, "&lt;" );
                            }
                            
                            // TODO: move this to a handler
                            message.processed = message.content == null ? null : linkify( message.content,  {
                                callback: function( text, href ) {
                                    if ( href )
                                    {
                                        if ( href.match( /(?:png|gif|jpg)$/i ) )
                                        {
                                            return '<a href="' + href + '" title="' + href + '" target="_blank"><img src="' + escapeHTML( text ) + '" /></a>';    
                                        }
                                        else if ( href.match( /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?.*?v=\S+/i ) )
                                        {
                                            var matched = href.match( /[\?|\&]v=(\w[\w|-]*)/i );
                                            if ( matched && matched.length == 2 )
                                            {
                                                return '<iframe class="youtube-player" type="text/html" width="640" height="360" src="http://www.youtube.com/embed/' + matched[ 1 ] + '?wmode=transparent" frameborder="0"></iframe>';
                                            }
                                            else
                                            {
                                                return '<a href="' + href + '" title="' + href + '" target="_blank">' + escapeHTML( text ) + '</a>';
                                            }
                                        }
                                        else if ( href.match( /(?:https?:\/\/)?(?:www\.)?youtu\.be\/.*?/i ) )
                                        {
                                            var matched = href.match( /(?:https?:\/\/)?(?:www\.)?youtu\.be\/(\w[\w|-]*)/i );
                                            if ( matched && matched.length == 2 )
                                            {
                                                return '<iframe class="youtube-player" type="text/html" width="640" height="360" src="http://www.youtube.com/embed/' + matched[ 1 ] + '?wmode=transparent" frameborder="0"></iframe>';
                                            }
                                            else
                                            {
                                                return '<a href="' + href + '" title="' + href + '" target="_blank">' + escapeHTML( text ) + '</a>';
                                            }
                                        }
                                        else
                                        {
                                            return '<a href="' + href + '" title="' + href + '" target="_blank">' + escapeHTML( text ) + '</a>';
                                        }
                                    }
                                    
                                    return escapeHTML( text );
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
                    
                    g_Socket.on( 'userlist', function( userlist ) {
                        g_ReceivedUserlistAt = new Date();
                        $( '#userlist-container' ).spin( 'medium' );
                        $( '#userlist' ).html( '' );
                        for ( var index = 0; index < userlist.users.length; ++index )
                        {
                            $( '#userlist' ).append( ich.userlist_entry( userlist.users[ index ] ) );
                        }
                        $( '#userlist-container' ).spin( false );
                    });
                    
                    function SendMessage() {
						if ($.trim($( '#message-entry-content' ).val()).length > 0)
						{
							var message = {
	                            kind: 'say',
	                            roomId: room._id,
	                            senderId: g_CurrentUser ? g_CurrentUser._id : null,
	                            nickname: g_CurrentUser ? g_CurrentUser.nickname : 'Anonymous',
	                            userHash: g_CurrentUser ? g_CurrentUser.hash : null,
	                            facebookId: g_CurrentUser ? g_CurrentUser.facebookId : null,
	                            twitterId: g_CurrentUser ? g_CurrentUser.twitterId : null,
	                            avatar: g_CurrentUser ? g_CurrentUser.avatar : null,
	                            content: $( '#message-entry-content' ).val()
	                        };

	                        g_Socket.emit( 'message', message );
	                        $( '#submit-message' ).button( 'loading' );
	                        $( '#message-entry-content' ).val( '' );
							SendIsUserTyping(false);
						}
                    }

					function SendIsUserTyping(status) {
						if (typeof g_CurrentUser.typingStatus === "undefined"
							|| g_CurrentUser.typingStatus === null
							|| g_CurrentUser.typingStatus !== status)
						{
							g_CurrentUser.typingStatus = status;
							
							var message = {
								kind: 'typingStatus',
								roomId: room._id,
								senderId: g_CurrentUser ? g_CurrentUser._id : null,
	                            nickname: g_CurrentUser ? g_CurrentUser.nickname : 'Anonymous',
	                            userHash: g_CurrentUser ? g_CurrentUser.hash : null,
	                            facebookId: g_CurrentUser ? g_CurrentUser.facebookId : null,
	                            twitterId: g_CurrentUser ? g_CurrentUser.twitterId : null,
	                            avatar: g_CurrentUser ? g_CurrentUser.avatar : null,
	                            content: g_CurrentUser.typingStatus
							};
						
							g_Socket.emit( 'message', message );
						}
					}
                    
                    $( '#submit-message' ).unbind();
                    $( '#submit-message' ).bind( 'click', function( event ) {
                        event.preventDefault();
                        event.stopPropagation();
                        SendMessage();
                    });
                    
                    $( '#message-entry-form' ).unbind();
                    $( '#message-entry-form' ).bind( 'submit', function( event ) {
                        event.preventDefault();
                        event.stopPropagation();
                        SendMessage();
                    });
                    
                    $( '#message-entry-content' ).bind( 'keydown', function( event ) {
						if ( event.which == 13 && !( event.shiftKey || event.ctrlKey || event.altKey ) )
                        {
                            event.preventDefault();
                            event.stopPropagation();
                            SendMessage();
                        }
                    });

					$( '#message-entry-content' ).bind( 'keyup', function( event ) {
						if ($.trim($( '#message-entry-content' ).val()).length > 0)
						{
							SendIsUserTyping(true);
						}
						else 
						{
							SendIsUserTyping(false);
						}
                    });
					
					$( '#message-entry-content' ).bind( 'change', function( event ) {
						if ($.trim($( '#message-entry-content' ).val()).length > 0)
						{
							SendIsUserTyping(true);
						}
						else
						{
							SendIsUserTyping(false);
						}
					});
                },
                error: function( response, status, error ) {
                    $( '#main' ).spin( false );
                    console.log( error );
                }
            });
        });
    });

});

$(function() {
    $.ajax({
        url: apiServer + '/api/1.0/User',
        type: 'GET',
        dataType: 'json',
        success: function( data ) {
            g_CurrentUser = data;
            $('.authenticated').show();
            $('.unauthenticated').hide();
            g_InitialUserCheckComplete = true;
        },
        error: function( response, status, error ) {
            $('.authenticated').hide();
            $('.unauthenticated').show();
            g_InitialUserCheckComplete = true;
        }
    });

    $( window ).bind( 'unload', LeaveRoom );                    

    $( window ).scroll( function() {
        g_NearBottom = ( ( $( window ).scrollTop() + $( window ).height() ) > ( $( document ).height() - 80 ) );
    });    

    $.idleTimer( g_IdleTimeout, document, {
        events: 'mousemove keydown mousewheel mousedown touchstart touchmove' // DOMMouseScroll, nope, scroll to bottom emits this
    });

    $( document ).bind( 'idle.idleTimer', function() {
        if ( g_Socket && g_Room )
        {
            g_Socket.emit( 'message', {
                kind: 'idle',
                roomId: g_Room._id,
                senderId: g_CurrentUser ? g_CurrentUser._id : null,
                nickname: g_CurrentUser ? g_CurrentUser.nickname : 'Anonymous',
                userHash: g_CurrentUser ? g_CurrentUser.hash : null,
                facebookId: g_CurrentUser ? g_CurrentUser.facebookId : null,
                twitterId: g_CurrentUser ? g_CurrentUser.twitterId : null,
                avatar: g_CurrentUser ? g_CurrentUser.avatar : null,
                content: null
            });
        }
    });
    
    
    $( document ).bind( 'active.idleTimer', function() {
        if ( g_Socket && g_Room )
        {
            g_UnreadMessages = 0;
            document.title = g_Room.name + ' on Grmble';
            
            g_Socket.emit( 'message', {
                kind: 'active',
                roomId: g_Room._id,
                senderId: g_CurrentUser ? g_CurrentUser._id : null,
                nickname: g_CurrentUser ? g_CurrentUser.nickname : 'Anonymous',
                userHash: g_CurrentUser ? g_CurrentUser.hash : null,
                facebookId: g_CurrentUser ? g_CurrentUser.facebookId : null,
                twitterId: g_CurrentUser ? g_CurrentUser.twitterId : null,
                avatar: g_CurrentUser ? g_CurrentUser.avatar : null,
                content: null
            });
        }
    });
    
    app.run( '#/' );
});

function HandleAuthentication( resource, form )
{
    var nickname = $(form).find( "input[type=text][name=nickname]" ).val();
    var email = $(form).find( "input[type=text][name=email]" ).val();
    var password = $(form).find( "input[type=password][name=password]" ).val();

    if ( !email.length || !password.length )
    {
        // TODO: show error
    }
    
    $(form).spin( 'small' );
    
    $.ajax({
        url: apiServer + '/api/1.0/' + resource,
        type: 'POST',
        data: JSON.stringify({
            'nickname': nickname,
            'email': email,
            'password': password
        }),
        dataType: 'json',
        contentType: 'application/json',
        cache: false,
        success: function( data ) {
            $(form).find( "input[type=text][name=nickname]" ).val( '' );
            $(form).find( "input[type=text][name=email]" ).val( '' );
            $(form).find( "input[type=password][name=password]" ).val( '' );
            $(form).find( "input[type=password][name=password]" ).removeClass( 'error' );

            g_CurrentUser = data.user || data;

            $('.authenticated').show();
            $('.unauthenticated').hide();
            $(form).spin( false );
            $( '#signup-modal' ).modal( 'hide' );
            
            app.refresh();
        },
        error: function( response, status, error ) {
            $(form).find( "input[type=password][name=password]" ).val( '' );

            if ( response.status == 403 )
            {
                $(form).find( "input[type=password][name=password]" ).addClass( 'error' );
            }
            
            $(form).spin( false );
            console.log( error );
        }
    });    
}

$('.button-signup').live( 'click', function( event ) {
    event.preventDefault();    
    var form = $(this).parents( 'form:first' );
    HandleAuthentication( 'User', form );
});

$('.button-signin').live( 'click', function( event ) {
    event.preventDefault();    
    var form = $(this).parents( 'form:first' );
    HandleAuthentication( 'Session', form );
});

$('.button-signout').live( 'click', function( event ) {
    event.preventDefault();
    $.ajax({
        url: apiServer + '/api/1.0/Session',
        type: 'DELETE',
        success: function( data ) {
            g_CurrentUser = null;
            $('.authenticated').hide();
            $('.unauthenticated').show();
            app.setLocation( '#/' );
        },
        error: function( response, status, error ) {
            console.log( error );
        }
    });    
});

$( '#signup-modal-set-nickname' ).live( 'click', function( event ) {
    event.preventDefault();
    event.stopPropagation();
    $( '#signup-modal' ).modal( 'hide' );
    $( '#set-nickname-modal' ).modal( { 'backdrop': 'static' } );
});

$( '#set-nickname-modal-set-nickname' ).live( 'click', function( event ) {
    event.preventDefault();
    event.stopPropagation();
    
    var nickname = $( '#set-nickname-form' ).find( "input[type=text][name=nickname]" ).val();
    if ( nickname.length )
    {
        g_CurrentUser = { nickname: nickname };
        $( '#set-nickname-modal' ).modal( 'hide' );
    }
});

$('.update-account-button').live( 'click', function( event ) {
    event.preventDefault();
    var button = this;
    var form = $(this).parents( 'form:first' );

    var toBeUpdated = {};
    var avatar = $(form).find( "#avatar" ).val();
    if ( avatar != g_CurrentUser.avatar )
    {
        toBeUpdated.avatar = avatar;
    }

    var email = $(form).find( "#email" ).val();
    if ( email != g_CurrentUser.email )
    {
        toBeUpdated.email = email;
    }
    
    var password = $(form).find( "#password" ).val();
    if ( password && password.length )
    {
        toBeUpdated.password = password;
    }
    
    var nickname = $(form).find( "#nickname" ).val();
    if ( nickname != g_CurrentUser.nickname )
    {
        toBeUpdated.nickname = nickname;
    }
    
    var location = $(form).find( "#location" ).val();
    if ( location != g_CurrentUser.location )
    {
        toBeUpdated.location = location;
    }

    var bio = $(form).find( "#bio" ).val();
    if ( bio != g_CurrentUser.bio )
    {
        toBeUpdated.bio = bio;
    }
    
    // only send if toBeUpdated has at least one key
    for ( var key in toBeUpdated )
    {
        $(button).button( 'loading' );
        $(form).spin( 'medium' );

        $.ajax({
            url: apiServer + '/api/1.0/User',
            type: 'PUT',
            data: JSON.stringify( toBeUpdated ),
            dataType: 'json',
            contentType: 'application/json',
            success: function( data ) {
                g_CurrentUser = data;
                $(form).find( '#password' ).val( '' );
                $(form).spin( false );
                $(button).button( 'complete' );
                setTimeout( function() {
                    $(button).button( 'reset' );
                }, 2000 );
            },
            error: function( response, status, error ) {
                $(form).spin( false );
                console.log( error );
                $(button).button( 'reset' );
            }
        });

        break; // we break, no matter what, because we just wanted to see if there was a key in toBeUpdated
    }
});

$('.reset-account-button').live( 'click', function( event ) {
    event.preventDefault();
    var form = $(this).parents( 'form:first' );

    // TODO: prompt for confirmation, maybe use bootstrap-modal.js?
    
    for ( var key in g_CurrentUser )
    {
        $(form).find( '#' + key ).val( g_CurrentUser[ key ] );
        $(form).find( '#' + key ).html( g_CurrentUser[ key ] );
    }
});

$( '#use-avatar-gravatar' ).live( 'click', function( event ) {
    event.preventDefault();
    event.stopPropagation();
    
    var button = this;
    var form = $(this).parents( 'form:first' );
    var gravatar = 'http://www.gravatar.com/avatar/' + Crypto.MD5( g_CurrentUser.email ) + '?s=64';
    
    $(form).find( "#avatar" ).val( gravatar );
    $(form).find( "#user-avatar-preview" ).attr( 'src', gravatar );
});

$('.button-create-room').live( 'click', function( event ) {
    event.preventDefault();
    var form = $(this).parents( 'form:first' );

    $(form).spin( 'medium' );

    var name = $(form).find( '#name' ).val();
    var description = $(form).find( '#description' ).val();
    var tags = $(form).find( '#tags' ).val().split( new RegExp( '[,;]' ) ).map( function( tag ) { return tag.trim(); } ) || [];
    var isPublic = $(form).find( '#protection' ).val() == 'Public';
    
    $.ajax({
        url: apiServer + '/api/1.0/Room',
        type: 'POST',
        data: JSON.stringify({
            'name': name,
            'description': description,
            'tags': tags,
            'isPublic': isPublic
        }),
        dataType: 'json',
        contentType: 'application/json',
        cache: false,
        success: function( room ) {
            $(form).spin( false );
            
            app.setLocation( '#/ManageRoom/' + room._id );
        },
        error: function( response, status, error ) {
            $(form).spin( false );
            console.log( error );
        }
    });
});

$('.update-room-button').live( 'click', function( event ) {
    event.preventDefault();
    var button = this;
    var form = $(this).parents( 'form:first' );

    var toBeUpdated = {};

    var roomId = $(form).find( '#id' ).val();
    var room = g_RoomCache[ roomId ];
    
    if ( !room )
    {
        console.log( 'Cache Error' );
        return;
    }
    
    var name = $(form).find( "#name" ).val();
    if ( name != room.name )
    {
        toBeUpdated.name = name;
    }
    
    var description = $(form).find( "#description" ).val();
    if ( description != room.description )
    {
        toBeUpdated.description = description;
    }

    var tags = $(form).find( "#tags" ).val().split( new RegExp( '[,;]' ) ).map( function( tag ) { return tag.trim() } );
    if ( tags != room.tags )
    {
        toBeUpdated.tags = tags;
    }
    
    var isPublic = $(form).find( "#protection" ).val() == 'Public';
    if ( isPublic != room.isPublic )
    {
        toBeUpdated.isPublic = isPublic;
    }

    // only send if toBeUpdated has at least one key
    for ( var key in toBeUpdated )
    {
        $(button).button( 'loading' );
        $(form).spin( 'medium' );

        $.ajax({
            url: apiServer + '/api/1.0/Room/' + roomId,
            type: 'PUT',
            data: JSON.stringify( toBeUpdated ),
            dataType: 'json',
            contentType: 'application/json',
            success: function( room ) {
                g_RoomCache[ room._id ] = room;
                $(form).spin( false );
                $(button).button( 'complete' );
                setTimeout( function() {
                    $(button).button( 'reset' );
                }, 2000 );
            },
            error: function( response, status, error ) {
                $(form).spin( false );
                console.log( error );
                $(button).button( 'reset' );
            }
        });

        break; // we break, no matter what, because we just wanted to see if there was a key in toBeUpdated
    }
});

$('.reset-room-button').live( 'click', function( event ) {
    event.preventDefault();
    var form = $(this).parents( 'form:first' );

    // TODO: prompt for confirmation, maybe use bootstrap-modal.js?
    
    var roomId = $(form).find( '#id' ).val();
    var room = g_RoomCache[ roomId ];
    
    if ( !room )
    {
        console.error( 'Cache error.' );
        return;
    }
    
    for ( var key in room )
    {
        $(form).find( '#' + key ).val( room[ key ] );
        $(form).find( '#' + key ).html( room[ key ] );
    }
});

$('.add-room-owner-button').live( 'click', function( event ) {
    event.preventDefault();
    var button = this;    
    var form = $( this ).parents( 'form:first' );
    
    $( button ).button( 'loading' );
    var roomId = $( form ).find( '#roomId' ).val();
    var hash = Crypto.MD5( $( form ).find( '#newowner' ).val().trim().toLowerCase() );

    $.ajax({
        url: apiServer + '/api/1.0/Room/' + roomId + '/Owners/' + hash,
        type: 'POST',
        dataType: 'json',
        success: function( room ) {
            g_RoomCache[ room._id ] = room;
            $(button).button( 'complete' );
            setTimeout( function() {
                $(button).button( 'reset' );
            }, 2000 );            

            $( '#ownerlist' ).spin( 'medium' );
            $( '#ownerlist' ).html( ich.ownerlist( { 'owners': room.owners, 'room': room } ) );

            $.ajax({
                url: apiServer + '/api/1.0/Users',
                type: 'POST',
                data: JSON.stringify( { 'users': room.owners } ),
                contentType: 'application/json',
                dataType: 'json',
                success: function( owners ) {
                    for ( var index = 0; index < owners.length; ++index )
                    {
                        $( '#' + owners[ index ]._id + '-nickname' ).html( owners[ index ].nickname );
                    }
                    $( '#ownerlist' ).spin( false ); 
                },
                error: function( response, status, error ) {
                    $( '#ownerlist' ).spin( false );
                    console.log( error );
                }
            });
        },
        error: function( response, status, error ) {
            $( button ).button( 'reset' );
            console.log( error );
        }
    });
});

$('.remove-room-owner-link').live( 'click', function( event ) {
    event.preventDefault();
    var link = this;
    
    $.ajax({
        url: apiServer + link.href,
        type: 'DELETE',
        dataType: 'json',
        success: function( room ) {
            g_RoomCache[ room._id ] = room;
            
            $( '#ownerlist' ).spin( 'medium' );
            $( '#ownerlist' ).html( ich.ownerlist( { 'owners': room.owners, 'context': room } ) );

            $.ajax({
                url: apiServer + '/api/1.0/Users',
                type: 'POST',
                data: JSON.stringify( { 'users': room.owners } ),
                contentType: 'application/json',
                dataType: 'json',
                success: function( owners ) {
                    for ( var index = 0; index < owners.length; ++index )
                    {
                        $( '#' + owners[ index ]._id + '-nickname' ).html( owners[ index ].nickname );
                    }
                    $( '#ownerlist' ).spin( false ); 
                },
                error: function( response, status, error ) {
                    $( '#ownerlist' ).spin( false );
                    console.log( error );
                }
            });
        },
        error: function( response, status, error ) {
            console.log( error );
        }
    });
});

$( '#load-more-button' ).live( 'click', function( event ) {
    event.preventDefault();
    event.stopPropagation();
    
    if ( g_Room )
    {
        $( '#load-more-button' ).button( 'loading' );
        
        var oldestMessageDate = $( '#chatlog' ).find( '.message:first' ).attr( 'time' );
        $.ajax({
            url: '/api/1.0/Room/' + g_Room._id + '/Messages/',
            type: 'GET',
            data: {
                sort: 'desc',
                before: oldestMessageDate
            },
            dataType: 'json',
            success: function( messages ) {

                var toBeInserted = '';
                var myNicknameRegex = new RegExp( g_CurrentUser != null ? g_CurrentUser.nickname : 'Anonymous', "ig" );
                for ( var index = messages.length - 1; index >= 0; --index )
                {
                    var message = messages[ index ];
                    
                    // FIXME: so dirty, cut and paste
                    if ( message.kind == 'idle' || message.kind == 'active' )
                    {
                        continue;
                    }
                    
                    // avoid duplicates
                    if ( $( '#' + message._id ).length == 0 ) {
                        
                        function escapeHTML( text ) {
                            return text.replace( /&/g, "&amp;" ).replace( />/g, "&gt;" ).replace( /</g, "&lt;" );
                        }
                        
                        // TODO: move this to a handler
                        message.processed = message.content == null ? null : linkify( message.content,  {
                            callback: function( text, href ) {
                                if ( href )
                                {
                                    if ( href.match( /(?:png|gif|jpg)$/i ) )
                                    {
                                        return '<a href="' + href + '" title="' + href + '" target="_blank"><img src="' + escapeHTML( text ) + '" /></a>';    
                                    }
                                    else if ( href.match( /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?.*?v=\S+/i ) )
                                    {
                                        var matched = href.match( /[\?|\&]v=(\w[\w|-]*)/i );
                                        if ( matched && matched.length == 2 )
                                        {
                                            return '<iframe class="youtube-player" type="text/html" width="640" height="360" src="http://www.youtube.com/embed/' + matched[ 1 ] + '?wmode=transparent" frameborder="0"></iframe>';
                                        }
                                        else
                                        {
                                            return '<a href="' + href + '" title="' + href + '" target="_blank">' + escapeHTML( text ) + '</a>';
                                        }
                                    }
                                    else if ( href.match( /(?:https?:\/\/)?(?:www\.)?youtu\.be\/.*?/i ) )
                                    {
                                        var matched = href.match( /(?:https?:\/\/)?(?:www\.)?youtu\.be\/(\w[\w|-]*)/i );
                                        if ( matched && matched.length == 2 )
                                        {
                                            return '<iframe class="youtube-player" type="text/html" width="640" height="360" src="http://www.youtube.com/embed/' + matched[ 1 ] + '?wmode=transparent" frameborder="0"></iframe>';
                                        }
                                        else
                                        {
                                            return '<a href="' + href + '" title="' + href + '" target="_blank">' + escapeHTML( text ) + '</a>';
                                        }
                                    }
                                    else
                                    {
                                        return '<a href="' + href + '" title="' + href + '" target="_blank">' + escapeHTML( text ) + '</a>';
                                    }
                                }
                                
                                return escapeHTML( text );
                            }
                        });
    
                        if ( message.content && message.content.match( myNicknameRegex ) )
                        {
                            message.referencesMe = true;
                        }                    
    
                        var newMessage = ich.message( message, true ); // true = raw
                    
                        toBeInserted += newMessage + "\n";
                    }
                }
                
                if ( toBeInserted.length )
                {
                    $( '#chatlog' ).prepend( toBeInserted );
                }

                $( '#load-more-button' ).button( 'reset' );
            },
            error: function( xhr ) {
                $( '#load-more-button' ).button( 'reset' );
            }
        });
    }
});
