var ManageRoom = function() {
    var self = this;
    
    self.app = null;
    self.router = null;
    
    self.Bind = function( app, router ) {
        self.app = app;
        self.router = router;
        
        self.router.on( '/ManageRoom/:roomId', function( roomId ) {
            mixpanel.track( "View: ManageRoom", {
                roomId: roomId
            });
            self.app.events.emit( 'navigated', 'manageroom' );

            self.app.GetRoom( roomId, function( room, error ) {
                if ( error )
                {
                    self.app.ShowError( error );
                    return;
                }

                room.joinedTags = room.tags.join( ', ' );

                dust.render( 'manage_room', room, function( error, output ) {
                    if ( error )
                    {
                        self.app.ShowError( error );
                        return;
                    }
                
                    $( '#main' ).html( output );

                    $( '#ownerlist' ).spin( 'medium' );
    
                    self.app.GetAPI( function( api ) {
                        jsonCall({
                            url: api.users,
                            type: 'GET',
                            data: {
                                'users': room.owners.join( ',' )
                            },
                            success: function( owners ) {
                                for ( var index = 0; index < owners.length; ++index )
                                {
                                    $( '#' + owners[ index ]._id + '-nickname' ).html( owners[ index ].nickname );
                                }
                                $( '#ownerlist' ).spin( false ); 
                            },
                            error: function( response, status, error ) {
                                $( '#ownerlist' ).spin( false );
                                self.app.ShowError( response.responseText );
                            }
                        });
                    });
                });
            });
        });
        
        $( document ).on( 'click', '.update-room-button', function( event ) {
            event.preventDefault();
            var button = this;
            var form = $(this).parents( 'form:first' );
        
            var toBeUpdated = {};
        
            var roomId = $(form).find( '#_id' ).val();
            self.app.GetRoom( roomId, function( room, error ) {
                if ( error )
                {
                    self.app.ShowError( error );
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
            
                    jsonCall({
                        url: room.urls.self,
                        type: 'PUT',
                        data: toBeUpdated,
                        success: function( room ) {
                            self.app.rooms[ room._id ] = room;
                            $(form).spin( false );
                            $(button).button( 'complete' );
                            setTimeout( function() {
                                $(button).button( 'reset' );
                            }, 2000 );
                        },
                        error: function( response, status, error ) {
                            $(form).spin( false );
                            self.app.ShowError( response.responseText );
                            $(button).button( 'reset' );
                        }
                    });
            
                    break; // we break, no matter what, because we just wanted to see if there was a key in toBeUpdated
                }
            });
        });
        
        $( document ).on( 'click', '.reset-room-button', function( event ) {
            event.preventDefault();
            var form = $(this).parents( 'form:first' );
        
            // TODO: prompt for confirmation, maybe use bootstrap-modal.js?
            
            var roomId = $(form).find( '#_id' ).val();
            self.app.GetRoom( roomId, function( room, error ) {
                if ( error )
                {
                    self.app.ShowError( error );
                    return;
                }

                $( form ).find( 'input[type=text]' ).each( function( index, input ) {
                    
                    if ( input.id == 'tags' )
                    {
                        $( input ).val( input.id in room ? room[ input.id ].join( ', ' ) : '' );
                        return;
                    }
                    
                    $( input ).val( input.id in room ? room[ input.id ] : '' );
                    $( input ).html( input.id in room ? room[ input.id ] : '' );
                });
            });
        });
        
        $( document ).on( 'click', '.add-room-owner-button', function( event ) {
            event.preventDefault();
            var button = this;    
            var form = $( this ).parents( 'form:first' );
            
            $( button ).button( 'loading' );
            var roomId = $( form ).find( '#roomId' ).val();
            var hash = md5( $( form ).find( '#newowner' ).val().trim().toLowerCase() );
        
            self.app.GetRoom( roomId, function( room, error) {
                if ( error )
                {
                    self.app.ShowError( error );
                    return;
                }

                self.app.GetAPI( function( api ) {
                    jsonCall({
                        url: api.userbyhash + '/' + hash,
                        type: 'GET',
                        success: function( user ) {
                            jsonCall({
                                url: room.urls.owners + '/' + user._id,
                                type: 'POST',
                                success: function( room ) {
                                    self.app.rooms[ room._id ] = room;
            
                                    $(button).button( 'complete' );
                                    setTimeout( function() {
                                        $(button).button( 'reset' );
                                    }, 2000 );
                                    
                                    $( form ).find( '#newowner' ).val( '' );
                        
                                    $( '#ownerlist' ).spin( 'medium' );
            
                                    dust.render( 'owner_list', room, function( error, output ) {
                                        if ( error )
                                        {
                                            self.app.ShowError( error );
                                            return;
                                        }
                                    
                                        $( '#ownerlist' ).html( output );
                                    
                                        self.app.GetAPI( function( api ) {
                                            jsonCall({
                                                url: api.users,
                                                type: 'GET',
                                                data: {
                                                    'users': room.owners.join( ',' )
                                                },
                                                success: function( owners ) {
                                                    for ( var index = 0; index < owners.length; ++index )
                                                    {
                                                        $( '#' + owners[ index ]._id + '-nickname' ).html( owners[ index ].nickname );
                                                    }
                                                    $( '#ownerlist' ).spin( false );
                                                },
                                                error: function( response, status, error ) {
                                                    $( '#ownerlist' ).spin( false );
                                                    self.app.ShowError( response.responseText );
                                                }
                                            });
                                        });
                                    });
                                },
                                error: function( response, status, error ) {
                                    $( button ).button( 'reset' );
                                    self.app.ShowError( response.responseText );
                                }
                            });
                        },
                        error: function( xhr ) {

                            $(button).button( 'reset' );
                            
                            if ( xhr.status == 404 )
                            {
                                self.app.ShowError( 'That user has not signed up, please invite them. TODO: improve this' );
                                return;
                            }

                            self.app.ShowError( xhr.responseText );
                        }
                    });
                });
            });
        });
        
        $( document ).on( 'click', '.remove-room-owner-link', function( event ) {
            event.preventDefault();
            var link = this;
            
            jsonCall({
                url: link.href,
                type: 'DELETE',
                success: function( room ) {
                    self.app.rooms[ room._id ] = room;
                    
                    $( '#ownerlist' ).spin( 'medium' );
                    dust.render( 'owner_list', room, function( error, output ) {
                        if ( error )
                        {
                            self.app.ShowError( error );
                            return;
                        }
                    
                        $( '#ownerlist' ).html( output );
                    
                        self.app.GetAPI( function( api ) {
                            jsonCall({
                                url: api.users,
                                type: 'GET',
                                data: {
                                    'users': room.owners.join( ',' )
                                },
                                success: function( owners ) {
                                    for ( var index = 0; index < owners.length; ++index )
                                    {
                                        $( '#' + owners[ index ]._id + '-nickname' ).html( owners[ index ].nickname );
                                    }
                                    $( '#ownerlist' ).spin( false ); 
                                },
                                error: function( response, status, error ) {
                                    $( '#ownerlist' ).spin( false );
                                    self.app.ShowError( response.responseText );
                                }
                            });
                        });
                    });
                },
                error: function( response, status, error ) {
                    console.log( error );
                }
            });
        });

    }
}
