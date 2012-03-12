var mongoose = require( 'mongoose' );
var MongooseTypes = require( 'mongoose-types' );
MongooseTypes.loadTypes( mongoose );
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

exports.UserSchema = new mongoose.Schema({
    email: { type: String, unique: true, index: true },
    passwordHash: { type: String },
    nickname: { type: String }
});
exports.UserSchema.plugin( SimpleTimestamps );
exports.User = mongoose.model( 'User', exports.UserSchema );

exports.RoomSchema = new mongoose.Schema({
    name: { type: String, index: true },
    owners: { type: Array, index: true },
    isPublic: { type: Boolean }
});
exports.RoomSchema.plugin( SimpleTimestamps );
exports.Room = mongoose.model( 'Room', exports.RoomSchema );

exports.MessageSchema = new mongoose.Schema({
    roomId: { type: mongoose.Schema.ObjectId, index: true },
    senderId: { type: mongoose.Schema.ObjectId, index: true },
    nickname: { type: String }, // just easier to toss this here than to require a lookup
    kind: { type: String },
    content: { type: String }
});
exports.MessageSchema.plugin( SimpleTimestamps );
exports.Message = mongoose.model( 'Message', exports.MessageSchema );
