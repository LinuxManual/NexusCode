// ==============================================================================
// NEXUS_OS KERNEL - PART 1: FIREBASE, VFS, AND WINDOW MANAGER
// ==============================================================================
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js';
import { getFirestore, collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';

// --- 1. FIREBASE SYSTEM CLOUD CONFIGURATION ---
const FIREBASE_CONFIG = {
    apiKey: 'AIzaSyBm5k1wF7-RaC8hEtTy2Phznxey0FnAcsU',
    authDomain: 'basket-clash-7901c.firebaseapp.com',
    projectId: 'basket-clash-7901c',
    storageBucket: 'basket-clash-7901c.firebasestorage.app',
    messagingSenderId: '307971899685',
    appId: '1:307971899685:web:8143142e3fbe3526ef5acc'
};

const app = initializeApp(FIREBASE_CONFIG);
const db = getFirestore(app);
window.NexusCloud = { db, collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp };

// --- 2. VIRTUAL FILE SYSTEM (VFS) ENGINE ---
// Προσομοιώνει έναν πλήρη σκληρό δίσκο UNIX στη μνήμη του browser
class VirtualFileSystem {
    constructor() {
        this.tree = {
            '': { type: 'dir', perms: 'rwxr-xr-x', children: {
                'home': { type: 'dir', perms: 'rwxr-xr-x', children: {
                    'operator': { type: 'dir', perms: 'rwx------', children: {
                        'documents': { type: 'dir', perms: 'rwxr-xr-x', children: {
                            'welcome.txt': { type: 'file', content: 'Welcome to NexusOS Global Command.', perms: 'rw-r--r--' },
                            'mission.md': { type: 'file', content: '# DIRECTIVE\nEstablish global relay node.', perms: 'rw-r--r--' }
                        }},
                        'scripts': { type: 'dir', perms: 'rwxr-xr-x', children: {
                            'hack.sh': { type: 'file', content: 'echo "Bypassing mainframe..."\nsleep 1\necho "Access Granted."', perms: 'rwxr-xr-x' }
                        }}
                    }}
                }},
                'sys': { type: 'dir', perms: 'r-xr-xr-x', children: {
                    'kernel': { type: 'dir', perms: 'r-xr-xr-x', children: {
                        'config.json': { type: 'file', content: '{"os": "Nexus", "version": 4.0, "firebase_sync": true}', perms: 'r--r--r--' }
                    }},
                    'logs': { type: 'dir', perms: 'rwxrwxrwx', children: {} }
                }},
                'bin': { type: 'dir', perms: 'r-xr-xr-x', children: {
                    'sysmon': { type: 'exe' },
                    'comms': { type: 'exe' }
                }}
            }}
        };
    }

    // Επιστρέφει τον κόμβο (φάκελο/αρχείο) σε μια συγκεκριμένη διαδρομή
    getNode(path) {
        if (path === '/') return this.tree[''];
        const parts = path.split('/').filter(Boolean);
        let current = this.tree[''];
        for (let part of parts) {
            if (!current || current.type !== 'dir' || !current.children[part]) return null;
            current = current.children[part];
        }
        return current;
    }

    // Μετατρέπει σχετικές διαδρομές (π.χ. ../docs) σε απόλυτες (/home/operator/docs)
    resolvePath(cwd, target) {
        if (!target) return cwd;
        if (target.startsWith('/')) return target;
        if (target === '~') return '/home/operator';
        
        const parts = cwd.split('/').filter(Boolean);
        const targetParts = target.split('/').filter(Boolean);
        
        for (let p of targetParts) {
            if (p === '..') { parts.pop(); }
            else if (p !== '.') { parts.push(p); }
        }
        return '/' + parts.join('/');
    }

    // Δημιουργία αρχείου
    writeFile(path, content, overwrite = true) {
        const parts = path.split('/').filter(Boolean);
        const fileName = parts.pop();
        const dirPath = '/' + parts.join('/');
        const dirNode = this.getNode(dirPath);

        if (!dirNode || dirNode.type !== 'dir') throw new Error('Directory not found');
        if (!overwrite && dirNode.children[fileName]) throw new Error('File already exists');
        
        dirNode.children[fileName] = { type: 'file', content: content, perms: 'rw-r--r--' };
        return true;
    }
}

// --- 3. WINDOW MANAGER (COMPOSITOR) ---
// Διαχειρίζεται τα γραφικά παράθυρα, το Drag & Drop, και το Taskbar
class WindowManager {
    constructor() {
        this.desktop = document.getElementById('desktop');
        this.tasklist = document.getElementById('task-list');
        this.windows = {};
        this.zIndexCounter = 1000;
        this.dragState = { active: false, id: null, offX: 0, offY: 0 };
        this.apps = {}; // Θα φορτωθούν στο Μέρος 2

        this.bindGlobalEvents();
    }

    bindGlobalEvents() {
        document.addEventListener('mousemove', (e) => {
            if (!this.dragState.active) return;
            const win = this.windows[this.dragState.id].dom;
            // Αποτροπή εξόδου του παραθύρου εκτός οθόνης
            let newX = Math.max(0, e.clientX - this.dragState.offX);
            let newY = Math.max(0, e.clientY - this.dragState.offY);
            win.style.left = `${newX}px`;
            win.style.top = `${newY}px`;
        });

        document.addEventListener('mouseup', () => {
            if (this.dragState.active) {
                this.windows[this.dragState.id].dom.style.opacity = '1';
                this.dragState.active = false;
            }
        });
    }

    registerApp(appId, config) {
        this.apps[appId] = config;
    }

    spawnWindow(appId, args = null) {
        const app = this.apps[appId];
        if (!app) {
            console.error(`App [${appId}] not registered in WindowManager.`);
            return;
        }

        const winId = `win_${appId}_${Date.now()}`;
        const offset = (Object.keys(this.windows).length % 10) * 30;
        
        // Κατασκευή DOM Παραθύρου
        const win = document.createElement('div');
        win.className = 'absolute bg-[rgba(10,12,20,0.9)] border border-[rgba(0,240,255,0.4)] shadow-2xl flex flex-col backdrop-blur-md overflow-hidden transition-transform duration-100';
        win.style.width = `${app.width || 600}px`;
        win.style.height = `${app.height || 400}px`;
        win.style.left = `${100 + offset}px`;
        win.style.top = `${50 + offset}px`;
        win.style.zIndex = ++this.zIndexCounter;
        win.style.borderRadius = '8px 8px 0 0';

        win.innerHTML = `
            <div class="bg-[rgba(0,240,255,0.1)] border-b border-[rgba(0,240,255,0.3)] px-3 py-2 flex justify-between items-center cursor-grab select-none win-header">
                <div class="text-white font-mono text-xs font-bold tracking-wider flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-[#00ff41] animate-pulse"></span>
                    ${app.title}
                </div>
                <div class="flex gap-2">
                    <button class="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-400 transition-colors win-min"></button>
                    <button class="w-3 h-3 rounded-full bg-green-500 hover:bg-green-400 transition-colors win-max"></button>
                    <button class="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400 transition-colors win-close"></button>
                </div>
            </div>
            <div class="flex-1 relative overflow-hidden flex flex-col" id="content_${winId}"></div>
        `;

        this.desktop.appendChild(win);

        // Κατασκευή Taskbar Item
        const task = document.createElement('button');
        task.className = 'px-3 py-1 bg-[rgba(0,240,255,0.1)] border-b-2 border-[#00f0ff] text-white font-mono text-xs flex items-center gap-2 hover:bg-[rgba(0,240,255,0.2)] transition-colors';
        task.innerHTML = `<span class="w-2 h-2 bg-[#00f0ff]"></span> ${app.title.split(' ')[0]}`;
        
        if(this.tasklist) this.tasklist.appendChild(task);

        // Αποθήκευση στο State
        this.windows[winId] = { dom: win, taskDom: task, minimized: false, maximized: false, oldRect: null };

        // Bind Window Controls
        this.bindWindowControls(winId, win, task);

        // Render App Content
        const contentArea = document.getElementById(`content_${winId}`);
        app.render(winId, contentArea, args);
        
        this.focus(winId);
        return winId;
    }

    bindWindowControls(id, win, task) {
        const header = win.querySelector('.win-header');
        
        // Dragging
        header.addEventListener('mousedown', (e) => {
            if (this.windows[id].maximized || e.target.tagName === 'BUTTON') return;
            this.focus(id);
            const rect = win.getBoundingClientRect();
            this.dragState = { active: true, id: id, offX: e.clientX - rect.left, offY: e.clientY - rect.top };
            win.style.opacity = '0.8';
        });

        // Focus on click anywhere in window
        win.addEventListener('mousedown', () => this.focus(id));
        
        // Buttons
        win.querySelector('.win-close').onclick = () => this.destroy(id);
        win.querySelector('.win-max').onclick = () => this.maximize(id);
        win.querySelector('.win-min').onclick = () => this.toggleMinimize(id);
        task.onclick = () => this.toggleMinimize(id);
    }

    focus(id) {
        if (!this.windows[id]) return;
        this.windows[id].dom.style.zIndex = ++this.zIndexCounter;
        
        // Update taskbar visual state
        Object.values(this.windows).forEach(w => {
            if(w.taskDom) {
                w.taskDom.classList.remove('border-[#00f0ff]', 'bg-[rgba(0,240,255,0.2)]');
                w.taskDom.classList.add('border-transparent', 'bg-[rgba(255,255,255,0.05)]');
            }
        });
        const activeTask = this.windows[id].taskDom;
        if(activeTask) {
            activeTask.classList.remove('border-transparent', 'bg-[rgba(255,255,255,0.05)]');
            activeTask.classList.add('border-[#00f0ff]', 'bg-[rgba(0,240,255,0.2)]');
        }
    }

    toggleMinimize(id) {
        const win = this.windows[id];
        if (win.minimized) {
            win.dom.style.display = 'flex';
            win.minimized = false;
            this.focus(id);
        } else {
            // Αν είναι ήδη μπροστά, ελαχιστοποίησέ το. Αλλιώς, φέρτο μπροστά.
            if (win.dom.style.zIndex == this.zIndexCounter) {
                win.dom.style.display = 'none';
                win.minimized = true;
                win.taskDom.classList.remove('border-[#00f0ff]');
            } else {
                this.focus(id);
            }
        }
    }

    maximize(id) {
        const win = this.windows[id];
        if (win.maximized) {
            win.dom.style.width = win.oldRect.width;
            win.dom.style.height = win.oldRect.height;
            win.dom.style.left = win.oldRect.left;
            win.dom.style.top = win.oldRect.top;
            win.dom.style.borderRadius = '8px 8px 0 0';
            win.maximized = false;
        } else {
            win.oldRect = {
                width: win.dom.style.width, height: win.dom.style.height,
                left: win.dom.style.left, top: win.dom.style.top
            };
            win.dom.style.width = '100%';
            win.dom.style.height = '100%';
            win.dom.style.left = '0';
            win.dom.style.top = '0';
            win.dom.style.borderRadius = '0';
            win.maximized = true;
        }
    }

    destroy(id) {
        this.windows[id].dom.remove();
        if(this.windows[id].taskDom) this.windows[id].taskDom.remove();
        
        // Trigger on_close event if app defined it
        const appId = id.split('_')[1];
        if (this.apps[appId] && this.apps[appId].onClose) {
            this.apps[appId].onClose(id);
        }
        delete this.windows[id];
    }
}

// Αρχικοποίηση Πυρήνα
window.NexusVFS = new VirtualFileSystem();
window.NexusWM = new WindowManager();
