module.exports = {
    
    server: {
        port: process.env[ 'GRUMBLE_PORT' ] || 8000
    },

    logging: {
        directory: ( process.env[ 'TMPDIR' ] || process.env[ 'TMP' ] ) + '/log/grumble',
        
        loggly: {
            subdomain: 'grumble',
            inputToken: '90b1efe8-eddb-4826-a705-0f218aa1e720'
        },
        
    },

    db: {
        host: process.env[ 'GRUMBLE_MONGO_HOST' ] || 'localhost',
        port: process.env[ 'GRUMBE_MONGO_PORT' ] || 27017,
        password: process.env[ 'GRUMBLE_MONGO_PASSWORD' ] || '',
        name: process.env[ 'GRUMBE_MONGO_DB' ] || 'grumble'
    },
    
    mixpanel: {
        id: ''
    }
}
