let game;

document.addEventListener("DOMContentLoaded", () => {
    let playButton = document.getElementById("playButton");
    let difficultyModal = document.getElementById("difficultyModal");
    let difficultyButtons = document.querySelectorAll(".difficulty-btn");
    let gameCanvas = document.getElementById("gameCanvas");
    let gameDescription = document.getElementById("gameDescription");

    playButton.addEventListener("click", () => {
        difficultyModal.style.display = "flex";
    });

    difficultyButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const difficulty = btn.getAttribute("data-difficulty");
            difficultyModal.style.display = "none";
            playButton.style.display = "none";
            gameDescription.style.display = "none";
            gameCanvas.style.display = "flex";
            startGame(difficulty);
        });
    });
});

function startGame(difficulty) {
    if (game && game.animationFrameId) {
        cancelAnimationFrame(game.animationFrameId);
    }
    game = new GameEngine(difficulty);
    setupEventListeners();
}

function setupEventListeners() {
    document.onkeydown = (e) => {
        if (!game || game.gameOver) return;
        switch (e.key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                game.player.nextDirection = { x: 0, y: -1 };
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                game.player.nextDirection = { x: 0, y: 1 };
                break;
            case 'ArrowLeft':
            case 'a':
            case 'A':
                game.player.nextDirection = { x: -1, y: 0 };
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                game.player.nextDirection = { x: 1, y: 0 };
                break;
            case ' ':
                game.changeLayer();
                break;
        }
    };
}

class GameEngine {
    constructor(difficulty) {
        this.canvas = document.getElementById("gameCanvas");
        this.context = this.canvas.getContext("2d");
        this.rows = 15;
        this.columns = 21;
        this.cellSize = 32;
        this.difficulty = difficulty;
        this.rules = ["Green - Stay away from ghosts!", "Red - Don't fall into shifting lava pits!", "Blue - Beware of shooting ice spikes!"];
        this.currentLayer = 0;
        this.player = new Player(this.canvas, this.context, this.rows, this.columns, this.cellSize);
        this.labyrinths = [
            new ClassicLevel(this.canvas, this.context, this.rows, this.columns, this.cellSize, this.player, this.difficulty),
            new LavaLevel(this.canvas, this.context, this.rows, this.columns, this.cellSize, this.player, this.difficulty),
            new IceLevel(this.canvas, this.context, this.rows, this.columns, this.cellSize, this.player, this.difficulty)
        ];
        this.score = 0;
        this.maxScore = 0;
        for (let labyrinth of this.labyrinths) {
            for (let y = 0; y < labyrinth.layout.length; y++) {
                for (let x = 0; x < labyrinth.layout[y].length; x++) {
                    if (labyrinth.layout[y][x] === 0) {
                        this.maxScore += 10;
                    }
                }
            }
        }
        console.log(this.maxScore);
        this.animationFrameId = null;
        this.canvas.focus();
        this.showRules();
        this.calculateScore();
        this.gameLoop();
    }

    showRules() {
        let rulesDiv = document.getElementById("rules");
        rulesDiv.textContent = this.rules[this.currentLayer];
    }

    calculateScore() {
        this.score = 0;
        for (let labyrinth of this.labyrinths) {
            this.score += labyrinth.score;
        }
        let scoreDiv = document.getElementById("score");
        scoreDiv.textContent = "Score: " + this.score;
    }

    drawPlayer() {
        let canTeleport = false;
        let nextLayer = (this.currentLayer + 1) % this.labyrinths.length;
        let playerX = this.player.gridPos.x;
        let playerY = this.player.gridPos.y;
        let nextLayout = this.labyrinths[nextLayer].layout;

        if (
            nextLayout[playerY] &&
            nextLayout[playerY][playerX] !== 1 &&
            nextLayout[playerY][playerX] !== 4
        ) {
            canTeleport = true;
        }

        this.context.fillStyle = this.player.color;
        this.context.beginPath();
        this.context.arc(
            this.player.pixelPos.x + this.cellSize / 2,
            this.player.pixelPos.y + this.cellSize / 2,
            this.cellSize / 2 - 4,
            0,
            Math.PI * 2
        );
        this.context.fill();

        if (canTeleport) {
            this.context.strokeStyle = "limegreen";
            this.context.lineWidth = 4;
            this.context.beginPath();
            this.context.arc(
                this.player.pixelPos.x + this.cellSize / 2,
                this.player.pixelPos.y + this.cellSize / 2,
                this.cellSize / 2 - 2,
                0,
                Math.PI * 2
            );
            this.context.stroke();
        }
    }

    isValidPosition(x, y) {
        if (x < 0 || x >= this.columns || y < 0 || y >= this.rows || this.labyrinths[this.currentLayer].isWall(x, y)) {
            return false;
        }
        return true;
    }

