var version = 0.1; //when do we ever use this??? -Kevin

var express = require('express');
var path = require('path');
var fs = require('fs');
var formidable = require('formidable');
var http = require('http');
var sys = require('sys');
var form = require('connect-form');

var Db = require('mongodb').Db,
Connection = require('mongodb').Connection,
Server = require('mongodb').Server,
BSON = require('mongodb').BSONNative; 

//All user login data is stored in the "nowtable" database
//in the "userinfo" collection
var collection;
var db = new Db('nowtable', new Server("localhost", 27017, {}), {native_parser:false});
db.open(function(err, conn) {
	db = conn;
	db.collection('userinfo', function(err, coll) {
		collection = coll;
	});
});

//Keep extensions and put uploaded files in /static/music if you should use Formidable.
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

/*
//Almost certain this doesn't work. -Kevin
server.post('/upload', function(req, res, next) {
	console.log("STARTING TO UPLOAD");
	var form = new formidable.IncomingForm(); //not sure this line is right
	form.parse(req, function (err, fields, files) {
		fs.writeFile('derp.mp3', files.upload, 'utf8', function (err) {
			if (err) throw err;
			console.log("Saved lol");
		});
	});
});
*/

/*
**********************************************
AFAIK this is the only version of uploading that works, but it's not async.

Perhaps what we want to do is to have an iframe that will post to /upload. -Kevin
**********************************************
*/

/*
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
		}
	});
	req.form.on('progress', function(bytesReceived, bytesExpected) {
		var percent = (bytesReceived / bytesExpected * 100) | 0;
		process.stdout.write('Uploading: ' + percent + '\r');
	});
});
*/
/*
server.post('/upload', function(req, res, next) {
	console.log("STARTING TO UPLOAD");
	req.form.complete(function(err, fields, files) {
		if (err) {
			console.log("ERROR OMG");
			next(err);
		} else {
			console.log("hi");
			console.log("THIS IS WHAT YOU UPLOADED: ", files);
			console.log("LOLOLOL: ", files.songs.name);
			fs.rename(files.songs.path, __dirname + "/static/music/" + files.songs.name, function () {
				everyone.now.wipeSongDiv();
				everyone.now.getSongList();
			});
			res.end("FUCK YOU");
		}
	});
	
});
*/

server.post('/upload', function(req, res) {
  var form = new formidable.IncomingForm();
  form.uploadDir = __dirname + '/static/music';
  form.encoding = 'binary';

  form.addListener('file', function(name, file) {
	console.log(file.path);
	console.log(file.name);
	fs.rename(file.path, __dirname + "/static/music/" + file.name, function () {
		console.log(arguments);
		everyone.now.wipeSongDiv();
		everyone.now.getSongList();
	});
  });

  form.addListener('end', function() {
    res.end();
  });

  form.parse(req, function(err, fields, files) {
    if (err) {
      console.log(err);
    }
  });
});


server.listen(80);
console.log("Express server listening on port %d", server.address().port);

var nowjs = require('now');

//Logging stuff. It's on a scale from 1-5.
var everyone = nowjs.initialize(server, {socketio:{"log level": process.argv[2]}});

//what to do when a client disconnects
nowjs.on('disconnect', function() {
	var self = this;
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
});

//what to do when a client connects
nowjs.on('connect', function() {
	//should have them open login box here.
});

//this number should never go above 1
var numKings = 0;

//this can be up to 5 at the moment
var numAristocrats = 0;

//This function will run in the background to make sure that a song will be played 
//the instant it is added to the queue if there were previously no songs.
var t;
checkToPlay = function () {
	if (songQueue.length == 0) {
		console.log("nothing in the playlist");
	} else {
		//tell king to play next song or just keep playing the current
		collection.findOne({isKing: true}, function(err, doc) {
			console.log("king found and", doc);
			if (err) {
				console.log("There was no king when trying to check if there was shit in playlist. YOU DONE GOOFED!");
			} else {
				console.log('huehuehue', doc.uId);
				nowjs.getClient(doc.uId, function() {this.now.startPlaylist()});
			}
		});
	}
	t=setTimeout(function() {checkToPlay()},1000);
}
checkToPlay();

//================================================================
//Logging-in/Register Section
//================================================================

//this function is run by the client to attempt to login
//password is checked and then if it is, ones is page is
//updated to reflect being logged in
everyone.now.tryLogin = function(uname, pwd) {
	console.log('gonna log in');
	var self = this;
	collection.findOne({username: uname}, function(err, doc) {
		if (doc) {
		if (doc.password == pwd) {
			self.now.finishLogin(uname);
			console.log("this is what we found: ",doc);
			doc.loggedIn = true;
			doc.uId = self.user.clientId;
			collection.update({username: uname}, doc, function (err, doc) {
				process.nextTick(function () {
					everyone.now.wipeUsersDiv();
					everyone.now.getUserList();
					self.now.getCurrentSong();
				});
			});
		} else {
			self.now.reLogin();
		}
	} else {
		self.now.reLogin();
	}
				
	});
};

