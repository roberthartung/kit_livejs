var ws = new WebSocket('ws://[SERVER_ADDRESS]:[SERVER_PORT]/', 'convert');
	
ws.onmessage = function (message) {
  var messages = document.getElementById('messages');
  messages.innerHTML += "<br>[in] " + message.data;
};

sendmsg = function() {
  var message = document.getElementById('message_to_send').value
  document.getElementById('message_to_send').value = ''
  ws.send(message);
  var messages = document.getElementById('messages');
  messages.innerHTML += "<br>[out] " + message;
};