    updatePlayerDirection() {
        if (!this.player.moving) {
            if (this.player.nextDirection.x !== 0 || this.player.nextDirection.y !== 0) {
                let newX = this.player.gridPos.x + this.player.nextDirection.x;
                let newY = this.player.gridPos.y + this.player.nextDirection.y;
                if (this.isValidPosition(newX, newY)) {
                    this.player.currentDirection = { ...this.player.nextDirection };
                }
            }
            if (this.player.currentDirection.x !== 0 || this.player.currentDirection.y !== 0) {
                let newX = this.player.gridPos.x + this.player.currentDirection.x;
                let newY = this.player.gridPos.y + this.player.currentDirection.y;
                if (this.isValidPosition(newX, newY)) {
                    this.player.moving = true;
                    this.targetPixelPos = {
                        x: newX * this.cellSize,
                        y: newY * this.cellSize
                    };
                    this.player.gridPos.x = newX;
                    this.player.gridPos.y = newY;
                } else {
                    this.player.currentDirection = { x: 0, y: 0 };
                }
            }
        } else {
            let dx = this.targetPixelPos.x - this.player.pixelPos.x;
            let dy = this.targetPixelPos.y - this.player.pixelPos.y;

            if (Math.abs(dx) <= this.player.moveSpeed && Math.abs(dy) <= this.player.moveSpeed) {
                this.player.pixelPos.x = this.targetPixelPos.x;
                this.player.pixelPos.y = this.targetPixelPos.y;
                this.player.moving = false;
            } else {
                this.player.pixelPos.x += Math.sign(dx) * this.player.moveSpeed;
                this.player.pixelPos.y += Math.sign(dy) * this.player.moveSpeed;
            }
        }
    }

    changeLayer() {
        let nextLayer = (this.currentLayer + 1) % this.labyrinths.length;
        if (this.labyrinths[nextLayer].layout[this.player.gridPos.y][this.player.gridPos.x] !== 1 && this.labyrinths[nextLayer].layout[this.player.gridPos.y][this.player.gridPos.x] !== 4) {
            this.currentLayer = nextLayer;
            this.showRules();
        }
    }

    killPlayer() {
        this.player.moving = false;
        this.player.currentDirection = { x: 0, y: 0 };
        this.gameOver = true;

        const rulesDiv = document.getElementById('rules');
        const scoreDiv = document.getElementById('score');
        const canvas = this.canvas;
        let gameOverModal = document.getElementById("gameOverModal");
        let deathMessageText = document.getElementById("deathMessageText");
        const finalScoreText = document.getElementById('finalScoreText');
        const resetButton = document.getElementById('resetButton');
        let resetEasy = document.getElementById("resetEasy");
        let resetMedium = document.getElementById("resetMedium");
        let resetHard = document.getElementById("resetHard");

        if (this.currentLayer === 0) {
            deathMessageText.textContent = "💀 A ghost spooked you! 💀";
        }
        else if (this.currentLayer === 1) {
            deathMessageText.textContent = "💀 You plunged into lava! 💀";
        }
        else {
            deathMessageText.textContent = "💀 An ice spike skewered you! 💀";
        }
        rulesDiv.style.color = "red";

        finalScoreText.textContent = `Final Score: ${scoreDiv.textContent.replace("Score: ", "")}`;
        canvas.style.display = "none";
        gameOverModal.style.display = "flex";
        gameOverModal.style.zIndex = "1000";

        resetButton.onclick = () => {
            gameOverModal.style.display = "none";
            rulesDiv.style.color = "#eee";
            canvas.style.display = "block";
            scoreDiv.textContent = "";
            startGame(this.difficulty);
        };
        resetEasy.onclick = () => {
            gameOverModal.style.display = "none";
            rulesDiv.style.color = "#eee";
            canvas.style.display = "block";
            scoreDiv.textContent = "";
            startGame("easy");
        };
        resetMedium.onclick = () => {
            gameOverModal.style.display = "none";
            rulesDiv.style.color = "#eee";
            canvas.style.display = "block";
            scoreDiv.textContent = "";
            startGame("medium");
        };
        resetHard.onclick = () => {
            gameOverModal.style.display = "none";
            rulesDiv.style.color = "#eee";
            canvas.style.display = "block";
            scoreDiv.textContent = "";
            startGame("hard");
        };
    }

