var mongoose = require( 'mongoose' );
var SimpleTimestamps = require( 'mongoose-SimpleTimestamps' ).SimpleTimestamps;

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

exports.AuthTokenSchema = new mongoose.Schema({
    token: { type: String, unique: true, index: true },
    owner: { type: mongoose.Schema.ObjectId, index: true },
    expires: { type: Date, default: null }
});
exports.AuthTokenSchema.plugin( SimpleTimestamps );
exports.AuthToken = mongoose.model( 'AuthToken', exports.AuthTokenSchema );

exports.UserSchema = new mongoose.Schema({
    email: { type: String, unique: true, index: true },
    hash: { type: String, unique: true, index: true },
    passwordHash: { type: String },
    nickname: { type: String },
    location: { type: String },
    bio: { type: String },
    facebookId: { type: String },
    twitterId: { type: String },
    avatar: { type: String }
});
exports.UserSchema.plugin( SimpleTimestamps );
exports.User = mongoose.model( 'User', exports.UserSchema );

exports.RoomSchema = new mongoose.Schema({
    name: { type: String, index: true },
    description: { type: String },
    tags: { type: Array, index: true },
    owners: { type: Array, index: true },
    isPublic: { type: Boolean },
    features: {
        users: { type: Number, default: 10 },
        logs: { type: Boolean, default: false },
        search: { type: Boolean, default: false }
    }
});
exports.RoomSchema.plugin( SimpleTimestamps );
exports.Room = mongoose.model( 'Room', exports.RoomSchema );

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
exports.Message = mongoose.model( 'Message', exports.MessageSchema );
