let monsters = [];
let holes = [];
let maxLimit = 120;
let score = 0;
let highScore = 0;
let gameOver = false;
let restartButton;

function setup() {
    let canvas = createCanvas(windowWidth, windowHeight);
    canvas.parent('game-container');
    highScore = getItem('highScore') || 0;

    for (let i = 0; i < 3; i++) {
        holes.push({ p: createVector(random(100, width-100), random(100, height-100)), r: 80 });
    }

    spawnMonsters(10);

    restartButton = createButton('重新開始');
    restartButton.position(width - 100, 60);
    restartButton.mousePressed(resetGame);
    restartButton.show(); 
}

function spawnMonsters(n) {
    for (let i = 0; i < n; i++) {
        monsters.push(new Monster({ p: createVector(random(width), random(height)), r: random(20, 40) }));
    }
}

function draw() {
    background(15, 15, 25);

    // 即時更新最高分：只要當前分數超過最高分就變動
    if (score > highScore) {
        highScore = score;
        storeItem('highScore', highScore);
    }

    if (gameOver) {
        showGameOver();
        return;
    }

    // 繪製黑洞
    fill(0); stroke(255, 0, 255); strokeWeight(4);
    for (let h of holes) ellipse(h.p.x, h.p.y, h.r * 2);

    // 碰撞檢查 (從最後一隻往前跑)
    for (let i = monsters.length - 1; i >= 0; i--) {
        let m = monsters[i];
        
        // 1. 黑洞碰撞
        let isDead = false;
        for (let h of holes) {
            if (dist(m.p.x, m.p.y, h.p.x, h.p.y) < m.r + h.r) {
                monsters.splice(i, 1);
                score = max(0, score - 100);
                isDead = true; break;
            }
        }
        if (isDead) continue;

        // 2. 怪獸融合
        for (let j = i - 1; j >= 0; j--) {
            let m2 = monsters[j];
            if (dist(m.p.x, m.p.y, m2.p.x, m2.p.y) < m.r + m2.r) {
                if (m.r >= maxLimit && m2.r >= maxLimit) {
                    score += 500;
                } else {
                    score += floor(m.r + m2.r);
                    monsters.push(new Monster({ p: p5.Vector.lerp(m.p, m2.p, 0.5), r: (m.r + m2.r) * 0.6 }));
                }
                monsters.splice(i, 1);
                monsters.splice(j, 1);
                break;
            }
        }
    }

    // 更新繪製
    for (let m of monsters) { m.update(); m.draw(); m.checkMouse(); }
    
    // UI
    fill(255); textSize(24);
    textAlign(LEFT, TOP);
    text("Score: " + floor(score), 20, 30);
    text("High Score: " + floor(highScore), 20, 60);
    
    // 遊戲結束判定 (加入 frameCount 確保遊戲開始後才判定)
    if (monsters.length === 0 && frameCount > 60) {
        gameOver = true;
    }
}

function showGameOver() {
    fill(255); textSize(50); textAlign(CENTER, CENTER);
    text("GAME OVER\nScore: " + floor(score), width/2, height/2 - 50);
}

function resetGame() {
    score = 0; 
    highScore = 0;
    storeItem('highScore', 0);
    gameOver = false; 
    monsters = [];
    spawnMonsters(10);
}

function mousePressed() {
    // 確保點擊時不會點到按鈕區域
    if (!gameOver && mouseY > 100) { 
        monsters.push(new Monster({ p: createVector(mouseX, mouseY), r: random(20, 40) }));
    }
}

class Monster {
    constructor(args) { this.r = args.r; this.p = args.p; this.v = createVector(random(-2, 2), random(-2, 2)); this.color = (this.r > 100) ? "#FFD700" : random(["#FF6B6B", "#4ECDC4", "#FFE66D"]); this.mode = "happy"; }
    draw() {
        push(); translate(this.p.x, this.p.y);
        fill(this.mode === "scared" ? "#FFF" : this.color);
        stroke(0); strokeWeight(3);
        beginShape(); for (let i = 0; i < 6; i++) vertex(this.r * cos(i*PI/3), this.r * sin(i*PI/3));
        endShape(CLOSE);

        // 繪製臉部特徵
        noStroke();
        fill(0); // 眼睛和嘴巴的顏色

        // 眼睛
        let eyeOffset = this.r * 0.3; // 眼睛相對於中心的水平偏移
        let eyeY = -this.r * 0.2; // 眼睛相對於中心的垂直位置
        let eyeSize = this.r * 0.15; // 眼睛大小

        if (this.mode === "scared") {
            // 驚恐的眼睛 (線條)
            stroke(0);
            strokeWeight(eyeSize / 2);
            line(-eyeOffset, eyeY, -eyeOffset * 0.5, eyeY); // 左眼
            line(eyeOffset * 0.5, eyeY, eyeOffset, eyeY); // 右眼
            noStroke();
        } else {
            // 開心的眼睛 (圓點)
            ellipse(-eyeOffset, eyeY, eyeSize, eyeSize); // 左眼
            ellipse(eyeOffset, eyeY, eyeSize, eyeSize); // 右眼
        }

        // 嘴巴
        let mouthWidth = this.r * 0.4; // 嘴巴寬度
        let mouthHeight = this.r * 0.1; // 嘴巴高度
        let mouthY = this.r * 0.3; // 嘴巴相對於中心的垂直位置

        if (this.mode === "scared") {
            // 驚恐的嘴巴 (向下彎曲)
            arc(0, mouthY, mouthWidth, mouthHeight, 0, PI, CHORD);
        } else {
            // 開心的嘴巴 (向上彎曲)
            arc(0, mouthY, mouthWidth, mouthHeight, PI, TWO_PI, CHORD);
        }

        pop();
    }

    update() {
        // 如果怪獸處於驚嚇模式，則遠離滑鼠
        if (this.mode === "scared") {
            let mousePos = createVector(mouseX, mouseY);
            let repelForce = p5.Vector.sub(this.p, mousePos); // 從滑鼠指向怪獸的向量
            repelForce.normalize(); // 正規化向量
            repelForce.mult(0.8); // 調整排斥力道
            this.v.add(repelForce); // 將排斥力加到速度上
        }

        this.v.limit(5); // 限制怪獸的最大速度，防止過快

        this.p.add(this.v);
        // 邊界碰撞檢查
        if (this.p.x < this.r || this.p.x > width - this.r) this.v.x *= -1;
        if (this.p.y < this.r || this.p.y > height - this.r) this.v.y *= -1;
        this.p.x = constrain(this.p.x, this.r, width - this.r);
        this.p.y = constrain(this.p.y, this.r, height - this.r);

        // 在更新後將模式重設為 happy，以便 checkMouse 在下一幀重新評估
        this.mode = "happy";
    }

    checkMouse() {
        let d = dist(mouseX, mouseY, this.p.x, this.p.y);
        this.mode = (d < this.r * 2) ? "scared" : "happy";
    }
}