    finishGame() {
        this.player.moving = false;
        this.player.currentDirection = { x: 0, y: 0 };
        this.gameOver = true;
        
        let gameWinModal = document.getElementById("gameWinModal");
        let playAgain = document.getElementById("playAgain");

        let winEasy = document.getElementById("winEasy");
        let winMedium = document.getElementById("winMedium");
        let winHard = document.getElementById("winHard");

        const rulesDiv = document.getElementById('rules');
        const scoreDiv = document.getElementById('score');
        const canvas = this.canvas;

        gameWinModal.style.display = "flex";
        gameWinModal.style.zIndex = "1000";

        playAgain.onclick = () => {
            gameWinModal.style.display = "none";
            rulesDiv.style.color = "#eee";
            canvas.style.display = "block";
            scoreDiv.textContent = "";
            startGame(this.difficulty);
        };
        winEasy.onclick = () => {
            gameWinModal.style.display = "none";
            rulesDiv.style.color = "#eee";
            canvas.style.display = "block";
            scoreDiv.textContent = "";
            startGame("easy");
        };
        winMedium.onclick = () => {
            gameWinModal.style.display = "none";
            rulesDiv.style.color = "#eee";
            canvas.style.display = "block";
            scoreDiv.textContent = "";
            startGame("medium");
        };
        winHard.onclick = () => {
            gameWinModal.style.display = "none";
            rulesDiv.style.color = "#eee";
            canvas.style.display = "block";
            scoreDiv.textContent = "";
            startGame("hard");
        };
    }

    gameLoop() {
        if (!this.gameOver) {
            if (this.labyrinths[this.currentLayer].layout[this.player.gridPos.y][this.player.gridPos.x] === 2 || this.labyrinths[this.currentLayer].layout[this.player.gridPos.y][this.player.gridPos.x] === 5) {
                this.killPlayer();
            }
            this.updatePlayerDirection();
            this.labyrinths[this.currentLayer].drawLabyrinth();
            this.drawPlayer();
            this.calculateScore();
            if (this.score === this.maxScore) {
                this.finishGame();
            }
            this.animationFrameId = requestAnimationFrame(() => this.gameLoop());
        }
    }
}

/*
Labyrinth states:
0 - road with coin
1 - wall
2 - road with coin and enemy
3 - road
4 - wall with enemy
5 - road with enemy
*/

class Labyrinth {
    constructor(canvas, context, rows, columns, cellSize, layout, player) {
        this.canvas = canvas;
        this.context = context;
        this.rows = rows;
        this.columns = columns;
        this.cellSize = cellSize;
        this.layout = layout;
        this.player = player;
        this.score = 0;
    }

    isWall(x, y) {
        if (this.layout[y][x] === 1 || this.layout[y][x] === 4) {
            return true;
        }
        else {
            return false;
        }
    }
    
    generateCoins() {
        this.context.fillStyle = "gold";
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.columns; x++) {
                if (this.layout[y][x] === 0 || this.layout[y][x] === 2) {
                    let centerX = x * this.cellSize + this.cellSize / 2;
                    let centerY = y * this.cellSize + this.cellSize / 2;
                    let radius = this.cellSize / 6;
                    this.context.beginPath();
                    this.context.arc(centerX, centerY, radius, 0, Math.PI * 2);
                    this.context.fill();
                    this.coinsGenerated = true;
                }
            }
        }
    }

    pickupCoin() {
        if (this.layout[this.player.gridPos.y][this.player.gridPos.x] === 0) {
            this.layout[this.player.gridPos.y][this.player.gridPos.x] = 3;
            this.score += 10;
        }
    }

    resetScore() {
        this.score = 0;
    }

}

