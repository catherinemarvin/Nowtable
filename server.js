var version = 0.1;

var express = require('express');
var path = require('path');
var fs = require('fs');

var formidable = require('formidable');
var http = require('http');
var sys = require('sys');
var form = require('connect-form');


//here lies the MONGOOSE MAGIC
//var mongoose = require('mongoose');
//var db = mongoose.connect('mongodb://localhost/nowtable');

//var Schema = mongoose.Schema;


//Schema definition. Delicious plaintext passwords (:
/*var UserInfo = new Schema({
	username : String,
	password : String,
	loggedin : Boolean
});
*/

//mongoose.model('UserInfo', UserInfo);

//var user = db.model('UserInfo');

var Db = require('mongodb').Db,
Connection = require('mongodb').Connection,
Server = require('mongodb').Server,
BSON = require('mongodb').BSONNative;

var collection;
var db = new Db('nowtable', new Server("localhost", 27017, {}), {native_parser:false});
db.open(function(err, conn) {
	db = conn;
	db.collection('userinfo', function(err, coll) {
		collection = coll;
	});
});
/*
var admin = new user();
admin.username = "twilight sparkle";
admin.password = "friendship is magic";
admin.save();
*/


//here ends the MONGOOSE MAGIC

var server = express.createServer(
	form({keepExtensions: true, uploadDir: __dirname+"/static/music"})
);

server.set('view options', {
layout: false
});

var user = {};
var songs = {};
var songQueue = [];
var names = [];

var currentSonguId = "nothing";
var currentSongsId = "nothing";

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



/*server.post('/login', function(req, res) {
	var form = new formidable.IncomingForm();
	form.parse(req, function(err, fields, files) {
		var userinfo = db.model('UserInfo');
		console.log("Username!test: " + fields.uname);
		console.log("Username!test: " + fields.pwd);
		var loggedinuser = userinfo.find({username: fields.uname});
		console.log("Username!: " + loggedinuser.username);
		console.log("Password!: " + loggedinuser.password);
	});
});*/

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
pause
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
			//res.redirect('back');
			res.end("done");
		}
	});
	req.form.on('progress', function(bytesReceived, bytesExpected) {
		var percent = (bytesReceived / bytesExpected * 100) | 0;
		process.stdout.write('Uploading: ' + percent + '\r');
	});
});



server.listen(1337);
console.log("Express server listening on port %d", server.address().port);

var nowjs = require('now');

//herp logging shit!
var everyone = nowjs.initialize(server, {socketio:{"log level": process.argv[2]}});

var numKings = 0;
var numAristocrats = 0;

everyone.now.tryLogin = function(uname, pwd) {
	var self = this;
	//db.collection('userinfo', function(err, collection){
		collection.findOne({username: uname}, function(err, doc){
			if (doc.password == pwd) {
				self.now.finishLogin(uname);
			} else {
				self.now.reLogin();
			}
		});
	//});
}


everyone.now.tryRegister = function(uname, pwd) {
	var self = this;
	//db.collection('userinfo', function(err, collection){
		collection.findOne({username: uname}, function(err, doc){
			if (doc) {
				self.now.reRegister();
			} else {
				collection.insert({username: uname, password: pwd, loggedIn: false, uId: 0, isKing: false, isAristocrat: false});
				self.now.finishRegister();
			}
		});
	//});
}

nowjs.on('disconnect', function() {
	var self = this;
	//db.collection('userinfo', function(err, collection) {
		collection.findOne({uId: self.user.clientId}, function(err, doc) {
			if (doc) {
				doc.loggedIn = false;
				doc.uId = 0;
				if (doc.isAristocrat == true) {
					doc.isAristocrat = false;
					numAristocrats--;
					if (doc.isKing == true) {
						doc.isKing = false;
						collection.find({isAristocrat: true}, function(err, cursor) {
							cursor.toArray(function (err, docs) {
								if (docs) {
									var newKing = docs[0];
									newKing.isKing = true;
									collection.update({uId: newKing.uId}, newKing, function (err, doc1) {
									});
								} else {
									numKings = 0;
								}
							});
						});
					} else {
					
					}
				} else {
				
				}
				collection.update({uId: self.user.clientId}, doc, function (err, doc) {
					process.nextTick(function () {
						everyone.now.wipeUsersDiv();
						everyone.now.getUserList();
					});
				});
			}
		});
	//});
});

nowjs.on('connect', function() {
	
});

everyone.now.songTest = function(songid, time) {
	console.log("King Song: " + songid);
	console.log("King Time: " + time);
}

everyone.now.syncToMe = function(state) {
	var self = this;
	//db.collection('userinfo', function(err, collection) {
		collection.findOne({uId: self.user.clientId}, function(err, doc) {
			if (doc.isKing == true) {
				collection.find({loggedIn: true}, function(err, cursor) {
					cursor.toArray(function (err, docs) {
						for (var i in docs) {
							if (docs[i].uId == doc.uId) {
								self.now.setStateKing(state);
							} else {
								nowjs.getClient(docs[i].uId, function() {this.now.kingSong(state)});
							}
						}
					});
				});
				everyone.now.setPlayButton(state);
			}
			
		});
	//});
}

