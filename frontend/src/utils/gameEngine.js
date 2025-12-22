// Blue Earth Watch - Ocean Cleanup Game Engine (Agar.io Style)

export class GameObject {
  constructor(x, y, radius, color, type) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.color = color;
    this.type = type;
    this.markedForDeletion = false;
    this.mass = Math.PI * radius * radius;
  }

  updateMass(newMass) {
    this.mass = newMass;
    this.radius = Math.sqrt(this.mass / Math.PI);
  }

  // Circular collision detection
  collidesWith(other) {
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < this.radius + other.radius;
  }

  // Check if this object can eat the other object
  canEat(other) {
    // Must be significantly larger (e.g., 10% larger radius) to eat
    if (this.radius <= other.radius * 1.1) return false;
    
    // Agar.io style eating condition:
    // The larger cell can eat when it overlaps enough with the smaller cell
    // Specifically: when the smaller cell's center is within the larger cell's radius
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Can eat when the distance is less than the difference of radii (smaller is "inside")
    // Add a small buffer (0.3 * other.radius) to make eating more responsive
    return distance < this.radius - other.radius * 0.3;
  }

  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.closePath();
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function safeNormal(dx, dy) {
  const dist = Math.hypot(dx, dy);
  if (!dist) return { x: 1, y: 0, dist: 0 };
  return { x: dx / dist, y: dy / dist, dist };
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

const AI_DIFFICULTY = {
  easy: {
    viewRadiusMultiplier: 8,
    maxForce: 0.14,
    ignorePlayerChance: 0.5,
    fleeWeight: 3.5,
    foodWeight: 1.2,
    preyWeight: 1.8,  // Increased: AI should chase prey more aggressively
    wanderWeight: 0.8,
    wanderChange: 0.45,
  },
  normal: {
    viewRadiusMultiplier: 10,
    maxForce: 0.22,
    ignorePlayerChance: 0.2,
    fleeWeight: 3.2,
    foodWeight: 1.0,
    preyWeight: 2.2,  // Increased: AI should chase prey more aggressively
    wanderWeight: 0.8,
    wanderChange: 0.3,
  },
  hard: {
    viewRadiusMultiplier: 14,
    maxForce: 0.32,
    ignorePlayerChance: 0.05,
    fleeWeight: 3.0,
    foodWeight: 0.8,
    preyWeight: 2.8,  // Increased: Hard AI is very aggressive
    wanderWeight: 0.6,
    wanderChange: 0.2,
  },
};

export class Player extends GameObject {
  constructor(x, y, name) {
    super(x, y, 20, '#0099e6', 'player');
    this.name = name;
    this.speed = 5;
    this.maxSpeed = 8;
    this.velocity = { x: 0, y: 0 };
    this.impulse = { x: 0, y: 0 };
    this.mergeReadyAt = 0;
  }

  move(targetX, targetY, worldWidth, worldHeight, speedScale = 1, speedMultiplier = 1) {
    // Calculate direction towards mouse/target
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 0) {
      // Speed formula: 2.2 * size^-0.439
      // We scale it up because canvas pixels are different from agar.io units
      // Base speed for radius 20 should be around 5-6
      // 2.2 * 20^-0.439 = 0.59. So we need a multiplier of ~10.

      const baseSpeedMultiplier = 10 * Math.pow(this.radius, -0.439);
      const currentSpeed = Math.max(1, baseSpeedMultiplier * 1.5); // Ensure min speed

      const desiredX = (dx / distance) * currentSpeed * speedMultiplier;
      const desiredY = (dy / distance) * currentSpeed * speedMultiplier;

      // Add a decaying impulse (used for split "launch")
      this.velocity.x = desiredX + this.impulse.x;
      this.velocity.y = desiredY + this.impulse.y;

      this.x += this.velocity.x * speedScale;
      this.y += this.velocity.y * speedScale;
    }

    // Decay impulse over time
    const impulseDecay = Math.pow(0.92, speedScale);
    this.impulse.x *= impulseDecay;
    this.impulse.y *= impulseDecay;

    // Boundary checks
    this.x = Math.max(this.radius, Math.min(worldWidth - this.radius, this.x));
    this.y = Math.max(this.radius, Math.min(worldHeight - this.radius, this.y));
  }

  draw(ctx, options = {}) {
    super.draw(ctx);

    // Draw Name
    if (options.showName !== false) {
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.max(12, this.radius / 2)}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.name, this.x, this.y);
    }
  }
}

export class Food extends GameObject {
  constructor(x, y, type) {
    const types = {
      bottle: { color: '#3b82f6', value: 10 },
      bag: { color: '#ef4444', value: 15 },
      net: { color: '#f59e0b', value: 30 },
      can: { color: '#94a3b8', value: 12 },
      microplastic: { color: '#a78bfa', value: 5 }
    };

    const config = types[type] || types.bottle;
    // Food radius is small
    super(x, y, 5 + Math.random() * 3, config.color, 'food');
    this.value = config.value;
    this.foodType = type;
  }
}

