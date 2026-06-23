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

function initNexusRunner() {
  const canvas = document.getElementById('runner-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const scoreElement = document.getElementById('game-score');
  const bestElement = document.getElementById('game-best');
  const overlay = document.getElementById('game-overlay');
  const startButton = document.getElementById('game-start');
  const actionButtons = document.querySelectorAll('[data-game-action]');
  const groundY = 292;
  const gravity = 0.62;
  const player = { x: 92, y: groundY - 58, width: 48, height: 58, vy: 0, sliding: false, shield: 0 };
  let obstacles = [];
  let particles = [];
  let stars = [];
  let running = false;
  let gameOver = false;
  let speed = 6;
  let score = 0;
  let best = Number(localStorage.getItem('nexusRunnerBest') || 0);
  let frame = 0;
  let lastObstacle = 0;

  setText(bestElement, Math.floor(best));

  const resetPlayer = () => {
    player.y = groundY - 58;
    player.vy = 0;
    player.sliding = false;
    player.height = 58;
    player.shield = 150;
  };

  const resetGame = () => {
    obstacles = [];
    particles = [];
    stars = Array.from({ length: 80 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * 230,
      size: Math.random() * 2 + 0.4,
      speed: Math.random() * 1.8 + 0.4
    }));
    running = true;
    gameOver = false;
    speed = 6;
    score = 0;
    frame = 0;
    lastObstacle = 0;
    resetPlayer();
    overlay.querySelector('strong').textContent = 'Nexus Runner';
    overlay.querySelector('span').textContent = 'Press Space, ↑, or tap to jump. Press ↓ to phase-slide.';
    startButton.textContent = 'Start Mission';
    overlay.classList.add('is-hidden');
  };

  const jump = () => {
    if (!running || gameOver) {
      resetGame();
      return;
    }
    if (player.y >= groundY - player.height - 1) {
      player.vy = -14.5;
      player.sliding = false;
      player.height = 58;
    }
  };

  const slide = () => {
    if (!running || gameOver) return;
    if (player.y >= groundY - player.height - 1) {
      player.sliding = true;
      player.height = 36;
      player.y = groundY - player.height;
      setTimeout(() => {
        player.sliding = false;
        player.height = 58;
      }, 420);
    }
  };

  const spawnObstacle = () => {
    const types = [
      { kind: 'spike', width: 34, height: 54, y: groundY - 54, color: '#ff4f8b' },
      { kind: 'gate', width: 42, height: 82, y: groundY - 82, color: '#7c5cff' },
      { kind: 'drone', width: 56, height: 28, y: groundY - 132 - Math.random() * 45, color: '#43e8ff' }
    ];
    const type = types[Math.floor(Math.random() * types.length)];
    obstacles.push({ ...type, x: canvas.width + 30, passed: false });
  };

  const intersects = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

  const burst = (x, y, color) => {
    for (let i = 0; i < 18; i += 1) {
      particles.push({ x, y, vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8, life: 26, color });
    }
  };

  const endGame = () => {
    gameOver = true;
    running = false;
    best = Math.max(best, score);
    localStorage.setItem('nexusRunnerBest', String(Math.floor(best)));
    setText(bestElement, Math.floor(best));
    overlay.querySelector('strong').textContent = 'Mission Complete';
    overlay.querySelector('span').textContent = `Score ${Math.floor(score)} · press Space or Restart to run again.`;
    startButton.textContent = 'Restart Mission';
    overlay.classList.remove('is-hidden');
  };

  const drawBackground = () => {
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#071733');
    gradient.addColorStop(0.55, '#0b2450');
    gradient.addColorStop(1, '#061126');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    stars.forEach((star) => {
      star.x -= star.speed + speed * 0.05;
      if (star.x < -4) star.x = canvas.width + Math.random() * 80;
      ctx.fillStyle = 'rgba(149, 204, 255, .75)';
      ctx.fillRect(star.x, star.y, star.size, star.size);
    });

    ctx.strokeStyle = 'rgba(67, 232, 255, .28)';
    ctx.lineWidth = 2;
    for (let x = -((frame * speed) % 64); x < canvas.width; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, groundY);
      ctx.lineTo(x + 40, canvas.height);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(63, 140, 255, .22)';
    ctx.fillRect(0, groundY, canvas.width, 5);
  };

  const drawPlayer = () => {
    ctx.save();
    ctx.shadowColor = player.shield > 0 ? '#43e8ff' : '#3f8cff';
    ctx.shadowBlur = 18;
    ctx.fillStyle = player.sliding ? '#43e8ff' : '#3f8cff';
    ctx.fillRect(player.x, player.y, player.width, player.height);
    ctx.fillStyle = '#e7efff';
    ctx.fillRect(player.x + 28, player.y + 12, 8, 8);
    ctx.fillStyle = '#0b1730';
    ctx.fillRect(player.x + 8, player.y + player.height - 10, 32, 10);
    if (player.shield > 0) {
      ctx.strokeStyle = 'rgba(67, 232, 255, .75)';
      ctx.lineWidth = 3;
      ctx.strokeRect(player.x - 8, player.y - 8, player.width + 16, player.height + 16);
    }
    ctx.restore();
  };

  const drawObstacle = (obstacle) => {
    ctx.save();
    ctx.shadowColor = obstacle.color;
    ctx.shadowBlur = 14;
    ctx.fillStyle = obstacle.color;
    if (obstacle.kind === 'spike') {
      ctx.beginPath();
      ctx.moveTo(obstacle.x, obstacle.y + obstacle.height);
      ctx.lineTo(obstacle.x + obstacle.width / 2, obstacle.y);
      ctx.lineTo(obstacle.x + obstacle.width, obstacle.y + obstacle.height);
      ctx.closePath();
      ctx.fill();
    } else if (obstacle.kind === 'drone') {
      ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
      ctx.fillStyle = '#e7efff';
      ctx.fillRect(obstacle.x + 8, obstacle.y + 9, 10, 6);
      ctx.fillRect(obstacle.x + 38, obstacle.y + 9, 10, 6);
    } else {
      ctx.strokeStyle = obstacle.color;
      ctx.lineWidth = 7;
      ctx.strokeRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
    }
    ctx.restore();
  };

  const update = () => {
    frame += 1;
    if (running) {
      speed += 0.0028;
      score += speed * 0.045;
      setText(scoreElement, Math.floor(score));
      player.vy += gravity;
      player.y += player.vy;
      if (player.y > groundY - player.height) {
        player.y = groundY - player.height;
        player.vy = 0;
      }
      if (player.shield > 0) player.shield -= 1;
      if (frame - lastObstacle > Math.max(52, 112 - speed * 4)) {
        spawnObstacle();
        lastObstacle = frame;
      }
      obstacles.forEach((obstacle) => {
        obstacle.x -= speed;
        if (!obstacle.passed && obstacle.x + obstacle.width < player.x) {
          obstacle.passed = true;
          score += 18;
          burst(player.x + player.width, player.y + player.height / 2, '#43e8ff');
        }
        if (intersects(player, obstacle)) {
          if (player.shield > 0) {
            player.shield = 0;
            obstacle.x = -200;
            burst(player.x + player.width / 2, player.y + player.height / 2, '#43e8ff');
          } else {
            burst(player.x + player.width / 2, player.y + player.height / 2, '#ff4f8b');
            endGame();
          }
        }
      });
      obstacles = obstacles.filter((obstacle) => obstacle.x > -120);
    }

    particles.forEach((particle) => {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.life -= 1;
    });
    particles = particles.filter((particle) => particle.life > 0);
  };

  const draw = () => {
    drawBackground();
    obstacles.forEach(drawObstacle);
    drawPlayer();
    particles.forEach((particle) => {
      ctx.globalAlpha = Math.max(particle.life / 26, 0);
      ctx.fillStyle = particle.color;
      ctx.fillRect(particle.x, particle.y, 4, 4);
      ctx.globalAlpha = 1;
    });
    requestAnimationFrame(loop);
  };

  const loop = () => {
    update();
    draw();
  };

  startButton.addEventListener('click', resetGame);
  canvas.addEventListener('pointerdown', jump);
  actionButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.dataset.gameAction;
      if (action === 'jump') jump();
      if (action === 'slide') slide();
      if (action === 'restart') resetGame();
    });
  });
  window.addEventListener('keydown', (event) => {
    if (event.code === 'Space' || event.code === 'ArrowUp') {
      event.preventDefault();
      jump();
    }
    if (event.code === 'ArrowDown') {
      event.preventDefault();
      slide();
    }
  });

  resetGame();
  running = false;
  overlay.classList.remove('is-hidden');
  loop();
}

initNexusRunner();
