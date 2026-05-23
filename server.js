const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

const blogPosts = [
  {
    id: 'engineering-excellence',
    title: 'Engineering Excellence at NexusCode',
    excerpt: 'How we design scalable digital products with speed, quality, and measurable business outcomes.',
    date: '2026-05-20',
    author: 'NexusCode Team',
    content:
      'At NexusCode, we combine product strategy, software engineering, and modern cloud architecture to deliver reliable digital platforms. Our teams prioritize clarity, testability, and sustainable velocity so clients can scale with confidence.'
  },
  {
    id: 'ai-transformation',
    title: 'Practical AI Transformation for Modern Companies',
    excerpt: 'A framework to move from AI experimentation to real production impact.',
    date: '2026-05-18',
    author: 'NexusCode Labs',
    content:
      'Successful AI initiatives are grounded in clear business goals. We help organizations identify the right use cases, build secure data foundations, and deploy AI-enabled workflows that improve operations, customer experience, and decision-making.'
  },
  {
    id: 'secure-by-design',
    title: 'Secure-by-Design Delivery',
    excerpt: 'Why cybersecurity needs to be embedded from day one of software development.',
    date: '2026-05-14',
    author: 'Security Practice',
    content:
      'Security is not an afterthought at NexusCode. We integrate secure coding practices, infrastructure hardening, and continuous monitoring throughout the delivery lifecycle to reduce risk and protect mission-critical systems.'
  }
];

app.get('/api/blogs', (_req, res) => {
  res.json(blogPosts);
});

app.get('/api/blogs/:id', (req, res) => {
  const post = blogPosts.find((item) => item.id === req.params.id);
  if (!post) {
    return res.status(404).json({ message: 'Post not found' });
  }

  return res.json(post);
});

const messages = [];

io.on('connection', (socket) => {
  socket.emit('chat:history', messages);

  socket.on('chat:message', (payload) => {
    const trimmedText = (payload?.text || '').trim();
    const sender = (payload?.name || 'Guest').trim().slice(0, 24) || 'Guest';

    if (!trimmedText) {
      return;
    }

    const message = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      sender,
      text: trimmedText.slice(0, 600),
      timestamp: new Date().toISOString()
    };

    messages.push(message);

    if (messages.length > 200) {
      messages.splice(0, messages.length - 200);
    }

    io.emit('chat:message', message);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`NexusCode site is running on http://localhost:${PORT}`);
});
