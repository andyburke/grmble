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

var g_TemplateCache = {};
var g_InFlightTemplates = {};
var g_RoomCache = {};
var g_ReceivedUserlistAt = new Date( -10000 );

var currentRoomId = null;

function GetTemplate( template, callback ) {
    if ( g_TemplateCache[ template ] )
    {
        callback( g_TemplateCache[ template ] );
        return;
    }
    
    if ( g_InFlightTemplates[ template ] )
    {
        setTimeout( function() { GetTemplate( template, callback ); }, 100 );
        return;
    }
    
    g_InFlightTemplates[ template ] = true;
    $.ajax({
        url: template,
        dataType: "text",
        success: function( contents ) {
            delete g_InFlightTemplates[ template ];
            g_TemplateCache[ template ] = contents;
            callback( g_TemplateCache[ template ] );
        },
        error: function( xhr ) {
            delete g_InFlightTemplates[ template ];
            callback( null );
        }
    });
}

function RenderTemplate( options, callback ) {
    GetTemplate( options.template, function( template ) {
        if ( template == null )
        {
            if ( callback )
            {
                callback( false );
            }
            return;
        }
        
        var result = Mustache.to_html( template, options.data )
        if ( options.append )
        {
            $( options.selector ).append( result );
        }
        else
        {
            $( options.selector ).html( result );
        }
        
        if ( callback )
        {
            callback( true );
        }
        
    });
}

var currentUser = null;

