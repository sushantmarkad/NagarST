const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Store connected drivers to manage state if needed
// This keeps track of the latest bus locations in memory so new clients get them immediately
const activeBuses = new Map();

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Send current active buses to newly connected clients
  socket.emit('initialLocations', Array.from(activeBuses.values()));

  // Listen for location updates from drivers
  socket.on('updateLocation', (data) => {
    // data should contain { busId, lat, lng, speed, ... }
    if (data && data.busId) {
      // Update memory store
      activeBuses.set(data.busId, data);
      
      // Broadcast to ALL connected clients (including the sender, or use socket.broadcast.emit to exclude sender)
      // We'll broadcast to everyone so passengers/admins see it
      io.emit('locationUpdate', data);
    }
  });

  // Handle bus going offline
  socket.on('stopTrip', (busId) => {
    activeBuses.delete(busId);
    io.emit('busOffline', busId);
  });

  // Handle direct dispatch messages from City Admin to Driver
  socket.on('sendDispatchMessage', (data) => {
    // data: { busId, message }
    io.emit('dispatchMessage', data);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Socket.IO Server running on port ${PORT}`);
});
