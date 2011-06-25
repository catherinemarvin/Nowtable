var version = 0.1;

var express = require('express'),
    sys = require('sys'),
    formidable = require('formidable');

var server = express.createServer();

// Configuration
server.use(express.errorHandler({ dumpExceptions: true, showStack: true }));

// Routes
server.get('/', function(req, res){
  res.send("lol hi");
});

server.listen(80);
console.log("Express server listening on port %d", server.address().port);

var nowjs = require('now');
var everyone = nowjs.initialize(server);
