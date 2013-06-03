var http = require('http');

var live = require('livejs')(http.createServer().listen(1337));

var groups = {};

live.on('group', function(live, group)
{
	groups[group] = group;
	console.log('[GROUPS.'+group.getName()+'] Created');
});

live.on('connect', function()
{
	this.emit('hello', {from:'server'});
});

// Client Events
live.on('status', function(client)
{
	//console.log('client:', client);
	console.log('received event "status" from client');
	client.send('Status received');
});

console.log('Running...');