var Room = Backbone.Model.extend({
    defaults: {
        room: null,
        previousTitle: document.title
    },
    
    initialize: function( attributes ) {
        var self = this;
        self.set( attributes );
    },
    
    BindEvents: function() {
        var self = this;
        
        $( window ).bind( 'unload', self.Leave );
        Backbone.history.on( 'route', self.Leave );
        
        theApp.socket.on( 'message', self.HandleMessage );
    },

    UnbindEvents: function() {
        var self = this;
        
        $( window ).unbind( 'unload', self.Leave );
        Backbone.history.off( 'route', self.Leave );
        
        theApp.socket.removeListener( 'message', self.HandleMessage );
    },
    
    Join: function() {
        var self = this;
        
        document.title = room.name;

        theApp.socket.emit( 'message', {
            kind: 'join',
            roomId: self.get( 'room' )._id,
            senderId: theApp.user._id,
            nickname: theApp.user.nickname,
            userHash: theApp.user.hash,
            facebookId: theApp.user.facebookId,
            twitterId: theApp.user.twitterId,
            avatar: theApp.user.avatar,
            content: null
        });
        
        self.emit( 'join' );
    },
    
    Leave: function() {
        var self = this;
        
        theApp.socket.emit( 'message', {
            kind: 'leave',
            roomId: self.get( 'room' )._id,
            senderId: theApp.user._id,
            nickname: theApp.user.nickname,
            userHash: theApp.user.hash,
            facebookId: theApp.user.facebookId,
            twitterId: theApp.user.twitterId,
            avatar: theApp.user.avatar,
            content: null
        });

        document.title = self.get( 'previousTitle' );
        self.emit( 'leave' );
    },
    
    HandleMessage: function( message ) {
        // create a new message
        // add it to the message collection
    }

});

var RoomView = Backbone.View.extend({
    initialize: function () {
        var self = this;
        self.model.bind( 'change:room', _.bind( self.render, self ) );
        self.render();
    },

    el: '#main',

    events: {
    },

    render: function() {
        var self = this;
        $( self.el ).html( ich.room( { 'room': self.model.get( 'room' ) } ) );
    }
});


var currentRoom = null;
var currentRoomView = null;
var RoomRouter = Backbone.Router.extend({

    routes: {
        'Room/:roomId': 'Room'
    },
    
    Room: function( roomId ) {
        theApp.GetUser( function( user ) {
            if ( !user )
            {
                // TODO: redirect them?
            }
            
            JSONRequest({
                url: '/api/1.0/Room/' + roomId,
                type: 'GET',
                dataType: 'json',
                success: function( room ) {
                    currentRoom = new Room({
                        room: room
                    });
                    
                    currentRoomView = new RoomView({
                        model: currentRoom
                    });
                    
                    currentRoom.BindEvents();
                    currentRoom.Join();
                    currentRoom.on( 'leave', function() {
                        currentRoom.UnbindEvents(); 
                    });
                },
                error: function( xhr ) {
                    alert( xhr.responseText );
                }
            });
            
        });
    }
});
