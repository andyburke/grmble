var CreateRoom = function() {
    var self = this;
    
    self.app = null;
    self.router = null;
    
    self.Bind = function( app, router ) {
        self.app = app;
        self.router = router;
        
        self.router.on( '/CreateRoom', function() {
            mixpanel.track( "View: CreateRoom" );
            self.app.events.emit( 'navigated', 'createroom' );
            
            dust.render( 'create_room', {}, function( error, output ) {
                if ( error )
                {
                    self.app.ShowError( error );
                    return;
                }
            
                $( '#main' ).html( output );
            });
        });
        

        $( document ).on( 'click', '.button-create-room', function( event ) {
            event.preventDefault();
            var form = $(this).parents( 'form:first' );
        
            $(form).spin( 'medium' );
        
            var name = $(form).find( '#name' ).val();
            var description = $(form).find( '#description' ).val();
            var tags = $(form).find( '#tags' ).val().split( new RegExp( '[,;]' ) ).map( function( tag ) { return tag.trim(); } ) || [];
            var isPublic = $(form).find( '#protection' ).val() == 'Public';
            
            self.app.GetAPI( function( api ) {
                jsonCall({
                    url: api.room,
                    type: 'POST',
                    data: {
                        'name': name,
                        'description': description,
                        'tags': tags,
                        'isPublic': isPublic
                    },
                    cache: false,
                    success: function( room ) {
                        $(form).spin( false );
                        
                        window.location.hash = '/ManageRoom/' + room._id;
                    },
                    error: function( response, status, error ) {
                        $(form).spin( false );
                        self.app.ShowError( response.responseText );
                    }
                });
            });
        });
    }
}
