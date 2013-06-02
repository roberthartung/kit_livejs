var live = new function()
{
	var ws = new WebSocket('ws://[SERVER_ADDRESS]:[SERVER_PORT]/'); // , 'convert'
	
	var live = this;
	
	var isReady = false;
	var waitReady = [];
	
	ws.onopen = function()
	{
		console.log('open');
		ws.send(JSON.stringify('Hi'));
		isReady = true;
		for(var i=0;i<waitReady.length;i++)
		{
			waitReady[i].call(live);
		}
	}
	
	ws.onerror = function(e)
	{
		console.log('error', e.data);
	}
	
	ws.onclose = function()
	{
		console.log('close');
	}
	
	ws.onmessage = function(message)
	{
		var json = JSON.parse(message.data);
		
		console.log('>> in >>', json);
		
		switch(json.type)
		{
			case 'event' :
				//console.log('event.name:', json.name);
				if(typeof events[json.name] == 'function')
				{
					events[json.name].apply(live, json.arguments);
				}
			break;
		}
	}
	
	var events = {};
	
	var groups = [];
	
	this.on = function(e,f)
	{
		events[e] = f;
	}
	
	function send(o)
	{
		ws.send(JSON.stringify(o));
	}
	
	/**
	 * Subscribe to a group
	 */
	
	this.subscribe = function(g)
	{
		send({type:'subscribe',group:g});
	}
	
	this.getGroups = function()
	{
		return groups;
	}
	
	this.trigger = this.emit = function(e,d)
	{
		send({type:'event',name:e,data:d});
	}
	
	this.ready = function(cb)
	{
		if(isReady)
			cb();
		else
			waitReady.push(cb);
	}
};