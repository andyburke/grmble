var UserlistManager = function() {
    var self = this;
    
    self.app = null;
    self.userlistReceivedAt = 0;

    self.Bind = function( app ) {
        self.app = app;
    }
    
    self.Start = function() {
        self.app.socket.on( 'message', function( message ) {
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
    
            var now = new Date();
            if ( now.getTime() - self.userlistReceivedAt.getTime() > 5000 )
            {
                switch( message.kind )
                {
                    case 'join':
                        if ( $( 'userlist-entry-' + message.clientid ).length == 0 )
                        {
                            dust.render( 'userlist_entry', message, function( error, output ) {
                                if ( error )
                                {
                                    self.app.ShowError( error );
                                    return;
                                }
                                
                                $( '#userlist' ).append( output );
                            });
                        }
                        break;
                    
                    case 'leave':
                        $( '#userlist-entry-' + message.clientId ).remove();
                        break;
                }
            }
        });

        self.app.socket.on( 'userlist', function( userlist ) {
            self.userlistReceivedAt = new Date();
            $( '#userlist-container' ).spin( 'medium' );
            $( '#userlist' ).html( '' );
            for ( var index = 0; index < userlist.users.length; ++index )
            {
                dust.render( 'userlist_entry', userlist.users[ index ], function( error, output ) {
                    if ( error )
                    {
                        self.app.ShowError( error );
                        return;
                    }
                    
                    $( '#userlist' ).append( output );
                });
            }
            $( '#userlist-container' ).spin( false );
        });
        
    }
}