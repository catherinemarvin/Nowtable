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
	res.header('content-type', 'audio/mp3');
	res.header('content-length', stat.size);
	res.sendfile(filePath);
});

server.listen(80);
console.log("Express server listening on port %d", server.address().port);

var nowjs = require('now');
var everyone = nowjs.initialize(server);

var kinggroup = nowjs.getGroup("king");
var kingId = 0;

everyone.on('disconnect', function() {
	delete user[this.user.clientId];
	if (everyone.count == 0) {
   	kingId = 0;
   } else {
		if (kingId == this.user.clientId) {
			for (var i in user) {
				kingId = i;
				break;
			}
   	}
   }
   everyone.now.deleteUser(this.user.clientId);
});

everyone.on('connect', function() {
	if (kingId == 0) {
		kingId = this.user.clientId;
	}
});

everyone.now.bugTest = function() {
	console.log("KING: " + kingId);
	console.log("EVERYONE: " + everyone.count);
	nowjs.getClient(kingId, function() {this.now.reportSong()});
}

everyone.now.songTest = function(songid, time) {
	console.log("King Song: " + songid);
	console.log("King Time: " + time);
}

everyone.now.becomeKing = function() {
	kingId = this.user.clientId;
	console.log("New King: " + this.user.clientId);
}

everyone.now.syncToMe = function(state) {
	if (kingId == this.user.clientId) {
		everyone.now.kingSong(state); //Need a function to do this to everyone except the caller (only exists in nowjs 0.7)
	}
}

everyone.now.onclientload = function() {
	everyone.now.onjoin(this.user.clientId, "");
	for (var i in user) {
		this.now.onjoin(i, user[i]);
	}
	user[this.user.clientId] = "";
}

everyone.now.consolePrint = function(text) {
	console.log(text);
}

everyone.now.changeSong = function(songid) {
	everyone.now.loadSong(songid, 0, "play");
}

everyone.now.setSong = function(cId, songid, loc, state) {
	nowjs.getClient(cId, function() {this.now.loadSong(songid, loc, state)});
}

everyone.now.kingSong = function(state) {
	var callerId = this.user.clientId;
	nowjs.getClient(kingId, function() {this.now.giveData(callerId, state)}); 
}

everyone.now.appendtext = function(text) {
	user[this.user.clientId] += text;
	everyone.now.refreshtext(this.user.clientId, text);
}

everyone.now.getSongList = function() {
	var myId = this.user.clientId;
	fs.readdir("static/music", function (err, files) {
		nowjs.getClient(myId, function() {
			for (var i in files) {
				var pattern = new RegExp("(\.mp3|\.m4a|\.ogg|\.oga)$","i");
				if (files[i].search(pattern) == -1) {
				} else {
					this.now.refreshtext("songlistdiv", files[i]);
				}
			}
			this.now.refreshtext("songlistdiv", "hurr durr")
                });
	});
}
