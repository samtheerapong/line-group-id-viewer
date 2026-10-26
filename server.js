const express = require('express');
const line = require('@line/bot-sdk');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN || '',
  channelSecret: process.env.CHANNEL_SECRET || '',
};

const app = express();

const GROUP_ID_FILE = path.join(__dirname, 'group_id.txt');
const HISTORY_FILE = path.join(__dirname, 'history.json');

// In-memory history cache
let history = [];
if (fs.existsSync(HISTORY_FILE)) {
  try {
    history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
  } catch (e) {
    history = [];
  }
}

function saveHistory(item) {
  history.unshift(item);
  if (history.length > 30) history.pop();
  try {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf-8');
  } catch (e) {}
}

// 1. Dashboard Homepage
app.get('/', (req, res) => {
  let latestId = '(ยังไม่มีข้อมูลกลุ่มล่าสุด)';
  if (fs.existsSync(GROUP_ID_FILE)) {
    try {
      latestId = fs.readFileSync(GROUP_ID_FILE, 'utf-8').trim() || latestId;
    } catch (e) {}
  }

  const rows = history.map((h, i) => `
    <tr class="border-b border-slate-700 hover:bg-slate-800/60 transition">
      <td class="p-3 text-slate-400 text-sm">${i + 1}</td>
      <td class="p-3 font-mono font-medium text-emerald-400 select-all">${h.groupId}</td>
      <td class="p-3 text-sm text-slate-300">
        <span class="px-2 py-0.5 rounded text-xs ${h.type === 'join' ? 'bg-blue-900/60 text-blue-300' : 'bg-purple-900/60 text-purple-300'}">${h.type}</span>
        ${h.text ? `<span class="ml-2 text-slate-400">"${h.text}"</span>` : ''}
      </td>
      <td class="p-3 text-sm text-slate-400">${h.time}</td>
    </tr>
  `).join('');

  const html = `
<!DOCTYPE html>
<html lang="th" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LINE Group ID Viewer | Webhook</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    function copyId() {
      const idText = document.getElementById('groupIdText').innerText.trim();
      if (!idText || idText.includes('ยังไม่มีข้อมูล')) return;
      navigator.clipboard.writeText(idText).then(() => {
        const btn = document.getElementById('copyBtn');
        const orig = btn.innerHTML;
        btn.innerHTML = '✅ คัดลอกสำเร็จ!';
        btn.classList.replace('bg-emerald-600', 'bg-blue-600');
        setTimeout(() => {
          btn.innerHTML = orig;
          btn.classList.replace('bg-blue-600', 'bg-emerald-600');
        }, 2000);
      });
    }

    // Auto-refresh every 3s to show new groups in real time
    setInterval(async () => {
      try {
        const res = await fetch('/api/latest');
        const data = await res.json();
        if (data.latestId && data.latestId !== document.getElementById('groupIdText').innerText.trim()) {
          location.reload();
        }
      } catch(e) {}
    }, 3000);
  </script>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex flex-col items-center py-10 px-4">
  <div class="max-w-3xl w-full space-y-6">
    
    <!-- Header -->
    <div class="text-center space-y-2">
      <div class="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400 text-xs font-semibold">
        <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        Webhook Server Active
      </div>
      <h1 class="text-3xl font-extrabold tracking-tight">📱 LINE Group ID Viewer</h1>
      <p class="text-slate-400 text-sm">เซิร์ฟเวอร์ดักรับ Webhook ดึงเลข Group ID จาก LINE แบบอัตโนมัติ</p>
    </div>

    <!-- Main Card -->
    <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
      <div class="flex items-center justify-between text-xs text-slate-400 uppercase tracking-wider font-semibold">
        <span>Group ID ล่าสุดที่ตรวจพบ</span>
        <span class="text-emerald-400">Real-time Auto Update</span>
      </div>

      <div class="p-4 bg-slate-950 border border-slate-800 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <span id="groupIdText" class="font-mono text-lg sm:text-2xl font-bold text-emerald-400 break-all select-all">${latestId}</span>
        <button id="copyBtn" onclick="copyId()" class="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium text-sm transition shadow-lg shrink-0 flex items-center justify-center gap-2">
          📋 คัดลอก ID
        </button>
      </div>

      <div class="bg-slate-800/40 border border-slate-800 rounded-lg p-3 text-xs text-slate-400 leading-relaxed">
        💡 <b>วิธีใช้งาน:</b> เชิญบอทเข้ากลุ่ม LINE หรือพิมพ์คำว่า <code class="text-emerald-300 bg-slate-800 px-1.5 py-0.5 rounded">getid</code> ในกลุ่ม LINE เลข Group ID จะมาปรากฏบนหน้านี้ทันทีโดยอัตโนมัติครับ
      </div>
    </div>

    <!-- History Table -->
    <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      <div class="p-4 border-b border-slate-800 font-semibold text-sm flex items-center justify-between">
        <span>🕒 ประวัติการตรวจจับกลุ่มล่าสุด</span>
        <span class="text-xs text-slate-500">${history.length} รายการ</span>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-slate-950 text-slate-400 text-xs uppercase font-medium border-b border-slate-800">
              <th class="p-3">#</th>
              <th class="p-3">Group ID</th>
              <th class="p-3">เหตุการณ์</th>
              <th class="p-3">เวลาที่ตรวจพบ</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="4" class="p-6 text-center text-slate-500 text-sm">ยังไม่มีประวัติการส่งข้อมูลจากกลุ่ม</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>

    <div class="text-center text-xs text-slate-500">
      Webhook Endpoint: <code class="text-slate-400">/webhook</code> (POST)
    </div>

  </div>
</body>
</html>
  `;
  res.send(html);
});

