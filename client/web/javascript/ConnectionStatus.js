var ConnectionStatus = Backbone.Model.extend({
    defaults: {
        socket: null,
        connected: false
    },
    
    initialize: function( attributes ) {
        var self = this;
        
        function OnSocketChanged() {
            function OnConnect() {
                self.set( 'connected', true );
            }
    
            function OnDisconnect() {
                self.set( 'disconnected', true );
            }
            
            var oldSocket = self.previous( 'socket' );
            if ( oldSocket )
            {
                oldSocket.removeListener( 'connect', OnConnect );
                oldSocket.removeListener( 'disconnect', OnDisconnect );
            }
            
            var socket = self.get( 'socket' );
            if ( socket )
            {
                socket.on( 'connect', OnConnect );
                socket.on( 'disconnect', OnDisconnect );
            }
    
            self.set( 'connected', socket && socket.socket.connected );
        }
        
        self.bind( 'change:socket', OnSocketChanged );
        self.set( attributes );
        OnSocketChanged();
    }
});

var ConnectionStatusView = Backbone.View.extend({
    initialize: function () {
        var self = this;
        self.model.bind( 'change', _.bind( self.render, self ) );
        self.render();
    },

    el: '#server-connection-status',

    events: {
    },

    render: function() {
        var self = this;
        var connected = self.model.get( 'connected' );
        $( self.el ).attr( 'class', connected ? 'icon-signal icon-white' : 'icon-ban-circle icon-white' );
        if ( !connected )
        {
            self.HighlightDisconnected();
        }
    },
    
    HighlightDisconnected: function() {
        var self = this;
        
        if ( self.model.get( 'connected' ) == true )
        {
            $( self.el ).css( 'opacity', 1.0 );
            return;
        }
        
        $( self.el ).animate( { opacity: 0.2 }, 500, function() {
            $( self.el ).animate( { opacity: 1.0 }, 500, function() {
                self.HighlightDisconnected();
            });
        });
    }

    
});
