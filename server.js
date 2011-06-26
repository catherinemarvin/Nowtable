var version = 0.1;

var express = require('express');

var server = express.createServer();

server.set('view options', {
layout: false
});

var user = {};

server.set('view engine', 'ejs');

// Configuration
server.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
server.set('views', __dirname + '/views');
server.use(express.static(__dirname + '/static'));

// Routes
server.get('/', function(req, res){
  res.render("index");
});

server.listen(80);
console.log("Express server listening on port %d", server.address().port);

var nowjs = require('now');
var everyone = nowjs.initialize(server);

everyone.on('disconnect', function() {
	delete user[this.user.clientId];
        everyone.now.deleteUser(this.user.clientId);
});

everyone.now.onclientload = function() {
	everyone.now.onjoin(this.user.clientId, "");
	for (var i in user) {
		this.now.onjoin(i, user[i]);
	}
	user[this.user.clientId] = "";
}

everyone.now.appendtext = function(text) {
	user[this.user.clientId] += text;
	everyone.now.refreshtext(this.user.clientId, text);
}
