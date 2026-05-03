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
let currentTemplate = 'empathy';
const groupsBySocket = new Map(); // socketId → groupNumber

function broadcastGroups() {
    const groups = [...new Set(groupsBySocket.values())].sort((a, b) => a - b);
    io.emit('groups_updated', groups);
}

const EMPATHY_PHASES = ['think_feel', 'see', 'hear', 'say_do', 'pain', 'gain', 'solutions'];
const SCAMPER_PHASES = ['substitute', 'combine', 'adapt', 'modify', 'put_to_use', 'eliminate', 'reverse'];
const ALL_VALID_PHASES = [...EMPATHY_PHASES, ...SCAMPER_PHASES];

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/student', (req, res) => res.sendFile(path.join(__dirname, 'public', 'student.html')));

io.on('connection', (socket) => {
    // Send full current state to new connection
    const connectedGroups = [...new Set(groupsBySocket.values())].sort((a, b) => a - b);
    socket.emit('init_data', { notes, currentPhase, currentTemplate, connectedGroups });

    socket.on('submit_note', (data) => {
        const { category, group, content } = data;
        if (!ALL_VALID_PHASES.includes(category) || !String(content || '').trim()) return;
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
        if (phase === null || ALL_VALID_PHASES.includes(phase)) {
            currentPhase = phase;
            io.emit('phase_changed', currentPhase);
        }
    });

    socket.on('set_template', (template) => {
        if (['empathy', 'scamper'].includes(template)) {
            currentTemplate = template;
            currentPhase = null;
            io.emit('template_changed', { template: currentTemplate, phase: null });
        }
    });

    socket.on('restart', () => {
        notes = [];
        currentPhase = null;
        io.emit('restarted');
    });

    socket.on('set_group', (group) => {
        const g = Math.min(Math.max(parseInt(group) || 0, 1), 10);
        if (g) { groupsBySocket.set(socket.id, g); broadcastGroups(); }
    });

    socket.on('disconnect', () => {
        groupsBySocket.delete(socket.id);
        broadcastGroups();
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