export class AIPlayer extends GameObject {
  constructor(x, y, worldWidth, worldHeight, options = {}) {
    const startRadius = 15 + Math.random() * 30;
    const colors = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const names = ['Shark', 'Whale', 'Dolphin', 'Orca', 'Tuna', 'Squid', 'Octopus', 'Crab', 'Lobster', 'Seal'];
    const name = names[Math.floor(Math.random() * names.length)];

    super(x, y, startRadius, color, 'ai');
    this.name = name;
    this.difficulty = options.difficulty || 'normal';
    this.config = AI_DIFFICULTY[this.difficulty] || AI_DIFFICULTY.normal;
    this.velocity = { x: 0, y: 0 };
    this.acceleration = { x: 0, y: 0 };
    this.maxSpeed = 8;
    this.maxForce = this.config.maxForce;
    this.wanderTheta = 0;
  }

  update(foods, player, otherAIs, worldWidth, worldHeight, options = {}) {
    const { boundaryMode = 'clamp' } = options;
    // 1. Perception
    this.config = AI_DIFFICULTY[this.difficulty] || AI_DIFFICULTY.normal;
    this.maxForce = this.config.maxForce;

    const viewRadius = this.radius * this.config.viewRadiusMultiplier;
    let closestFood = null;
    let closestDist = Infinity;

    // Find closest food
    for (const food of foods) {
      const d = Math.hypot(food.x - this.x, food.y - this.y);
      if (d < closestDist && d < viewRadius) {
        closestDist = d;
        closestFood = food;
      }
    }

    // Find threats (larger players) and prey (smaller players)
    let closestThreat = null;
    let closestPrey = null;
    let threatDist = Infinity;
    let preyDist = Infinity;

    // Check human player (with reduced focus)
    const dPlayer = Math.hypot(player.x - this.x, player.y - this.y);
    const shouldConsiderPlayer = Math.random() > this.config.ignorePlayerChance;

    if (dPlayer < viewRadius && shouldConsiderPlayer) {
      if (player.radius > this.radius * 1.1) {
        if (dPlayer < threatDist) {
          threatDist = dPlayer;
          closestThreat = player;
        }
      } else if (player.radius < this.radius * 0.9) {
        if (dPlayer < preyDist) {
          preyDist = dPlayer;
          closestPrey = player;
        }
      }
    }

    // Check other AIs (prioritize AI interactions)
    for (const other of otherAIs) {
      if (other === this) continue;
      const d = Math.hypot(other.x - this.x, other.y - this.y);
      if (d < viewRadius) {
        if (other.radius > this.radius * 1.1) {
          if (d < threatDist) {
            threatDist = d;
            closestThreat = other;
          }
        } else if (other.radius < this.radius * 0.9) {
          if (d < preyDist) {
            preyDist = d;
            closestPrey = other;
          }
        }
      }
    }

    // 2. Calculate Steering Forces (rebalanced priorities)
    // Agar.io style: prioritize based on opportunity, not just fixed order
    let steer = { x: 0, y: 0 };

    if (closestThreat && threatDist < this.radius * 4) {
      // High priority: Flee from nearby threats
      const fleeForce = this.flee(closestThreat);
      steer.x += fleeForce.x * this.config.fleeWeight;
      steer.y += fleeForce.y * this.config.fleeWeight;
    } else if (closestPrey && preyDist < closestDist * 0.8) {
      // If prey is closer than food (with some margin), chase prey first
      const seekForce = this.seek(closestPrey);
      steer.x += seekForce.x * this.config.preyWeight;
      steer.y += seekForce.y * this.config.preyWeight;
    } else if (closestFood) {
      // Eat nearby food
      const seekForce = this.seek(closestFood);
      steer.x += seekForce.x * this.config.foodWeight;
      steer.y += seekForce.y * this.config.foodWeight;
    } else if (closestPrey) {
      // Chase prey if no food around
      const seekForce = this.seek(closestPrey);
      steer.x += seekForce.x * this.config.preyWeight;
      steer.y += seekForce.y * this.config.preyWeight;
    } else {
      // Default: Wander
      const wanderForce = this.wander();
      steer.x += wanderForce.x * this.config.wanderWeight;
      steer.y += wanderForce.y * this.config.wanderWeight;
    }

    // Apply steering
    this.acceleration.x += steer.x;
    this.acceleration.y += steer.y;

    // Update velocity
    this.velocity.x += this.acceleration.x;
    this.velocity.y += this.acceleration.y;

    // Limit speed based on size
    const speedMultiplier = 10 * Math.pow(this.radius, -0.439);
    const currentMaxSpeed = Math.max(1, speedMultiplier * 1.5);

    const velMag = Math.hypot(this.velocity.x, this.velocity.y);
    if (velMag > currentMaxSpeed) {
      this.velocity.x = (this.velocity.x / velMag) * currentMaxSpeed;
      this.velocity.y = (this.velocity.y / velMag) * currentMaxSpeed;
    }

    const speedScale = options.speedScale ?? 1;

    // Update position
    this.x += this.velocity.x * speedScale;
    this.y += this.velocity.y * speedScale;

    // Boundary checks
    if (boundaryMode === 'leave') {
      const margin = this.radius * 2;
      if (
        this.x < -margin ||
        this.x > worldWidth + margin ||
        this.y < -margin ||
        this.y > worldHeight + margin
      ) {
        this.markedForDeletion = true;
      }
    } else {
      this.x = clamp(this.x, this.radius, worldWidth - this.radius);
      this.y = clamp(this.y, this.radius, worldHeight - this.radius);
    }

    // Reset acceleration
    this.acceleration = { x: 0, y: 0 };
  }

