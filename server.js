const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let notes = [];

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/student', (req, res) => res.sendFile(path.join(__dirname, 'public', 'student.html')));

io.on('connection', (socket) => {
    socket.emit('init_notes', notes);

    socket.on('submit_note', (data) => {
        const newNote = {
            ...data,
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            timestamp: Date.now()
        };
        notes.push(newNote);
        io.emit('new_note', newNote);
    });

    socket.on('delete_note', (noteId) => {
        notes = notes.filter(n => n.id !== noteId);
        io.emit('note_deleted', noteId);
    });

    // Handle Clear All Notes (Crucial Fix: Use 'clear_all' as requested)
    socket.on('clear_all', () => {
        console.log('Admin requested Clear All');
        notes = []; // Clear variable
        io.emit('init_notes', []); // Broadcast empty array to force redraw
    });

    socket.on('disconnect', () => { });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
