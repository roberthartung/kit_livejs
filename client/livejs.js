var live = new function()
{
	var ws = new WebSocket('ws://[SERVER_ADDRESS]:[SERVER_PORT]/'); // , 'convert'
	
	var live = this;
	
	var isReady = false;
	var waitReady = [];
	
	ws.onopen = function()
	{
		//console.log('open');
		
		isReady = true;
		for(var i=0;i<waitReady.length;i++)
		{
			waitReady[i].call(live);
		}
	}
	
	ws.onerror = function()
	{
		console.log('error');
	}
	
	ws.onclose = function()
	{
		console.log('close');
	}
	
	ws.onmessage = function(message)
	{
		var json = JSON.parse(message.data);
		
		console.log(json);
		
		switch(json.type)
		{
			case 'event' :
				if(typeof events[json.name] == 'function')
				{
					events[json.name].call(live, json.data);
				}
			break;
		}
	}
	
	var events = {};
	
	this.on = function(e,f)
	{
		events[e] = f;
	}
	
	this.trigger = function(e,d)
	{
		var json = JSON.stringify({type:'event',name:e,data:d});
		ws.send(json);
	}
	
	this.ready = function(cb)
	{
		if(isReady)
			cb();
		else
			waitReady.push(cb);
	}
};