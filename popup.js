// Talks to Firebase Realtime Database over plain REST — see
// content_scripts/sync-core.js for why there's no Firebase SDK involved.

const dbUrlInput = document.getElementById('dbUrlInput');
const saveDbUrlBtn = document.getElementById('saveDbUrl');
const dbUrlStatus = document.getElementById('dbUrlStatus');
const setupCard = document.getElementById('setupCard');
const roomCodeEl = document.getElementById('roomCode');
const copyRoomBtn = document.getElementById('copyRoom');
const joinCodeInput = document.getElementById('joinCodeInput');
const joinRoomBtn = document.getElementById('joinRoom');
const notesArea = document.getElementById('notesArea');
const notesStatus = document.getElementById('notesStatus');
const chatLog = document.getElementById('chatLog');
const chatInput = document.getElementById('chatInput');
const sendChatBtn = document.getElementById('sendChat');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const changeDbLink = document.getElementById('changeDbLink');

let dbUrl = null;
let roomId = null;
let myClientId = 'p_' + Math.random().toString(36).slice(2, 10); // per-popup-session, only used to style my own chat bubbles
let chatPoll = null;

function randomRoomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars
  let code = '';
  for (let i = 0; i < 6; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
  return code;
}

function roomUrl(path) {
  return `${dbUrl.replace(/\/$/, '')}/rooms/${encodeURIComponent(roomId)}/${path}.json`;
}

function setConnectionStatus(state) {
  // state: 'connected' | 'disconnected' | 'unknown'
  statusDot.className = 'dot' + (state === 'connected' ? ' connected' : state === 'disconnected' ? ' disconnected' : '');
  statusText.textContent = state === 'connected' ? 'Connected' : state === 'disconnected' ? 'Offline' : 'Not set up';
}

// ---------------------------------------------------------------------
// tabs
// ---------------------------------------------------------------------
document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.panel').forEach((p) => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('panel-' + btn.dataset.tab).classList.add('active');
  });
});

// ---------------------------------------------------------------------
// database connection
// ---------------------------------------------------------------------
async function testConnection() {
  try {
    const res = await fetch(`${dbUrl.replace(/\/$/, '')}/.json?shallow=true`);
    if (!res.ok) throw new Error(res.status);
    dbUrlStatus.textContent = '';
    setupCard.style.display = 'none';
    setConnectionStatus('connected');
    return true;
  } catch (e) {
    dbUrlStatus.textContent = "Couldn't reach that database — check the URL and that it's a Realtime Database (not Firestore).";
    setConnectionStatus('disconnected');
    return false;
  }
}

changeDbLink.addEventListener('click', () => {
  setupCard.style.display = 'block';
  dbUrlInput.focus();
});

saveDbUrlBtn.addEventListener('click', async () => {
  const url = dbUrlInput.value.trim();
  if (!url) return;
  dbUrl = url;
  const ok = await testConnection();
  if (ok) {
    chrome.storage.sync.set({ dbUrl });
    loadNotes();
    loadChat();
  }
});

// ---------------------------------------------------------------------
// room
// ---------------------------------------------------------------------
function enterRoom(newRoomId) {
  roomId = newRoomId;
  roomCodeEl.textContent = roomId;
  chrome.storage.sync.set({ roomId });
  loadNotes();
  loadChat();
  clearInterval(chatPoll);
  chatPoll = setInterval(loadChat, 4000);
}

copyRoomBtn.addEventListener('click', () => {
  navigator.clipboard.writeText(roomId || '');
  copyRoomBtn.textContent = 'Copied ✓';
  setTimeout(() => { copyRoomBtn.textContent = 'Copy code'; }, 1200);
});

joinRoomBtn.addEventListener('click', () => {
  const code = joinCodeInput.value.trim().toUpperCase();
  if (!code) return;
  joinCodeInput.value = '';
  enterRoom(code);
});

// ---------------------------------------------------------------------
// notes
// ---------------------------------------------------------------------
function loadNotes() {
  if (!dbUrl || !roomId) return;
  fetch(roomUrl('notes')).then((r) => r.json()).then((data) => {
    if (data && typeof data.text === 'string' && document.activeElement !== notesArea) {
      notesArea.value = data.text;
    }
  }).catch(() => {});
}

let notesSaveTimer = null;
function saveNotesDebounced() {
  clearTimeout(notesSaveTimer);
  notesSaveTimer = setTimeout(() => {
    fetch(roomUrl('notes'), {
      method: 'PUT',
      body: JSON.stringify({ text: notesArea.value, updatedAt: Date.now() }),
    }).then(() => {
      notesStatus.classList.add('show');
      setTimeout(() => notesStatus.classList.remove('show'), 1200);
    }).catch(() => {});
  }, 500);
}
notesArea.addEventListener('input', saveNotesDebounced);

// ---------------------------------------------------------------------
// chat
// ---------------------------------------------------------------------
function renderChat(messages) {
  const items = Object.values(messages || {}).sort((a, b) => a.ts - b.ts).slice(-30);
  if (!items.length) {
    chatLog.innerHTML = '<div class="empty-state">No messages yet</div>';
    return;
  }
  chatLog.innerHTML = '';
  for (const m of items) {
    const div = document.createElement('div');
    div.className = 'bubble ' + (m.from === myClientId ? 'me' : 'them');
    div.textContent = m.text;
    chatLog.appendChild(div);
  }
  chatLog.scrollTop = chatLog.scrollHeight;
}

function loadChat() {
  if (!dbUrl || !roomId) return;
  fetch(roomUrl('chat')).then((r) => r.json()).then(renderChat).catch(() => {});
}

function sendChat() {
  const text = chatInput.value.trim();
  if (!text || !dbUrl || !roomId) return;
  chatInput.value = '';
  fetch(roomUrl('chat'), {
    method: 'POST',
    body: JSON.stringify({ text, from: myClientId, ts: Date.now() }),
  }).then(loadChat).catch(() => {});
}
sendChatBtn.addEventListener('click', sendChat);
chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendChat(); });

// ---------------------------------------------------------------------
// boot
// ---------------------------------------------------------------------
chrome.storage.sync.get(['dbUrl', 'roomId'], async (stored) => {
  if (stored.dbUrl) {
    dbUrl = stored.dbUrl;
    dbUrlInput.value = dbUrl;
    await testConnection();
  } else {
    setConnectionStatus('unknown');
  }
  enterRoom(stored.roomId || randomRoomCode());
});
