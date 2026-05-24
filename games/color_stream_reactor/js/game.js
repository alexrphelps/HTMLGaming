document.addEventListener("keydown",(event)=>{

    if(event.repeat) return;

    const key = event.key.toLowerCase();
    const colorIndex = COLOR_KEYS.indexOf(key);

    if(colorIndex >= 0 && running && colorIndex < availableColors){

        event.preventDefault();
        shoot(COLORS[colorIndex]);
    }

    if(!running && (key === "enter" || key === " ")){

        if(menuEl.style.display !== "none"){

            event.preventDefault();
            startGame();
        }
    }
});

game.addEventListener("animationend",(event)=>{

    if(event.animationName === "dangerFlash"){

        game.classList.remove("warning");
    }
});

function perspectiveScale(y){

    return 0.35 + (y / window.innerHeight) * 1.7;
}

function spawnDot(){

    const colorPool =
        COLORS.slice(0, availableColors);

    const color =
        colorPool[
            Math.floor(
                Math.random()*colorPool.length
            )
        ];

    const el = document.createElement("div");

    el.className = "dot";

    el.style.background = color;
    el.style.color = color;

    lane.appendChild(el);

    dots.push({
        el,
        color,
        y:-40
    });
}

function shoot(color){

    const el = document.createElement("div");

    el.className = "projectile";

    el.style.background = color;
    el.style.color = color;

    lane.appendChild(el);

    projectiles.push({

        el,
        color,
        y:window.innerHeight - 120
    });
}

function updateDifficulty(){

    const old = availableColors;

    availableColors = COLOR_UNLOCKS.reduce((unlocked,threshold)=>{

        return score >= threshold.score ? threshold.colors : unlocked;

    },1);

    level = availableColors;

    if(old !== availableColors){

        comboPopup("NEW COLOR");

        updateButtons();
    }
}

function gameOver(){

    running = false;
    stopLoop();
    saveHighScore(score);
    updateHUD();

    finalScoreEl.textContent =
        "FINAL SCORE: " + score;
    highScoreEl.textContent =
        "BEST SCORE: " + highScore;

    gameOverEl.style.display = "flex";
}

function gameLoop(timestamp){

    if(!running) return;

    const delta = lastTime ? Math.min(timestamp - lastTime,MAX_DELTA) : 0;
    const deltaSeconds = delta / 1000;

    lastTime = timestamp;

    spawnTimer += delta;

    if(spawnTimer >= spawnRate){

        spawnTimer = 0;

        spawnDot();

        if(spawnRate > MIN_SPAWN_RATE){

            spawnRate = Math.max(MIN_SPAWN_RATE,spawnRate - SPAWN_RATE_STEP);
        }

        fallSpeed += FALL_SPEED_STEP;
    }

    for(let i=dots.length-1;i>=0;i--){

        const d = dots[i];

        const wobble =
            Math.sin(d.y * 0.03) * 18;

        d.y += fallSpeed * deltaSeconds;

        const scale = perspectiveScale(d.y);

        const size = 24 + scale * 42;

        d.el.style.width = size + "px";
        d.el.style.height = size + "px";

        d.el.style.top = d.y + "px";

        d.el.style.left =
            `calc(50% + ${wobble}px)`;

        if(d.y > window.innerHeight - 240 && timestamp - lastWarningTime >= WARNING_INTERVAL){

            lastWarningTime = timestamp;
            game.classList.add("warning");
        }

        if(d.y > window.innerHeight - 110){

            gameOver();

            return;
        }
    }

    for(let i=projectiles.length-1;i>=0;i--){

        const p = projectiles[i];

        p.y -= PROJECTILE_SPEED * deltaSeconds;

        const scale = perspectiveScale(p.y);

        const size = 12 + scale * 18;

        p.el.style.width = size + "px";
        p.el.style.height = size + "px";

        p.el.style.top = p.y + "px";

        if(p.y < -50){

            p.el.remove();

            projectiles.splice(i,1);
        }
    }

    if(dots.length > 0){

        const front = dots[0];

        for(let i=projectiles.length-1;i>=0;i--){

            const p = projectiles[i];

            const dist =
                Math.abs(p.y - front.y);

            if(dist < 45){

                if(p.color === front.color){

                    combo++;

                    if(combo >= 5){

                        comboPopup(combo + "x COMBO");
                    }

                    score += 1 + Math.floor(combo / 5);

                    updateDifficulty();
                    updateHUD();

                    front.el.remove();

                    dots.shift();

                }else{

                    combo = 0;

                    updateHUD();
                }

                p.el.remove();

                projectiles.splice(i,1);

                break;
            }
        }
    }

    rafId = requestAnimationFrame(gameLoop);
}

function startGame(){

    menuEl.style.display = "none";

    resetGame();

    beginRun();
}

function restartGame(){

    gameOverEl.style.display = "none";

    resetGame();

    beginRun();
}

function resetGame(){

    dots.forEach(d=>d.el.remove());
    projectiles.forEach(p=>p.el.remove());

    dots = [];
    projectiles = [];

    score = 0;
    combo = 0;
    level = 1;

    availableColors = 1;

    spawnRate = BASE_SPAWN_RATE;
    fallSpeed = BASE_FALL_SPEED;
    spawnTimer = 0;
    lastTime = 0;
    lastWarningTime = -Infinity;

    updateButtons();
    updateHUD();
}

function beginRun(){

    stopLoop();

    running = true;

    rafId = requestAnimationFrame(gameLoop);
}

function stopLoop(){

    if(rafId !== null){

        cancelAnimationFrame(rafId);
        rafId = null;
    }
}

updateButtons();
updateHUD();

window.ColorStreamReactor = {
    COLORS,
    COLOR_KEYS,
    COLOR_UNLOCKS,
    startGame,
    restartGame,
    resetGame,
    shoot,
    spawnDot,
    gameLoop,
    getState(){
        return {
            dots,
            projectiles,
            score,
            combo,
            level,
            running,
            spawnTimer,
            spawnRate,
            fallSpeed,
            availableColors,
            lastTime,
            highScore,
            rafId
        };
    },
    setScore(value){
        score = value;
        updateDifficulty();
        updateHUD();
    }
};
