const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const port = 3000;

// Serve the frontend
app.use(express.static(path.join(__dirname, '../frontend')));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let nextClientId = 1;

// ✅ Store connected clients and their names
wss.on('connection', (socket) => {
  socket.clientId = nextClientId++;
  socket.userName = null;

  console.log(`Client ${socket.clientId} connected`);

  // Send the client their ID
  socket.send(JSON.stringify({
    type: 'assign-id',
    id: socket.clientId
  }));

  // Handle incoming messages
  socket.on('message', (msg) => {
    let data;
    try {
      data = JSON.parse(msg);
    } catch {
      console.log("❌ Invalid JSON received.");
      return;
    }

    // ✅ Handle name setting
    if (data.type === 'set-name') {
      socket.userName = data.name;
      console.log(`✅ Client ${socket.clientId} set name: ${socket.userName}`);
      return;
    }

    // ✅ If name hasn't been set yet, ignore all other messages
    if (!socket.userName) {
      console.log(`❌ Client ${socket.clientId} tried to send a message before setting a name.`);
      return;
    }

    // ✅ Prepare message payload
    const payload = {
      type: data.type || 'chat',
      from: socket.clientId,
      name: socket.userName
    };

    if (data.text) {
      payload.text = data.text;
    }

    if (data.image) {
      payload.image = data.image;
    }

    // ✅ Broadcast to all clients
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(payload));
      }
    });
  });

  // Handle client disconnection
  socket.on('close', () => {
    console.log(`Client ${socket.clientId} disconnected`);
  });
});

server.listen(port, () => {
  console.log(`🚀 Server listening on http://localhost:${port}`);
});
