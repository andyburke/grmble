var mongoose = require( 'mongoose' );
var SimpleTimestamps = require( 'mongoose-SimpleTimestamps' ).SimpleTimestamps;

var dbURI = 'mongodb://' + config.mongo.host + ':' + config.mongo.port + '/' + config.mongo.name;
log.channels.db.info( 'Connecting to: ' + dbURI );

var connection = exports.connection = mongoose.createConnection( dbURI );

connection.on( 'error', function( error ) {
    log.channels.db.error( error );
});

connection.on( 'connected', function() {
    log.channels.db.info( 'Connected to db.' ); 
});

connection.on( 'disconnected', function() {
    log.channels.db.info( 'Disconnected from db.' ); 
});

connection.on( 'open', function() {
    log.channels.db.info( 'DB connection open.' );
});

connection.on( 'close', function() {
    log.channels.db.info( 'DB connection closed.' );
});

// TODO: make this be on the mongoose model prototype
var censor = exports.censor = function ( object, fields )
{
    var censored = {};
    for ( var key in ( object._doc || object ) )
    {
        if ( !( key in fields ) )
        {
            censored[ key ] = object[ key ];
        }
    }
    return censored;
}

var update = exports.update = function( object, parameters, handlers ) {
    for ( var key in handlers )
    {
        object[ key ] = handlers[ key ]( object, parameters );
    }

    for ( var key in ( object._doc || object ) )
    {
        if ( ( key in parameters ) && ( !handlers || !( key in handlers ) ) )
        {
            object[ key ] = parameters[ key ];
        }
    }
    
    if ( typeof( object.schema ) != 'undefined' )
    {
        for ( var key in object.schema.paths )
        {
            if ( !( key in ( object._doc || object ) ) && ( key in parameters ) )
            {
                object[ key ] = parameters[ key ];
            }
        }
    }
}

exports.AuthTokenSchema = new mongoose.Schema({
    token: { type: String, unique: true, index: true },
    ownerId: { type: mongoose.Schema.ObjectId, index: true },
    expires: { type: Date, default: null }
});
exports.AuthTokenSchema.plugin( SimpleTimestamps );
exports.AuthToken = connection.model( 'AuthToken', exports.AuthTokenSchema );

exports.UserSchema = new mongoose.Schema({
    email: { type: String, unique: true, index: true },
    hash: { type: String, unique: true, index: true },
    passwordHash: { type: String },
    nickname: { type: String },
    location: { type: String },
    bio: { type: String },
    stripeToken: { type: mongoose.Schema.Types.Mixed },
    stripeCustomer: { type: mongoose.Schema.Types.Mixed },
    avatar: { type: String }
});
exports.UserSchema.plugin( SimpleTimestamps );
exports.User = connection.model( 'User', exports.UserSchema );

exports.RoomSchema = new mongoose.Schema({
    name: { type: String, index: true },
    description: { type: String },
    tags: { type: Array, index: true },
    ownerId: { type: mongoose.Schema.ObjectId, index: true },
    isPublic: { type: Boolean },
    features: {
        users: { type: Number, default: 10 },
        logs: { type: Boolean, default: false },
        search: { type: Boolean, default: false }
    }
});
exports.RoomSchema.plugin( SimpleTimestamps );
exports.Room = connection.model( 'Room', exports.RoomSchema );

exports.MessageSchema = new mongoose.Schema({
    roomId: { type: mongoose.Schema.ObjectId, index: true },
    senderId: { type: mongoose.Schema.ObjectId, index: true },
    clientId: { type: String }, // the client id the message came from
    nickname: { type: String }, // just easier to toss this here than to require a lookup
    userHash: { type: String },
    avatar: { type: String },
    kind: { type: String },
    content: { type: String }
});
exports.MessageSchema.plugin( SimpleTimestamps );
exports.Message = connection.model( 'Message', exports.MessageSchema );

exports.StripeEventRecordSchema = new mongoose.Schema({
    json: { type: String } 
});
exports.StripeEventRecordSchema.plugin( SimpleTimestamps );
exports.StripeEventRecord = connection.model( 'StripeEventRecord', exports.StripeEventRecordSchema );
