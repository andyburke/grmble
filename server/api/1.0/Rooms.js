var mongoose = require( 'mongoose' );

require( 'date-utils' );
var nodemailer = require( 'nodemailer' );
var dust = require( 'dustjs-linkedin' );
var fs = require( 'fs' );

dust.loadSource( dust.compile( fs.readFileSync( 'templates/invite_email_text.dust', 'ascii' ), 'invite_email_text' ) );
dust.loadSource( dust.compile( fs.readFileSync( 'templates/invite_email_html.dust', 'ascii' ), 'invite_email_html' ) );

var Rooms = module.exports = function( options ) {
    var self = this;

    var stripe = require( 'stripe' )( options.config.stripe.key[ process.env[ 'GRMBLE_ENVIRONMENT' ] || 'test' ] );
    
    // TODO: get this out of here, either raise an invite event or move this into some wrapper
    //       so we're not setting up the same thing in a few places
    var smtpTransport = nodemailer.createTransport( 'SES', {
        AWSAccessKeyID: options.config.aws.AccessKeyID,
        AWSSecretKey: options.config.aws.SecretKey
    });

    options.app.post( '/api/1.0/Room', options.checks.user, function( request, response ) {
        
        var room = new options.models.Room();
        options.models.update( room, request.body, {
            owner: function( obj, params ) {
                return request.user._id;
            }
        });
    
        room.save( function( error ) {
            if ( error )
            {
                response.json( error.message ? error.message : error, 500 );
                return;
            }
    
            response.json( room.toObject() );
        });
    });
        
    options.app.get( '/api/1.0/Room/:roomId', function( request, response ) {
        options.models.Room.findById( request.params.roomId, function( error, room ) {
            if ( error )
            {
                response.json( error, 500 );
                return;
            }
            
            if ( !room )
            {
                response.json( 'No room found with id: ' + request.params.roomId, 404 );
                return;
            }

            response.json( room.toObject() );
        });
    });

    options.app.put( '/api/1.0/Room/:roomId', options.checks.user, options.checks.ownsRoom, function( request, response ) {
        
        var oldCost = 0;
        oldCost += request.room.features.logs ? config.pricing.logs : 0;
        oldCost += request.room.features.privacy ? config.pricing.privacy : 0;
        oldCost += request.room.features.advertising ? 0 : config.pricing.advertising;
        oldCost += request.room.features.search ? config.pricing.search : 0;
        
        options.models.update( request.room, request.body );
        
        var totalCost = 0;
        totalCost += request.room.features.logs ? config.pricing.logs : 0;
        totalCost += request.room.features.privacy ? config.pricing.privacy : 0;
        totalCost += request.room.features.advertising ? 0 : config.pricing.advertising;
        totalCost += request.room.features.search ? config.pricing.search : 0;

        if ( totalCost > 0 && !request.user.stripeToken )
        {
            response.json( { 'error': 'no billing info', 'message': 'You must have billing info associated with your account to add these settings to your room.' }, 403 );
            return;
        }

        function SaveRoom() {
            request.room.save( function( error ) {
                if ( error )
                {
                    response.json( error.message ? error.message : error, 500 );
                    return;
                }
        
                response.json( request.room.toObject() );
            });
        }

        var planId = 'sub_' + ( totalCost * 100 );
        if ( !request.user.stripeCustomer && totalCost > 0 )
        {
            var planId = 'sub_' + ( totalCost * 100 );
            stripe.plans.create({
                id: planId,
                amount: totalCost * 100,
                currency: 'usd',
                interval: 'month',
                name: 'Grmble Monthly Subscription'
            }, function( error ) {
                if ( error && ( !error.response || !error.response.error || !error.response.error.message || error.response.error.message != 'Plan already exists.' ) )
                {
                    response.json( error, 500 );
                    return;
                }
                
                stripe.customers.create({
                    card: request.user.stripeToken.id,
                    email: request.user.email,
                    description: request.user.nickname,
                    plan: planId
                }, function( error, customer ) {
                    if ( error )
                    {
                        response.json( error, 500 );
                        return;
                    }
             
                    request.user.stripeCustomer = customer;
                    request.user.markModified( 'stripeCustomer' );
                    request.user.save( function( error ) {
                        if ( error )
                        {
                            response.json( error, 500 );
                            return;
                        }
                        
                        SaveRoom();
                    });
                });
            });
        }
        else if ( request.user.stripeCustomer && ( oldCost != totalCost ) )
        {
            stripe.customers.cancel_subscription( request.user.stripeCustomer.id, false, function( error ) {
                if ( error && ( !error.statusCode || error.statusCode != 404 ) )
                {
                    response.json( error, 500 );
                    return;
                }
                
                if ( totalCost > 0 )
                {
                    stripe.plans.create({
                        id: planId,
                        amount: totalCost * 100,
                        currency: 'usd',
                        interval: 'month',
                        name: 'Grmble Monthly Subscription'
                    }, function( error ) {
                        if ( error && ( !error.response || !error.response.error || !error.response.error.message || error.response.error.message != 'Plan already exists.' ) )
                        {
                            response.json( error, 500 );
                            return;
                        }
                        
                        stripe.customers.update_subscription( request.user.stripeCustomer.id, {
                            plan: planId
                        }, function( error ) {
                            if ( error )
                            {
                                response.json( error, 500 );
                                return;
                            }
                            
                            SaveRoom();
                        });
                    });
                }
                else
                {
                    SaveRoom();
                }
            });
        }
        else
        {
            SaveRoom();
        }
    });

    options.app.get( '/api/1.0/Room/:roomId/Dynamics', function( request, response ) {
        options.models.RoomDynamics.findOne( { room: request.param( 'roomId' ) } ).lean().exec( function( error, roomDynamics ) {
            if ( error )
            {
                response.json( error, 500 );
                return;
            }
            
            if ( !roomDynamics )
            {
                response.json( 'No room dynamis found for room with id: ' + request.param( 'roomId' ), 404 );
                return;
            }

            response.json( roomDynamics );
        });
    });
    
    options.app.post( '/api/1.0/Room/:roomId/Invite', options.checks.user, function( request, response ) {
        options.models.Room.findById( request.params.roomId, function( error, room ) {
            if ( error )
            {
                response.json( error, 500 );
                return;
            }
            
            if ( !room )
            {
                response.json( 'No room found with id: ' + request.params.roomId, 404 );
                return;
            }

            options.models.Invite.find( { senderId: request.user._id } ).sort( '-createdAt' ).limit( 1 ).exec( function( error, invites ) {
                if ( error )
                {
                    response.json( error, 500 );
                    return;
                }
                
                if ( invites.length )
                {
                    if ( new Date() - invites[ 0 ].createdAt < 10000 )
                    {
                        response.json( { 'error': 'invite spam', 'message': 'You must wait 10 seconds to send another invite.' }, 400 );
                        return;
                    }
                }

                var invite = new options.models.Invite();
                invite.senderId = request.user._id;
                invite.email = request.param( 'email' ).toLowerCase().trim();
                invite.roomId = room._id;
                invite.save( function( error ) {
                    if ( error )
                    {
                        response.json( error, 500 );
                        return;
                    }
                    
                    // TODO: https, not just generate this link this way
                    var link = 'http://' + request.headers.host + '/#/Room/' + room._id;
                    var data = {
                        link: link,
                        message: request.param( 'message' ),
                        user: request.user,
                        room: room
                    };

                    dust.render( 'invite_email_text', data, function( error, text ) {
                        if ( error )
                        {
                            response.json( error, 500 )
                            return;
                        }
                        
                        dust.render( 'invite_email_html', data, function( error, html ) {
                            if ( error )
                            {
                                response.json( error, 500 )
                                return;
                            }

                            smtpTransport.sendMail({
                                from: "Grmble <support@grmble.com>",
                                to: invite.email,
                                subject: "Come chat with " + request.user.nickname + " on Grmble.com!",
                                text: text,
                                html: html
                            }, function( error, smtpResponse ) {
                                if ( error )
                                {
                                    response.json( error, 500 );
                                    return;
                                }

                                response.json( { 'sent': true } );
                            });
                        });
                    });
                    
                });
            });
        });
    });
    
    options.app.get( '/api/1.0/Rooms', options.utils.query.HandleSearchParams, function( request, response ) {
        var criteria = {
            'room.features.privacy': false
        };
        
        if ( request.param( 'tags' ) )
        {
            criteria[ 'tags' ] = { $in: request.param( 'tags' ).split( ',' ) };
        }
        
        var query = options.models.Room.find( criteria );
        
        query.limit( request.query.limit );
        query.skip( request.query.offset );
        query.gt( 'createdAt', request.query.createdSince );
        query.lt( 'createdAt', request.query.createdUntil );

        var sort = {};
        sort[ request.query.sortBy ] = request.query.sort;
        query.sort( sort );
        
        query.lean().exec( function( error, rooms ) {
            if ( error )
            {
                response.json( error.message || error, 500 );
                return;
            }

            response.json( rooms );
        });
    });

    options.app.get( '/api/1.0/MyRooms', options.checks.user, function( request, response ) {
        options.models.Room.find( { owner: request.user._id } ).lean().exec( function( error, rooms ) {
            if ( error )
            {
                response.json( error, 500 );
                return;
            }
            
            response.json( rooms );
        });
    });
    
    options.app.get( '/api/1.0/RoomDynamics', options.utils.query.HandleSearchParams, function( request, response ) {
        var criteria = {
            privacy: false
        };
        
        if ( request.param( 'tags' ) )
        {
            criteria[ 'tags' ] = { $in: request.param( 'tags' ).split( ',' ) };
        }
        
        var query = options.models.RoomDynamics.find( criteria ).populate( 'room' );
        
        query.limit( request.query.limit );
        query.skip( request.query.offset );
        query.gt( 'createdAt', request.query.createdSince );
        query.lt( 'createdAt', request.query.createdUntil );

        var sort = {};
        sort[ request.query.sortBy ] = request.query.sort;
        query.sort( sort );
        
        query.lean().exec( function( error, roomDynamicList ) {
            if ( error )
            {
                response.json( error.message || error, 500 );
                return;
            }
            
            response.json( roomDynamicList );
        });
    });

}

Rooms.prototype.Interface = {
    rooms: {
        room: '/api/1.0/Room',
        search: '/api/1.0/Rooms',
        searchdynamics: '/api/1.0/RoomDynamics',
        mine: '/api/1.0/MyRooms',
        dynamics: '/api/1.0/Room/{{roomid}}/Dynamics',
        invite: '/api/1.0/Room/{{roomid}}/Invite'
    }
};