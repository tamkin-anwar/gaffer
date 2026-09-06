// Talks to Firebase Realtime Database over plain REST — see
// content_scripts/sync-core.js for why there's no Firebase SDK involved.

const dbUrlInput = document.getElementById('dbUrlInput');
const saveDbUrlBtn = document.getElementById('saveDbUrl');
const dbUrlStatus = document.getElementById('dbUrlStatus');
const roomCodeInput = document.getElementById('roomCode');
const copyRoomBtn = document.getElementById('copyRoom');
const joinCodeInput = document.getElementById('joinCodeInput');
const joinRoomBtn = document.getElementById('joinRoom');
const notesArea = document.getElementById('notesArea');
const notesStatus = document.getElementById('notesStatus');
const chatLog = document.getElementById('chatLog');
const chatInput = document.getElementById('chatInput');
const sendChatBtn = document.getElementById('sendChat');

let dbUrl = null;
let roomId = null;
let myClientId = 'p_' + Math.random().toString(36).slice(2, 10); // per-popup-session, only used to bold my own chat lines
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

function setStatus(el, text, ok) {
  el.textContent = text;
  el.className = 'status ' + (ok ? 'ok' : 'err');
}

async function testConnection() {
  try {
    const res = await fetch(`${dbUrl.replace(/\/$/, '')}/.json?shallow=true`);
    if (!res.ok) throw new Error(res.status);
    setStatus(dbUrlStatus, 'Connected.', true);
    return true;
  } catch (e) {
    setStatus(dbUrlStatus, "Couldn't reach that database — check the URL and that it's a Realtime Database (not Firestore).", false);
    return false;
  }
}

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
  setStatus(notesStatus, 'Saving…', true);
  notesSaveTimer = setTimeout(() => {
    fetch(roomUrl('notes'), {
      method: 'PUT',
      body: JSON.stringify({ text: notesArea.value, updatedAt: Date.now() }),
    }).then(() => setStatus(notesStatus, 'Saved.', true))
      .catch(() => setStatus(notesStatus, 'Could not save — check your connection.', false));
  }, 500);
}

function renderChat(messages) {
  chatLog.innerHTML = '';
  const items = Object.values(messages || {}).sort((a, b) => a.ts - b.ts).slice(-30);
  for (const m of items) {
    const div = document.createElement('div');
    if (m.from === myClientId) div.className = 'me';
    div.textContent = `${m.from === myClientId ? 'You' : 'Them'}: ${m.text}`;
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

function enterRoom(newRoomId) {
  roomId = newRoomId;
  roomCodeInput.value = roomId;
  chrome.storage.sync.set({ roomId });
  loadNotes();
  loadChat();
  clearInterval(chatPoll);
  chatPoll = setInterval(loadChat, 4000);
}

// ---------------------------------------------------------------------
// wire up
// ---------------------------------------------------------------------
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

copyRoomBtn.addEventListener('click', () => {
  navigator.clipboard.writeText(roomCodeInput.value);
  copyRoomBtn.textContent = 'Copied';
  setTimeout(() => { copyRoomBtn.textContent = 'Copy'; }, 1200);
});

joinRoomBtn.addEventListener('click', () => {
  const code = joinCodeInput.value.trim().toUpperCase();
  if (!code) return;
  joinCodeInput.value = '';
  enterRoom(code);
});

notesArea.addEventListener('input', saveNotesDebounced);
sendChatBtn.addEventListener('click', sendChat);
chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendChat(); });

chrome.storage.sync.get(['dbUrl', 'roomId'], async (stored) => {
  if (stored.dbUrl) {
    dbUrl = stored.dbUrl;
    dbUrlInput.value = dbUrl;
    await testConnection();
  }
  enterRoom(stored.roomId || randomRoomCode());
});
