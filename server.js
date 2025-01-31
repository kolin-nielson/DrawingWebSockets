const express = require('express');
const WebSocket = require('ws');
const http = require('http');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static('public'));

let drawingState = []; // This holds all the drawing actions

wss.on('connection', (ws) => {
  console.log('New client connected');

  // Send the complete current drawing state to the new client
  ws.send(JSON.stringify({ type: 'state', data: drawingState }));

  ws.on('message', (message) => {
    const data = JSON.parse(message);
    switch(data.type) {
      case 'draw':
        // Append new drawing data to the state
        drawingState.push(data.data);  // Store the entire line data as received
        broadcastToClients(ws, JSON.stringify(data)); // Broadcast this line to all clients
        break;
      case 'clear':
        // Reset the drawing state
        drawingState = [];
        broadcastToClients(ws, JSON.stringify({ type: 'clear' }));
        break;
    }
  });

  function broadcastToClients(sender, msg) {
    wss.clients.forEach(client => {
      if (client !== sender && client.readyState === WebSocket.OPEN) {
        client.send(msg);
      }
    });
  }

  ws.on('close', () => {
    console.log('Client has disconnected');
  });
});

server.listen(8080, () => {
  console.log('Server is running on port 8080');
});