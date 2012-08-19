Grmble
====

#### Getting Started

 * install node (http://nodejs.org/)
 * install mongo (http://www.mongodb.org/downloads)
 * install redis (http://redis.io/download)
 * clone the code: git clone git@github.com:andyburke/grmble.git
 * cd grmble/server
 * npm install (to install all required modules)
 * copy grmble/server/config/server.config.js.example to grmble/server/config/server.config.js and adjust settings
 * run mongod
 * run redis-server
 * nodemon --debug server.js
 * http://localhost:8000/

#### Optional, But Recommended

 * sudo npm install -g nodemon (for easy iteration)
 * sudo npm install -g node-inspector (for debugging)

#### Running (Debug)

Open two terminals.  In one, run:

    nodemon --debug server.js

In the other, run:

    node-inspector

This will output a line like:

    visit http://0.0.0.0:8080/debug?port=5858 to start debugging
    
Plug that url into your favorite webkit browser and you'll be able to set breakpoints, etc.