everyone.now.finishLogin = function () {
	this.now.cleanLoginRegister();
}

everyone.now.tryRegister = function(uname, pwd) {
	var self = this;
	collection.findOne({username: uname}, function(err, doc){
		if (doc) {
			self.now.reRegister();
		} else {
			collection.insert({username: uname, password: pwd, loggedIn: false, uId: 0, isKing: false, isAristocrat: false});
			self.now.finishRegister(uname, pwd);
		}
	});
}

//Now that you're registered, you need to be logged in.
everyone.now.finishRegister = function(uname, pwd) { 
	var self = this;
	collection.findOne({username: uname}, function (err, doc) {
		doc.loggedIn = true;
		doc.uId = self.user.clientId;
		collection.update({username: uname}, doc, function (err, doc) {
			process.nextTick(function () {
				everyone.now.wipeUsersDiv();
				everyone.now.getUserList();
				self.now.getCurrentSong();
			});
		});
	});
	self.now.cleanLoginRegister();
}

//tells client to reloggin because password was bad
everyone.now.reLogin = function() {
	this.now.reLoginAlert();
}

//tells client to reloggin because error occured (duplicate username etc.)
everyone.now.reRegister = function() {
	this.now.reRegisterAlert();
}

everyone.now.tryLogout = function () {
	var self = this;
	var theUID = self.user.clientId;
	collection.findOne({uId: theUID}, function (err, doc) {
		doc.loggedIn = false;
		doc.uId = 0;
		doc.isKing = false;
		doc.isAristocrat = false;
		collection.update({uId: theUID}, doc, function (err, doc) {
			self.now.finishLogout();
			process.nextTick(function () {
				everyone.now.wipeUsersDiv();
			});
		});
	});
};

//================================================================
//End of Logging-in/Register Section
//================================================================


everyone.now.songTest = function(songid, time) {
	console.log("King Song: " + songid);
	console.log("King Time: " + time);
}

everyone.now.syncToMe = function(state) {
	var self = this;
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
}

everyone.now.kingStateChange = function(state) {
	var self = this;
	//db.collection('userinfo', function(err, collection) {
		collection.findOne({uId: self.user.clientId}, function(err, doc) {
			if (!doc) {
				//do nothing.
			}
			if (doc.isKing == true) {
				self.now.syncToMe(state);
			} else {
				//do nothing
			}
		});
	//});
}

everyone.now.consolePrint = function(text) {
	console.log(text);
};

everyone.now.changeSong = function(songid) {
	this.now.loadSong(songid, 0, "play");
};

everyone.now.setSong = function(cId, songid, loc, state) {
	nowjs.getClient(cId, function() {this.now.loadSong(songid, loc, state)});
};

everyone.now.kingSong = function(state) {
	var callerId = this.user.clientId;
	var self = this;
	collection.findOne({isKing: true}, function(err, doc) {
		if (doc) {
			nowjs.getClient(doc.uId, function() {this.now.giveData(callerId, state)});
		}
	});
}

everyone.now.appendtext = function(text) {
	var self = this;
	var usrname;
	collection.findOne({uId: self.user.clientId}, function (err, doc) {
		if (doc) {
			usrname = doc.username;
			everyone.now.refreshtext(usrname, text);
		}
	});
};

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

everyone.now.becomeAristocrat = function() {
	var self = this;
	collection.findOne({uId: self.user.clientId}, function (err, doc) {
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
					self.now.cleanAristocrat();
					everyone.now.wipeUsersDiv();
					everyone.now.getUserList();
				});
			});
		}
	});
};

everyone.now.unAristocrat = function () {
	var self = this;
	var actuallyDoSomething = false;
	collection.findOne({uId: self.user.clientId}, function (err, doc) {
		if (doc) {
			if (doc.isAristocrat == true) {
				doc.isAristocrat = false;
				numAristocrats--;
				console.log("Number of aristocrats now: "+numAristocrats);
				if (doc.isKing == true) {
					actuallyDoSomething = true;
					doc.isKing = false;
					numKings = 0;
				} else {
				}
				collection.update({uId: self.user.clientId}, doc, function (err, doc) {
					process.nextTick(function () {
						self.now.cleanUnaristocrat();
						self.now.needNewKing(actuallyDoSomething);
						everyone.now.wipeUsersDiv();
						everyone.now.getUserList();
					});
				});
			} else {
				console.log("You were not an aristocrat for some reason.");
			}
		} else {
			console.log("Couldn't find you in the DB for some reason.");
		}
	});
};

everyone.now.tryNewKing = function () {
	collection.find({isAristocrat: true}, function (err, cursor) {
		cursor.toArray(function (err, docs) {
			if (docs[0]) {
				console.log("LONG LIVE THE NEW KING");
				var newKing = docs[0];
				newKing.isKing = true;
				collection.update({uId: newKing.uId}, newKing, function (err, doc1) {
					process.nextTick(function () {
						everyone.now.wipeUsersDiv();
						everyone.now.getUserList();
					});
				});
			} else {
				console.log("could not find a new king");
			}
		});
	});
};