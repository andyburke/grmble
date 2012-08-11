// finds the longest common substring in the given data set.
// takes an array of strings and a starting index
function longestInCommon(candidates, index) {
    var i, ch, memo;

    do {
        memo = null;
        for (i = 0; i < candidates.length; i++) {
            ch = candidates[i].charAt(index);
            if (!ch) { break };
            if (!memo) { memo = ch; }
            else if (ch != memo) { break; }
        }
    } while (i == candidates.length && ++index);

    return candidates[0].slice(0, index);
}

var TabCompletion = function() {
    var self = this;
    
    self.app = null;
    self.users = {};
    
    self.Bind = function( app ) {
        self.app = app;
    }
    
    self.Start = function() {
        self.app.socket.on( 'message', function( message ) {
            if ( message.kind == 'join' )
            {
                self.users[ message.nickname ] = true;
            }
            else if ( message.kind == 'leave' )
            {
                delete self.users[ message.nickname ];
            }
        });
        
        self.app.socket.on( 'userlist', function( userlist ) {
            self.users = {};
            for ( var index = 0; index < userlist.users.length; ++index )
            {
                self.users[ userlist.users[ index ].nickname ] = true;
            }
        });
        
        $( document ).on( 'keydown', '#message-entry-content', function( event ) {
            var keyCode = event.keyCode || event.which;
            if ( keyCode == 9 )
            {
                var value = $( this ).val();
                var candidates = [];
                var i;
        
                // ensure we have text, no text is selected, and cursor is at end of text
                if ( value.length > 0 && $( this )[0].selectionStart == $( this )[0].selectionEnd && $( this )[0].selectionStart == value.length )
                {
                    // filter names to find only strings that start with existing value
                    for ( var user in self.users )
                    {
                        if ( user.toLowerCase().indexOf( value.toLowerCase() ) == 0 && user.length >= value.length )
                        {
                            candidates.push( user );
                        }
                    }

                    if ( candidates.length > 0 )
                    {
                        if ( candidates.length == 1 )
                        {
                            $( this ).val( candidates[0] + ': ');
                        }
                        else
                        {
                            $( this ).val( longestInCommon( candidates, value.length ) );
                        }
                    }
                }
            
                return false;

            }
            
            return true;
        });
    }
}