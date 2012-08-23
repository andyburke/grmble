var mongoose = require( 'mongoose' );

var stripe = require( 'stripe' )( config.stripe.key[ process.env[ 'GRMBLE_ENVIRONMENT' ] || 'test' ] );

require( 'date-utils' );
var nodemailer = require( 'nodemailer' );
var dust = require( 'dustjs-linkedin' );
var fs = require( 'fs' );

dust.loadSource( dust.compile( fs.readFileSync( 'templates/invite_email_text.dust', 'ascii' ), 'invite_email_text' ) );
dust.loadSource( dust.compile( fs.readFileSync( 'templates/invite_email_html.dust', 'ascii' ), 'invite_email_html' ) );

var smtpTransport = nodemailer.createTransport( 'SES', {
    AWSAccessKeyID: config.aws.AccessKeyID,
    AWSSecretKey: config.aws.SecretKey
});

var Rooms = function() {
    var self = this;

    self.GetURLs = function( obj ) {
        if ( !obj )
        {
            return {
                'room': '/api/1.0/Room',
                'rooms': '/api/1.0/Rooms',
                'myrooms': '/api/1.0/MyRooms'
            };
        }

        if ( obj instanceof models.Room )
        {
            return {
                'self': '/api/1.0/Room/' + obj._id,
                'invite': '/api/1.0/Room/' + obj._id + '/Invite'
            };
        }

        return {};
    };
    
    self.bind = function( app ) {
        app.post( '/api/1.0/Room', checks.user, function( request, response ) {
            
            var room = new models.Room();
            models.update( room, request.body, {
                ownerId: function( obj, params ) {
                    return request.user._id;
                }
            });
        
            room.save( function( error ) {
                if ( error )
                {
                    response.json( error.message ? error.message : error, 500 );
                    return;
                }
        
                response.json( app.WithURLs( request, room ) );
            });
        });
            
        app.get( '/api/1.0/Room/:roomId', function( request, response ) {
            models.Room.findById( request.params.roomId, function( error, room ) {
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
    
                response.json( app.WithURLs( request, room ) );           
            });
        });
    
        app.put( '/api/1.0/Room/:roomId', checks.user, checks.ownsRoom, function( request, response ) {
            
            var oldCost = 0;
            oldCost += request.room.features.logs ? config.pricing.logs : 0;
            oldCost += request.room.features.privacy ? config.pricing.privacy : 0;
            oldCost += request.room.features.advertising ? config.pricing.advertising : 0;
            oldCost += request.room.features.search ? config.pricing.search : 0;
            
            models.update( request.room, request.body );
            
            var totalCost = 0;
            totalCost += request.room.features.logs ? config.pricing.logs : 0;
            totalCost += request.room.features.privacy ? config.pricing.privacy : 0;
            totalCost += request.room.features.advertising ? config.pricing.advertising : 0;
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
            
                    response.json( app.WithURLs( request, request.room ) );
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
            else if ( request.user.stripeCustomer )
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

        app.post( '/api/1.0/Room/:roomId/Invite', checks.user, function( request, response ) {
            models.Room.findById( request.params.roomId, function( error, room ) {
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

                models.Invite.find( { senderId: request.user._id } ).sort( '-createdAt' ).limit( 1 ).exec( function( error, invites ) {
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

                    var invite = new models.Invite();
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
        
        // TODO: we will need some kind of filtering/cursoring here
        app.get( '/api/1.0/Rooms', function( request, response ) {
            models.Room.find( { 'features.privacy': false }, function( error, rooms ) {
                if ( error )
                {
                    response.json( error, 500 );
                    return;
                }
                
                response.json( app.WithURLs( request, rooms ) );
            });
        });
    
        app.get( '/api/1.0/MyRooms', checks.user, function( request, response ) {
            models.Room.find( { 'ownerId': request.user._id }, function( error, rooms ) {
                if ( error )
                {
                    response.json( error, 500 );
                    return;
                }
                
                response.json( app.WithURLs( request, rooms ) );
            });
        });
    }
    
}

module.exports = new Rooms();