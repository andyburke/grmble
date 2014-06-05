var uuid = require( 'node-uuid' );

module.exports = function( request ) {
    var socket = request.socket.socket ? request.socket.socket : request.socket;
    
    return {
        ip: request.ip ? request.ip : socket.remoteAddress,
        date: new Date().toUTCString(),
        request: {
            method: request.method,
            url: request.url,
            version: "HTTP/" + request.httpVersion,
            protocol: "HTTP" + ( request.connection.encrypted ? 'S' : '' ),
            agent: request.headers[ 'user-agent' ]
        },
        status: request.res.statusCode,
        responseTime: request.__startTime ? new Date() - request.__startTime : -1,
        bytesSent: socket.bytesWritten,
        referrer: request.headers[ 'referer' ] || request.headers[ 'referrer' ],
        id: uuid.v4()
    }
}