class ClassicLevel extends Labyrinth{
    constructor(canvas, context, rows, columns, cellSize, player, difficulty) {
        let layout = [
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
            [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1],
            [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1],
            [1,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,1],
            [1,0,1,1,1,0,1,1,1,0,1,0,1,1,1,0,1,1,1,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,1,1,1,0,1,1,1,0,1,0,1,1,1,0,1,1,1,0,1],
            [1,0,1,0,0,0,0,0,0,0,3,0,0,0,0,0,0,0,1,0,1],
            [1,0,1,0,1,1,1,0,1,1,1,1,1,0,1,1,1,0,1,0,1],
            [1,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,1],
            [1,1,1,0,1,0,1,1,1,0,1,0,1,1,1,0,1,0,1,1,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
        ];
        super(canvas, context, rows, columns, cellSize, layout, player);
        this.ghostsGenerated = false;
        this.difficulty = difficulty;
    }

    drawLabyrinth() {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (!this.ghostsGenerated) {
            this.generateGhosts();
            this.ghostsGenerated = true;
        }
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.columns; x++) {
                if (this.layout[y][x] === 1) {
                    this.context.fillStyle = "#2e7d32";
                    this.context.fillRect(x * this.cellSize, y * this.cellSize, this.cellSize, this.cellSize);
                } 
                else {
                    this.context.fillStyle = "#a5d6a7";
                    this.context.fillRect(x * this.cellSize, y * this.cellSize, this.cellSize, this.cellSize);
                }
            }
        }
        this.pickupCoin();
        this.generateCoins();
        this.updateGhosts();
        for (let ghost of this.ghosts) {
            this.drawGhost(ghost);
        }
    }

    generateGhosts() {
        if (this.difficulty === "easy") {
            this.ghosts = [
                new Ghost(1, 1, 1 * this.cellSize, 1 * this.cellSize, this.difficulty),
                new Ghost(19, 13, 19 * this.cellSize, 13 * this.cellSize, this.difficulty),
            ];
        }
        else {
            this.ghosts = [
                new Ghost(1, 1, 1 * this.cellSize, 1 * this.cellSize, this.difficulty),
                new Ghost(1, 13, 1 * this.cellSize, 13 * this.cellSize, this.difficulty),
                new Ghost(19, 1, 19 * this.cellSize, 1 * this.cellSize, this.difficulty),
                new Ghost(19, 13, 19 * this.cellSize, 13 * this.cellSize, this.difficulty),
            ];
        }
    }

    updateGhosts() {
        for (let ghost of this.ghosts) {
            if (this.layout[ghost.gridY] && this.layout[ghost.gridY][ghost.gridX] === 2) {
                this.layout[ghost.gridY][ghost.gridX] = 0;
            }
            else if (this.layout[ghost.gridY] && this.layout[ghost.gridY][ghost.gridX] === 5) {
                this.layout[ghost.gridY][ghost.gridX] = 3;
            }

            if (!ghost.moving) {
                ghost.path = this.getPath(ghost.gridX, ghost.gridY, this.player.gridPos.x, this.player.gridPos.y);
                ghost.pathIndex = 1;
                if (!ghost.path || ghost.path.length <= 1) {
                    continue;
                }

                let nextStepFound = false;
                while (ghost.pathIndex < ghost.path.length) {
                    let next = ghost.path[ghost.pathIndex];
                    let occupied = false;
                    if (this.layout[ghost.path[ghost.pathIndex].y][ghost.path[ghost.pathIndex].x] == 2 || this.layout[ghost.path[ghost.pathIndex].y][ghost.path[ghost.pathIndex].x] == 5) {
                        occupied = true;
                    }
                    if (!occupied) {
                        ghost.targetGridX = next.x;
                        ghost.targetGridY = next.y;
                        ghost.targetPixelX = next.x * this.cellSize;
                        ghost.targetPixelY = next.y * this.cellSize;
                        ghost.moving = true;
                        nextStepFound = true;
                        break;
                    }
                    ghost.pathIndex++;
                }
                if (!nextStepFound) {
                    ghost.moving = false;
                }
            }

            if (ghost.moving && !(this.layout[ghost.targetGridY][ghost.targetGridX] === 2 || this.layout[ghost.targetGridY][ghost.targetGridX] === 5)) {
                let dx = ghost.targetPixelX - ghost.pixelX;
                if (Math.abs(dx) <= ghost.speed) {
                    ghost.pixelX = ghost.targetPixelX;
                } else {
                    ghost.pixelX += Math.sign(dx) * ghost.speed;
                }

                let dy = ghost.targetPixelY - ghost.pixelY;
                if (Math.abs(dy) <= ghost.speed) {
                    ghost.pixelY = ghost.targetPixelY;
                } else {
                    ghost.pixelY += Math.sign(dy) * ghost.speed;
                }

                if (ghost.pixelX === ghost.targetPixelX && ghost.pixelY === ghost.targetPixelY) {
                    ghost.gridX = ghost.targetPixelX / this.cellSize;
                    ghost.gridY = ghost.targetPixelY / this.cellSize;

                    ghost.moving = false;
                    ghost.pathIndex++;
                    if (ghost.pathIndex >= ghost.path.length) {
                        ghost.pathIndex = ghost.path.length - 1;
                    }
                }
            }

            if (this.layout[ghost.gridY] && this.layout[ghost.gridY][ghost.gridX] === 0) {
                this.layout[ghost.gridY][ghost.gridX] = 2;
            }
            else if (this.layout[ghost.gridY] && this.layout[ghost.gridY][ghost.gridX] === 3) {
                this.layout[ghost.gridY][ghost.gridX] = 5;
            }
        }
    }

    getPath(startX, startY, targetX, targetY) {
        let queue = [];
        let visited = new Set();
        let predecessor = new Map();

        const key = (x, y) => `${x},${y}`;

        let actions = [
            {dx: 0, dy: -1},
            {dx: 1, dy: 0},
            {dx: 0, dy: 1},
            {dx: -1, dy: 0},
        ];

        queue.push({x: startX, y: startY});
        visited.add(key(startX, startY));
        while (queue.length > 0) {
            let current = queue.shift();
            if (current.x === targetX && current.y === targetY) {
                let path = [];
                let crawl = key(current.x, current.y);
                while (crawl !== key(startX, startY)) {
                    let [cx, cy] = crawl.split(',').map(Number);
                    path.push({x: cx, y: cy});
                    crawl = predecessor.get(crawl);
                }
                path.push({x: startX, y: startY});
                path.reverse();
                return path;
            }
            for (let action of actions) {
                let nextX = current.x + action.dx;
                let nextY = current.y + action.dy;
                if (nextY >= 0 && nextY < this.layout.length && nextX >= 0 && nextX < this.layout[0].length && (this.layout[nextY][nextX] === 0 || this.layout[nextY][nextX] === 2 || this.layout[nextY][nextX] === 3) && !visited.has(key(nextX, nextY))) {
                    queue.push({x: nextX, y: nextY});
                    visited.add(key(nextX, nextY));
                    predecessor.set(key(nextX, nextY), key(current.x, current.y));
                }
            }
        }
        return null;
    }

    drawGhost(ghost) {
        this.context.fillStyle = "#fff";
        this.context.beginPath();
        this.context.arc(
            ghost.pixelX + this.cellSize / 2,
            ghost.pixelY + this.cellSize / 2,
            this.cellSize / 2.5,
            0,
            Math.PI * 2
        );
        this.context.fill();
    }
}