// API for real-time polling
app.get('/api/latest', (req, res) => {
  let latestId = '';
  if (fs.existsSync(GROUP_ID_FILE)) {
    try {
      latestId = fs.readFileSync(GROUP_ID_FILE, 'utf-8').trim();
    } catch (e) {}
  }
  res.json({ latestId, historyCount: history.length });
});

// 2. LINE Webhook Endpoint
app.post('/webhook', line.middleware(config), (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error('Error handling webhook event:', err);
      res.status(500).end();
    });
});

// Event Handler
function handleEvent(event) {
  const nowStr = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });

  // 1. Group / Room event detection
  if (event.source && (event.source.type === 'group' || event.source.type === 'room')) {
    const groupId = event.source.groupId || event.source.roomId;
    console.log('----------------------------------------');
    console.log(`[+] Group ID found: ${groupId} (Event: ${event.type})`);
    console.log('----------------------------------------');

    try {
      fs.writeFileSync(GROUP_ID_FILE, groupId, 'utf-8');
    } catch (e) {
      console.error('Error saving group_id.txt:', e);
    }

    saveHistory({
      groupId: groupId,
      type: event.type,
      text: (event.message && event.message.text) ? event.message.text : '',
      time: nowStr
    });
  }

  // 2. Handle 'getid' text command
  if (event.type === 'message' && event.message && event.message.type === 'text') {
    const text = event.message.text.trim().toLowerCase();
    if (text === 'getid' || text === 'id') {
      const replyToken = event.replyToken;
      const source = event.source;

      let replyText = 'This is not a group chat.';
      if (source.type === 'group') {
        replyText = `Your Group ID is:\n${source.groupId}`;
      } else if (source.type === 'room') {
        replyText = `Your Room ID is:\n${source.roomId}`;
      }

      if (config.channelAccessToken) {
        const client = new line.messagingApi.MessagingApiClient({
          channelAccessToken: config.channelAccessToken
        });

        return client.replyMessage({
          replyToken: replyToken,
          messages: [{ type: 'text', text: replyText }]
        });
      }
    }
  }

  return Promise.resolve(null);
}

const port = process.env.PORT || 3010;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

module.exports = app;