everyone.now.kingStateChange = function(state) {
	var self = this;
	//db.collection('userinfo', function(err, collection) {
		collection.findOne({uId: self.user.clientId}, function(err, doc) {
			if (doc.isKing == true) {
				self.now.syncToMe(state);
			} else {
		
			}
		});
	//});
}

/*everyone.now.onclientload = function() {
	everyone.now.onjoin(this.user.clientId, "");
	for (var i in user) {
		this.now.onjoin(i, user[i]);
	}
	user[this.user.clientId] = "";
}*/

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
	var self = this;
	//db.collection('userinfo', function(err, collection) {
		collection.findOne({isKing: true}, function(err, doc) {
			if (doc) {
				nowjs.getClient(doc.uId, function() {this.now.giveData(callerId, state)});
			}
		});
	//});
}

everyone.now.appendtext = function(text) {
	//user[this.user.clientId] += text;
	var self = this;
	var usrname;
	collection.findOne({uId: self.user.clientId}, function (err, doc) {
		if (doc) {
			usrname = doc.username;
			everyone.now.refreshtext(usrname, text);
		}
	});
}

everyone.now.playNextSong = function() {
	var self = this;
	//db.collection('userinfo', function(err, collection) {
		collection.findOne({uId: self.user.clientId}, function(err, doc) {
			if (doc.isKing == true && songQueue.length > 0) {
				var nextSong = songQueue.shift();
				self.now.changeSong(nextSong.sId);
				self.now.syncToMe("play");
				everyone.now.wipeQueueDiv();
				everyone.now.getQueueList();
				currentSonguId = nextSong.uId;
				currentSongsId = nextSong.sId;
				console.log("uId: " + currentSonguId + ", sId: " + currentSongsId);
				everyone.now.setTitleSong(currentSonguId, currentSongsId);
			} else if (doc.isKing == true) {
				everyone.now.setTitleSong("nothing", "nothing");
				currentSonguId = "nothing";
				currentSongsId = "nothing";
			} else {
	
			}
		});
	//});
}

everyone.now.addToUsers = function(username) {
	var test = false;
	for (var i in names) {
		if (username == names[i].username && !names[i].online) {
			names[i].uId = this.user.clientId;
			names[i].online = true;
			test = true;
		} else if (username == names[i].username && names[i].online) {
			this.now.requestNewUsername();
			test = true;
		} else {
			
		}
	}
	if (!test) {
		var obj = {};
		obj.uId = this.user.clientId;
		obj.username = username;
		obj.online = true;
		names.push(obj);
	} else {
	
	}
	everyone.now.wipeUsersDiv();
	everyone.now.getUserList();
}

everyone.now.getLogin = function(loc) {
	var loggedin = false;
	if (loggedin && !loc) {
		this.now.openSettings();
	} else if (!loggedin) {
		this.now.openLogin();
	} else {
		//don't open the div
	}
}

everyone.now.userLogin = function() {
	//not written 
}

everyone.now.getCurrentSong = function() {
	var self = this;
	//db.collection('userinfo', function(err, collection) {
		collection.findOne({uId: self.user.clientId}, function(err, doc) {
			if (doc.isKing == true) {
				/*if (songQueue.length > 0) {
					this.now.playNextSong();
				} else {
			
				}*/
			} else if (doc.loggedIn == true) {
				if (songQueue.length > 0) {
					self.now.kingSong("play");
					everyone.now.setTitleSong(currentSonguId, currentSongsId);
				} else {
			
				}
			} else {
				
			}
		});
	//});
} 

everyone.now.addToQueue = function(songid) {
	var obj = {};
	var self = this;
	//db.collection('userinfo', function(err, collection) {
		collection.findOne({uId: self.user.clientId}, function(err, doc) {
			if (doc.isAristocrat == true) {
				var changed = false;
				for (var i in songQueue) {
					if (songQueue[i].uId == doc.username) {
						songQueue[i].sId = songid;
						changed = true;
					} 
				}
				if (changed) {
					//do nothing
				} else {
				obj.uId = doc.username;
				obj.sId = songid;
				obj.downvotes = 0;
				obj.upvotes = 0;
				obj.upvoteList = [];
				obj.downvoteList = [];
				songQueue.push(obj);
				}
				everyone.now.wipeQueueDiv();
				everyone.now.getQueueList();
			} else {
				
			}
		});
	//});
}