class LavaLevel extends Labyrinth {
    constructor(canvas, context, rows, columns, cellSize, player, difficulty) {
        let layout = [
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], // 1
            [1,0,0,0,1,0,0,0,1,0,1,1,0,1,0,0,0,1,0,0,1], // 2
            [1,0,1,0,1,0,1,0,1,0,1,1,0,1,0,1,0,1,0,1,1], // 3
            [1,0,1,0,0,0,1,0,0,0,1,1,0,0,0,1,0,0,0,1,1], // 4
            [1,0,1,1,1,0,1,1,1,0,1,1,0,1,1,1,0,1,1,1,1], // 5
            [1,0,0,0,1,0,0,0,1,0,1,1,0,1,0,0,0,1,0,0,1], // 6
            [1,1,1,0,1,1,1,0,1,0,1,1,0,1,0,1,1,1,0,1,1], // 7
            [1,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,1], // 8 
            [1,1,1,0,1,1,1,0,1,0,1,1,0,1,0,1,1,1,0,1,1], // 9
            [1,0,0,0,1,0,0,0,1,0,1,1,0,1,0,0,0,1,0,0,1], // 10
            [1,0,1,1,1,0,1,1,1,0,1,1,0,1,1,1,0,1,1,1,1], // 11
            [1,0,1,0,0,0,1,0,0,0,1,1,0,0,0,1,0,0,0,1,1], // 12
            [1,0,1,0,1,0,1,0,1,0,1,1,0,1,0,1,0,1,0,1,1], // 13
            [1,0,0,0,1,0,0,0,1,0,1,1,0,1,0,0,0,1,0,0,1], // 14
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]  // 15
        ];
        super(canvas, context, rows, columns, cellSize, layout, player);
        this.difficulty = difficulty;
        this.frame = 0;
        this.crackFrame = 100;
    }

    drawLabyrinth() {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        let phaseDuration = Math.floor(this.crackFrame / 3);
        if (this.frame === this.crackFrame) {
            this.removeLavaHoles();
            this.generateLavaHoles();
            this.generateCracks();
            this.frame = 0;
        } 
        else {
            this.frame++;
            if (this.cracks) {
                for (let crack of this.cracks) {
                    if (this.frame % phaseDuration === 0 && crack.stage < 2) {
                        crack.stage++;
                    }
                }
            }
        }
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.columns; x++) {
                if (this.layout[y][x] === 1) {
                    this.context.fillStyle = "#b71c1c";
                    this.context.fillRect(x * this.cellSize, y * this.cellSize, this.cellSize, this.cellSize);
                }
                else if (this.layout[y][x] === 2 || this.layout[y][x] === 5) {
                    this.context.fillStyle = "#dd571c";
                    this.context.fillRect(x * this.cellSize, y * this.cellSize, this.cellSize, this.cellSize);
                }
                else {
                    this.context.fillStyle = "#222";
                    this.context.fillRect(x * this.cellSize, y * this.cellSize, this.cellSize, this.cellSize);
                    if (this.cracks) {
                        let crack = this.cracks.find(c => c.x === x && c.y === y);
                        if (crack) {
                            this.context.strokeStyle = "#dd571c";
                            this.context.lineWidth = crack.stage + 1;
                            this.context.beginPath();
                            let offset = (2 - crack.stage) * 2;
                            this.context.moveTo(x * this.cellSize + offset, y * this.cellSize + offset);
                            this.context.lineTo((x + 1) * this.cellSize - offset, (y + 1) * this.cellSize - offset);
                            this.context.moveTo((x + 1) * this.cellSize - offset, y * this.cellSize + offset);
                            this.context.lineTo(x * this.cellSize + offset, (y + 1) * this.cellSize - offset);
                            this.context.stroke();
                        }
                    }
                }
            }
        }
        this.pickupCoin();
        this.generateCoins();
    }

    generateCracks() {
        this.cracks = [];
        let available = [];
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.columns; x++) {
                if (this.layout[y][x] === 0 || this.layout[y][x] === 3) {
                    available.push({x, y, stage: 0});
                }
            }
        }
        for (let i = available.length - 1; i > 0; i--) {
            let j = Math.floor(Math.random() * (i + 1));
            [available[i], available[j]] = [available[j], available[i]];
        }
        switch (this.difficulty) {
            case "easy": this.cracks = available.slice(0, 10); break;
            case "medium": this.cracks = available.slice(0, 15); break;
            case "hard": this.cracks = available.slice(0, 20); break;
        }
    }

    generateLavaHoles() {
        if (!this.cracks) {
            return;
        }
        for (let crack of this.cracks) {
            if (this.layout[crack.y][crack.x] === 0) {
                this.layout[crack.y][crack.x] = 2;
            }
            else {
                this.layout[crack.y][crack.x] = 5;
            }
            
        }
        this.cracks = [];
    }

    removeLavaHoles() {
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.columns; x++) {
                if (this.layout[y][x] === 2) {
                    this.layout[y][x] = 0;
                }
                else if (this.layout[y][x] === 5) {
                    this.layout[y][x] = 3;
                }
            }
        }
    }

}

