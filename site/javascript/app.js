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
var g_RoomCache = {};

function renderTemplate( elementSelector, template, data, callback ) {
    if ( g_TemplateCache[ template ] )
    {
        $(elementSelector).html( Mustache.to_html( g_TemplateCache[ template ], data ) );
        if ( callback )
        {
            callback();
        }
    }
    else
    {
        $.ajax({
            url: template,
            dataType: "text",
            success: function( contents ) {
                g_TemplateCache[ template ] = contents;
                renderTemplate( elementSelector, template, data, callback );
            }
        });
    }
}

var currentUser = null;

var app = Sammy( function() {
    this.debug = true;
    
    this.get( '#/', function() {
        SetActivePage( 'about' );
        renderTemplate( '#main', "/templates/home.mustache", null );
    });
    
    this.get( '#/Rooms', function() {
        SetActivePage( 'rooms' );
        $( '#main' ).spin( 'large' );
        $.ajax({
            url: apiServer + '/api/1.0/Rooms',
            type: 'GET',
            dataType: 'json',
            success: function( rooms ) {
                renderTemplate( '#main', "/templates/rooms.mustache", { 'rooms': rooms }, function() {
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
        renderTemplate( '#main', "/templates/signup.mustache", null );
    });
    
    this.get( '#/MyAccount', function() {
        SetActivePage( 'myaccount' );
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
                    renderTemplate( '#main', '/templates/myaccount.mustache', currentUser );
                },
                error: function( response, status, error ) {
                    $('#main').spin( false );
                    console.log( error );
                }
            });
        }
        else
        {
            renderTemplate( '#main', '/templates/myaccount.mustache', currentUser );
        }
    });
    
    this.get( '#/User/:hash', function() {
        $('#main').spin( 'large' );

        var userHash = this.params[ 'hash' ];
        
        function render( user )
        {
            renderTemplate( '#main', '/templates/user.mustache', { 'user': user }, function() {
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
                renderTemplate( '#main', '/templates/rooms.mustache', { 'rooms': rooms }, function() {
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
        renderTemplate( '#main', '/templates/createroom.mustache', null, function () {
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
                renderTemplate( '#main', '/templates/manageroom.mustache', room, function() {
                    $( '#main' ).spin( false );
                    
                    $( '#ownerlist' ).spin( 'small' );
                    renderTemplate( '#ownerlist', '/templates/ownerlist.mustache', { 'owners': room.owners, 'room': room }, function() {
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

        var roomId = this.params[ 'roomId' ];

        $.ajax({
            url: apiServer + '/api/1.0/Room/' + roomId,
            type: 'GET',
            dataType: 'json',
            success: function( room ) {
                g_RoomCache[ room._id ] = room;
                renderTemplate( '#main', '/templates/room.mustache', { 'room': room }, function () {
                    $( '#main' ).spin( false );
                    
                    // TODO: start grabbing messages
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
            $('.authenticated').show();
            $('.unauthenticated').hide();
            $(form).spin( false );
            
            var queryParams = QueryParameters();
            if ( queryParams.after )
            {
                app.setLocation( queryParams.after );
            }
            else
            {
                app.setLocation( '#/MyAccount' );
            }
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

$('.reset-apikey-button').live( 'click', function( event ) {
    event.preventDefault();
    event.stopPropagation();
    
    var button = this;
    var form = $(this).parents( 'form:first' );
    var contextId = $(form).find( '#id' ).val();

    $.ajax({
        url: apiServer + '/api/1.0/Context/' + contextId + '/ResetAPIKey',
        type: 'POST',
        data: '{}',
        dataType: 'json',
        contentType: 'application/json',
        success: function( context ) {
            g_ContextCache[ context._id ] = context;
            for ( var key in context )
            {
                $(form).find( '#' + key ).val( context[ key ] );
                $(form).find( '#' + key ).html( context[ key ] );
            }
            $(button).button( 'complete' );
            setTimeout( function() {
                $(button).button( 'reset' );
            }, 2000 );
        },
        error: function( response, status, error ) {
            console.log( error );
            $(button).button( 'reset' );
        }
    });
});

$('.reset-context-button').live( 'click', function( event ) {
    event.preventDefault();
    var form = $(this).parents( 'form:first' );

    // TODO: prompt for confirmation, maybe use bootstrap-modal.js?
    
    var contextId = $(form).find( '#id' ).val();
    var context = g_ContextCache[ contextId ];
    
    if ( !context )
    {
        console.error( 'Context should be set.' );
        return;
    }
    
    for ( var key in context )
    {
        $(form).find( '#' + key ).val( context[ key ] );
        $(form).find( '#' + key ).html( context[ key ] );
    }
});

$('.button-create-achievementclass').live( 'click', function( event ) {
    event.preventDefault();
    var form = $(this).parents( 'form:first' );

    $(form).spin( 'medium' );

    var contextId = $(form).find( '#contextId' ).val();
    var name = $(form).find( '#name' ).val();
    var description = $(form).find( '#description' ).val();
    
    $.ajax({
        url: apiServer + '/api/1.0/Context/' + contextId + '/AchievementClass',
        type: 'POST',
        data: JSON.stringify({
            'name': name,
            'description': description
        }),
        dataType: 'json',
        contentType: 'application/json',
        cache: false,
        success: function( achievementClass ) {
            $(form).spin( false );
            
            g_AchievementClassCache[ achievementClass._id ] = achievementClass;
            g_AchievementClassListCache[ contextId ].push( achievementClass );
            
            app.setLocation( '#/Context/' + contextId + '/ManageAchievementClass/' + achievementClass._id );
        },
        error: function( response, status, error ) {
            $(form).spin( false );
            console.log( error );
        }
    });
});

$('.update-achievementclass-button').live( 'click', function( event ) {
    event.preventDefault();
    var button = this;
    var form = $(this).parents( 'form:first' );

    var toBeUpdated = {};

    var contextId = $(form).find( '#contextId' ).val();
    var achievementClassId = $(form).find( '#id' ).val();
    var cachedAchievementClass = g_AchievementClassCache[ achievementClassId ];
    
    var imageFileInput = $(form).find( '#image-file' );
    if ( imageFileInput.length )
    {
        var file = imageFileInput[ 0 ].files[ 0 ];
        if ( file && file.fileName )
        {
            $( '#achievementclass-image' ).spin( 'medium' );
            
            var formData = new FormData();
            formData.append( 'achievementClassImage', file );

            $.ajax({
                url: apiServer + '/api/1.0/Context/' + contextId + '/AchievementClass/' + achievementClassId + '/Image',
                data: formData,
                cache: false,
                contentType: false,
                processData: false,
                type: 'POST',
                success: function( updatedAchievementClass ) {
                    g_AchievementClassCache[ achievementClassId ] = updatedAchievementClass;
                    $( '#achievementclass-image' ).attr( 'src', updatedAchievementClass.image );
                    $( '#achievementclass-image' ).spin( false );
                },
                error: function( xhr ) {
                    console.log( "error updating image" );
                    $( '#achievementclass-image' ).spin( false );
                }
            });
        }
    }
    
    var name = $(form).find( "#name" ).val();
    if ( name != cachedAchievementClass.name )
    {
        toBeUpdated.name = name;
    }
    
    var description = $(form).find( "#description" ).val();
    if ( description != cachedAchievementClass.description )
    {
        toBeUpdated.description = description;
    }
    
    // only send if toBeUpdated has at least one key
    for ( var key in toBeUpdated )
    {
        $(button).button( 'loading' );
        $(form).spin( 'medium' );

        $.ajax({
            url: apiServer + '/api/1.0/Context/' + contextId + '/AchievementClass/' + achievementClassId,
            type: 'PUT',
            data: JSON.stringify( toBeUpdated ),
            dataType: 'json',
            contentType: 'application/json',
            success: function( achievementClass ) {
                g_AchievementClassCache[ achievementClass._id ] = achievementClass;
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

$('.reset-achievementclass-button').live( 'click', function( event ) {
    event.preventDefault();
    var form = $(this).parents( 'form:first' );

    // TODO: prompt for confirmation, maybe use bootstrap-modal.js?
    
    var achievementClassId = $(form).find( '#id' ).val();
    var cachedAchievementClass = g_AchievementClassCache[ achievementClassId ];
    
    if ( !cachedAchievementClass )
    {
        console.error( 'AchievementClass should be set.' );
        return;
    }
    
    for ( var key in cachedAchievementClass )
    {
        $(form).find( '#' + key ).val( cachedAchievementClass[ key ] );
        $(form).find( '#' + key ).html( cachedAchievementClass[ key ] );
    }
});

$('.add-context-owner-button').live( 'click', function( event ) {
    event.preventDefault();
    var button = this;    
    var form = $( this ).parents( 'form:first' );
    
    $( button ).button( 'loading' );
    var contextId = $( form ).find( '#contextId' ).val();
    var hash = Crypto.MD5( $( form ).find( '#newowner' ).val().trim().toLowerCase() );

    $.ajax({
        url: apiServer + '/api/1.0/Context/' + contextId + '/Owners/' + hash,
        type: 'POST',
        dataType: 'json',
        success: function( context ) {
            g_ContextCache[ context._id ] = context;
            $(button).button( 'complete' );
            setTimeout( function() {
                $(button).button( 'reset' );
            }, 2000 );            

            $( '#ownerlist' ).spin( 'medium' );
            renderTemplate( '#ownerlist', '/templates/ownerlist.mustache', { 'owners': context.owners, 'context': context }, function() {
                $.ajax({
                    url: apiServer + '/api/1.0/Users',
                    type: 'POST',
                    data: JSON.stringify( { 'users': context.owners } ),
                    contentType: 'application/json',
                    dataType: 'json',
                    success: function( owners ) {
                        for ( var index = 0; index < owners.length; ++index )
                        {
                            $( '#' + owners[ index ].hash + '-nickname' ).html( owners[ index ].nickname );
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

$('.remove-context-owner-link').live( 'click', function( event ) {
    event.preventDefault();
    var link = this;
    
    $.ajax({
        url: apiServer + link.href,
        type: 'DELETE',
        dataType: 'json',
        success: function( context ) {
            g_ContextCache[ context._id ] = context;
            
            $( '#ownerlist' ).spin( 'medium' );
            renderTemplate( '#ownerlist', '/templates/ownerlist.mustache', { 'owners': context.owners, 'context': context }, function() {
                $.ajax({
                    url: apiServer + '/api/1.0/Users',
                    type: 'POST',
                    data: JSON.stringify( { 'users': context.owners } ),
                    contentType: 'application/json',
                    dataType: 'json',
                    success: function( owners ) {
                        for ( var index = 0; index < owners.length; ++index )
                        {
                            $( '#' + owners[ index ].hash + '-nickname' ).html( owners[ index ].nickname );
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

$('.grant-achievement-button').live( 'click', function( event ) {
    event.preventDefault();
    var button = this;
    var form = $( this ).parents( 'form:first' );
    
    $( button ).button( 'loading' );
    var contextId = $( form ).find( '#contextId' ).val();
    var achievementClassId = $( form ).find( '#achievementClassId' ).val();
    var hash = Crypto.MD5( $( form ).find( '#target' ).val().trim().toLowerCase() );

    $.ajax({
        url: apiServer + '/api/1.0/User/' + hash + '/Context/' + contextId + '/AchievementClass/' + achievementClassId,
        type: 'POST',
        dataType: 'json',
        success: function( context ) {
            $(button).button( 'complete' );
            setTimeout( function() {
                $(button).button( 'reset' );
            }, 2000 );
            
            $( form ).find( '#target' ).val( '' );
        },
        error: function( response, status, error ) {
            $( button ).button( 'reset' );
            console.log( error );
        }
    });
});
