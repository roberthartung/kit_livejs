var http = require('http');

var live = require('livejs')(http.createServer().listen(1337));

live.on('status', function()
{
	console.log('received event "status"', arguments);
});

live.on('connect', function()
{
	this.emit('hello', {from:'server'});
});

/*
var live2 = require('livejs')(http.createServer().listen(1338));

live2.on('event', function()
{
	console.log('received event "event"');
});
*/