class IceLevel extends Labyrinth{
    constructor(canvas, context, rows, columns, cellSize, player, difficulty) {
        let layout = [
            [1,4,1,1,1,4,1,1,1,1,1,4,1,1,1,1,1,1,1,4,1], // 1
            [4,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,4], // 2
            [1,0,1,1,1,0,1,1,1,0,1,0,1,1,1,0,1,1,1,0,1], // 3
            [1,0,4,0,0,0,0,0,1,0,1,0,4,0,0,0,0,0,1,0,1], // 4
            [1,0,1,0,1,1,1,0,1,0,1,0,1,0,1,1,1,0,1,0,1], // 5
            [4,0,0,0,4,0,0,0,0,0,0,0,0,0,0,0,4,0,0,0,4], // 6
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], // 7
            [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4], // 8
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], // 9
            [1,0,0,0,4,0,0,0,0,0,0,0,0,0,0,0,4,0,0,0,1], // 10
            [1,0,1,0,1,1,1,0,1,0,1,0,1,0,1,1,1,0,1,0,1], // 11
            [1,0,4,0,0,0,0,0,1,0,1,0,1,0,0,0,0,0,1,0,1], // 12
            [1,0,1,1,1,0,1,1,1,0,1,0,1,1,1,0,1,1,1,0,1], // 13
            [4,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,4], // 14
            [1,4,1,1,1,1,1,1,1,4,1,4,1,1,1,4,1,1,1,4,1]  // 15
        ];
        super(canvas, context, rows, columns, cellSize, layout, player);
        this.difficulty = difficulty;
        this.frame = 0;
        this.wallSpikeFrame = 100;
        this.flyingSpikeFrame = 200;
        this.flyingSpikes = [];
        this.spikes = [];
    }

    drawLabyrinth() {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (this.frame === this.wallSpikeFrame) {
            this.generateWallIceSpikes();
            this.frame++;
        }
        else if (this.frame === this.flyingSpikeFrame && this.spikes.length > 0) {
            this.generateFlyingIceSpikes();
            this.spikes = [];
            this.frame = 0;
        }
        else {
            this.frame++;
        }
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.columns; x++) {
                if (this.layout[y][x] === 1) { //wall
                    this.context.fillStyle = "#003152";
                    this.context.fillRect(x * this.cellSize, y * this.cellSize, this.cellSize, this.cellSize);
                }
                else if (this.layout[y][x] === 4) { //ice spike wall
                    this.context.fillStyle = "#003152";
                    this.context.fillRect(x * this.cellSize, y * this.cellSize, this.cellSize, this.cellSize);
                    if (this.spikes && this.spikes.some(c => c.x === x && c.y === y)) {
                        let spike = this.spikes.find(s => s.x === x && s.y === y);
                        if (spike) {
                            let cx = x * this.cellSize;
                            let cy = y * this.cellSize;
                            this.context.fillStyle = "#e8eaf6";
                            this.context.beginPath();
                            switch(spike.direction) {
                                case "up":
                                    this.context.moveTo(cx + this.cellSize / 2, cy + this.cellSize * 0.2);
                                    this.context.lineTo(cx + this.cellSize * 0.2, cy + this.cellSize * 0.8);
                                    this.context.lineTo(cx + this.cellSize * 0.8, cy + this.cellSize * 0.8);
                                    break;
                                case "right":
                                    this.context.moveTo(cx + this.cellSize * 0.8, cy + this.cellSize / 2);
                                    this.context.lineTo(cx + this.cellSize * 0.2, cy + this.cellSize * 0.2);
                                    this.context.lineTo(cx + this.cellSize * 0.2, cy + this.cellSize * 0.8);
                                    break;
                                case "down":
                                    this.context.moveTo(cx + this.cellSize / 2, cy + this.cellSize * 0.8);
                                    this.context.lineTo(cx + this.cellSize * 0.2, cy + this.cellSize * 0.2);
                                    this.context.lineTo(cx + this.cellSize * 0.8, cy + this.cellSize * 0.2);
                                    break;
                                case "left":
                                    this.context.moveTo(cx + this.cellSize * 0.2, cy + this.cellSize / 2);
                                    this.context.lineTo(cx + this.cellSize * 0.8, cy + this.cellSize * 0.2);
                                    this.context.lineTo(cx + this.cellSize * 0.8, cy + this.cellSize * 0.8);
                                    break;
                                default:
                                    this.context.moveTo(cx + this.cellSize / 2, cy + this.cellSize * 0.2);
                                    this.context.lineTo(cx + this.cellSize * 0.2, cy + this.cellSize * 0.8);
                                    this.context.lineTo(cx + this.cellSize * 0.8, cy + this.cellSize * 0.8);
                            }
                            this.context.closePath();
                            this.context.fill();
                        }
                    }
                } 
                else { //road
                    this.context.fillStyle = "#57a0d3";
                    this.context.fillRect(x * this.cellSize, y * this.cellSize, this.cellSize, this.cellSize);
                }
            }
        }
        this.pickupCoin();
        this.generateCoins();
        this.updateFlyingIceSpikes();
        for (let spike of this.flyingSpikes) {
            this.drawSpike(spike);
        }
    }

    generateWallIceSpikes() {
        this.wallSpikes = [];
        let available = [];
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.columns; x++) {
                if (this.layout[y][x] === 4) {
                    let direction = " ";
                    if (y > 0 && (this.layout[y - 1][x] === 0 || this.layout[y - 1][x] === 3)) {
                        direction = "up";
                    }
                    else if (x < this.columns - 1 && (this.layout[y][x + 1] === 0 || this.layout[y][x + 1] === 3)) {
                        direction = "right";
                    }
                    else if (y < this.rows - 1 && (this.layout[y + 1][x] === 0 || this.layout[y + 1][x] === 3)) {
                        direction = "down";
                    }
                    else if (x > 0 && (this.layout[y][x - 1] === 0 || this.layout[y][x - 1] === 3)) {
                        direction = "left";
                    }
                    available.push({x, y, direction});
                }
            }
        }
        for (let i = available.length - 1; i > 0; i--) {
            let j = Math.floor(Math.random() * (i + 1));
            [available[i], available[j]] = [available[j], available[i]];
        }
        switch (this.difficulty) {
            case "easy": this.spikes = available.slice(0, 4); break;
            case "medium": this.spikes = available.slice(0, 6); break;
            case "hard": this.spikes = available.slice(0, 8); break;
        }
    }

    generateFlyingIceSpikes() {
        for (let spike of this.spikes) {
            let direction = spike.direction;
            let x = spike.x;
            let y = spike.y;
            switch (direction) {
                case "up":
                    y--;
                    break;
                case "right":
                    x++;
                    break;
                case "down":
                    y++;
                    break;
                case "left":
                    x--;
                    break;
            }
            this.flyingSpikes.push(new IceSpike(x, y, x * this.cellSize, y * this.cellSize, direction, this.difficulty));
        }
        this.wallSpikes = [];
    }

    updateFlyingIceSpikes() {
        for (let i = this.flyingSpikes.length - 1; i >= 0; i--) {
            let spike = this.flyingSpikes[i];
            if (this.layout[spike.gridY] && this.layout[spike.gridY][spike.gridX] === 2) {
                this.layout[spike.gridY][spike.gridX] = 0;
            }
            else if (this.layout[spike.gridY] && this.layout[spike.gridY][spike.gridX] === 5) {
                this.layout[spike.gridY][spike.gridX] = 3;
            }
            let nextX = spike.gridX;
            let nextY = spike.gridY;
            switch (spike.direction) {
                case "up": nextY -= 1; break;
                case "right": nextX += 1; break;
                case "down": nextY += 1; break;
                case "left": nextX -= 1; break;
            }
            if (nextX < 0 || nextX >= this.columns || nextY < 0 || nextY >= this.rows || this.layout[nextY][nextX] === 1 || this.layout[nextY][nextX] === 4) {
                this.flyingSpikes.splice(i, 1);
                continue;
            }
            switch (spike.direction) {
                case "up":
                    spike.pixelY -= spike.speed;
                    break;
                case "right":
                    spike.pixelX += spike.speed;
                    break;
                case "down":
                    spike.pixelY += spike.speed;
                    break;
                case "left":
                    spike.pixelX -= spike.speed;
                    break;
            }
            let newGridX = Math.floor(spike.pixelX / this.cellSize);
            let newGridY = Math.floor(spike.pixelY / this.cellSize);
            spike.gridX = newGridX;
            spike.gridY = newGridY;
            if (this.layout[newGridY] && this.layout[newGridY][newGridX] === 0) {
                this.layout[newGridY][newGridX] = 2;
            }
            else if (this.layout[newGridY] && this.layout[newGridY][newGridX] === 3) {
                this.layout[newGridY][newGridX] = 5;
            }
        }
    }

    drawSpike(spike) {
        const cx = spike.pixelX;
        const cy = spike.pixelY;
        this.context.fillStyle = "#e8eaf6";
        this.context.beginPath();
        switch(spike.direction) {
            case "up":
                this.context.moveTo(cx + this.cellSize / 2, cy + this.cellSize * 0.2);
                this.context.lineTo(cx + this.cellSize * 0.2, cy + this.cellSize * 0.8);
                this.context.lineTo(cx + this.cellSize * 0.8, cy + this.cellSize * 0.8);
                break;
            case "right":
                this.context.moveTo(cx + this.cellSize * 0.8, cy + this.cellSize / 2);
                this.context.lineTo(cx + this.cellSize * 0.2, cy + this.cellSize * 0.2);
                this.context.lineTo(cx + this.cellSize * 0.2, cy + this.cellSize * 0.8);
                break;
            case "down":
                this.context.moveTo(cx + this.cellSize / 2, cy + this.cellSize * 0.8);
                this.context.lineTo(cx + this.cellSize * 0.2, cy + this.cellSize * 0.2);
                this.context.lineTo(cx + this.cellSize * 0.8, cy + this.cellSize * 0.2);
                break;
            case "left":
                this.context.moveTo(cx + this.cellSize * 0.2, cy + this.cellSize / 2);
                this.context.lineTo(cx + this.cellSize * 0.8, cy + this.cellSize * 0.2);
                this.context.lineTo(cx + this.cellSize * 0.8, cy + this.cellSize * 0.8);
                break;
        }
        this.context.closePath();
        this.context.fill();
    }
}

