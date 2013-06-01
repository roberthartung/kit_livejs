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

function Group(name)
{
	events.EventEmitter.call(this);
	var name = name;
	var group = this;
	var clients = [];
	
	this.addClient = function(client)
	{
		clients.push(client);
	}
	
	var emit = this.emit;
	this.emit = function()
	{
		if(typeof group._events[arguments[0]] == 'undefined')
		{
			console.log('Group.emit('+arguments[0]+')');
			for(var c=0;c<clients.length;c++)
				clients[c].emit.apply(clients[c], arguments);
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