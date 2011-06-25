var express = require('express');

var app = express.createServer();

app.get('/', function(req, res){
    res.send('Hello World');
});
app.get('/table/:name', function(req, res){
    res.send('You are in table: ' + req.params.name);
});
app.listen(80);
