const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const MAX_MESSAGES = 200;
const MAX_MESSAGE_LENGTH = 600;
const MAX_NAME_LENGTH = 24;

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

const normalizeText = (value, fallback = '') => String(value || fallback).trim();

function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'], maxAge: '1h' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'nexuscode-site' });
  });

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

  return app;
}

function attachRealtimeChat(server, options = {}) {
  const io = new Server(server, {
    cors: { origin: false },
    ...options
  });
  const messages = [];

  io.on('connection', (socket) => {
    socket.emit('chat:history', messages);

    socket.on('chat:message', (payload = {}) => {
      const trimmedText = normalizeText(payload.text);
      const sender = normalizeText(payload.name, 'Guest').slice(0, MAX_NAME_LENGTH) || 'Guest';

      if (!trimmedText) {
        return;
      }

      const message = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        sender,
        text: trimmedText.slice(0, MAX_MESSAGE_LENGTH),
        timestamp: new Date().toISOString()
      };

      messages.push(message);

      if (messages.length > MAX_MESSAGES) {
        messages.splice(0, messages.length - MAX_MESSAGES);
      }

      io.emit('chat:message', message);
    });
  });

  return io;
}

function createServer() {
  const app = createApp();
  const server = http.createServer(app);
  const io = attachRealtimeChat(server);

  return { app, server, io };
}

if (require.main === module) {
  const { server } = createServer();
  const PORT = process.env.PORT || 3000;

  server.listen(PORT, () => {
    console.log(`NexusCode site is running on http://localhost:${PORT}`);
  });
}

module.exports = { createApp, createServer, attachRealtimeChat, blogPosts };
