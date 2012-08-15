Grumble
====

#### Getting Started

 1. Install node (http://nodejs.org/)
 2. Install mongo (http://www.mongodb.org/downloads)
 3. Clone the code: git clone git@github.com:andyburke/grumble.git
 4. cd grumble/server
 5. npm install
 6. sudo npm install -g nodemon (for easy iteration)
 7. sudo npm install -g node-inspector (for debugging)
 8. run mongod
 9. nodemon --debug server.js
 10. http://localhost:8000/

#### Optional, But Recommended

    sudo npm install -g nodemon
    sudo npm install -g node-inspector

Then you can do:

    nodemon --debug server.js

in one terminal, and:

    node-inspector

in another (which will let you debug the server using chrome by pointing to the url it prints out).
