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
// ==============================================================================
// NEXUS_OS KERNEL - PART 2: TERMINAL ENGINE & TELEMETRY MONITOR
// ==============================================================================

// --- 1. THE TERMINAL APP (Command Line Interface) ---
window.NexusWM.registerApp('terminal', {
    title: 'TTY1 - Global Terminal',
    width: 650,
    height: 450,
    render: (winId, container) => {
        container.innerHTML = `
            <div id="term-out-${winId}" class="flex-1 bg-[rgba(2,2,5,0.95)] text-[#00f0ff] p-4 overflow-y-auto font-mono text-[13px] leading-relaxed select-text">
                <div class="mb-4 text-[#00ff41]">
                    NexusOS Core v4.0 - Global Access Terminal<br>
                    Type <span class="text-white font-bold">'help'</span> for a list of executables.
                </div>
            </div>
            <form id="term-form-${winId}" class="bg-black border-t border-[rgba(0,240,255,0.3)] p-3 flex font-mono text-[13px]">
                <span id="prompt-${winId}" class="text-[#00ff41] font-bold mr-2 shadow-[#00ff41]">operator@nexus:~$</span>
                <input type="text" id="term-inp-${winId}" class="flex-1 bg-transparent text-white outline-none" autocomplete="off" spellcheck="false">
            </form>
        `;

        const out = document.getElementById(`term-out-${winId}`);
        const inp = document.getElementById(`term-inp-${winId}`);
        const form = document.getElementById(`term-form-${winId}`);
        const prompt = document.getElementById(`prompt-${winId}`);

        let cwd = '/home/operator';
        let history = [];
        let hIdx = -1;

        const print = (html) => {
            out.innerHTML += `<div class="mb-1">${html}</div>`;
            out.scrollTop = out.scrollHeight;
        };
        const escape = (s) => s.replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

        // Firebase: Ακρόαση για νέα μηνύματα (Global Chat)
        const chatRef = window.NexusCloud.collection(window.NexusCloud.db, 'messages');
        const chatQuery = window.NexusCloud.query(chatRef, window.NexusCloud.orderBy('createdAt', 'desc'), window.NexusCloud.limit(1));
        let isFirstLoad = true;

        const unsubscribe = window.NexusCloud.onSnapshot(chatQuery, (snap) => {
            if (isFirstLoad) { isFirstLoad = false; return; } // Αγνόηση του παλιού ιστορικού κατά το άνοιγμα
            snap.docChanges().forEach(change => {
                if (change.type === 'added') {
                    const d = change.doc.data();
                    const time = d.createdAt?.toDate ? d.createdAt.toDate().toLocaleTimeString([], {hour12:false}) : 'NOW';
                    print(`<span class="text-gray-500">[${time}]</span> <span class="text-[#00ff41]">NET_RCV</span> &lt;<span class="text-[#b000ff]">${escape(d.name)}</span>&gt; <span class="text-white">${escape(d.text)}</span>`);
                }
            });
        });

        // Αποθήκευση του listener για να κλείσει όταν κλείσει το παράθυρο
        window.NexusWM.windows[winId].unsubscribeChat = unsubscribe;

        form.onsubmit = async (e) => {
            e.preventDefault();
            const rawCmd = inp.value.trim();
            if (!rawCmd) return;

            print(`<span class="text-[#00ff41]">${prompt.textContent}</span> <span class="text-white">${escape(rawCmd)}</span>`);
            history.push(rawCmd);
            hIdx = history.length;
            inp.value = '';

            // Διαχωρισμός εντολής (κρατάει τα strings σε εισαγωγικά ενωμένα)
            const args = rawCmd.match(/(?:[^\s"]+|"[^"]*")+/g).map(s => s.replace(/(^"|"$)/g, ''));
            const cmd = args[0].toLowerCase();

            try {
                switch (cmd) {
                    case 'help':
                        print(`Available Modules: <span class="text-white">ls, cd, pwd, mkdir, cat, echo, clear, whoami, msg</span>`);
                        break;
                    case 'clear':
                        out.innerHTML = '';
                        break;
                    case 'pwd':
                        print(cwd);
                        break;
                    case 'whoami':
                        print('operator');
                        break;
                    case 'ls':
                        const targetPath = args[1] ? window.NexusVFS.resolvePath(cwd, args[1]) : cwd;
                        const node = window.NexusVFS.getNode(targetPath);
                        if (!node) print(`ls: cannot access '${targetPath}': No such file or directory`);
                        else if (node.type !== 'dir') print(args[1]);
                        else {
                            const files = Object.keys(node.children).map(k => {
                                return node.children[k].type === 'dir' ? `<span class="text-[#00f0ff] font-bold">${k}/</span>` : `<span class="text-white">${k}</span>`;
                            });
                            print(`<div class="grid grid-cols-4 gap-2 mt-1">${files.join('')}</div>`);
                        }
                        break;
                    case 'cd':
                        const newPath = args[1] ? window.NexusVFS.resolvePath(cwd, args[1]) : '/home/operator';
                        const nNode = window.NexusVFS.getNode(newPath);
                        if (!nNode) print(`cd: ${args[1]}: No such file or directory`);
                        else if (nNode.type !== 'dir') print(`cd: ${args[1]}: Not a directory`);
                        else {
                            cwd = newPath;
                            const displayPath = cwd.startsWith('/home/operator') ? cwd.replace('/home/operator', '~') : cwd;
                            prompt.textContent = `operator@nexus:${displayPath}$`;
                        }
                        break;
                    case 'mkdir':
                        if (!args[1]) return print('mkdir: missing operand');
                        const parentNode = window.NexusVFS.getNode(cwd);
                        if (parentNode.children[args[1]]) print(`mkdir: cannot create directory '${args[1]}': File exists`);
                        else parentNode.children[args[1]] = { type: 'dir', perms: 'rwxr-xr-x', children: {} };
                        break;
                    case 'echo':
                        if (args.length >= 3 && args[args.length - 2] === '>') {
                            const text = args.slice(1, -2).join(' ');
                            const fileName = args[args.length - 1];
                            window.NexusVFS.writeFile(window.NexusVFS.resolvePath(cwd, fileName), text);
                        } else {
                            print(args.slice(1).join(' '));
                        }
                        break;
                    case 'cat':
                        if (!args[1]) return print('cat: missing operand');
                        const fNode = window.NexusVFS.getNode(window.NexusVFS.resolvePath(cwd, args[1]));
                        if (!fNode) print(`cat: ${args[1]}: No such file or directory`);
                        else if (fNode.type === 'dir') print(`cat: ${args[1]}: Is a directory`);
                        else print(`<pre class="text-gray-300 font-mono mt-1">${escape(fNode.content)}</pre>`);
                        break;
                    case 'msg':
                        const msgText = args.slice(1).join(' ');
                        if (!msgText) return print(`<span class="text-[#ff003c]">ERR: Message payload empty. Usage: msg [text]</span>`);
                        inp.disabled = true;
                        try {
                            await window.NexusCloud.addDoc(chatRef, {
                                name: 'operator',
                                text: msgText,
                                createdAt: window.NexusCloud.serverTimestamp()
                            });
                        } catch (e) {
                            print(`<span class="text-[#ff003c]">TX_FAILED: ${e.message}</span>`);
                        } finally {
                            inp.disabled = false;
                            inp.focus();
                        }
                        break;
                    default:
                        print(`nx-bash: ${escape(cmd)}: command not found`);
                }
            } catch (err) {
                print(`<span class="text-[#ff003c]">CRITICAL_ERR: ${err.message}</span>`);
            }
        };

        inp.onkeydown = (e) => {
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (hIdx > 0) inp.value = history[--hIdx];
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (hIdx < history.length - 1) inp.value = history[++hIdx];
                else { hIdx = history.length; inp.value = ''; }
            }
        };
        
        setTimeout(() => inp.focus(), 100);
    },
    onClose: (winId) => {
        // Καθαρισμός του Firebase Listener όταν κλείνει το παράθυρο
        if(window.NexusWM.windows[winId]?.unsubscribeChat) {
            window.NexusWM.windows[winId].unsubscribeChat();
        }
    }
});

// --- 2. TELEMETRY MONITOR APP (Canvas Graph Rendering) ---
window.NexusWM.registerApp('monitor', {
    title: 'HW_TELEMETRY',
    width: 550,
    height: 380,
    render: (winId, container) => {
        container.innerHTML = `
            <div class="p-4 h-full bg-[#05050a] flex flex-col gap-4 overflow-hidden">
                <div class="grid grid-cols-2 gap-4">
                    <div class="border border-[rgba(0,240,255,0.3)] p-3 bg-black rounded">
                        <div class="text-xs text-[#00f0ff] mb-2 font-mono flex justify-between">
                            <span>CPU MATRIX</span>
                            <span id="cpu-val-${winId}" class="font-bold">0%</span>
                        </div>
                        <canvas id="cpu-canv-${winId}" width="220" height="60" class="w-full"></canvas>
                    </div>
                    <div class="border border-[rgba(0,240,255,0.3)] p-3 bg-black rounded">
                        <div class="text-xs text-[#b000ff] mb-2 font-mono flex justify-between">
                            <span>MEM ALLOC</span>
                            <span id="ram-val-${winId}" class="font-bold">0GB</span>
                        </div>
                        <canvas id="ram-canv-${winId}" width="220" height="60" class="w-full"></canvas>
                    </div>
                </div>
                <div class="border border-[rgba(0,240,255,0.3)] p-3 bg-black rounded flex-1 flex flex-col">
                    <div class="text-xs text-[#00ff41] mb-2 font-mono">NETWORK I/O (Gbps)</div>
                    <div id="net-bars-${winId}" class="flex-1 flex items-end gap-1"></div>
                </div>
            </div>
        `;

        const drawGraph = (ctx, data, color) => {
            ctx.clearRect(0, 0, 220, 60);
            ctx.beginPath(); 
            ctx.moveTo(0, 60);
            data.forEach((val, i) => ctx.lineTo(i * (220 / 19), 60 - (val / 100) * 60));
            ctx.lineTo(220, 60); 
            ctx.fillStyle = color; 
            ctx.fill();
            ctx.strokeStyle = color.replace('0.3', '1'); 
            ctx.lineWidth = 1.5; 
            ctx.stroke();
        };

        const cpuCtx = document.getElementById(`cpu-canv-${winId}`).getContext('2d');
        const ramCtx = document.getElementById(`ram-canv-${winId}`).getContext('2d');
        const netBox = document.getElementById(`net-bars-${winId}`);
        
        let cpuData = Array(20).fill(0);
        let ramData = Array(20).fill(0);

        // Interval Loop για την ανανέωση των γραφημάτων
        const interval = setInterval(() => {
            const cpu = Math.floor(Math.random() * 80) + 15;
            const ram = Math.floor(Math.random() * 30) + 20;
            
            cpuData.shift(); cpuData.push(cpu);
            ramData.shift(); ramData.push(ram);
            
            document.getElementById(`cpu-val-${winId}`).innerText = `${cpu}%`;
            document.getElementById(`ram-val-${winId}`).innerText = `${(ram * 0.64).toFixed(1)} GB`;
            
            drawGraph(cpuCtx, cpuData, 'rgba(0, 240, 255, 0.3)');
            drawGraph(ramCtx, ramData, 'rgba(176, 0, 255, 0.3)');

            // Μπάρες Δικτύου
            netBox.innerHTML = Array(35).fill(0).map(() => {
                const height = Math.random() * 90 + 10;
                const color = height > 80 ? '#ff003c' : '#00ff41';
                return `<div class="w-full opacity-80 transition-all duration-300" style="height: ${height}%; background-color: ${color}"></div>`;
            }).join('');
        }, 1200);

        window.NexusWM.windows[winId].monitorInterval = interval;
    },
    onClose: (winId) => {
        clearInterval(window.NexusWM.windows[winId].monitorInterval);
    }
});
// ==============================================================================
// NEXUS_OS KERNEL - PART 3: DESKTOP, START MENU & BOOT SEQUENCE
// ==============================================================================

// --- 1. DESKTOP & UI INITIALIZATION ---
const initDesktop = () => {
    const desktop = document.getElementById('desktop');
    const taskbar = document.getElementById('task-list');
    
    // Δημιουργία Εικονιδίων Επιφάνειας Εργασίας
    const apps = [
        { id: 'terminal', icon: 'M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', name: 'Terminal' },
        { id: 'monitor', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', name: 'Telemetry' }
    ];

    const iconGrid = document.createElement('div');
    iconGrid.className = 'p-5 grid grid-cols-1 gap-6 w-24 relative z-10';
    
    apps.forEach(app => {
        const btn = document.createElement('div');
        btn.className = 'flex flex-col items-center justify-center cursor-pointer group';
        btn.onclick = () => window.NexusWM.spawnWindow(app.id);
        btn.innerHTML = `
            <div class="w-12 h-12 bg-[rgba(0,240,255,0.05)] border border-[rgba(0,240,255,0.2)] rounded-lg flex items-center justify-center group-hover:bg-[rgba(0,240,255,0.2)] group-hover:border-[#00f0ff] transition-all">
                <svg class="w-6 h-6 text-[#00f0ff] drop-shadow-[0_0_5px_rgba(0,240,255,0.8)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="${app.icon}"></path></svg>
            </div>
            <span class="text-white text-xs font-mono mt-2 bg-black/50 px-1 rounded drop-shadow-md">${app.name}</span>
        `;
        iconGrid.appendChild(btn);
    });

    desktop.appendChild(iconGrid);

    // Μενού Έναρξης (SYS.START)
    const startMenu = document.createElement('div');
    startMenu.id = 'start-menu';
    startMenu.className = 'absolute bottom-[40px] left-0 w-64 bg-[rgba(10,12,20,0.95)] border border-[rgba(0,240,255,0.4)] border-b-0 rounded-tr-lg hidden flex-col overflow-hidden z-[9500] backdrop-blur-md transition-all duration-200 opacity-0 transform translate-y-2';
    startMenu.innerHTML = `
        <div class="p-4 border-b border-[rgba(0,240,255,0.2)] flex items-center gap-3">
            <div class="w-10 h-10 rounded bg-[#00f0ff] flex items-center justify-center text-black font-bold text-xl shadow-[0_0_10px_#00f0ff]">N</div>
            <div>
                <div class="font-bold text-white text-sm">OPERATOR</div>
                <div class="text-[10px] text-[#00ff41] font-mono">SYS.ADMIN_LEVEL_9</div>
            </div>
        </div>
        <div class="p-2 space-y-1">
            <button class="w-full text-left px-4 py-2 hover:bg-[#00f0ff] hover:text-black transition-colors rounded text-sm text-gray-200" onclick="window.NexusWM.spawnWindow('terminal'); document.getElementById('start-btn').click();">Command Terminal</button>
            <button class="w-full text-left px-4 py-2 hover:bg-[#00f0ff] hover:text-black transition-colors rounded text-sm text-gray-200" onclick="window.NexusWM.spawnWindow('monitor'); document.getElementById('start-btn').click();">Hardware Telemetry</button>
            <button class="w-full text-left px-4 py-2 mt-2 text-[#ff003c] hover:bg-[#ff003c] hover:text-white transition-colors rounded text-sm border border-[#ff003c]/30" onclick="location.reload()">Reboot System</button>
        </div>
    `;
    document.body.appendChild(startMenu);

    const startBtn = document.getElementById('start-btn');
    startBtn.onclick = () => {
        const isHidden = startMenu.classList.contains('hidden');
        if (isHidden) {
            startMenu.classList.remove('hidden');
            setTimeout(() => {
                startMenu.classList.remove('opacity-0', 'translate-y-2');
                startMenu.classList.add('opacity-100', 'translate-y-0');
            }, 10);
            startBtn.classList.add('bg-[#00f0ff]', 'text-black');
        } else {
            startMenu.classList.remove('opacity-100', 'translate-y-0');
            startMenu.classList.add('opacity-0', 'translate-y-2');
            setTimeout(() => startMenu.classList.add('hidden'), 200);
            startBtn.classList.remove('bg-[#00f0ff]', 'text-black');
        }
    };

    // Ρολόι
    setInterval(() => {
        document.getElementById('sys-clock').textContent = new Date().toLocaleTimeString('en-US', {hour12: false}) + ' UTC';
    }, 1000);
};

// --- 2. BOOT SEQUENCE & AUTHENTICATION ---
const initBootSequence = () => {
    const authScreen = document.getElementById('auth-screen');
    const authForm = document.getElementById('auth-form');
    const authPwd = document.getElementById('auth-pwd');
    const bootLog = document.getElementById('boot-log');

    // Matrix Background Animation
    const c = document.getElementById('matrix-bg');
    const ctx = c.getContext('2d');
    c.width = window.innerWidth; 
    c.height = window.innerHeight;
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$+-*/=%\"'#&_(),.;:?!\\|{}<>[]^~".split('');
    const drops = Array(Math.floor(c.width / 14)).fill(1);
    
    setInterval(() => {
        ctx.fillStyle = "rgba(5, 5, 10, 0.05)";
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.fillStyle = "#00ff41"; 
        ctx.font = "14px monospace";
        for(let i = 0; i < drops.length; i++) {
            const text = chars[Math.floor(Math.random() * chars.length)];
            ctx.fillText(text, i * 14, drops[i] * 14);
            if(drops[i] * 14 > c.height && Math.random() > 0.975) drops[i] = 0;
            drops[i]++;
        }
    }, 33);

    // Boot Text Animation
    const lines = [
        'BIOS Date 09/19/2026 13:08:11 Ver 4.00',
        'CPU: Quantum Core x128 @ 4.2THz',
        'Memory Testing: 65536 OK',
        'Loading Kernel Modules............ OK',
        'Mounting VFS (Virtual File System) OK',
        'Initializing Cloud Connectors..... OK',
        'Awaiting Operator Input...'
    ];
    
    let i = 0;
    const bootInterval = setInterval(() => {
        if (i < lines.length) {
            bootLog.innerHTML += `<div>[${(i * 0.14).toFixed(3)}] ${lines[i]}</div>`;
            bootLog.scrollTop = bootLog.scrollHeight;
            i++;
        } else {
            clearInterval(bootInterval);
        }
    }, 300);

    // Έλεγχος Κωδικού Πρόσβασης
    authForm.onsubmit = (e) => {
        e.preventDefault();
        // Κωδικός πρόσβασης: 2945
        if (btoa(authPwd.value.trim()) === 'Mjk0NQ==') {
            authScreen.style.opacity = '0';
            document.getElementById('net-status').innerHTML = `<span class="w-2 h-2 rounded-full animate-pulse bg-[#00ff41]"></span> UPLINK ACTIVE`;
            document.getElementById('net-status').classList.replace('text-yellow-400', 'text-[#00ff41]');
            
            setTimeout(() => {
                authScreen.remove();
                // Αυτόματο άνοιγμα του τερματικού μετά το boot
                window.NexusWM.spawnWindow('terminal');
            }, 1000);
        } else {
            authPwd.value = '';
            authScreen.classList.add('bg-red-900/40');
            setTimeout(() => authScreen.classList.remove('bg-red-900/40'), 200);
        }
    };
};

// Εκτέλεση μόλις φορτώσει το DOM
document.addEventListener('DOMContentLoaded', () => {
    initDesktop();
    initBootSequence();
});
