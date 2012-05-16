var Room = Backbone.Model.extend({
    defaults: {
        room: null,
        messages: []
    },
    
    initialize: function( attributes ) {
        var self = this;
        self.set( attributes );
    }
});

var RoomView = Backbone.View.extend({
    initialize: function () {
        var self = this;
        self.model.bind( 'change:room', _.bind( self.render, self ) );
        self.model.bind( 'change:messages', _.bind( self.renderMessages, self ) );
        self.render();
    },

    el: '#main',

    events: {
    },

    render: function() {
        var self = this;
        $( self.el ).html( ich.room( { 'room': self.model.get( 'room' ) } ) );
    },
    
    renderMessages: function() {
        
    }
    
});


var currentRoomView = null;
var RoomRouter = Backbone.Router.extend({

    routes: {
        'Room/:roomId': 'Room'
    },
    
    Room: function( roomId ) {
        JSONRequest({
            url: '/api/1.0/Room/' + roomId,
            type: 'GET',
            dataType: 'json',
            success: function( room ) {
                currentRoomView = new RoomView({
                    model: new Room({
                        room: room
                    })
                });
            },
            error: function( xhr ) {
                alert( xhr.responseText );
            }
        });
    }
});