var app = Sammy( function() {
    this.debug = true;
    
    this.get( '#/', function() {
        SetActivePage( 'about' );
        RenderTemplate( {
            selector: '#main',
            template: "/templates/home.mustache"
        });
    });
    
    this.get( '#/Rooms', function() {
        SetActivePage( 'rooms' );
        $( '#main' ).spin( 'large' );
        $.ajax({
            url: apiServer + '/api/1.0/Rooms',
            type: 'GET',
            dataType: 'json',
            success: function( rooms ) {
                RenderTemplate({
                    selector: '#main',
                    template: "/templates/rooms.mustache",
                    data: { 'rooms': rooms }
                }, function() {
                    $('#main').spin( false );
                });
            },
            error: function( response, status, error ) {
                $('#main').spin( false );
                console.log( error );
            }
        });
    });
    
    this.get( '#/SignUp', function() {
        SetActivePage( 'signup' );
        RenderTemplate({
            selector: '#main',
            template: "/templates/signup.mustache"
        });
    });
    
    this.get( '#/Settings', function() {
        SetActivePage( 'settings' );
        if ( !currentUser )
        {
            $('#main').spin( 'large' );
            $.ajax({
                url: apiServer + '/api/1.0/User',
                type: 'GET',
                dataType: 'json',
                success: function( data ) {
                    $('#main').spin( false );
                    currentUser = data;
                    RenderTemplate({
                        selector: '#main',
                        template: '/templates/settings.mustache',
                        data: currentUser
                    });
                },
                error: function( response, status, error ) {
                    $('#main').spin( false );
                    console.log( error );
                }
            });
        }
        else
        {
            RenderTemplate({
                selector: '#main',
                template: '/templates/settings.mustache',
                data: currentUser
            });
        }
    });
    
    this.get( '#/User/:hash', function() {
        $('#main').spin( 'large' );

        var userHash = this.params[ 'hash' ];
        
        function render( user )
        {
            RenderTemplate({
                selector: '#main',
                template: '/templates/user.mustache',
                data: { 'user': user }
            }, function() {
                $( '#main' ).spin( false );
            });
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

    this.get( '#/MyRooms', function() {
        SetActivePage( 'myrooms' );
        $( '#main' ).spin( 'large' );
        $.ajax({
            url: apiServer + '/api/1.0/MyRooms',
            type: 'GET',
            dataType: 'json',
            success: function( rooms ) {
                RenderTemplate({
                    selector: '#main',
                    template: '/templates/rooms.mustache',
                    data: { 'rooms': rooms }
                }, function() {
                    $( '#main' ).spin( false );
                });
            },
            error: function( response, status, error ) {
                $( '#main' ).spin( false );
                console.log( error );
            }
        });
    });

    this.get( '#/CreateRoom', function() {
        SetActivePage( 'createroom' );
        $( '#main' ).spin( 'large' );
        RenderTemplate({
            selector: '#main',
            template: '/templates/createroom.mustache'
        }, function () {
            $( '#main' ).spin( false );
        });
    });
    
    this.get( '#/ManageRoom/:roomId', function () {
        $( '#main' ).spin( 'large' );
        
        var roomId = this.params[ 'roomId' ];

        $.ajax({
            url: apiServer + '/api/1.0/Room/' + roomId,
            type: 'GET',
            dataType: 'json',
            success: function( room ) {
                g_RoomCache[ room._id ] = room;
                room.joinedTags = room.tags.join( ', ' );
                RenderTemplate({
                    selector: '#main',
                    template: '/templates/manageroom.mustache',
                    data: room
                }, function() {
                    $( '#main' ).spin( false );
                    
                    $( '#ownerlist' ).spin( 'small' );
                    RenderTemplate({
                        selector: '#ownerlist',
                        template: '/templates/ownerlist.mustache',
                        data: { 'owners': room.owners, 'room': room }
                    }, function() {
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
                    });
                });
            },
            error: function( response, status, error ) {
                $( '#main' ).spin( false );
                console.log( error );
            }
        });
    });

    this.get( '#/Room/:roomId', function () {
        $( '#main' ).spin( 'large' );

        currentRoomId = this.params[ 'roomId' ];

        $.ajax({
            url: apiServer + '/api/1.0/Room/' + currentRoomId,
            type: 'GET',
            dataType: 'json',
            success: function( room ) {
                g_RoomCache[ room._id ] = room;
                RenderTemplate({
                    selector: '#main',
                    template: '/templates/room.mustache',
                    data: { 'room': room }
                }, function () {
                    $( '#main' ).spin( false );
                    
                    var scrollRequests = 0;
                    function ScrollToBottom() {
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
    
                    var socket = io.connect( window.location.origin, {
                        'sync disconnect on unload': false // we will handle disconnect ourselves
                    });

                    socket.on( 'message', function( message ) {
                        
                        GetTemplate( '/templates/message.mustache', function( template ) {
                            
                            function escapeHTML( text ) {
                                return text.replace( /&/g, "&amp;" ).replace( />/g, "&gt;" ).replace( /</g, "&lt;" );
                            }
                            
                            // TODO: move this to a handler
                            message.processed = linkify( message.content,  {
                                callback: function( text, href ) {
                                    if ( href )
                                    {
                                        if ( href.match( /(?:png|gif|jpg)$/i ) )
                                        {
                                            return '<a href="' + href + '" title="' + href + '" target="_blank"><img src="' + escapeHTML( text ) + '" /></a>';    
                                        }
                                        else if ( href.match( /(?:https?:\/\/)(?:www\.)youtube\.com\/watch\?.*?v=\S+/i ) )
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
                                        else
                                        {
                                            return '<a href="' + href + '" title="' + href + '" target="_blank">' + escapeHTML( text ) + '</a>';
                                        }
                                    }
                                    
                                    return escapeHTML( text );
                                }
                            });

                            var newMessage = Mustache.to_html( template, message );
                            
                            var added = false;
                            $( '#chatlog > .message' ).each( function() {
                                if ( $(this).attr( 'time' ) > $( newMessage ).attr( 'time') )
                                {
                                    $( newMessage ).insertBefore( $( this ) );
                                    added = true;
                                    return false;
                                }
                                
                                return true;
                            });
                            
                            if ( !added )
                            {
                                $( newMessage ).appendTo( '#chatlog' );
                            }
                            
                            ScrollToBottom();
                        });

                        $( '#submit-message' ).button( 'reset' );
                        
                        var now = new Date();
                        if ( now.getTime() - g_ReceivedUserlistAt.getTime() > 5000 )
                        {
                            switch( message.kind )
                            {
                                case 'join':
                                    RenderTemplate({
                                        selector: '#userlist',
                                        template: '/templates/userlist-entry.mustache',
                                        data: message,
                                        append: true
                                    });
                                    break;
                                
                                case 'part':
                                    $( '#userlist-entry-' + message.clientId ).remove();
                                    break;
                            }
                        }
                    });
                    
                    socket.on( 'userlist', function( userlist ) {
                        g_ReceivedUserlistAt = new Date();
                        $( '#userlist-container' ).spin( 'medium' );
                        $( '#userlist' ).html( '' );
                        var rendered = 0;
                        for ( var index = 0; index < userlist.users.length; ++index )
                        {
                            RenderTemplate({
                                selector: '#userlist',
                                template: '/templates/userlist-entry.mustache',
                                data: userlist.users[ index ],
                                append: true
                            }, function() {
                                if ( ++rendered == userlist.users.length )
                                {
                                    $( '#userlist-container' ).spin( false );
                                }
                            });
                        }
                    });
                    
                    socket.emit( 'message', {
                        kind: 'join',
                        roomId: room._id,
                        senderId: currentUser ? currentUser._id : null,
                        nickname: currentUser ? currentUser.nickname : 'Anonymous',
                        userHash: currentUser ? currentUser.hash : null,
                        facebookId: currentUser ? currentUser.facebookId : null,
                        twitterId: currentUser ? currentUser.twitterId : null,
                        avatar: currentUser ? currentUser.avatar : null,
                        content: null
                    });

                    $( window ).bind( 'unload', function() {
                        socket.emit( 'message', {
                            kind: 'part',
                            roomId: room._id,
                            senderId: currentUser ? currentUser._id : null,
                            nickname: currentUser ? currentUser.nickname : 'Anonymous',
                            userHash: currentUser ? currentUser.hash : null,
                            facebookId: currentUser ? currentUser.facebookId : null,
                            twitterId: currentUser ? currentUser.twitterId : null,
                            avatar: currentUser ? currentUser.avatar : null,
                            content: null
                        });

                        socket.emit( 'disconnect', {} );
                    });                    
                    
                    function SendMessage() {

                    
                        if ( !currentUser )
                        {
                            $( '#signup-modal' ).modal( { 'backdrop': 'static' } );
                            return;
                        }
                        
                        var message = {
                            kind: 'say',
                            roomId: room._id,
                            senderId: currentUser ? currentUser._id : null,
                            nickname: currentUser ? currentUser.nickname : 'Anonymous',
                            userHash: currentUser ? currentUser.hash : null,
                            facebookId: currentUser ? currentUser.facebookId : null,
                            twitterId: currentUser ? currentUser.twitterId : null,
                            avatar: currentUser ? currentUser.avatar : null,
                            content: $( '#message-entry-content' ).val()
                        };
                        
                        socket.emit( 'message', message );
                        $( '#submit-message' ).button( 'loading' );
                        $( '#message-entry-content' ).val( '' );
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
                });
            },
            error: function( response, status, error ) {
                $( '#main' ).spin( false );
                console.log( error );
            }
        });
    });

});

$(function() {
    $.ajax({
        url: apiServer + '/api/1.0/User',
        type: 'GET',
        dataType: 'json',
        success: function( data ) {
            currentUser = data;
            $('.authenticated').show();
            $('.unauthenticated').hide();
        },
        error: function( response, status, error ) {
            $('.authenticated').hide();
            $('.unauthenticated').show();
        }
    });

    app.run( '#/' );
});

function HandleAuthentication( resource, form )
{
    var email = $(form).find( "input[type=text][name=email]" ).val();
    var password = $(form).find( "input[type=password][name=password]" ).val();

    $(form).spin( 'small' );
    
    $.ajax({
        url: apiServer + '/api/1.0/' + resource,
        type: 'POST',
        data: JSON.stringify({
            'email': email,
            'password': password
        }),
        dataType: 'json',
        contentType: 'application/json',
        cache: false,
        success: function( data ) {
            $(form).find( "input[type=text][name=email]" ).val( '' );
            $(form).find( "input[type=password][name=password]" ).val( '' );
            $(form).find( "input[type=password][name=password]" ).removeClass( 'error' );

            if ( resource == 'User' )
            {
                currentUser = data;
            }
            else
            {
                currentUser = data.user;
            }

            $('.authenticated').show();
            $('.unauthenticated').hide();
            $(form).spin( false );
            $( '#signup-modal' ).modal( 'hide' );
            
            /*
            var queryParams = QueryParameters();
            if ( queryParams.after )
            {
                app.setLocation( queryParams.after );
            }
            else
            {
                app.setLocation( '#/MyAccount' );
            }
            */
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
            currentUser = null;
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
        currentUser = { nickname: nickname };
        $( '#set-nickname-modal' ).modal( 'hide' );
    }
});

$('.update-account-button').live( 'click', function( event ) {
    event.preventDefault();
    var button = this;
    var form = $(this).parents( 'form:first' );

    var toBeUpdated = {};
    var email = $(form).find( "#email" ).val();
    if ( email != currentUser.email )
    {
        toBeUpdated.email = email;
    }
    
    var password = $(form).find( "#password" ).val();
    if ( password && password.length )
    {
        toBeUpdated.password = password;
    }
    
    var nickname = $(form).find( "#nickname" ).val();
    if ( nickname != currentUser.nickname )
    {
        toBeUpdated.nickname = nickname;
    }
    
    var location = $(form).find( "#location" ).val();
    if ( location != currentUser.location )
    {
        toBeUpdated.location = location;
    }

    var bio = $(form).find( "#bio" ).val();
    if ( bio != currentUser.bio )
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
                currentUser = data;
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
    
    for ( var key in currentUser )
    {
        $(form).find( '#' + key ).val( currentUser[ key ] );
        $(form).find( '#' + key ).html( currentUser[ key ] );
    }
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
            RenderTemplate({
                selector: '#ownerlist',
                template: '/templates/ownerlist.mustache',
                data: { 'owners': room.owners, 'room': room }
            }, function() {
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
            RenderTemplate({
                selector: '#ownerlist',
                template: '/templates/ownerlist.mustache',
                data: { 'owners': room.owners, 'context': room }
            }, function() {
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
            });
        },
        error: function( response, status, error ) {
            console.log( error );
        }
    });
});