class Player {
    constructor(canvas, context, rows, columns, cellSize) {
        this.canvas = canvas;
        this.context = context;
        this.rows = rows;
        this.columns = columns;
        this.cellSize = cellSize;
        this.gridPos = {x: 10, y: 7};
        this.pixelPos = {x: this.gridPos.x * this.cellSize, y: this.gridPos.y * this.cellSize};
        this.moving = false;
        this.moveSpeed = 2;
        this.currentDirection = {x: 0, y: 0};
        this.nextDirection = {x: 0, y: 0};
        this.color = "#ffff00";
    }

}

class IceSpike {
    constructor(gridX, gridY, pixelX, pixelY, direction, difficulty) {
        this.gridX = gridX;
        this.gridY = gridY;
        this.pixelX = pixelX;
        this.pixelY = pixelY;
        this.direction = direction;
        switch (difficulty) {
            case "easy": this.speed = 4; break;
            case "medium": this.speed = 6; break;
            case "hard": this.speed = 8; break;
        }
    }
}

class Ghost {
    constructor(gridX, gridY, pixelX, pixelY, difficulty) {
        this.gridX = gridX;
        this.gridY = gridY;
        this.pixelX = pixelX;
        this.pixelY = pixelY;
        switch (difficulty) {
            case "easy": this.speed = 1; break;
            case "medium": this.speed = 1; break;
            case "hard": this.speed = 2; break;
        }
        this.path = [];
        this.moving = false;
        this.path = [];
    }
}