  seek(target) {
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist === 0) return { x: 0, y: 0 };

    const speedMultiplier = 10 * Math.pow(this.radius, -0.439);
    const maxSpeed = Math.max(1, speedMultiplier * 1.5);

    const desiredX = (dx / dist) * maxSpeed;
    const desiredY = (dy / dist) * maxSpeed;

    let steerX = desiredX - this.velocity.x;
    let steerY = desiredY - this.velocity.y;

    const steerMag = Math.hypot(steerX, steerY);
    if (steerMag > this.maxForce) {
      steerX = (steerX / steerMag) * this.maxForce;
      steerY = (steerY / steerMag) * this.maxForce;
    }

    return { x: steerX, y: steerY };
  }

  flee(target) {
    const force = this.seek(target);
    return { x: -force.x, y: -force.y };
  }

  wander() {
    const wanderR = 25;
    const wanderD = 80;
    const change = this.config?.wanderChange ?? 0.3;

    this.wanderTheta += (Math.random() * 2 - 1) * change;

    const velMag = Math.hypot(this.velocity.x, this.velocity.y);
    let circleCenterX, circleCenterY;

    if (velMag > 0) {
      circleCenterX = this.velocity.x / velMag * wanderD;
      circleCenterY = this.velocity.y / velMag * wanderD;
    } else {
      circleCenterX = wanderD;
      circleCenterY = 0;
    }

    const h = this.wanderTheta;
    const circleX = circleCenterX + wanderR * Math.cos(h);
    const circleY = circleCenterY + wanderR * Math.sin(h);

    const forceMag = Math.hypot(circleX, circleY);
    let forceX = circleX;
    let forceY = circleY;

    if (forceMag > this.maxForce) {
      forceX = (circleX / forceMag) * this.maxForce;
      forceY = (circleY / forceMag) * this.maxForce;
    }

    return { x: forceX, y: forceY };
  }

  draw(ctx) {
    super.draw(ctx);
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.max(10, this.radius / 2.5)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.name, this.x, this.y);
  }
}

export class GameManager {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    // World settings
    this.worldWidth = 3000;
    this.worldHeight = 3000;

    this.options = {
      aiBoundaryMode: options.aiBoundaryMode || 'leave', // 'clamp' | 'leave'
      collisionMode: options.collisionMode || 'bounce', // 'none' | 'bounce'
      botDifficulty: options.botDifficulty || 'mixed', // 'easy' | 'normal' | 'hard' | 'mixed'
      initialAICount: typeof options.initialAICount === 'number' ? options.initialAICount : 15,
      aiMix: options.aiMix || null, // { easy: number, normal: number, hard: number } (used when botDifficulty === 'mixed')
      minAI: typeof options.minAI === 'number' ? options.minAI : 10,
      respawnBatch: typeof options.respawnBatch === 'number' ? options.respawnBatch : 5,
      gameSpeed: typeof options.gameSpeed === 'number' ? options.gameSpeed : 1,
      playerName: typeof options.playerName === 'string' ? options.playerName : 'You',
      maxPlayerCells: typeof options.maxPlayerCells === 'number' ? options.maxPlayerCells : 4,
      minSplitMass: typeof options.minSplitMass === 'number' ? options.minSplitMass : 900,
      splitCooldownSeconds: typeof options.splitCooldownSeconds === 'number' ? options.splitCooldownSeconds : 0.6,
      mergeDelaySeconds: typeof options.mergeDelaySeconds === 'number' ? options.mergeDelaySeconds : 10,
      boostMultiplier: typeof options.boostMultiplier === 'number' ? options.boostMultiplier : 1.65,
      boostDrainFractionPerSecond:
        typeof options.boostDrainFractionPerSecond === 'number'
          ? options.boostDrainFractionPerSecond
          : 0.015,
      minBoostMass: typeof options.minBoostMass === 'number' ? options.minBoostMass : 520,
    };

    this.score = 0;
    this.timeLeft = 300;
    this.gameOverReason = null;

    // Entities
    this.playerName = this.options.playerName || 'You';
    this.playerCells = [new Player(this.worldWidth / 2, this.worldHeight / 2, this.playerName)];
    this.player = this.playerCells[0];
    this.foods = [];
    this.ais = [];

    this.isRunning = false;
    this.mouse = { x: this.canvas.width / 2, y: this.canvas.height / 2 };

    // Camera
    this.camera = { x: 0, y: 0, scale: 1 };

    this.setupControls();

    this.elapsedSeconds = 0;
    this._splitCooldownRemaining = 0;
    this._boostWanted = false;

    this._hudLeaderboard = [];
    this._hudLeaderboardUpdatedAt = 0;

