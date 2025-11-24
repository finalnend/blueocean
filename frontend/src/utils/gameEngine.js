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
    // Must be significantly larger (e.g., 10% larger mass/radius) to eat
    return this.radius > other.radius * 1.1 && this.collidesWith(other);
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

export class Player extends GameObject {
  constructor(x, y, name) {
    super(x, y, 20, '#0099e6', 'player');
    this.name = name;
    this.speed = 5;
    this.maxSpeed = 8;
    this.velocity = { x: 0, y: 0 };
  }

  move(targetX, targetY, worldWidth, worldHeight) {
    // Calculate direction towards mouse/target
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 0) {
      // Speed formula: 2.2 * size^-0.439
      // We scale it up because canvas pixels are different from agar.io units
      // Base speed for radius 20 should be around 5-6
      // 2.2 * 20^-0.439 = 0.59. So we need a multiplier of ~10.

      const speedMultiplier = 10 * Math.pow(this.radius, -0.439);
      const currentSpeed = Math.max(1, speedMultiplier * 1.5); // Ensure min speed

      this.velocity.x = (dx / distance) * currentSpeed;
      this.velocity.y = (dy / distance) * currentSpeed;

      this.x += this.velocity.x;
      this.y += this.velocity.y;
    }

    // Boundary checks
    this.x = Math.max(this.radius, Math.min(worldWidth - this.radius, this.x));
    this.y = Math.max(this.radius, Math.min(worldHeight - this.radius, this.y));
  }

  draw(ctx) {
    super.draw(ctx);

    // Draw Name
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.max(12, this.radius / 2)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.name, this.x, this.y);
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
  constructor(x, y, worldWidth, worldHeight) {
    const startRadius = 15 + Math.random() * 30;
    const colors = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const names = ['Shark', 'Whale', 'Dolphin', 'Orca', 'Tuna', 'Squid', 'Octopus', 'Crab', 'Lobster', 'Seal'];
    const name = names[Math.floor(Math.random() * names.length)];

    super(x, y, startRadius, color, 'ai');
    this.name = name;
    this.velocity = { x: 0, y: 0 };
    this.acceleration = { x: 0, y: 0 };
    this.maxSpeed = 8;
    this.maxForce = 0.2;
    this.wanderTheta = 0;
  }

  update(foods, player, otherAIs, worldWidth, worldHeight) {
    // 1. Perception
    const viewRadius = this.radius * 10;
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
    // Add randomness: 30% chance to ignore player as prey
    const shouldConsiderPlayer = Math.random() > 0.3;

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
    let steer = { x: 0, y: 0 };

    if (closestThreat) {
      // High priority: Flee
      const fleeForce = this.flee(closestThreat);
      steer.x += fleeForce.x * 3;
      steer.y += fleeForce.y * 3;
    } else if (closestFood) {
      // Higher priority: Eat food first
      const seekForce = this.seek(closestFood);
      steer.x += seekForce.x * 1.2;
      steer.y += seekForce.y * 1.2;
    } else if (closestPrey) {
      // Lower priority: Chase (reduced from 1.5 to 0.8)
      const seekForce = this.seek(closestPrey);
      steer.x += seekForce.x * 0.8;
      steer.y += seekForce.y * 0.8;
    } else {
      // Default: Wander
      const wanderForce = this.wander();
      steer.x += wanderForce.x;
      steer.y += wanderForce.y;
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

    // Update position
    this.x += this.velocity.x;
    this.y += this.velocity.y;

    // Boundary checks
    this.x = Math.max(this.radius, Math.min(worldWidth - this.radius, this.x));
    this.y = Math.max(this.radius, Math.min(worldHeight - this.radius, this.y));

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
    const change = 0.3;

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
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    // World settings
    this.worldWidth = 3000;
    this.worldHeight = 3000;

    this.score = 0;
    this.timeLeft = 300;

    // Entities
    this.player = new Player(this.worldWidth / 2, this.worldHeight / 2, 'You');
    this.foods = [];
    this.ais = [];

    this.isRunning = false;
    this.mouse = { x: this.canvas.width / 2, y: this.canvas.height / 2 };

    // Camera
    this.camera = { x: 0, y: 0, scale: 1 };

    this.setupControls();
  }

  setupControls() {
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - rect.left;
      this.mouse.y = e.clientY - rect.top;
    });

    // Handle window resize
    window.addEventListener('resize', () => {
      // Optional: resize canvas to full screen if needed
    });
  }

  start() {
    this.isRunning = true;
    this.score = 0;
    this.timeLeft = 300;

    // Reset Player
    this.player = new Player(this.worldWidth / 2, this.worldHeight / 2, 'You');

    // Spawn initial entities
    this.foods = [];
    this.ais = [];
    this.spawnFood(300);
    this.spawnAI(15);

    this.gameLoop();
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
      this.ais.push(new AIPlayer(x, y, this.worldWidth, this.worldHeight));
    }
  }

  update() {
    // 1. Update Player Movement
    // Convert mouse screen pos to world pos
    const targetWorldX = (this.mouse.x - this.canvas.width / 2) / this.camera.scale + this.player.x;
    const targetWorldY = (this.mouse.y - this.canvas.height / 2) / this.camera.scale + this.player.y;

    this.player.move(targetWorldX, targetWorldY, this.worldWidth, this.worldHeight);

    // 2. Update AI
    this.ais.forEach(ai => ai.update(this.foods, this.player, this.ais, this.worldWidth, this.worldHeight));

    // 3. Collision Detection

    // Player vs Food
    this.foods.forEach(food => {
      if (!food.markedForDeletion && this.player.collidesWith(food)) {
        food.markedForDeletion = true;
        // Growth formula: Area1 + Area2 = NewArea
        // pi*r1^2 + pi*r2^2 = pi*R^2 -> R = sqrt(r1^2 + r2^2)
        // But for gameplay, linear radius growth is too fast, area growth is realistic.
        // Let's add mass directly.
        this.player.updateMass(this.player.mass + food.value * 5); // *5 to make it noticeable
        this.score += food.value;
      }
    });

    // Player vs AI
    this.ais.forEach(ai => {
      if (ai.markedForDeletion) return;

      // Player eats AI
      if (this.player.canEat(ai)) {
        ai.markedForDeletion = true;
        this.player.updateMass(this.player.mass + ai.mass);
        this.score += Math.floor(ai.mass / 10);
      }
      // AI eats Player
      else if (ai.canEat(this.player)) {
        this.isRunning = false; // Game Over
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
        }
      }
    }

    // Cleanup
    this.foods = this.foods.filter(f => !f.markedForDeletion);
    this.ais = this.ais.filter(a => !a.markedForDeletion);

    // Respawn Food/AI to keep world populated
    if (this.foods.length < 250) this.spawnFood(50);
    if (this.ais.length < 10) this.spawnAI(5);

    // Update Camera
    // Center on player
    // Zoom out as player grows: scale = 1 / (player.radius^0.4 / constant)
    const targetScale = Math.max(0.1, 50 / (this.player.radius + 30));
    // Smooth zoom
    this.camera.scale += (targetScale - this.camera.scale) * 0.1;

    this.camera.x = this.player.x;
    this.camera.y = this.player.y;

    // Time
    this.timeLeft -= 1 / 60;
    if (this.timeLeft <= 0) this.isRunning = false;
  }

  draw() {
    // Clear background
    this.ctx.fillStyle = '#0f172a'; // Deep ocean color
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

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

    const allPlayers = [...this.ais, this.player];
    allPlayers.sort((a, b) => a.mass - b.mass);

    allPlayers.forEach(p => p.draw(this.ctx));

    this.ctx.restore();

    // Draw UI (HUD)
    this.drawUI();
  }

  drawUI() {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(10, 10, 200, 100);

    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold 16px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`Score: ${this.score}`, 20, 35);
    this.ctx.fillText(`Mass: ${Math.floor(this.player.mass)}`, 20, 60);
    this.ctx.fillText(`Time: ${Math.floor(this.timeLeft / 60)}:${(Math.floor(this.timeLeft % 60)).toString().padStart(2, '0')}`, 20, 85);

    // Leaderboard (Top 5)
    const leaderboard = [...this.ais, this.player]
      .sort((a, b) => b.mass - a.mass)
      .slice(0, 5);

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(this.canvas.width - 210, 10, 200, 150);
    this.ctx.fillStyle = '#fff';
    this.ctx.fillText('Leaderboard', this.canvas.width - 200, 35);

    leaderboard.forEach((p, i) => {
      const text = `${i + 1}. ${p.name}`;
      const isMe = p === this.player;
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
      duration: 300 - this.timeLeft
    };
  }

  stop() {
    this.isRunning = false;
  }
}
