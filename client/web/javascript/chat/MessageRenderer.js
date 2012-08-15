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
    M: "1m",
    MM: "%dm",
    y: "1y",
    yy: "%dy"
};

function escapeHTML( text ) {
    return text.replace( /&/g, "&amp;" ).replace( />/g, "&gt;" ).replace( /</g, "&lt;" );
}

function processTextHref(text, href) {
    if ( href )
    {
        if ( href.match( /(?:png|gif|jpg)$/i ) )
        {
            return '<a href="' + href + '" title="' + href + '" target="_blank"><img src="' + escapeHTML( text ) + '" /></a>';    
        }
		else if ( href.match( /(?:http?:\/\/)?(?:open\.)?spotify\.com\/track\/(\w*)/i ) )
		{
			var matched = href.match( /(?:http?:\/\/)?(?:open\.)?spotify\.com\/track\/(\w*)/i );
            console.log("FOUND A SPOTIFY: " + matched);
			
			if ( matched && matched.length == 2 )
            {
                return '<iframe src="https://embed.spotify.com/?theme=white&view=coverart&uri=spotify:track:' + matched[1] + '" width="250" height="80" frameborder="0" allowtransparency="true"></iframe>';
            }
            else
            {
                return '<a href="' + href + '" title="' + href + '" target="_blank">' + escapeHTML( text ) + '</a>';
            }
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
        else if ( href.match( /(?:https?:\/\/)?(?:www\.)?vimeo\.com\/.*?/i ) )
        {
            var matched = href.match( /(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(\w[\w|-]*)/i);
            if ( matched && matched.length == 2 )
            {
                return '<iframe src="http://player.vimeo.com/video/' + matched[1] + '?autoplay=0&amp;api=1" width="640" height="360" frameborder="0" webkitAllowFullScreen mozallowfullscreen allowFullScreen></iframe>';
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

var MessageRenderer = function() {
    var self = this;
    
    self.app = null;
    
    self.Bind = function( app ) {
        self.app = app;
    }
    
    self.Start = function() {
        self.app.socket.on( 'message', function( message ) {
            self.RenderMessage( message, true );
        });
        
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
                
            // TODO: render these, but make them look better somehow
            case 'join':
            case 'leave':
                return;
        }

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
                renderedMessage = $( '#chatlog' ).prepend( output );
            }
            
            self.app.events.emit( 'message rendered', message, renderedMessage );
            
            $( '#submit-message' ).button( 'reset' );
        });
    }
    
    self.UpdateMessageTimes = function() {

        $( '.message-time' ).each( function( index, element ) {
            $( element ).html( moment( $( element ).data( 'createdat' ) ).fromNow( true ) );
        });

        setTimeout( self.UpdateMessageTimes, 10000 );
    }
}