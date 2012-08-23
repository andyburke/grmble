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

function escapeHTML( text ) {
    return text.replace( /&/g, "&amp;" ).replace( />/g, "&gt;" ).replace( /</g, "&lt;" ).replace( /\n/g, "<br/>" );
}

function processTextHref(text, href) {
    if ( href )
    {
        var result = '<a href="' + href + '" title="' + href + '" target="_blank">' + escapeHTML( text ) + '</a>';
        if ( href.match( /(?:png|gif|jpg)$/i ) )
        {
            result = '<a href="' + href + '" title="' + href + '" target="_blank"><img class="dynamic-embed" src="' + escapeHTML( text ) + '" /></a>';
        }
        else if ( href.match( /(?:http?:\/\/)?(?:open\.)?spotify\.com\/track\/(\w*)/i ) )
        {
            var matched = href.match( /(?:http?:\/\/)?(?:open\.)?spotify\.com\/track\/(\w*)/i );

            if ( matched && matched.length == 2 )
            {
                result = '<iframe class="dynamic-embed" src="https://embed.spotify.com/?theme=white&view=coverart&uri=spotify:track:' + matched[1] + '" width="250" height="80" frameborder="0" allowtransparency="true"></iframe>';
            }
        }
        else if ( href.match( /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?.*?v=\S+/i ) )
        {
            var matched = href.match( /[\?|\&]v=(\w[\w|-]*)/i );
            if ( matched && matched.length == 2 )
            {
                result = '<iframe class="youtube-player dynamic-embed" type="text/html" width="640" height="360" src="http://www.youtube.com/embed/' + matched[ 1 ] + '?wmode=transparent" frameborder="0"></iframe>';
            }
        }
        else if ( href.match( /(?:https?:\/\/)?(?:www\.)?youtu\.be\/.*?/i ) )
        {
            var matched = href.match( /(?:https?:\/\/)?(?:www\.)?youtu\.be\/(\w[\w|-]*)/i );
            if ( matched && matched.length == 2 )
            {
                result = '<iframe class="youtube-player dynamic-embed" type="text/html" width="640" height="360" src="http://www.youtube.com/embed/' + matched[ 1 ] + '?wmode=transparent" frameborder="0"></iframe>';
            }
        }
        else if ( href.match( /(?:https?:\/\/)?(?:www\.)?vimeo\.com\/.*?/i ) )
        {
            var matched = href.match( /(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(\w[\w|-]*)/i);
            if ( matched && matched.length == 2 )
            {
                result = '<iframe class="dynamic-embed" src="http://player.vimeo.com/video/' + matched[1] + '?autoplay=0&amp;api=1" width="640" height="360" frameborder="0" webkitAllowFullScreen mozallowfullscreen allowFullScreen></iframe>';
            }
        }
        
        return result;
    }

    return escapeHTML( text );
}

var MessageRenderer = function() {
    var self = this;
    
    self.app = null;
    self.subscriptions = {};
    
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

    self.RenderMessage = function( message, append ) {
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
                        return processTextHref(text, href);
                    }
                });
        
                message.time = moment( message.createdAt ).fromNow( true );
                dust.render( 'message', message, function( error, output ) {
                    if ( error )
                    {
                        self.app.ShowError( error );
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
}