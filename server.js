var version = 0.1;

var express = require('express');
var path = require('path');
var fs = require('fs');

var server = express.createServer();

server.set('view options', {
layout: false
});

var user = {};
var songs = {};

server.set('view engine', 'ejs');

// Configuration
server.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
server.set('views', __dirname + '/views');
server.use(express.static(__dirname + '/static'));

// Routes
server.get('/', function(req, res){
  res.render("index");
});

server.get('/play/:song', function(req, res) {
	filePath = path.join(__dirname, "/static/music", req.param('song'));
	stat = fs.statSync(filePath);
	res.header('content-type', 'audio/m4a');
	res.header('content-length', stat.size);
	res.sendfile(filePath);
	});

server.listen(80);
console.log("Express server listening on port %d", server.address().port);

var nowjs = require('now');
var everyone = nowjs.initialize(server);

var kinggroup = nowjs.getGroup("king");
var kingId;

everyone.on('disconnect', function() {
	delete user[this.user.clientId];
   everyone.now.deleteUser(this.user.clientId);
});

everyone.on('connect', function() { });

everyone.now.bugTest = function() {
	console.log("KINGS: " + kingId);
	console.log("EVERYONE: " + everyone.count);
	console.log("King Song: " + nowjs.getClient(kingId, function() {this.now.giveSong()}));
	console.log("King Time: " + nowjs.getClient(kingId, function() {this.now.giveTime()}));
	
}

everyone.now.becomeKing = function() {
	kingId = this.user.clientId;
	
	//kinggroup.addUser(this.user.clientId);
}

everyone.now.onclientload = function() {
	everyone.now.onjoin(this.user.clientId, "");everyone.now.becomeKing = function() {
	kingId = this.user.clientId;
	
	//kinggroup.addUser(this.user.clientId);
}
	for (var i in user) {
		this.now.onjoin(i, user[i]);
	}
	user[this.user.clientId] = "";
}

everyone.now.changeSong = function(songid) {
	everyone.now.loadSong(songid, 0);
}

everyone.now.setSong = function(cId, songid, loc) {
	nowjs.getClient(cId, function() {this.now.loadSong(songid, loc)});
}

everyone.now.myId = function() {
	return this.now.clientId;
}

everyone.now.kingSong = function(cId) {
	nowjs.getClient(kingId, function() {this.now.giveData(cId)});
	//kinggroup.now.giveData(this.now.clientId);
	//this.now.loadSong(nowjs.getClient(i, function(){this.now.}), nowjs.getClient(i, this.now.giveTime()));
}

everyone.now.appendtext = function(text) {
	user[this.user.clientId] += text;
	everyone.now.refreshtext(this.user.clientId, text);
}
