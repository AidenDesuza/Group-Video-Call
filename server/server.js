const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(path.join(__dirname, '../client'))); // Serve static files from the client directory

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        socket.to(roomId).emit('user-connected', socket.id);
        console.log(`User ${socket.id} joined room: ${roomId}`);

        socket.on('disconnect', () => {
            socket.to(roomId).emit('user-disconnected', socket.id);
            console.log(`User ${socket.id} disconnected`);
        });
    });

    socket.on('send-signal', (signal, targetId) => {
        socket.to(targetId).emit('receive-signal', signal, socket.id);
        console.log(`Signal sent from ${socket.id} to ${targetId}`);
    });
});

server.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});
