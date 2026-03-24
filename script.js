/*
  Asteroid Arcade - Vanilla JS, kein Build-Step
  Struktur:
  - Konfiguration & globaler Spielzustand
  - Initialisierung
  - Input Handling
  - Entity-Management
  - Kollisionslogik
  - Rendering
  - Hauptschleife (requestAnimationFrame)
*/

(() => {
  "use strict";

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  const scoreEl = document.getElementById("score");
  const livesEl = document.getElementById("lives");
  const statusEl = document.getElementById("status");

  const CONFIG = {
    width: canvas.width,
    height: canvas.height,
    friction: 0.992,
    turnSpeed: Math.PI * 1.8,
    thrust: 0.25,
    bulletSpeed: 460,
    bulletLifetime: 1.1,
    shootCooldown: 0.14,
    muzzleFlashDuration: 0.06,
    invulnerabilityTime: 1.8,
    asteroidCountStart: 5,
    maxAsteroidSpeed: 95,
    asteroidMinSpeed: 22,
    scoreValues: {
      large: 20,
      medium: 50,
      small: 100,
    },
  };

  const KEY = {
    ArrowLeft: false,
    ArrowRight: false,
    ArrowUp: false,
    Space: false,
    Enter: false,
    KeyP: false,
  };

  let ship;
  let asteroids = [];
  let bullets = [];
  let particles = [];
  let score = 0;
  let lives = 3;
  let level = 1;
  let gameOver = false;
  let paused = false;
  let lastTime = 0;

  function wrapPosition(entity) {
    if (entity.x < 0) entity.x += CONFIG.width;
    if (entity.x > CONFIG.width) entity.x -= CONFIG.width;
    if (entity.y < 0) entity.y += CONFIG.height;
    if (entity.y > CONFIG.height) entity.y -= CONFIG.height;
  }

  function createShip() {
    return {
      x: CONFIG.width / 2,
      y: CONFIG.height / 2,
      vx: 0,
      vy: 0,
      angle: -Math.PI / 2,
      radius: 14,
      canShootIn: 0,
      invulnerableIn: CONFIG.invulnerabilityTime,
      muzzleFlashIn: 0,
    };
  }

  function createAsteroid(x, y, size = "large") {
    const radiusMap = { large: 44, medium: 26, small: 14 };
    const radius = radiusMap[size];
    const angle = Math.random() * Math.PI * 2;
    const speed =
      CONFIG.asteroidMinSpeed +
      Math.random() * (CONFIG.maxAsteroidSpeed - CONFIG.asteroidMinSpeed);

    return {
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 1.2,
      radius,
      size,
      shape: makeJaggedShape(radius),
      hitFlash: 0,
    };
  }

  function makeJaggedShape(radius) {
    const points = 10;
    return Array.from({ length: points }, (_, index) => {
      const t = (index / points) * Math.PI * 2;
      const dist = radius * (0.7 + Math.random() * 0.4);
      return {
        x: Math.cos(t) * dist,
        y: Math.sin(t) * dist,
      };
    });
  }

  function spawnInitialAsteroids() {
    asteroids = [];
    const amount = CONFIG.asteroidCountStart + (level - 1);

    while (asteroids.length < amount) {
      const x = Math.random() * CONFIG.width;
      const y = Math.random() * CONFIG.height;
      const safeDistance = 150;
      const dx = x - ship.x;
      const dy = y - ship.y;

      if (Math.hypot(dx, dy) > safeDistance) {
        asteroids.push(createAsteroid(x, y, "large"));
      }
    }
  }

  function resetGame() {
    score = 0;
    lives = 3;
    level = 1;
    bullets = [];
    particles = [];
    gameOver = false;
    paused = false;
    ship = createShip();
    spawnInitialAsteroids();
    updateHud("Laufend");
  }

  function nextLevel() {
    level += 1;
    ship = createShip();
    bullets = [];
    spawnInitialAsteroids();
    updateHud(`Level ${level}`);
  }

  function updateHud(statusText) {
    scoreEl.textContent = String(score);
    livesEl.textContent = String(lives);
    if (statusText) statusEl.textContent = statusText;
  }

  function setupInput() {
    window.addEventListener("keydown", (event) => {
      if (event.code in KEY) {
        KEY[event.code] = true;
      }
      if (["Space", "ArrowUp", "ArrowLeft", "ArrowRight"].includes(event.code)) {
        event.preventDefault();
      }

      if (event.code === "Enter" && gameOver) {
        resetGame();
      }

      if (event.code === "KeyP" && !gameOver) {
        paused = !paused;
        updateHud(paused ? "Pausiert" : "Laufend");
      }
    });

    window.addEventListener("keyup", (event) => {
      if (event.code in KEY) {
        KEY[event.code] = false;
      }
    });
  }

  function shoot() {
    if (ship.canShootIn > 0 || ship.invulnerableIn > 0) return;

    const noseX = ship.x + Math.cos(ship.angle) * (ship.radius + 2);
    const noseY = ship.y + Math.sin(ship.angle) * (ship.radius + 2);

    bullets.push({
      x: noseX,
      y: noseY,
      vx: Math.cos(ship.angle) * CONFIG.bulletSpeed + ship.vx,
      vy: Math.sin(ship.angle) * CONFIG.bulletSpeed + ship.vy,
      life: CONFIG.bulletLifetime,
      radius: 2,
    });

    ship.canShootIn = CONFIG.shootCooldown;
    ship.muzzleFlashIn = CONFIG.muzzleFlashDuration;
  }

  function createExplosion(x, y, amount, color = "#c6d0ff") {
    for (let i = 0; i < amount; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 180;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.25 + Math.random() * 0.6,
        size: 1 + Math.random() * 2,
        color,
      });
    }
  }

  function splitAsteroid(asteroid) {
    const children = [];
    if (asteroid.size === "large") {
      children.push(createAsteroid(asteroid.x, asteroid.y, "medium"));
      children.push(createAsteroid(asteroid.x, asteroid.y, "medium"));
      score += CONFIG.scoreValues.large;
    } else if (asteroid.size === "medium") {
      children.push(createAsteroid(asteroid.x, asteroid.y, "small"));
      children.push(createAsteroid(asteroid.x, asteroid.y, "small"));
      score += CONFIG.scoreValues.medium;
    } else {
      score += CONFIG.scoreValues.small;
    }

    createExplosion(asteroid.x, asteroid.y, asteroid.size === "small" ? 8 : 14);
    return children;
  }

  function circlesCollide(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y) <= a.radius + b.radius;
  }

  function handleCollisions() {
    for (let b = bullets.length - 1; b >= 0; b -= 1) {
      const bullet = bullets[b];
      for (let a = asteroids.length - 1; a >= 0; a -= 1) {
        const asteroid = asteroids[a];
        if (!circlesCollide(bullet, asteroid)) continue;

        bullets.splice(b, 1);
        asteroids.splice(a, 1);
        asteroid.hitFlash = 0.05;

        const fragments = splitAsteroid(asteroid);
        asteroids.push(...fragments);
        updateHud();
        break;
      }
    }

    if (ship.invulnerableIn > 0 || gameOver) return;

    for (const asteroid of asteroids) {
      if (!circlesCollide(ship, asteroid)) continue;
      lives -= 1;
      createExplosion(ship.x, ship.y, 22, "#ff88a0");

      if (lives <= 0) {
        gameOver = true;
        updateHud("Game Over");
      } else {
        ship = createShip();
        updateHud("Treffer!");
      }
      break;
    }
  }

  function updateShip(dt) {
    if (KEY.ArrowLeft) ship.angle -= CONFIG.turnSpeed * dt;
    if (KEY.ArrowRight) ship.angle += CONFIG.turnSpeed * dt;

    if (KEY.ArrowUp) {
      ship.vx += Math.cos(ship.angle) * CONFIG.thrust;
      ship.vy += Math.sin(ship.angle) * CONFIG.thrust;
      createExplosion(
        ship.x - Math.cos(ship.angle) * (ship.radius - 4),
        ship.y - Math.sin(ship.angle) * (ship.radius - 4),
        1,
        "#6ef3ff"
      );
    }

    if (KEY.Space) {
      shoot();
    }

    ship.canShootIn = Math.max(0, ship.canShootIn - dt);
    ship.muzzleFlashIn = Math.max(0, ship.muzzleFlashIn - dt);
    ship.invulnerableIn = Math.max(0, ship.invulnerableIn - dt);

    ship.vx *= CONFIG.friction;
    ship.vy *= CONFIG.friction;
    ship.x += ship.vx * dt * 60;
    ship.y += ship.vy * dt * 60;

    wrapPosition(ship);
  }

  function updateBullets(dt) {
    for (let i = bullets.length - 1; i >= 0; i -= 1) {
      const bullet = bullets[i];
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      bullet.life -= dt;
      wrapPosition(bullet);

      if (bullet.life <= 0) {
        bullets.splice(i, 1);
      }
    }
  }

  function updateAsteroids(dt) {
    for (const asteroid of asteroids) {
      asteroid.x += asteroid.vx * dt;
      asteroid.y += asteroid.vy * dt;
      asteroid.angle += asteroid.spin * dt;
      asteroid.hitFlash = Math.max(0, asteroid.hitFlash - dt);
      wrapPosition(asteroid);
    }

    if (asteroids.length === 0 && !gameOver) {
      nextLevel();
    }
  }

  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      p.vx *= 0.98;
      p.vy *= 0.98;

      if (p.life <= 0) {
        particles.splice(i, 1);
      }
    }
  }

  function drawShip() {
    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.angle);

    const blink = ship.invulnerableIn > 0 && Math.floor(ship.invulnerableIn * 12) % 2 === 0;
    ctx.strokeStyle = blink ? "#5671d7" : "#e9edff";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(ship.radius, 0);
    ctx.lineTo(-ship.radius * 0.75, -ship.radius * 0.8);
    ctx.lineTo(-ship.radius * 0.45, 0);
    ctx.lineTo(-ship.radius * 0.75, ship.radius * 0.8);
    ctx.closePath();
    ctx.stroke();

    if (KEY.ArrowUp && !gameOver) {
      ctx.strokeStyle = "#6ef3ff";
      ctx.beginPath();
      ctx.moveTo(-ship.radius * 0.55, -ship.radius * 0.35);
      ctx.lineTo(-ship.radius - Math.random() * 9, 0);
      ctx.lineTo(-ship.radius * 0.55, ship.radius * 0.35);
      ctx.stroke();
    }

    if (ship.muzzleFlashIn > 0) {
      ctx.strokeStyle = "#ffc86e";
      ctx.beginPath();
      ctx.moveTo(ship.radius, 0);
      ctx.lineTo(ship.radius + 8 + Math.random() * 8, 0);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawAsteroids() {
    for (const asteroid of asteroids) {
      ctx.save();
      ctx.translate(asteroid.x, asteroid.y);
      ctx.rotate(asteroid.angle);
      ctx.strokeStyle = asteroid.hitFlash > 0 ? "#ff909f" : "#c6d0ff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      asteroid.shape.forEach((pt, idx) => {
        if (idx === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawBullets() {
    ctx.fillStyle = "#ffffff";
    for (const bullet of bullets) {
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawParticles() {
    for (const p of particles) {
      const alpha = Math.max(0, Math.min(1, p.life * 1.5));
      ctx.fillStyle = hexToRgba(p.color, alpha);
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }
  }

  function drawOverlay() {
    if (!gameOver && !paused) return;

    ctx.fillStyle = "rgba(4, 6, 13, 0.72)";
    ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);

    ctx.textAlign = "center";
    ctx.fillStyle = paused ? "#6ef3ff" : "#ff5d7a";
    ctx.font = "bold 52px 'Courier New', monospace";
    ctx.fillText(paused ? "PAUSE" : "GAME OVER", CONFIG.width / 2, CONFIG.height / 2 - 18);

    ctx.fillStyle = "#d6deff";
    ctx.font = "22px 'Courier New', monospace";
    ctx.fillText(`Score: ${score}`, CONFIG.width / 2, CONFIG.height / 2 + 20);
    ctx.font = "18px 'Courier New', monospace";
    ctx.fillText(
      paused ? "Drücke P zum Fortsetzen" : "Drücke Enter für Neustart",
      CONFIG.width / 2,
      CONFIG.height / 2 + 58
    );
  }

  function hexToRgba(hex, alpha) {
    const cleaned = hex.replace("#", "");
    const int = Number.parseInt(cleaned, 16);
    const r = (int >> 16) & 255;
    const g = (int >> 8) & 255;
    const b = int & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function render() {
    ctx.clearRect(0, 0, CONFIG.width, CONFIG.height);

    // Stern-Hintergrund mit dezentem Parallax-Look
    ctx.fillStyle = "#0f1634";
    for (let i = 0; i < 60; i += 1) {
      const x = (i * 137) % CONFIG.width;
      const y = (i * 97) % CONFIG.height;
      ctx.fillRect(x, y, 1, 1);
    }

    drawParticles();
    drawAsteroids();
    drawBullets();
    drawShip();
    drawOverlay();
  }

  function gameLoop(timestamp) {
    const dt = Math.min((timestamp - lastTime) / 1000 || 0, 0.035);
    lastTime = timestamp;

    if (!gameOver && !paused) {
      updateShip(dt);
      updateBullets(dt);
      updateAsteroids(dt);
      updateParticles(dt);
      handleCollisions();
    } else {
      updateParticles(dt);
    }

    render();
    requestAnimationFrame(gameLoop);
  }

  function init() {
    setupInput();
    resetGame();
    updateHud("Laufend");
    requestAnimationFrame(gameLoop);
  }

  init();
})();
