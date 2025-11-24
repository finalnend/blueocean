// Blue Earth Watch - Ocean Cleanup Game Engine

export class GameObject {
  constructor(x, y, width, height, type) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.type = type;
    this.collected = false;
  }
  
  // 碰撞檢測 (AABB - Axis-Aligned Bounding Box)
  collidesWith(other) {
    return (
      this.x < other.x + other.width &&
      this.x + this.width > other.x &&
      this.y < other.y + other.height &&
      this.y + this.height > other.y
    );
  }
  
  draw(ctx) {
    // 子類別實作
  }
}

// 清理船
export class CleanupShip extends GameObject {
  constructor(x, y) {
    super(x, y, 40, 40, 'ship');
    this.speed = 5;
    this.direction = { x: 0, y: 0 };
  }
  
  move(canvasWidth, canvasHeight) {
    this.x += this.direction.x * this.speed;
    this.y += this.direction.y * this.speed;
    
    // 邊界限制
    this.x = Math.max(0, Math.min(canvasWidth - this.width, this.x));
    this.y = Math.max(0, Math.min(canvasHeight - this.height, this.y));
  }
  
  draw(ctx) {
    // 繪製船體
    ctx.fillStyle = '#0099e6';
    ctx.fillRect(this.x, this.y, this.width, this.height);
    
    // 繪製船艏
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(this.x + this.width / 2, this.y);
    ctx.lineTo(this.x + this.width, this.y + 15);
    ctx.lineTo(this.x, this.y + 15);
    ctx.closePath();
    ctx.fill();
    
    // 繪製回收標誌
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('♻', this.x + this.width / 2, this.y + this.height / 2 + 7);
  }
}

// 垃圾物件
export class TrashItem extends GameObject {
  constructor(x, y, trashType) {
    const size = 25;
    super(x, y, size, size, 'trash');
    this.trashType = trashType; // bottle, bag, net, can
    this.value = this.getTrashValue(trashType);
    this.floatOffset = Math.random() * Math.PI * 2;
    this.floatSpeed = 0.02 + Math.random() * 0.02;
  }
  
  getTrashValue(type) {
    const values = {
      bottle: 10,
      bag: 15,
      net: 30,
      can: 12,
      microplastic: 5
    };
    return values[type] || 10;
  }
  
  update(time) {
    // 漂浮動畫
    this.floatOffset += this.floatSpeed;
  }
  
  draw(ctx) {
    if (this.collected) return;
    
    const floatY = this.y + Math.sin(this.floatOffset) * 3;
    
    ctx.save();
    ctx.translate(this.x + this.width / 2, floatY + this.height / 2);
    
    // 根據類型繪製不同垃圾
    switch (this.trashType) {
      case 'bottle':
        this.drawBottle(ctx);
        break;
      case 'bag':
        this.drawBag(ctx);
        break;
      case 'net':
        this.drawNet(ctx);
        break;
      case 'can':
        this.drawCan(ctx);
        break;
      default:
        this.drawGeneric(ctx);
    }
    
    ctx.restore();
  }
  
  drawBottle(ctx) {
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(-10, -12, 20, 24);
    ctx.fillRect(-6, -15, 12, 3);
  }
  
  drawBag(ctx) {
    ctx.fillStyle = '#ef4444';
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(-12, -10);
    ctx.lineTo(12, -10);
    ctx.lineTo(10, 10);
    ctx.lineTo(-10, 10);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  
  drawNet(ctx) {
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    for (let i = -10; i <= 10; i += 5) {
      ctx.beginPath();
      ctx.moveTo(i, -10);
      ctx.lineTo(i, 10);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-10, i);
      ctx.lineTo(10, i);
      ctx.stroke();
    }
  }
  
  drawCan(ctx) {
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(-8, -12, 16, 24);
    ctx.fillStyle = '#64748b';
    ctx.fillRect(-8, -12, 16, 4);
  }
  
  drawGeneric(ctx) {
    ctx.fillStyle = '#6b7280';
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();
  }
}

// 海洋生物
export class SeaCreature extends GameObject {
  constructor(x, y, creatureType) {
    const size = 35;
    super(x, y, size, size, 'creature');
    this.creatureType = creatureType; // fish, turtle, dolphin
    this.speed = 1 + Math.random();
    this.direction = Math.random() > 0.5 ? 1 : -1;
    this.animationFrame = 0;
  }
  
