var http = require("http"),
	crypto = require('crypto'),
	zlib = require("zlib"),
	fs = require('fs');

function sha1(str)
{
	shasum = crypto.createHash('sha1');
	shasum.update(str);
	return shasum.digest('base64');
}

/*
 _connecting
_handle
_readableState
readable
domain
_events
_maxListeners
_writableState
writable
allowHalfOpen
onend
destroyed
errorEmitted
bytesRead
_bytesDispatched
_pendingData
_pendingEncoding
server
_idleTimeout
_idleNext
_idlePrev
_idleStart
parser
ondata
_sockname
pipe
addListener
on
pause
resume
read
_consuming
listen
setTimeout
_onTimeout
setNoDelay
setKeepAlive
address
_read
end
destroySoon
_destroy
destroy
_getpeername
remoteAddress
remotePort
_getsockname
localAddress
localPort
write
_write
bytesWritten
connect
ref
unref
push
unshift
setEncoding
unpipe
wrap
setMaxListeners
emit
once
removeListener
removeAllListeners
listeners
*/

function LiveJS(server)
{
	this.groups = {};
	var live = this;
	
	function Group(name)
	{
		this.name = name;
		this.shared = {};
		this.clients = [];
		
		// make group globally known
		live.groups[this.name] = this;
	}
	
	Group.prototype.share = function(key, val)
	{
		this.shared[key] = val;
		this.updateShared();
	}
	
	function createSharableObject(from, to)
	{
		for(k in from)
		{
			if(typeof from[k] == 'function')
			{
				to[k] = 'function';
			}
			else if(typeof from[k] == 'object' || typeof from[k] == 'array')
			{
				createSharableObject(from[k], to[k]);
			}
			else
			{
				to[k] = from[k];
			}
		}
	}
	
	Group.prototype.getShareMessage = function()
	{
		var shared = {};
		createSharableObject(this.shared, shared);
		return JSON.stringify({from:'system','type':'share',shared:shared});
	}
	
	Group.prototype.updateShared = function()
	{
		var msg = this.getShareMessage();
	
		for(var c=0;c<this.clients.length;c++)
		{
			this.clients[c].send(msg);
		}
	}
	
	Group.prototype.addClient = function(client)
	{
		this.clients.push(client);
		client.send(this.getShareMessage());
		//this.updateShared();
	}
	
	function onRequest(req, res)
	{
		console.log('server:', typeof server);
		if(req.method == 'GET')
		{
			if(req.url.toLowerCase() == '/livejs/live.js')
			{
				res.writeHead(200, {'Content-Type': 'text/javascript'});
				fs.readFile('_livejs.js', 'utf8', function(err, data)
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
	
	function Frame(arg, compression)
	{
		this.compression = compression;

		if(typeof arg == 'object')
		{
			// read frame from Buffer object
			this.createFromBuffer(arg);
		}
		else if(typeof arg === 'string')
		{
			var bytes = [];
			this.isFin = 1; // last frame segment
			this.opcode = 1; // text frame
			this.isMasked = 0;
			this.payloadLength = arg.length;
			bytes.push(this.isFin << 7 | this.opcode);
			bytes.push(this.isMasked << 7 | this.payloadLength);
			//console.log((this.isMasked << 7 + this.payloadLength&0x7f).toString(2));
			
			this.byteStream = '';
			for(b=0;b<bytes.length;b++)
			{
				//console.log(bytes[b].toString(2));
				var chr = String.fromCharCode(bytes[b]);
				//console.log(bytes[b].toString(16));
				this.byteStream += chr;
			}
			
			this.byteStream += arg;
			
			//console.log(str);
		}
	}

	Frame.prototype.createFromBuffer = function(buffer)
	{
		this.isFin = buffer.readUInt8(0) & 0x80;
		
		var str = buffer.toString('hex');
		var bitOffset = 0;
		
		function readBits(num)
		{
			var val = 0;
			for(b=0;b<num;b++)
			{
				var bytePos = Math.floor(bitOffset / 8);
				var bitPosition = bitOffset % 8;
				
				// get 
				var bit = buffer.readUInt8(bytePos) & ((1 << 7) >> bitPosition);
				bit >>= (7 - bitPosition);
				
				//console.log('bytePos:', bytePos, 'bitOffset:', bitPosition, 'bit:', bit);
				// MSB is read first
				val |= bit << (num - b - 1);
				val = val >>> 0;
				bitOffset++;
			}
			return val;
		}
		
		// read 1 bit
		var headerLength = 2;
		this.isFin = readBits(1);
		this.rsv = readBits(3);
		this.isDeflated = this.rsv & 0x4 ? 1 : 0;
		this.opcode = readBits(4);
		this.isMasked = readBits(1);
		this.payloadLength = readBits(7);
		
		// 1 4 1 1 5
		//console.log(this.isFin, this.rsv, this.opcode, this.isMasked, this.payloadLength);
		
		if(this.payloadLength == 126)
		{
			headerLength += 2;
			this.payloadLength = readBits(16);
		}
		else if(this.payloadLength == 127)
		{
			headerLength += 8;
			// @todo we should use .read... functions here
			readBits(64);
		}
		
		var mask;
		if(this.isMasked)
		{
			headerLength += 4;
			this.maskingKey = readBits(32);
			mask = [((this.maskingKey >>> 24) & 0xFF), ((this.maskingKey >>> 16) & 0xFF), ((this.maskingKey >>> 8) & 0xFF), ((this.maskingKey >>> 0) & 0xFF)];
			//console.log('maskingKey:', this.maskingKey, this.maskingKey.toString(16), this.mask);
		}
		// no mask => mask with 1
		else
		{
			mask = [0xFF, 0xFF, 0xFF, 0xFF];
		}
		
		var byteOffset = bitOffset / 8;
		var messageLength = buffer.length - byteOffset;
		
		this.message = new Buffer(messageLength, 'utf8');
		this.message_raw1 = new Buffer(messageLength + 4, 'hex');
		this.message_raw2 = new Buffer(messageLength + 4, 'utf8');
		var maskOffset = 0;
		var i = 0;
		for(var b=byteOffset;b<buffer.length;b++)
		{
			this.message_raw1[i] = buffer.readUInt8(b);
			this.message_raw2[i] = buffer.readUInt8(b);
		
			//console.log(b + ': ' + buffer.readUInt8(b).toString(16));
		
			var chrCode = buffer.readUInt8(b) ^ mask[maskOffset];
			//console.log('chrCode:', chrCode.toString(16));
			this.message[i++] = chrCode;
			//console.log(chrCode, chrCode.toString(16));
			//this.message += String.fromCharCode(chrCode);
			maskOffset = (maskOffset + 1) % mask.length;
		}
		
		/*
		this.message_raw1[i++] = 0x00;
		//this.message_raw1[i++] = 0x00;
		this.message_raw1[i++] = 0xFF;
		this.message_raw1[i++] = 0xFF;
		
		//console.log('this.message:', this.message);
		//console.log('raw message1:', this.message_raw1);
		console.log('raw message1:', this.message_raw1);
		
		zlib.inflate(this.message_raw1, function()
		{
			console.log(arguments);
		});
		*/

		if(this.isDeflated)
		{
			this.message = new Buffer(this.message + '\x00\x00\xFF\xFF', 'utf8');
			
			/*this.message.writeUInt8(0x00, i++);
			this.message.writeUInt8(0x00, i++);
			this.message.writeUInt8(0xff, i++);
			this.message.writeUInt8(0xff, i++);
			*/
			//console.log('this.message:', this.message, this.message.toString('hex'));
			zlib.inflate(this.message, function()
			{
				console.log(arguments);
			});
		}
		
		this.message = this.message.toString();
	}

	function Client(socket)
	{
		this.socket = socket;
		this.deflate = 0;
		
		var client = this;
		
		live.groups.everyone.addClient(this);
		
		this.socket.on('data', function(buffer)
		{
			// var frame = new Frame(buffer);
			//console.log(buffer);
			var frame = new Frame(buffer, this.deflate);
			console.log('received message: ', frame.message);
			client.send("Ok");
		});
		
		this.socket.on('end', function()
		{
			console.log('client disconnected.');
		});
		
		//this.send(str);
		
		/*
		var cl = new Client();
		cl.send('foo');
		*/
		
		socket.setNoDelay(true);
		socket.setTimeout(0);
	}

	Client.prototype.send = function(msg)
	{
		console.log('sending message: ' + msg);
		var frame = new Frame(msg);
		// binary required here
		this.socket.write(frame.byteStream, 'binary');
	}

	function onUpgrade(request, socket)
	{
		// request.url
		var accept_key = sha1(request.headers['sec-websocket-key'] + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11');
		
		socket.write("HTTP/1.1 101 Switching Protocols\r\n");
		socket.write("Upgrade: " + request.headers.upgrade + "\r\n");
		socket.write("Connection: Upgrade\r\n");
		
		if(request.headers['sec-websocket-extensions'] == 'x-webkit-deflate-frame')
		{
			//socket.write("Sec-WebSocket-Extensions: x-webkit-deflate-frame\r\n");
			//client.deflate = 1;
		}
		socket.write("Sec-WebSocket-Accept: " + accept_key + "\r\n");
		if(request.headers.origin)
			socket.write("WebSocket-Origin: "+request.headers.origin+"\r\n");
		if(request.headers['sec-websocket-protocol'])
			socket.write("WebSocket-Protocol: "+request.headers['sec-websocket-protocol']+"\n");
		socket.write("\r\n");
		
		var client = new Client(socket);
		
		//var str = JSON.stringify(shared);
		//client.send(str);
	}

	this.shared = {};
	
	// init everyone group before everything else
	new Group('everyone');
	
	server.on('request', onRequest);
	server.on('upgrade', onUpgrade);
	
	return this;
}

LiveJS.prototype.register = function(name, val)
{
	// value
	var group = 'everyone';
	
	if(typeof arguments[2] == 'string')
		group = arguments[2];
	
	/*
	if(typeof arguments[1] == 'string')
	{
		
	}
	// closure
	else if(typeof arguments[1] == 'function')
	{
		
	}
	else
	{
		return false;
	}
	*/
	
	this.groups[group].share(name, val);
	
	return true;
}

module.exports = {
	create : function(server)
	{
		return new LiveJS(server);
	}
};