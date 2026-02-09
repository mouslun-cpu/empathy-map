const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// In-memory storage for notes
// Structure: { category: 'think_feel' | 'see' | 'say_do' | 'hear' | 'pain' | 'gain', group: string, content: string, timestamp: number }
let notes = [];

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/student', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'student.html'));
});

// Socket.io Logic
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Send existing notes to the newly connected client (for Admin dashboard mostly)
    socket.emit('init_notes', notes);

    // Listen for new notes from students
    socket.on('submit_note', (data) => {
        // data should be { category, group, content }
        const newNote = {
            ...data,
            id: Date.now().toString(),
            timestamp: Date.now()
        };

        console.log('New note received:', newNote);

        // Save to memory
        notes.push(newNote);

        // Broadcast to all clients (Admin will pick it up to display)
        io.emit('new_note', newNote);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