  update() {
    this.x += this.speed * this.direction;
    this.animationFrame += 0.1;
    
    // 超出邊界時改變方向
    if (this.x < -50 || this.x > 850) {
      this.direction *= -1;
    }
  }
  
  draw(ctx) {
    ctx.save();
    ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
    
    if (this.direction < 0) {
      ctx.scale(-1, 1);
    }
    
    switch (this.creatureType) {
      case 'fish':
        this.drawFish(ctx);
        break;
      case 'turtle':
        this.drawTurtle(ctx);
        break;
      case 'dolphin':
        this.drawDolphin(ctx);
        break;
    }
    
    ctx.restore();
  }
  
  drawFish(ctx) {
    // 魚身
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.ellipse(0, 0, 15, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // 魚尾
    ctx.beginPath();
    ctx.moveTo(-15, 0);
    ctx.lineTo(-22, -8);
    ctx.lineTo(-22, 8);
    ctx.closePath();
    ctx.fill();
    
    // 眼睛
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(8, -2, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(9, -2, 1, 0, Math.PI * 2);
    ctx.fill();
  }
  
  drawTurtle(ctx) {
    // 龜殼
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.ellipse(0, 0, 15, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // 龜殼花紋
    ctx.strokeStyle = '#064e3b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-8, -6);
    ctx.lineTo(8, 6);
    ctx.moveTo(-8, 6);
    ctx.lineTo(8, -6);
    ctx.stroke();
    
    // 頭部
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(15, 0, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  
  drawDolphin(ctx) {
    // 海豚身體
    ctx.fillStyle = '#06b6d4';
    ctx.beginPath();
    ctx.ellipse(0, 0, 18, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // 背鰭
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(-5, -18);
    ctx.lineTo(5, -10);
    ctx.closePath();
    ctx.fill();
    
    // 嘴部
    ctx.fillStyle = '#0891b2';
    ctx.beginPath();
    ctx.arc(18, 0, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

// 特殊效果
export class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 4;
    this.vy = (Math.random() - 0.5) * 4;
    this.life = 1;
    this.color = color;
    this.size = 3 + Math.random() * 3;
  }
  
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.1; // 重力
    this.life -= 0.02;
  }
  
  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.life;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  
  isDead() {
    return this.life <= 0;
  }
}

// 遊戲管理器
export class GameManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.score = 0;
    this.timeLeft = 300; // 5 分鐘
    this.ship = new CleanupShip(canvas.width / 2 - 20, canvas.height / 2 - 20);
    this.trashItems = [];
    this.seaCreatures = [];
    this.particles = [];
    this.isRunning = false;
    this.keys = {};
    this.collectedCount = 0;
    this.totalTrash = 0;
    this.hitCreatureCount = 0;
    
    this.setupControls();
  }
  
  setupControls() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.key] = true;
      e.preventDefault();
    });
    
    window.addEventListener('keyup', (e) => {
      this.keys[e.key] = false;
    });
  }
  
  start() {
    this.isRunning = true;
    this.score = 0;
    this.timeLeft = 300;
    this.collectedCount = 0;
    this.hitCreatureCount = 0;
    this.spawnTrash(100);
    this.spawnCreatures(20);
    this.gameLoop();
  }
  
  spawnTrash(count) {
    const types = ['bottle', 'bag', 'net', 'can'];
    this.totalTrash = count;
    
    for (let i = 0; i < count; i++) {
      const x = Math.random() * (this.canvas.width - 30);
      const y = Math.random() * (this.canvas.height - 30);
      const type = types[Math.floor(Math.random() * types.length)];
      this.trashItems.push(new TrashItem(x, y, type));
    }
  }
  
  spawnCreatures(count) {
    const types = ['fish', 'turtle', 'dolphin'];
    
    for (let i = 0; i < count; i++) {
      const x = Math.random() * this.canvas.width;
      const y = Math.random() * this.canvas.height;
      const type = types[Math.floor(Math.random() * types.length)];
      this.seaCreatures.push(new SeaCreature(x, y, type));
    }
  }
  
