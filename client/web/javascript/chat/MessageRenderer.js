moment.relativeTime = {
    future: "in %s",
    past: "%s ago",
    s: "now",
    m: "1m",
    mm: "%dm",
    h: "1h",
    hh: "%dh",
    d: "1d",
    dd: "%dd",
    M: "1M",
    MM: "%dM",
    y: "1Y",
    yy: "%dY"
};

var MessageRenderer = function() {
    var self = this;
    
    self.app = null;
    self.subscriptions = {};
    
    self.handlers = [];
    
    self.AddHandler = function( handler ) {
        for ( var index = 0; index < self.handlers.length; ++index )
        {
            if ( self.handlers[ index ] === handler )
            {
                return;
            }
        }
        
        self.handlers.push( handler );
    }
    
    self.RemoveHandler = function( handler ) {
        for ( var index = 0; index < self.handlers.length; ++index )
        {
            if ( self.handlers[ index ] === renderer )
            {
                self.handlers.splice( index, 1 );
                return;
            }
        }
    }
    
    self.Bind = function( app ) {
        self.app = app;
        
        self.app.events.addListener( 'client created', function() {
            self.app.client.subscribe( '/client/' + self.app.clientId, function( message ) {
                self.RenderMessage( message );
            });
        });
        
        self.app.events.addListener( 'joining room', function( room ) {
            self.subscriptions[ room._id ] = self.app.client.subscribe( '/room/' + room._id, function( message ) {
                self.RenderMessage( message, true );
            });
        });
        
        self.app.events.addListener( 'left room', function( room ) {
            if ( self.subscriptions[ room._id ] )
            {
                self.subscriptions[ room._id ].cancel();
                self.subscriptions[ room._id ] = null;
            }
        });
    }
    
    self.Start = function() {
        self.UpdateMessageTimes();
    }

    self.RenderMessage = function( message, append, callback ) {
        callback = callback || function() {};
        
        switch( message.kind )
        {
            case 'idle':
            case 'active':
            case 'startedTyping':
            case 'stoppedTyping':
            case 'cancelledTyping':
            case 'userlist':
            case 'error':
                return;
                
            // TODO: render these, but make them look better somehow
            case 'join':
            case 'leave':
                return;

            case 'say':
                // avoid duplicates
                if ( $( '#' + message._id ).length != 0 )
                {
                    return;
                }

                // TODO: move this to a handler
                message.processed = message.content == null ? null : linkify( message.content,  {
                    callback: function(text, href) {
                        if ( href )
                        {
                            
                            var result = '<a href="' + href + '" title="' + href + '" target="_blank">' + self.EscapeHTML( text ) + '</a>';

                            for ( var index = 0; index < self.handlers.length; ++index )
                            {
                                var handlerResult = null;
                                if ( ( handlerResult = self.handlers[ index ].Handle( href ) ) )
                                {
                                    result = handlerResult;
                                    break;
                                }
                            }

                            return result;
                        }
                    
                        return self.EscapeHTML( text );
                    }
                });
            
                message.time = moment( message.createdAt ).fromNow( true );
                dust.render( 'message', message, function( error, output ) {
                    if ( error )
                    {
                        self.app.ShowError( error );
                        callback( error, null );
                        return;
                    }
                    
                    var renderedMessage = null;
                    if ( append )
                    {
                        renderedMessage = $( '#chatlog' ).append( output );
                    }
                    else
                    {
                        var elements = $( '#chatlog' ).find( '.message' );
                        var inserted = false;
                        
                        for ( var index = 0; index < elements.length; ++index )
                        {
                            var time = $( elements[ index ] ).data( 'time' );
                            if ( time > message.createdAt )
                            {
                                renderedMessage = $( elements[ index ] ).before( output );
                                inserted = true;
                                break;
                            }
                        }
                        
                        if ( !inserted )
                        {
                            renderedMessage = $( '#chatlog' ).append( output );
                        }
                    }
                    
                    callback( null, renderedMessage );
                    
                    self.app.events.emit( 'message rendered', message, renderedMessage );
                });
                break;
        }
    }
    
    self.UpdateMessageTimes = function() {

        $( '.message-time' ).each( function( index, element ) {
            $( element ).html( moment( $( element ).data( 'createdat' ) ).fromNow( true ) );
        });

        setTimeout( self.UpdateMessageTimes, 10000 );
    }
    
    self.EscapeHTML = function ( text ) {
        return text.replace( /&/g, "&amp;" ).replace( />/g, "&gt;" ).replace( /</g, "&lt;" ).replace( /\n/g, "<br/>" );
    }

}