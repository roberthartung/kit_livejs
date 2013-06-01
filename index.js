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
		
		// console.log(this._events);
		
		var emit = this.emit;
		var live = this;
		
		// Emit directly on LiveJS object -> send event to everyone group
		this.emit = function()
		{
			//console.log('emit', arguments[0],typeof live._events[arguments[0]], live._events);
			if(typeof live._events[arguments[0]] == 'undefined')
			{
				console.log('LiveJS.emit('+arguments[0]+')');
				return groups.everyone.emit.apply(live, arguments);
			}
			else
			{
				return emit.apply(live, arguments);
			}
		}
		
		// import
		var groups = {};
		var Group = require('./Group');
		var Client = require('./Client');
		
		// setup
		var websocket = require('websocket')(httpServer);
		var everyone = new Group('everyone');
		groups['everyone'] = everyone;
		
		websocket.on('connect', function(connection)
		{
			var client = new Client(connection, live);
			groups.everyone.addClient(client);
			live.emit('connect', client);
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