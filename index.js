var fs = require('fs'),
	ws = require('websocket'),
	events = require("events"),
	util = require("util"),
    path = require('path');

module.dir = path.dirname(module.filename) + path.sep;

module.exports = function(httpServer)
{
	function LiveJS()
	{
		events.EventEmitter.call(this);
		
		var emit = this.emit;
		var live = this;
		
		var _reserved_events = ['group'];
		
		// Emit directly on LiveJS object -> send event to everyone group
		this.emit = function()
		{
			//console.log('live.emit('+arguments[0]+')');
			//console.log('emit', arguments[0],typeof live._events[arguments[0]], live._events);
			if(typeof live._events[arguments[0]] == 'undefined' && _reserved_events.indexOf(arguments[0]) == -1)
			{
				/*
				function Event()
				{
					
				}
				new Event();
				*/
				console.log('LiveJS.emit('+arguments[0]+')');
				return groups.everyone.emit.apply(live, arguments);
			}
			else
			{
				var args = []; for(var a=1;a<arguments.length;a++) args[a-1] = arguments[a];
				args.unshift(this);
				args.unshift(arguments[0]);
				console.log('args:', args);
				return emit.apply(live, args);
			}
		}
		
		// import
		var groups = {};
		var Group = require('./Group');
		var Client = require('./Client');
		
		// setup
		var websocket = require('websocket')(httpServer);
		
		function createGroup(g, subscribable)
		{
			var group = new Group(g, subscribable ? true : false);
			groups[g] = group;
			live.emit('group', group);
			return group;
		}
		
		createGroup('everyone');
		
		websocket.on('connect', function(connection)
		{
			var client = new Client(connection, live);
			groups.everyone.addClient(client);
			live.emit('connect', client);
			client.on('subscribe', function(group)
			{
				if(typeof groups[group] == 'undefined')
				{
					createGroup(group, true);
				}
				
				groups[group].subscribe(client);
			});
		});
		
		function onRequest(req, res)
		{
			if(req.method == 'GET')
			{
				if(req.url.toLowerCase() == '/livejs/live.js')
				{
					res.writeHead(200, {'Content-Type': 'text/javascript'});
					fs.readFile(module.dir + 'client/livejs.js', 'utf8', function(err, data)
					{
						if(!err)
						{
							data = data.toString();
							var addr  = req.socket.address();
							data = data.replace("[SERVER_PORT]", addr.port);
							data = data.replace("[SERVER_ADDRESS]", addr.address);
							res.end(data);
						}
					});
					
					return;
				}
			}
			
			res.writeHead(404, 'Not Found');
			res.end();
		}
		
		httpServer.on('request', onRequest);
	};
	
	util.inherits(LiveJS, events.EventEmitter);
	
	return new LiveJS();
}