		/*
		
		Group.prototype.send = function(msg)
		{
			for(var c=0;c<this.clients.length;c++)
			{
				this.clients[c].send(msg);
			}
		}
		
		Group.prototype.trigger = function(e,d)
		{
			var json = JSON.stringify({type:'event',name:e,data:d});
			this.send(json);
		}
		
*/

var events = require("events"),
	util = require("util");

function Group(name, canSubscribe)
{
	events.EventEmitter.call(this);
	var group = this;
	var clients = [];
	
	this.getName = function()
	{
		return name;
	}
	
	this.addClient = function(client)
	{
		clients.push(client);
		client.emit('group', name);
		client.once('disconnect', function()
		{
			for(var c=0;c<clients.length;c++)
			{
				if(clients[c] === this)
				{
					clients.splice(c, 1);
					break;
				}
			}
		});
	}
	
	function put(data)
	{
		for(var c=0;c<clients.length;c++)
		{
			clients[c].put(data);
		}
	}
	
	this.send = function(msg)
	{
		put(JSON.stringify(msg));
	}
	
	this.subscribe = function(client)
	{
		if(canSubscribe)
		{
			group.addClient(client);
		}
		
		return false;
	}
	
	var emit = this.emit;
	this.emit = function()
	{
		if(typeof group._events[arguments[0]] == 'undefined')
		{
			console.log('Group.emit('+arguments[0]+')');
			for(var c=0;c<clients.length;c++)
			{
				clients[c].emit.apply(clients[c], arguments);
			}
			return true;
		}
		else
		{
			return emit.apply(group, arguments);
		}
	}
}
	
util.inherits(Group, events.EventEmitter);
module.exports = Group;