everyone.now.voteQueue = function(song, voted) {
	var self = this;
	collection.findOne({uId: self.user.clientId}, function (err, doc) {
		for (var i in songQueue) {
			if (songQueue[i].sId == song) {
				console.log("Found the song");
				if (voted == "up") {
					console.log("Voted up");
					var inUpvoteList = false;
					var inDownvoteList = false;
					var downvoteuserloc;
					for (var j in songQueue[i].upvoteList) {
						if (songQueue[i].upvoteList[j] == doc.username) {
							inUpvoteList = true;
						}
					}
					for (var j in songQueue[i].downvoteList) {
						if (songQueue[i].downvoteList[j] == doc.username) {
							inDownvoteList = true;
							downvoteuserloc = j;
						}
					}
					if (inUpvoteList) {
						//do nothing
					} else if (inDownvoteList) {
						songQueue[i].downvoteList.splice(j,1);
						songQueue[i].upvoteList.push(doc.username);
						songQueue[i].upvotes++;
						songQueue[i].downvotes--;
					} else { //were in neither list
						songQueue[i].upvoteList.push(doc.username);
						songQueue[i].upvotes++;
					}
					console.log("******SONG INFORMATION*******");
					console.log(songQueue[i]);
				} else { //else voted down
					var inUpvoteList = false;
					var inDownvoteList = false;
					var upvoteuserloc;
					for (var j in songQueue[i].downvoteList) {
						if (songQueue[i].downvoteList[j] == doc.username) {
							inDownvoteList = true;
						}
					}
					for (var j in songQueue[i].upvoteList) {
						if (songQueue[i].upvoteList[j] == doc.username) {
							inUpvoteList = true;
							upvoteuserloc = j;
						}
					}
					if (inDownvoteList) {
						//do nothing
					} else if (inUpvoteList) {
						songQueue[i].upvoteList.splice(j,1);
						songQueue[i].downvoteList.push(doc.username);
						songQueue[i].downvotes++;
						songQueue[i].upvotes--;
					} else { //were in neither list
						songQueue[i].downvoteList.push(doc.username);
						songQueue[i].downvotes++;
					}
					console.log("******SONG INFORMATION*******");
					console.log(songQueue[i]);
				}
			}
			
			
		}
	});
}


everyone.now.getQueueList = function() {
	for (var i in songQueue) {
		this.now.displayQueueItem(songQueue[i].uId, songQueue[i].sId);
	}
}

everyone.now.getUserList = function() {
	var self = this;
	//db.collection('userinfo', function(err, collection) {
		collection.find({loggedIn: true}, function(err, cursor) {
			cursor.toArray(function (err, docs) {
				if (docs) {
					for (var i in docs) {
						if (docs[i].uId == self.user.clientId) {
							if (docs[i].isKing == true) {
								if (docs[i].isAristocrat == true) {
									self.now.displayUserItem(docs[i].username, true, true, true);
								} else {
									self.now.displayUserItem(docs[i].username, true, true, false);
								}
							} else {
								if (docs[i].isAristocrat == true) {
									self.now.displayUserItem(docs[i].username, true, false, true);
								} else {
									self.now.displayUserItem(docs[i].username, true, false, false);
								}
							}
						} else {
							if (docs[i].isKing == true) {
								if (docs[i].isAristocrat == true) {
									self.now.displayUserItem(docs[i].username, false, true, true);
								} else {
									self.now.displayUserItem(docs[i].username, false, true, false);
								}
							} else {
								if (docs[i].isAristocrat == true) {
									self.now.displayUserItem(docs[i].username, false, false, true);
								} else {
									self.now.displayUserItem(docs[i].username, false, false, false);
								}
							}
						}
					}
				}
			});
		});
	//});
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

everyone.now.finishLogin = function(uname) {
	var self = this;
	//db.collection('userinfo', function(err, collection) {
		collection.findOne({username: uname}, function(err, doc) {
			console.log("this is what we found: ",doc);
			doc.loggedIn = true;
			doc.uId = self.user.clientId;
			/*if (numAristocrats < 5) {
				doc.isAristocrat = true;
				numAristocrats++;
				console.log("number of aristocrats now: "+numAristocrats);
				if (kingId == 0) {
					doc.isKing = true;
					kingId = self.user.clientId;
				}
			}
			else {
				console.log("too many aristocrats");
			}*/
			collection.update({username: uname}, doc, function (err, doc) {
				process.nextTick(function () {
					everyone.now.wipeUsersDiv();
					everyone.now.getUserList();
					self.now.getCurrentSong();
				});
			});
			
		});
	//});	
	
};

everyone.now.finishRegister = function() {
	
}

everyone.now.reLogin = function() {
	this.now.reLoginAlert();
}

everyone.now.reRegister = function() {
	this.now.reRegisterAlert();
}

everyone.now.becomeAristocrat = function() {
	var self = this;
	//db.collection('userinfo', function(err, collection) {
		collection.findOne({uId: self.user.clientId}, function(err, doc) {
			if (doc && doc.isAristocrat == false) {
				if (numAristocrats < 5) {
					doc.isAristocrat = true;
					numAristocrats++;
					console.log("number of aristocrats now: "+numAristocrats);
					if (numKings == 0) {
						doc.isKing = true;
						numKings++;
					}
				}
				collection.update({uId: self.user.clientId}, doc, function (err, doc) {
					process.nextTick(function () {
						everyone.now.wipeUsersDiv();
						everyone.now.getUserList();
					});
				});
			}
		});
	//});

}
