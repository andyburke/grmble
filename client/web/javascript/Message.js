var Message = Backbone.Model.extend({
    defaults: {
    },
    
    initialize: function( attributes ) {
        var self = this;
        self.set( attributes );
    }
});

var MessageView = Backbone.View.extend({
    initialize: function () {
        var self = this;
        self.el = '#' + self.model.get( '_id' );
        self.model.bind( 'change', _.bind( self.render, self ) );
        self.render();
    },

    events: {
    },

    render: function() {
        var self = this;
        $( self.el ).html( ich.message( self.model.attributes ) );
    }
});

var MessageList = Backbone.Collection.extend({
    model: Message,
  
    comparator: function( message ) {
        return message.get( "createdAt" );
    }
});

var MessageListView = Backbone.View.extend({
    initialize: function( messageList ) {
        var self = this;
        
        _.bindAll( this, 'render' );

        this.messages = messageList;

        this.messages.bind( 'add', function( message, options ) {
            self.render( 'add', message, options );
        });

        this.messages.bind( 'remove', function( message, options ) {
            self.render( 'remove', message, options );
        });
    },
    
    events: {
    },

    render: function( action, message, options ) {
        if ( action )
        {
            // add/remove message as necessary
        }
        else
        {
            // render whole list   
        }
    },

});    
});
