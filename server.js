const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let notes = [];
let currentPhase = null;

const VALID_PHASES = ['think_feel', 'see', 'hear', 'say_do', 'pain', 'gain', 'solutions'];

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/student', (req, res) => res.sendFile(path.join(__dirname, 'public', 'student.html')));

io.on('connection', (socket) => {
    // Send full current state to new connection
    socket.emit('init_data', { notes, currentPhase });

    socket.on('submit_note', (data) => {
        const { category, group, content } = data;
        if (!VALID_PHASES.includes(category) || !String(content || '').trim()) return;
        const note = {
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            category,
            group: Math.min(Math.max(parseInt(group) || 1, 1), 10),
            content: String(content).trim().slice(0, 200)
        };
        notes.push(note);
        io.emit('new_note', note);
    });

    socket.on('delete_note', (noteId) => {
        notes = notes.filter(n => n.id !== noteId);
        io.emit('note_deleted', noteId);
    });

    socket.on('set_phase', (phase) => {
        if (phase === null || VALID_PHASES.includes(phase)) {
            currentPhase = phase;
            io.emit('phase_changed', currentPhase);
        }
    });

    socket.on('restart', () => {
        notes = [];
        currentPhase = null;
        io.emit('restarted');
    });

    socket.on('disconnect', () => {});
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
