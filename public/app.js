async function loadBlogs() {
  const container = document.getElementById('blog-list');

  try {
    const response = await fetch('/api/blogs');
    const posts = await response.json();

    container.innerHTML = posts
      .map(
        (post) => `
          <article class="card">
            <div class="blog-meta">${post.date} · ${post.author}</div>
            <h3>${post.title}</h3>
            <p>${post.excerpt}</p>
          </article>
        `
      )
      .join('');
  } catch (_error) {
    container.innerHTML = '<p>Unable to load blogs at the moment.</p>';
  }
}

function initChat() {
  const socket = io();
  const form = document.getElementById('chat-form');
  const nameInput = document.getElementById('name-input');
  const messageInput = document.getElementById('message-input');
  const chatMessages = document.getElementById('chat-messages');

  const renderMessage = (message) => {
    const element = document.createElement('article');
    element.className = 'message';
    const date = new Date(message.timestamp);
    element.innerHTML = `
      <div class="meta"><strong>${message.sender}</strong> · ${date.toLocaleString()}</div>
      <p>${message.text}</p>
    `;
    chatMessages.appendChild(element);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  };

  socket.on('chat:history', (history) => {
    chatMessages.innerHTML = '';
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
  });
}

loadBlogs();
initChat();
