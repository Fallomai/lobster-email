export const inboxPage = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Inbox - Lobster Email</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace;
      background: #0d0d0d;
      color: #e0e0e0;
      min-height: 100vh;
    }

    .header {
      background: #1a1a1a;
      border-bottom: 1px solid #333;
      padding: 1rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .logo {
      font-size: 1.5rem;
      text-decoration: none;
    }

    .email-address {
      font-family: monospace;
      color: #4ade80;
      font-size: 0.9rem;
    }

    .copy-email {
      background: #333;
      border: none;
      color: #e0e0e0;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.75rem;
      margin-left: 0.5rem;
    }

    .copy-email:hover {
      background: #444;
    }

    .limits {
      color: #888;
      font-size: 0.85rem;
    }

    .limits span {
      color: #ff6b6b;
    }

    .container {
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
    }

    .tabs {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
    }

    .tab {
      background: transparent;
      border: 1px solid #333;
      color: #888;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.9rem;
    }

    .tab.active {
      background: #ff6b6b;
      border-color: #ff6b6b;
      color: white;
    }

    .tab:hover:not(.active) {
      border-color: #555;
      color: #e0e0e0;
    }

    .messages {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .message {
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 8px;
      padding: 1rem;
      cursor: pointer;
      transition: border-color 0.2s;
    }

    .message:hover {
      border-color: #555;
    }

    .message.unread {
      border-left: 3px solid #ff6b6b;
    }

    .message-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.5rem;
    }

    .message-from {
      font-weight: 500;
      color: #e0e0e0;
    }

    .message-time {
      color: #666;
      font-size: 0.85rem;
    }

    .message-subject {
      color: #888;
      font-size: 0.95rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .message-preview {
      color: #666;
      font-size: 0.85rem;
      margin-top: 0.5rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .empty {
      text-align: center;
      color: #666;
      padding: 3rem;
    }

    .loading {
      text-align: center;
      color: #888;
      padding: 2rem;
    }

    .error {
      background: #2d1f1f;
      border: 1px solid #ff6b6b;
      border-radius: 8px;
      padding: 1rem;
      color: #ff6b6b;
      text-align: center;
    }

    /* Message detail modal */
    .modal {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.8);
      z-index: 100;
      padding: 2rem;
      overflow-y: auto;
    }

    .modal.open {
      display: block;
    }

    .modal-content {
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 8px;
      max-width: 700px;
      margin: 0 auto;
      padding: 1.5rem;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid #333;
    }

    .modal-close {
      background: transparent;
      border: none;
      color: #888;
      font-size: 1.5rem;
      cursor: pointer;
    }

    .modal-close:hover {
      color: #e0e0e0;
    }

    .modal-meta {
      color: #888;
      font-size: 0.85rem;
      margin-bottom: 0.25rem;
    }

    .modal-subject {
      font-size: 1.25rem;
      font-weight: 500;
      margin-bottom: 1rem;
    }

    .modal-body {
      white-space: pre-wrap;
      font-family: monospace;
      font-size: 0.9rem;
      line-height: 1.6;
      color: #ccc;
    }
  </style>
</head>
<body>
  <header class="header">
    <div class="header-left">
      <a href="/" class="logo">&#x1F99E;</a>
      <span class="email-address" id="emailAddress">Loading...</span>
      <button class="copy-email" onclick="copyEmail()">Copy</button>
    </div>
    <div class="limits">
      <span id="emailsSent">0</span>/<span id="emailLimit">10</span> emails today
    </div>
  </header>

  <div class="container">
    <div class="tabs">
      <button class="tab active" data-direction="all" onclick="setTab('all')">All</button>
      <button class="tab" data-direction="inbound" onclick="setTab('inbound')">Inbox</button>
      <button class="tab" data-direction="outbound" onclick="setTab('outbound')">Sent</button>
    </div>

    <div id="content" class="loading">Loading...</div>
  </div>

  <div class="modal" id="modal" onclick="closeModal(event)">
    <div class="modal-content" onclick="event.stopPropagation()">
      <div class="modal-header">
        <div>
          <div class="modal-meta" id="modalFrom"></div>
          <div class="modal-meta" id="modalTo"></div>
          <div class="modal-meta" id="modalTime"></div>
        </div>
        <button class="modal-close" onclick="closeModal()">&times;</button>
      </div>
      <h2 class="modal-subject" id="modalSubject"></h2>
      <div class="modal-body" id="modalBody"></div>
    </div>
  </div>

  <script>
    const params = new URLSearchParams(window.location.search);
    const apiKey = params.get('key');
    let currentDirection = 'all';

    if (!apiKey) {
      window.location.href = '/';
    }

    async function fetchInbox() {
      try {
        const res = await fetch('/api/inbox', {
          headers: { 'Authorization': 'Bearer ' + apiKey }
        });

        if (!res.ok) {
          throw new Error('Invalid API key');
        }

        const data = await res.json();
        document.getElementById('emailAddress').textContent = data.inbox.email;
        document.getElementById('emailsSent').textContent = data.limits.emails_sent_today;
        document.getElementById('emailLimit').textContent = data.limits.emails_per_day;

        window.inboxEmail = data.inbox.email;
      } catch (err) {
        document.getElementById('content').innerHTML = '<div class="error">' + err.message + '</div>';
      }
    }

    async function fetchMessages() {
      document.getElementById('content').innerHTML = '<div class="loading">Loading...</div>';

      try {
        let url = '/api/messages?limit=50';
        if (currentDirection !== 'all') {
          url += '&direction=' + currentDirection;
        }

        const res = await fetch(url, {
          headers: { 'Authorization': 'Bearer ' + apiKey }
        });

        if (!res.ok) {
          throw new Error('Failed to fetch messages');
        }

        const data = await res.json();
        renderMessages(data.messages);
      } catch (err) {
        document.getElementById('content').innerHTML = '<div class="error">' + err.message + '</div>';
      }
    }

    function renderMessages(messages) {
      if (messages.length === 0) {
        document.getElementById('content').innerHTML = '<div class="empty">No messages yet</div>';
        return;
      }

      const html = '<div class="messages">' + messages.map(m => {
        const isUnread = !m.read;
        const displayAddress = m.direction === 'inbound' ? m.from : m.to;
        return \`
          <div class="message \${isUnread ? 'unread' : ''}" onclick="openMessage('\${m.id}')">
            <div class="message-header">
              <span class="message-from">\${escapeHtml(displayAddress)}</span>
              <span class="message-time">\${timeAgo(m.created_at)}</span>
            </div>
            <div class="message-subject">\${escapeHtml(m.subject || '(no subject)')}</div>
            <div class="message-preview">\${escapeHtml(m.preview)}</div>
          </div>
        \`;
      }).join('') + '</div>';

      document.getElementById('content').innerHTML = html;
    }

    async function openMessage(id) {
      try {
        const res = await fetch('/api/messages/' + id, {
          headers: { 'Authorization': 'Bearer ' + apiKey }
        });

        if (!res.ok) {
          throw new Error('Failed to fetch message');
        }

        const msg = await res.json();

        document.getElementById('modalFrom').textContent = 'From: ' + msg.from;
        document.getElementById('modalTo').textContent = 'To: ' + msg.to;
        document.getElementById('modalTime').textContent = new Date(msg.created_at).toLocaleString();
        document.getElementById('modalSubject').textContent = msg.subject || '(no subject)';
        document.getElementById('modalBody').textContent = msg.text || '(no content)';
        document.getElementById('modal').classList.add('open');

        // Refresh messages to update read status
        fetchMessages();
      } catch (err) {
        alert(err.message);
      }
    }

    function closeModal(e) {
      if (!e || e.target === document.getElementById('modal')) {
        document.getElementById('modal').classList.remove('open');
      }
    }

    function setTab(direction) {
      currentDirection = direction;
      document.querySelectorAll('.tab').forEach(t => {
        t.classList.toggle('active', t.dataset.direction === direction);
      });
      fetchMessages();
    }

    function copyEmail() {
      if (window.inboxEmail) {
        navigator.clipboard.writeText(window.inboxEmail);
        const btn = document.querySelector('.copy-email');
        btn.textContent = 'Copied!';
        setTimeout(() => btn.textContent = 'Copy', 2000);
      }
    }

    function timeAgo(dateStr) {
      const date = new Date(dateStr);
      const now = new Date();
      const seconds = Math.floor((now - date) / 1000);

      if (seconds < 60) return 'just now';
      if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
      if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
      return Math.floor(seconds / 86400) + 'd ago';
    }

    function escapeHtml(str) {
      if (!str) return '';
      return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    // Keyboard shortcut to close modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });

    // Initial load
    fetchInbox();
    fetchMessages();

    // Auto-refresh every 30 seconds
    setInterval(fetchMessages, 30000);
  </script>
</body>
</html>`;
