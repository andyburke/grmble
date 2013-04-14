module.exports = {
    
    server: {
        port: process.env[ 'GRMBLE_PORT' ] || 8000,
        sslport: process.env[ 'GRMBLE_SSL_PORT' ] || 4443
    },

    logging: {
        directory: ( process.env[ 'TMPDIR' ] || process.env[ 'TMP' ] || '/var/www' ) + '/log/grmble',
        
        loggly: {
            subdomain: 'grmble',
            inputTokens: {
                dev: '33ace2e4-1a1d-46d2-96c4-3afd8cb5a54d',
                live: 'e2fb7281-0a8b-4ec3-b08f-4ab8fd957650'
            }
        },
    },

    mongo: {
        host: process.env[ 'GRMBLE_MONGO_HOST' ] || 'localhost',
        port: process.env[ 'GRMBLE_MONGO_PORT' ] || 27017,
        password: process.env[ 'GRMBLE_MONGO_PASSWORD' ] || '',
        name: process.env[ 'GRMBLE_MONGO_DB' ] || 'grmble'
    },
    
    redis: {
        host: process.env[ 'GRMBLE_REDIS_HOST' ], // null is ok for redis, defaults to localhost
        port: process.env[ 'GRMBLE_REDIS_PORT' ], // null is ok for redis, defaults to 6379
        password: process.env[ 'GRMBLE_REDIS_PASSWORD' ],
        channel: process.env[ 'GRMBLE_REDIS_CHANNEL' ] || 'grmble'
    },
    
    mixpanel: {
        tokens: {
            dev: 'd93c1412753d4a961367d8473f9fa989',
            live: '1fdbd3dc858493c22714a3201e4a849f'
        }
    },
    
    stripe: {
        key: {
            test: 'sk_0AdmjFhYZOOR3vBlx6MZbsFsZC9dH',
            live: 'sk_0AdmGOIXPybWoYXpApGmD2SVxcvsr'
        },
        publishable: {
            test: 'pk_0AdmZd4S9SyrQ1jVNqTRwMFbkTnIp',
            live: 'pk_0Adma94adOR0ptE1zuquOXGx6R4kb'
        }
    },
    
    aws: {
        AccessKeyID: 'AKIAIDRUBGFV4WVHXWEQ',
        SecretKey: '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'
    },
    
    pricing: {
        privacy: 1,
        advertising: 1,
        logs: 1,
        search: 10
    }
}
