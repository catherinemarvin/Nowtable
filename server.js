var version = 0.1;

var express = require('express');
var path = require('path');
var fs = require('fs');

var formidable = require('formidable');
var http = require('http');
var sys = require('sys');
var form = require('connect-form');



var server = express.createServer(
	form({keepExtensions: true, uploadDir: __dirname+"/static/music"})
);

server.set('view options', {
layout: false
});

var user = {};
var songs = {};
var songQueue = [];

var currentSonguId = 0;
var currentSongsId = 0;

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

/*
server.post('/upload', function(req, res) {
	var form = new formidable.IncomingForm();
	form.parse(req, function(err, fields, files) {
		console.log("GONNA PARSE THE UPLOAD!");
		//var finalDestination = '/static/music/' + files.upload.name;
		//console.log(finalDestination);
		fs.writeFile(files.song.name, files.song, 'utf8', function(err) {
			if (err) throw err;
			console.log("saved it lol");
		});
	});
});

*/



server.post('/upload', function(req, res, next) {
	console.log("starting upload");
	req.form.complete(function(err, fields, files) {
		if (err) {
			next(err);
		} else {
			//now rename the song!!!
			fs.rename(files.song.path, __dirname + "/static/music/" + fields.title + ".mp3", function() {
				everyone.now.wipeSongDiv();
				everyone.now.getSongList();
			});
			res.redirect('back');
		}
	});
	req.form.on('progress', function(bytesReceived, bytesExpected) {
		var percent = (bytesReceived / bytesExpected * 100) | 0;
		process.stdout.write('Uploading: %' + percent + '\r');
	});
});



server.listen(80);
console.log("Express server listening on port %d", server.address().port);

var nowjs = require('now');

//herp logging shit!
var everyone = nowjs.initialize(server, {socketio:{"log level": process.argv[2]}});

var kinggroup = nowjs.getGroup("king");
var kingId = 0;

nowjs.on('disconnect', function() {
	var self = this;
	delete user[this.user.clientId];
	everyone.count(function(count) {
		if (count == 0) {
   		kingId = 0;
	   } else {
			if (kingId == self.user.clientId) {
				for (var i in user) {
					kingId = i;
					break;
				}
   		}
   	}
   });
   everyone.now.deleteUser(this.user.clientId);
});

nowjs.on('connect', function() {
	if (kingId == 0) {
		kingId = this.user.clientId;
	}
});

everyone.now.bugTest = function() {
	console.log("KING: " + kingId);
	everyone.count(function(count) {console.log("EVERYONE: " + count)});
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
		for (var i in user) {
			if (i == kingId) {
				this.now.setStateKing(state);
			} else {
				nowjs.getClient(i, function() {this.now.kingSong(state)});
			}
		}
		
	}
	everyone.now.setPlayButton(state);
	
}

everyone.now.kingStateChange = function(state) {
	if (kingId == this.user.clientId) {
		this.now.syncToMe(state);
	} else {
		
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
	this.now.loadSong(songid, 0, "play");

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

everyone.now.playNextSong = function() {
	if (this.user.clientId == kingId) {
		var nextSong = songQueue.shift();
		this.now.changeSong(nextSong.sId);
		this.now.syncToMe("play");
		everyone.now.wipeQueueDiv();
		everyone.now.getQueueList();
		currentSonguId = nextSong.uId;
		currentSongsId = nextSong.sId;
		everyone.now.setTitleSong(nextSong.uId, nextSong.sId);
	}
}

everyone.now.getCurrentSong = function() {
	myId = this.user.clientId;
	if (kingId == myId) {
		/*if (songQueue.length > 0) {
			this.now.playNextSong();
		} else {
			
		}*/
	} else {
		if (songQueue.length > 0) {
			this.now.kingSong("play");
			everyone.now.setTitleSong(currentSonguId, currentSongsId);
		} else {
			
		}
	}
} 

everyone.now.addToQueue = function(songid) {
	var obj = {};
	obj.uId = this.user.clientId;
	obj.sId = songid;
	songQueue.push(obj);
	everyone.now.wipeQueueDiv();
	everyone.now.getQueueList();
}

everyone.now.getQueueList = function() {
	var myId = this.user.clientId;
	nowjs.getClient(myId, function() {
		for (var i in songQueue) {
			this.now.displayQueueItem(songQueue[i].uId, songQueue[i].sId);
		}
	});
}

everyone.now.getSongList = function() {
	var myId = this.user.clientId;
	fs.readdir("static/music", function (err, files) {
		nowjs.getClient(myId, function() {
			for (var i in files) {
				var pattern = new RegExp("(\.mp3|\.m4a|\.ogg|\.oga)$","i");
				if (files[i].search(pattern) == -1) {
				} else {
					this.now.appendSong(files[i]);
					this.now.appendQueue(files[i]);
				}
			}
		});
	});
}
