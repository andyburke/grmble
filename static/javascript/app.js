var App = function() {
    var self = this;
    
    self.router = new Backbone.Router();

    self.Start = function() {
        Backbone.history.start();
    }
}

var theApp = new App();
