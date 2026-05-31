function setText(element, value) {
  element.textContent = value;
}

function createBlogCard(post) {
  const article = document.createElement('article');
  article.className = 'card';

  const meta = document.createElement('div');
  meta.className = 'blog-meta';
  setText(meta, `${post.date} · ${post.author}`);

  const title = document.createElement('h3');
  setText(title, post.title);

  const excerpt = document.createElement('p');
  setText(excerpt, post.excerpt);

  article.append(meta, title, excerpt);
  return article;
}

async function loadBlogs() {
  const container = document.getElementById('blog-list');
  setText(container, 'Loading latest insights...');

  try {
    const response = await fetch('/api/blogs');
    if (!response.ok) {
      throw new Error(`Blog request failed with ${response.status}`);
    }

    const posts = await response.json();
    container.replaceChildren(...posts.map(createBlogCard));
  } catch (_error) {
    const message = document.createElement('p');
    setText(message, 'Unable to load blogs at the moment. Please refresh or try again soon.');
    container.replaceChildren(message);
  }
}

function initChat() {
  const socket = io();
  const form = document.getElementById('chat-form');
  const nameInput = document.getElementById('name-input');
  const messageInput = document.getElementById('message-input');
  const chatMessages = document.getElementById('chat-messages');
  const status = document.getElementById('chat-status');

  const updateStatus = (message) => {
    setText(status, message);
  };

  const renderMessage = (message) => {
    const element = document.createElement('article');
    element.className = 'message';

    const meta = document.createElement('div');
    meta.className = 'meta';

    const sender = document.createElement('strong');
    setText(sender, message.sender);

    const date = new Date(message.timestamp);
    meta.append(sender, ` · ${date.toLocaleString()}`);

    const text = document.createElement('p');
    setText(text, message.text);

    element.append(meta, text);
    chatMessages.appendChild(element);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  };

  socket.on('connect', () => updateStatus('Connected to live chat.'));
  socket.on('disconnect', () => updateStatus('Reconnecting to live chat...'));
  socket.on('connect_error', () => updateStatus('Unable to connect to live chat.'));

  socket.on('chat:history', (history) => {
    chatMessages.replaceChildren();
    history.forEach(renderMessage);
  });

  socket.on('chat:message', renderMessage);

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const text = messageInput.value.trim();
    if (!text) {
      return;
    }

    socket.emit('chat:message', {
      name: nameInput.value,
      text
    });

    messageInput.value = '';
    messageInput.focus();
  });
}

loadBlogs();
initChat();
