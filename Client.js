var events = require("events"),
	util = require("util");

function Client(connection, live)
{
	events.EventEmitter.call(this);
	var client = this;
	this.send = function(m)
	{
		put(JSON.stringify({type:'message',message:m}));
	}
	this.send('Welcome');
	
	function put(str)
	{
		connection.send(str);
	}
	
	connection.on('data', function(data)
	{
		var json = JSON.parse(data);
		switch(json.type)
		{
			case 'event' :
				live.emit.call(connection, json.name, json.data);
			break;
		}
	});
	
	connection.on('disconnect', function()
	{
		client.emit('disconnect');
	});
	
	var emit = this.emit;
	this.emit = function()
	{
		if(typeof client._events[arguments[0]] == 'undefined')
		{
			console.log('Client.emit('+arguments[0]+')');
			var args = [];
			for(var i=0;i<arguments.length;i++)
			{
				args[i] = arguments[i];
			}
			put(JSON.stringify({type:'event',name:arguments[0],arguments:args.splice(1)}));
			return true;
		}
		else
		{
			return emit.apply(client, arguments);
		}
	}
}

util.inherits(Client, events.EventEmitter);
module.exports = Client;