    this.background = {
      bubbles: [],
      specks: [],
      rays: [],
      time: 0,
    };
    this.initBackground();
  }

  initBackground() {
    const bubbleCount = 140;
    const speckCount = 700;
    const rayCount = 5;

    this.background.bubbles = Array.from({ length: bubbleCount }, () => ({
      x: rand(0, this.worldWidth),
      y: rand(0, this.worldHeight),
      r: rand(2, 10),
      vy: rand(10, 35),
      vx: rand(-6, 6),
      a: rand(0.05, 0.18),
    }));

    this.background.specks = Array.from({ length: speckCount }, () => ({
      x: rand(0, this.worldWidth),
      y: rand(0, this.worldHeight),
      r: rand(0.6, 1.8),
      a: rand(0.02, 0.08),
      phase: rand(0, Math.PI * 2),
    }));

    this.background.rays = Array.from({ length: rayCount }, () => ({
      x: rand(-0.2, 1.2),
      w: rand(0.12, 0.28),
      a: rand(0.03, 0.08),
      drift: rand(-0.01, 0.01),
    }));

    this.background.time = 0;
  }

  updateBackground(stepScale) {
    this.background.time += (stepScale / 60);

    for (const b of this.background.bubbles) {
      b.y -= b.vy * stepScale;
      b.x += b.vx * stepScale;

      if (b.y < -50) {
        b.y = this.worldHeight + rand(0, 200);
        b.x = rand(0, this.worldWidth);
        b.r = rand(2, 10);
        b.vy = rand(10, 35);
        b.vx = rand(-6, 6);
        b.a = rand(0.05, 0.18);
      }

      if (b.x < -50) b.x = this.worldWidth + 50;
      if (b.x > this.worldWidth + 50) b.x = -50;
    }
  }

  drawScreenBackground() {
    const w = this.canvas.width;
    const h = this.canvas.height;

    const gradient = this.ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#061a2e');
    gradient.addColorStop(0.6, '#0b2a4b');
    gradient.addColorStop(1, '#051423');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, w, h);

    // Light rays (screen space)
    this.ctx.save();
    this.ctx.globalCompositeOperation = 'lighter';
    for (const ray of this.background.rays) {
      const x = (ray.x + ray.drift * Math.sin(this.background.time * 0.2)) * w;
      const rayW = ray.w * w;
      const g = this.ctx.createLinearGradient(x, 0, x + rayW, h);
      g.addColorStop(0, `rgba(120, 200, 255, 0)`);
      g.addColorStop(0.5, `rgba(120, 200, 255, ${ray.a})`);
      g.addColorStop(1, `rgba(120, 200, 255, 0)`);
      this.ctx.fillStyle = g;
      this.ctx.fillRect(x - rayW, 0, rayW * 2, h);
    }
    this.ctx.restore();

    // Subtle vignette
    const vignette = this.ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.max(w, h) * 0.7);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.45)');
    this.ctx.fillStyle = vignette;
    this.ctx.fillRect(0, 0, w, h);
  }

  drawWorldBackground(startX, startY, endX, endY) {
    // Specks
    this.ctx.fillStyle = '#ffffff';
    for (const s of this.background.specks) {
      if (s.x < startX || s.x > endX || s.y < startY || s.y > endY) continue;
      const twinkle = 0.6 + 0.4 * Math.sin(this.background.time * 2 + s.phase);
      this.ctx.globalAlpha = s.a * twinkle;
      this.ctx.beginPath();
      this.ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.globalAlpha = 1;

    // Bubbles
    for (const b of this.background.bubbles) {
      if (b.x < startX || b.x > endX || b.y < startY || b.y > endY) continue;
      this.ctx.globalAlpha = b.a;
      this.ctx.beginPath();
      this.ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      this.ctx.strokeStyle = 'rgba(180, 235, 255, 0.8)';
      this.ctx.lineWidth = 1.5;
      this.ctx.stroke();
    }
    this.ctx.globalAlpha = 1;
  }

  setupControls() {
    this._onMouseMove = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - rect.left;
      this.mouse.y = e.clientY - rect.top;
    };
    this.canvas.addEventListener('mousemove', this._onMouseMove);

    this._onKeyDown = (e) => {
      const active = document.activeElement;
      const activeTag = active?.tagName?.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') return;

      if (e.key === 'Shift') {
        this._boostWanted = true;
      }

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        if (this.isRunning) {
          const target = this.getMouseWorldTarget();
          this.trySplit(target.x, target.y);
        }
      }
    };
    window.addEventListener('keydown', this._onKeyDown);

    this._onKeyUp = (e) => {
      if (e.key === 'Shift') {
        this._boostWanted = false;
      }
    };
    window.addEventListener('keyup', this._onKeyUp);

    this._onBlur = () => {
      this._boostWanted = false;
    };
    window.addEventListener('blur', this._onBlur);

    // Handle window resize
    this._onResize = () => {
      // Optional: resize canvas to full screen if needed
    };
    window.addEventListener('resize', this._onResize);
  }

  destroy() {
    if (this._onMouseMove) this.canvas.removeEventListener('mousemove', this._onMouseMove);
    if (this._onKeyDown) window.removeEventListener('keydown', this._onKeyDown);
    if (this._onKeyUp) window.removeEventListener('keyup', this._onKeyUp);
    if (this._onBlur) window.removeEventListener('blur', this._onBlur);
    if (this._onResize) window.removeEventListener('resize', this._onResize);
  }

  getMouseWorldTarget() {
    return {
      x: (this.mouse.x - this.canvas.width / 2) / this.camera.scale + this.camera.x,
      y: (this.mouse.y - this.canvas.height / 2) / this.camera.scale + this.camera.y,
    };
  }

  getPlayerTotalMass() {
    return this.playerCells.reduce((sum, cell) => sum + (cell?.mass || 0), 0);
  }

  getPlayerEquivalentRadius() {
    const mass = this.getPlayerTotalMass();
    return Math.sqrt(Math.max(1, mass) / Math.PI);
  }

  getPlayerLargestCell() {
    let best = this.playerCells[0] || null;
    for (const cell of this.playerCells) {
      if (!best || cell.mass > best.mass) best = cell;
    }
    return best;
  }

  getPlayerCenter() {
    const totalMass = this.getPlayerTotalMass() || 1;
    let x = 0;
    let y = 0;
    for (const cell of this.playerCells) {
      const w = cell.mass / totalMass;
      x += cell.x * w;
      y += cell.y * w;
    }
    return { x, y };
  }

  trySplit(targetX, targetY) {
    if (!this.isRunning) return false;
    if (this._splitCooldownRemaining > 0) return false;
    if (this.playerCells.length >= this.options.maxPlayerCells) return false;

    const cell = this.getPlayerLargestCell();
    if (!cell) return false;
    if (cell.mass < this.options.minSplitMass) return false;

    const dx = targetX - cell.x;
    const dy = targetY - cell.y;
    const dir = safeNormal(dx, dy);

    const newMass = cell.mass / 2;
    cell.updateMass(newMass);

    const child = new Player(
      cell.x + dir.x * cell.radius * 0.8,
      cell.y + dir.y * cell.radius * 0.8,
      this.playerName
    );
    child.updateMass(newMass);

    const mergeReadyAt = this.elapsedSeconds + this.options.mergeDelaySeconds;
    cell.mergeReadyAt = mergeReadyAt;
    child.mergeReadyAt = mergeReadyAt;

    const launch = 14 * Math.max(0.6, Math.min(1.1, 20 / Math.max(10, child.radius)));
    child.impulse.x = dir.x * launch;
    child.impulse.y = dir.y * launch;
    cell.impulse.x += dir.x * launch * 0.25;
    cell.impulse.y += dir.y * launch * 0.25;

    this.playerCells.push(child);
    this._splitCooldownRemaining = this.options.splitCooldownSeconds;
    return true;
  }

  applyBoost(stepScale) {
    if (!this._boostWanted) return 1;

    const dt = stepScale / 60;
    const drainFraction = this.options.boostDrainFractionPerSecond;
    const minMass = Math.max(1, this.options.minBoostMass);

    for (const cell of this.playerCells) {
      if (cell.mass <= minMass) continue;
      const drain = cell.mass * drainFraction * dt;
      cell.updateMass(Math.max(minMass, cell.mass - drain));
    }

    return this.options.boostMultiplier;
  }

  start() {
    this.isRunning = true;
    this.score = 0;
    this.timeLeft = 300;
    this.gameOverReason = null;
    this.elapsedSeconds = 0;
    this._splitCooldownRemaining = 0;
    this._boostWanted = false;

    // Reset Player
    this.playerName = this.options.playerName || this.playerName || 'You';
    this.playerCells = [new Player(this.worldWidth / 2, this.worldHeight / 2, this.playerName)];
    this.player = this.playerCells[0];

    // Spawn initial entities
    this.foods = [];
    this.ais = [];
    this.spawnFood(300);

    if (this.options.botDifficulty === 'mixed' && this.getAIMixTotal() > 0) {
      this.spawnAIExact(this.options.aiMix);
    } else {
      this.spawnAI(this.options.initialAICount);
    }

    this.gameLoop();
  }

  resolveBounce(a, b, restitution = 0.6) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const normal = safeNormal(dx, dy);
    const dist = normal.dist || 0.0001;
    const overlap = a.radius + b.radius - dist;
    if (overlap <= 0) return;

    const totalMass = a.mass + b.mass || 1;
    const moveA = overlap * (b.mass / totalMass);
    const moveB = overlap * (a.mass / totalMass);

    a.x -= normal.x * moveA;
    a.y -= normal.y * moveA;
    b.x += normal.x * moveB;
    b.y += normal.y * moveB;

    if (a.velocity && b.velocity) {
      const rvx = a.velocity.x - b.velocity.x;
      const rvy = a.velocity.y - b.velocity.y;
      const velAlongNormal = rvx * normal.x + rvy * normal.y;
      if (velAlongNormal > 0) return;

      const invMassA = 1 / Math.max(a.mass, 1);
      const invMassB = 1 / Math.max(b.mass, 1);
      const impulse = (-(1 + restitution) * velAlongNormal) / (invMassA + invMassB);

      const impulseX = impulse * normal.x;
      const impulseY = impulse * normal.y;

      a.velocity.x += impulseX * invMassA;
      a.velocity.y += impulseY * invMassA;
      b.velocity.x -= impulseX * invMassB;
      b.velocity.y -= impulseY * invMassB;
    }
  }

  spawnFood(count) {
    const types = ['bottle', 'bag', 'net', 'can', 'microplastic'];
    for (let i = 0; i < count; i++) {
      const x = Math.random() * this.worldWidth;
      const y = Math.random() * this.worldHeight;
      const type = types[Math.floor(Math.random() * types.length)];
      this.foods.push(new Food(x, y, type));
    }
  }

  spawnAI(count) {
    for (let i = 0; i < count; i++) {
      const x = Math.random() * this.worldWidth;
      const y = Math.random() * this.worldHeight;
      this.ais.push(
        new AIPlayer(x, y, this.worldWidth, this.worldHeight, {
          difficulty: this.pickAIDifficulty(),
        })
      );
    }
  }

  spawnAIExact(mix) {
    if (!mix) return;
    this.spawnAIByDifficulty('easy', mix.easy || 0);
    this.spawnAIByDifficulty('normal', mix.normal || 0);
    this.spawnAIByDifficulty('hard', mix.hard || 0);
  }

  spawnAIByDifficulty(difficulty, count) {
    for (let i = 0; i < count; i++) {
      const x = Math.random() * this.worldWidth;
      const y = Math.random() * this.worldHeight;
      this.ais.push(
        new AIPlayer(x, y, this.worldWidth, this.worldHeight, {
          difficulty,
        })
      );
    }
  }

  getAIMixTotal() {
    const mix = this.options.aiMix;
    if (!mix) return 0;
    return (mix.easy || 0) + (mix.normal || 0) + (mix.hard || 0);
  }

  pickAIDifficulty() {
    const selected = this.options.botDifficulty;
    if (selected === 'easy' || selected === 'normal' || selected === 'hard') return selected;

    const mix = this.options.aiMix;
    const easyWeight = mix?.easy ?? 0;
    const normalWeight = mix?.normal ?? 0;
    const hardWeight = mix?.hard ?? 0;
    const total = easyWeight + normalWeight + hardWeight;

    if (total > 0) {
      const roll = Math.random() * total;
      if (roll < easyWeight) return 'easy';
      if (roll < easyWeight + normalWeight) return 'normal';
      return 'hard';
    }

    const fallbackRoll = Math.random();
    if (fallbackRoll < 0.4) return 'easy';
    if (fallbackRoll < 0.8) return 'normal';
    return 'hard';
  }

  update() {
    const speed = clamp(this.options.gameSpeed || 1, 0.25, 4);
    const substeps = Math.max(1, Math.ceil(speed));
    const stepScale = speed / substeps;

    for (let i = 0; i < substeps; i++) {
      if (!this.isRunning) break;
      this.updateStep(stepScale);
    }

    // Respawn Food/AI to keep world populated (once per frame)
    if (this.foods.length < 250) this.spawnFood(50);
    if (this.ais.length < this.options.minAI) this.spawnAI(this.options.respawnBatch);

    // Update Camera (once per frame)
    const targetScale = Math.max(0.1, 50 / (this.getPlayerEquivalentRadius() + 30));
    this.camera.scale += (targetScale - this.camera.scale) * 0.1;
    const center = this.getPlayerCenter();
    this.camera.x = center.x;
    this.camera.y = center.y;

    this.player = this.getPlayerLargestCell() || this.player;
  }

  updateStep(stepScale) {
    this.updateBackground(stepScale);
    this.elapsedSeconds += stepScale / 60;
    this._splitCooldownRemaining = Math.max(0, this._splitCooldownRemaining - stepScale / 60);

    const boostMultiplier = this.applyBoost(stepScale);

    // 1. Update Player Movement
    // Convert mouse screen pos to world pos
    const target = this.getMouseWorldTarget();

    for (const cell of this.playerCells) {
      cell.move(target.x, target.y, this.worldWidth, this.worldHeight, stepScale, boostMultiplier);
    }

    // Separate own cells (soft bounce)
    for (let i = 0; i < this.playerCells.length; i++) {
      for (let j = i + 1; j < this.playerCells.length; j++) {
        const a = this.playerCells[i];
        const b = this.playerCells[j];
        if (!a || !b) continue;
        if (a.collidesWith(b)) this.resolveBounce(a, b, 0.15);
      }
    }

    // Merge cells after delay
    if (this.playerCells.length > 1) {
      for (let i = 0; i < this.playerCells.length; i++) {
        for (let j = i + 1; j < this.playerCells.length; j++) {
          const a = this.playerCells[i];
          const b = this.playerCells[j];
          if (!a || !b) continue;
          if (this.elapsedSeconds < a.mergeReadyAt) continue;
          if (this.elapsedSeconds < b.mergeReadyAt) continue;
          if (!a.collidesWith(b)) continue;

          const bigger = a.mass >= b.mass ? a : b;
          const smaller = bigger === a ? b : a;
          smaller.markedForDeletion = true;
          bigger.updateMass(bigger.mass + smaller.mass);
        }
      }
      this.playerCells = this.playerCells.filter((c) => !c.markedForDeletion);
    }

    this.player = this.getPlayerLargestCell() || this.player;

    // 2. Update AI
    const playerFocus = this.getPlayerLargestCell() || this.player;
    this.ais.forEach(ai => {
      ai.update(this.foods, playerFocus, this.ais, this.worldWidth, this.worldHeight, {
        boundaryMode: this.options.aiBoundaryMode,
        speedScale: stepScale,
      });
    });

    // 3. Collision Detection

    // Player vs Food
    this.foods.forEach(food => {
      if (food.markedForDeletion) return;
      for (const cell of this.playerCells) {
        if (!cell.markedForDeletion && cell.collidesWith(food)) {
          food.markedForDeletion = true;
          cell.updateMass(cell.mass + food.value * 5); // *5 to make it noticeable
          this.score += food.value;
          break;
        }
      }
    });

    // Player vs AI
    this.ais.forEach(ai => {
      if (ai.markedForDeletion || !this.isRunning) return;

      // Player eats AI (any cell)
      for (const cell of this.playerCells) {
        if (ai.markedForDeletion) break;
        if (cell.canEat(ai)) {
          ai.markedForDeletion = true;
          cell.updateMass(cell.mass + ai.mass);
          this.score += Math.floor(ai.mass / 10);
        }
      }

      if (ai.markedForDeletion) return;

      // AI eats a player cell (only end game if all cells are gone)
      for (const cell of this.playerCells) {
        if (cell.markedForDeletion) continue;
        if (ai.canEat(cell)) {
          cell.markedForDeletion = true;
          ai.updateMass(ai.mass + cell.mass);
        }
      }

      const remainingCells = this.playerCells.filter((c) => !c.markedForDeletion);
      if (remainingCells.length === 0) {
        this.isRunning = false;
        this.gameOverReason = 'eaten';
        return;
      }
      this.playerCells = remainingCells;
      this.player = this.getPlayerLargestCell() || this.player;

      // Only bounce if neither can eat the other AND they are similar size
      // In Agar.io, cells that can't eat each other should be able to overlap/pass through
      // Only apply bounce for cells of very similar size to prevent clipping
      if (this.options.collisionMode === 'bounce') {
        for (const cell of this.playerCells) {
          if (!cell.markedForDeletion && cell.collidesWith(ai)) {
            // Only bounce if sizes are very similar (within 10% of each other)
            const sizeRatio = Math.max(cell.radius, ai.radius) / Math.min(cell.radius, ai.radius);
            if (sizeRatio < 1.1) {
              this.resolveBounce(cell, ai, 0.3);
              cell.x = clamp(cell.x, cell.radius, this.worldWidth - cell.radius);
              cell.y = clamp(cell.y, cell.radius, this.worldHeight - cell.radius);
              if (this.options.aiBoundaryMode === 'clamp') {
                ai.x = clamp(ai.x, ai.radius, this.worldWidth - ai.radius);
                ai.y = clamp(ai.y, ai.radius, this.worldHeight - ai.radius);
              }
            }
            // If one is bigger but can't eat yet, allow overlap (no bounce)
          }
        }
      }
    });

    // AI vs Food
    this.ais.forEach(ai => {
      this.foods.forEach(food => {
        if (!food.markedForDeletion && ai.collidesWith(food)) {
          food.markedForDeletion = true;
          ai.updateMass(ai.mass + food.value * 5);
        }
      });
    });

    // AI vs AI
    for (let i = 0; i < this.ais.length; i++) {
      for (let j = i + 1; j < this.ais.length; j++) {
        const ai1 = this.ais[i];
        const ai2 = this.ais[j];
        if (ai1.markedForDeletion || ai2.markedForDeletion) continue;

        if (ai1.canEat(ai2)) {
          ai2.markedForDeletion = true;
          ai1.updateMass(ai1.mass + ai2.mass);
        } else if (ai2.canEat(ai1)) {
          ai1.markedForDeletion = true;
          ai2.updateMass(ai2.mass + ai1.mass);
        } else if (this.options.collisionMode === 'bounce' && ai1.collidesWith(ai2)) {
          // Only bounce AI vs AI if they are very similar size
          const sizeRatio = Math.max(ai1.radius, ai2.radius) / Math.min(ai1.radius, ai2.radius);
          if (sizeRatio < 1.1) {
            this.resolveBounce(ai1, ai2, 0.3);
            if (this.options.aiBoundaryMode === 'clamp') {
              ai1.x = clamp(ai1.x, ai1.radius, this.worldWidth - ai1.radius);
              ai1.y = clamp(ai1.y, ai1.radius, this.worldHeight - ai1.radius);
              ai2.x = clamp(ai2.x, ai2.radius, this.worldWidth - ai2.radius);
              ai2.y = clamp(ai2.y, ai2.radius, this.worldHeight - ai2.radius);
            }
          }
          // If sizes differ, allow overlap (Agar.io style)
        }
      }
    }

    // Cleanup
    this.foods = this.foods.filter(f => !f.markedForDeletion);
    this.ais = this.ais.filter(a => !a.markedForDeletion);
    this.playerCells = this.playerCells.filter((c) => !c.markedForDeletion);
    this.player = this.getPlayerLargestCell() || this.player;

    // Time
    this.timeLeft -= stepScale / 60;
    if (this.timeLeft <= 0) {
      this.isRunning = false;
      this.gameOverReason = this.gameOverReason || 'timeout';
    }
  }

  draw() {
    this.drawScreenBackground();

    this.ctx.save();

    // Apply Camera Transform
    // Translate to center of screen, Scale, Translate back from camera position
    this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
    this.ctx.scale(this.camera.scale, this.camera.scale);
    this.ctx.translate(-this.camera.x, -this.camera.y);

    // Draw World Boundaries
    this.ctx.strokeStyle = '#334155';
    this.ctx.lineWidth = 5;
    this.ctx.strokeRect(0, 0, this.worldWidth, this.worldHeight);

    // Draw Grid
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    this.ctx.lineWidth = 1;
    const gridSize = 50;

    // Optimize grid drawing: only draw visible grid
    // (Simplified for now: draw all, or large area around player)
    const startX = Math.max(0, this.camera.x - (this.canvas.width / 2) / this.camera.scale);
    const startY = Math.max(0, this.camera.y - (this.canvas.height / 2) / this.camera.scale);
    const endX = Math.min(this.worldWidth, this.camera.x + (this.canvas.width / 2) / this.camera.scale);
    const endY = Math.min(this.worldHeight, this.camera.y + (this.canvas.height / 2) / this.camera.scale);

    this.drawWorldBackground(startX, startY, endX, endY);

    // Snap to grid
    const gridStartX = Math.floor(startX / gridSize) * gridSize;
    const gridStartY = Math.floor(startY / gridSize) * gridSize;

    this.ctx.beginPath();
    for (let x = gridStartX; x <= endX; x += gridSize) {
      this.ctx.moveTo(x, startY);
      this.ctx.lineTo(x, endY);
    }
    for (let y = gridStartY; y <= endY; y += gridSize) {
      this.ctx.moveTo(startX, y);
      this.ctx.lineTo(endX, y);
    }
    this.ctx.stroke();

    // Draw Entities
    // Sort by size so larger things are on top? Or z-index? 
    // Actually in agar.io smaller things can be under larger things.
    // Let's just draw food, then ais/player sorted by mass.

    this.foods.forEach(f => f.draw(this.ctx));

    const largestCell = this.getPlayerLargestCell();
    const allPlayers = [...this.ais, ...this.playerCells];
    allPlayers.sort((a, b) => a.mass - b.mass);

    allPlayers.forEach((p) => {
      if (p.type === 'player') {
        p.draw(this.ctx, { showName: p === largestCell });
      } else {
        p.draw(this.ctx);
      }
    });

    this.ctx.restore();

    // Draw UI (HUD)
    this.drawUI();
  }

  drawUI() {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(10, 10, 200, 120);

    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold 16px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`Score: ${this.score}`, 20, 35);
    this.ctx.fillText(`Mass: ${Math.floor(this.getPlayerTotalMass())}`, 20, 60);
    this.ctx.fillText(`Time: ${Math.floor(this.timeLeft / 60)}:${(Math.floor(this.timeLeft % 60)).toString().padStart(2, '0')}`, 20, 85);
    this.ctx.font = '12px Arial';
    this.ctx.fillText(`Cells: ${this.playerCells.length}`, 20, 105);

    // Leaderboard (Top 5)
    const now = performance.now();
    if (now - this._hudLeaderboardUpdatedAt > 250) {
      const me = { name: this.playerName, mass: this.getPlayerTotalMass(), type: 'player' };
      this._hudLeaderboard = [...this.ais, me].sort((a, b) => b.mass - a.mass).slice(0, 5);
      this._hudLeaderboardUpdatedAt = now;
    }
    const leaderboard = this._hudLeaderboard;

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(this.canvas.width - 210, 10, 200, 150);
    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold 16px Arial';
    this.ctx.fillText('Leaderboard', this.canvas.width - 200, 35);

    leaderboard.forEach((p, i) => {
      this.ctx.font = '14px Arial';
      const suffix = p.type === 'ai' ? ` [${(p.difficulty || 'n')[0].toUpperCase()}]` : '';
      const text = `${i + 1}. ${p.name}${suffix}`;
      const isMe = p.type === 'player';
      this.ctx.fillStyle = isMe ? '#3b82f6' : '#fff';
      this.ctx.fillText(text, this.canvas.width - 200, 60 + i * 25);
    });
  }

  gameLoop() {
    if (!this.isRunning) return;
    this.update();
    this.draw();
    requestAnimationFrame(() => this.gameLoop());
  }

  getGameState() {
    return {
      score: this.score,
      timeLeft: this.timeLeft,
      cleanupRate: 0, // Not used in this mode really
      duration: 300 - this.timeLeft,
      gameOverReason: this.gameOverReason,
      playerMass: this.getPlayerTotalMass(),
      playerCells: this.playerCells.length,
    };
  }

  stop(reason = 'stopped') {
    this.isRunning = false;
    this.gameOverReason = this.gameOverReason || reason;
  }
}
