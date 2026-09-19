// ==========================================
// NEXUS_OS CENTRAL SERVER (v4.0 Enterprise)
// ==========================================
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const crypto = require('crypto');

// Αρχικοποίηση Διακομιστή
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

// Middleware για ασφάλεια και στατικά αρχεία
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // Εξυπηρέτηση του φακέλου public/

// ==========================================
// SERVER-SIDE STATE (In-Memory VFS & Users)
// ==========================================
const activeOperators = new Map();
let globalMessageHistory = [];

// Κεντρικό Virtual File System (Προσωρινό πριν τη Βάση Δεδομένων)
const serverVFS = {
    '/home/root': { type: 'dir', perms: 'rwx------', children: ['system_logs.txt', 'network_config.json'] },
    '/sys/kernel': { type: 'dir', perms: 'r-xr-xr-x', children: ['core_dump.log'] },
    '/public/dropzone': { type: 'dir', perms: 'rwxrwxrwx', children: [] }
};

// ==========================================
// WEBSOCKETS (Πραγματικός Χρόνος)
// ==========================================
io.on('connection', (socket) => {
    // Εκχώρηση προσωρινού Session ID
    const sessionId = crypto.randomBytes(4).toString('hex');
    activeOperators.set(socket.id, { callsign: `ANON_${sessionId}`, ip: socket.handshake.address });
    
    console.log(`[+] UPLINK ESTABLISHED: Socket ${socket.id} (ID: ${sessionId})`);

    // Αποστολή ιστορικού μηνυμάτων στον νέο χρήστη
    socket.emit('sys_sync', { history: globalMessageHistory.slice(-50), online: activeOperators.size });
    
    // Ειδοποίηση δικτύου για νέα σύνδεση
    socket.broadcast.emit('net_broadcast', {
        type: 'system',
        sender: 'SYS_DAEMON',
        text: `New operator connected. Active links: ${activeOperators.size}`,
        timestamp: new Date().toISOString()
    });

    // 1. Αλλαγή Ταυτότητας (Callsign)
    socket.on('set_identity', (callsign) => {
        const cleanName = String(callsign).trim().slice(0, 16).replace(/[^a-zA-Z0-9_-]/g, '');
        if (cleanName) {
            const oldName = activeOperators.get(socket.id).callsign;
            activeOperators.get(socket.id).callsign = cleanName;
            io.emit('net_broadcast', {
                type: 'system',
                sender: 'SYS_DAEMON',
                text: `Identity sync: [${oldName}] is now recognized as [${cleanName}]`,
                timestamp: new Date().toISOString()
            });
        }
    });

    // 2. Παγκόσμια Εκπομπή (Global Chat/Comms)
    socket.on('transmit_msg', (payload) => {
        const operator = activeOperators.get(socket.id);
        const msgData = {
            type: 'message',
            sender: operator.callsign,
            text: String(payload).trim().slice(0, 250),
            timestamp: new Date().toISOString()
        };

        if (msgData.text) {
            globalMessageHistory.push(msgData);
            if (globalMessageHistory.length > 100) globalMessageHistory.shift(); // Διατήρηση τελευταίων 100
            io.emit('net_broadcast', msgData); // Αποστολή σε όλους, συμπεριλαμβανομένου του αποστολέα
        }
    });

    // 3. Ερωτήματα Συστήματος Αρχείων (VFS Queries)
    socket.on('vfs_request', (req, callback) => {
        const { command, target } = req;
        if (command === 'ls') {
            const data = serverVFS[target] || { error: 'Directory not found or access denied.' };
            callback(data);
        }
    });

    // Αποσύνδεση
    socket.on('disconnect', () => {
        const operator = activeOperators.get(socket.id);
        activeOperators.delete(socket.id);
        console.log(`[-] UPLINK LOST: ${operator.callsign}`);
        
        io.emit('net_broadcast', {
            type: 'system',
            sender: 'SYS_DAEMON',
            text: `Operator ${operator.callsign} disconnected.`,
            timestamp: new Date().toISOString()
        });
    });
});

// ==========================================
// STARTUP SEQUENCE
// ==========================================
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`\n========================================`);
    console.log(`[OK] NEXUS_OS KERNEL BOOTED SUCCESSFULLY`);
    console.log(`[OK] WEBSOCKET RELAY ACTIVE ON PORT ${PORT}`);
    console.log(`[OK] SERVING FRONTEND FROM /public`);
    console.log(`========================================\n`);
});
