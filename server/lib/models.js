var mongoose = require( 'mongoose' );
var SimpleTimestamps = require( 'mongoose-SimpleTimestamps' ).SimpleTimestamps;

mongoose.set('debug', true);

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

exports.Init = function( connection ) {
    exports.UserSchema = new mongoose.Schema({
        email: { type: String, unique: true, index: true, select: false },
        hash: { type: String, unique: true, index: true },
        passwordHash: { type: String, select: false },
        nickname: { type: String },
        location: { type: String },
        bio: { type: String },
        stripeToken: { type: mongoose.Schema.Types.Mixed, select: false },
        stripeCustomer: { type: mongoose.Schema.Types.Mixed, select: false },
        avatar: { type: String }
    });
    exports.UserSchema.plugin( SimpleTimestamps );
    exports.User = connection.model( 'User', exports.UserSchema );
    
    exports.AuthTokenSchema = new mongoose.Schema({
        token: { type: String, unique: true, index: true },
        owner: { type: mongoose.Schema.ObjectId, index: true, ref: 'User' },
        expires: { type: Date, default: null }
    });
    exports.AuthTokenSchema.plugin( SimpleTimestamps );
    exports.AuthToken = connection.model( 'AuthToken', exports.AuthTokenSchema );
    
    exports.RoomSchema = new mongoose.Schema({
        owner: { type: mongoose.Schema.ObjectId, index: true, ref: 'User' },
        name: { type: String, index: true },
        description: { type: String },
        tags: { type: Array, index: true },
        image: { type: String },
        features: {
            privacy: { type: Boolean, default: false },
            advertising: { type: Boolean, default: true },
            logs: { type: Boolean, default: false },
            search: { type: Boolean, default: false }
        }
    });
    exports.RoomSchema.plugin( SimpleTimestamps );
    exports.Room = connection.model( 'Room', exports.RoomSchema );
    
    exports.RoomDynamicsSchema = new mongoose.Schema({
        room: { type: mongoose.Schema.ObjectId, index: true, ref: 'Room' },
        users: { type: Number, default: 0, min: 0 },
        messages: { type: Number, default: 0, min: 0 },
        privacy: { type: Boolean, default: false, index: true }, // duplicated from room
        tags: { type: Array, index: true } // duplicated from room
    });
    exports.RoomDynamicsSchema.plugin( SimpleTimestamps );
    exports.RoomDynamics = connection.model( 'RoomDynamics', exports.RoomDynamicsSchema );
    
    exports.MessageSchema = new mongoose.Schema({
        room: { type: mongoose.Schema.ObjectId, index: true, ref: 'Room' },
        sender: { type: mongoose.Schema.ObjectId, index: true, ref: 'User' },
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
    
    exports.InviteSchema = new mongoose.Schema({
        sender: { type: mongoose.Schema.ObjectId, index: true, ref: 'User' },
        email: { type: String, index: true },
        room: { type: mongoose.Schema.ObjectId, index: true, ref: 'Room' }
    });
    exports.InviteSchema.plugin( SimpleTimestamps );
    exports.Invite = connection.model( 'Invite', exports.InviteSchema );
}