  update() {
    // 更新船隻方向
    this.ship.direction = { x: 0, y: 0 };
    if (this.keys['ArrowUp'] || this.keys['w']) this.ship.direction.y = -1;
    if (this.keys['ArrowDown'] || this.keys['s']) this.ship.direction.y = 1;
    if (this.keys['ArrowLeft'] || this.keys['a']) this.ship.direction.x = -1;
    if (this.keys['ArrowRight'] || this.keys['d']) this.ship.direction.x = 1;
    
    // 正規化對角線移動
    if (this.ship.direction.x !== 0 && this.ship.direction.y !== 0) {
      this.ship.direction.x *= 0.707;
      this.ship.direction.y *= 0.707;
    }
    
    this.ship.move(this.canvas.width, this.canvas.height);
    
    // 更新垃圾
    this.trashItems.forEach(trash => trash.update());
    
    // 更新海洋生物
    this.seaCreatures.forEach(creature => creature.update());
    
    // 更新粒子
    this.particles = this.particles.filter(p => !p.isDead());
    this.particles.forEach(p => p.update());
    
    // 碰撞檢測
    this.checkCollisions();
    
    // 時間倒數
    this.timeLeft -= 1 / 60;
    
    // 遊戲結束條件
    if (this.timeLeft <= 0 || this.collectedCount >= this.totalTrash) {
      this.isRunning = false;
    }
  }
  
  checkCollisions() {
    // 檢查與垃圾的碰撞
    this.trashItems.forEach(trash => {
      if (!trash.collected && this.ship.collidesWith(trash)) {
        trash.collected = true;
        this.score += trash.value;
        this.collectedCount++;
        this.createParticles(trash.x, trash.y, '#10b981');
      }
    });
    
    // 檢查與海洋生物的碰撞
    this.seaCreatures.forEach(creature => {
      if (this.ship.collidesWith(creature)) {
        this.score = Math.max(0, this.score - 50);
        this.hitCreatureCount++;
        this.createParticles(creature.x, creature.y, '#ef4444');
        // 生物受驚移開
        creature.x += creature.direction * 100;
      }
    });
  }
  
  createParticles(x, y, color) {
    for (let i = 0; i < 10; i++) {
      this.particles.push(new Particle(x, y, color));
    }
  }
  
  draw() {
    // 清空畫布
    this.ctx.fillStyle = '#0ea5e9';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // 繪製海洋波浪效果
    this.drawWaves();
    
    // 繪製遊戲物件
    this.trashItems.forEach(trash => {
      if (!trash.collected) trash.draw(this.ctx);
    });
    
    this.seaCreatures.forEach(creature => creature.draw(this.ctx));
    this.particles.forEach(particle => particle.draw(this.ctx));
    this.ship.draw(this.ctx);
    
    // 繪製 UI
    this.drawUI();
  }
  
  drawWaves() {
    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    this.ctx.lineWidth = 2;
    
    for (let i = 0; i < 5; i++) {
      this.ctx.beginPath();
      const offset = (Date.now() / 1000 + i * 50) % this.canvas.width;
      for (let x = 0; x < this.canvas.width; x += 20) {
        const y = 50 + i * 100 + Math.sin((x + offset) / 30) * 10;
        if (x === 0) {
          this.ctx.moveTo(x, y);
        } else {
          this.ctx.lineTo(x, y);
        }
      }
      this.ctx.stroke();
    }
    
    this.ctx.restore();
  }
  
  drawUI() {
    // 背景半透明
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(10, 10, 250, 80);
    
    // 文字
    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold 16px Arial';
    this.ctx.fillText(`分數: ${this.score}`, 20, 35);
    this.ctx.fillText(`時間: ${Math.floor(this.timeLeft / 60)}:${(Math.floor(this.timeLeft % 60)).toString().padStart(2, '0')}`, 20, 60);
    this.ctx.fillText(`清理: ${this.collectedCount}/${this.totalTrash}`, 20, 85);
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
      cleanupRate: this.totalTrash > 0 ? this.collectedCount / this.totalTrash : 0,
      duration: 300 - this.timeLeft,
      hitCreatureCount: this.hitCreatureCount
    };
  }
  
  stop() {
    this.isRunning = false;
  }
}
