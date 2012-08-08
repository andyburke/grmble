var UserlistManager = function( app ) {
    var self = this;
    
    self.app = app;

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
        if ( now.getTime() - self.app.receivedUserlistAt.getTime() > 5000 )
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
    });
}