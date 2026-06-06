document.addEventListener("keydown",(event)=>{

    if(event.repeat) return;

    const key = event.key.toLowerCase();
    const colorIndex = COLOR_KEYS.indexOf(key);

    if(colorIndex >= 0 && running && isColorActive(colorIndex)){

        event.preventDefault();
        shoot(COLORS[colorIndex]);
    }

    if(!running && (key === "enter" || key === " ")){

        if(menuEl.style.display !== "none"){

            event.preventDefault();
            startGame("basic");
        }else if(gameOverEl.style.display !== "none"){

            event.preventDefault();
            restartGame("basic");
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

function getDifficultyConfig(difficultyKey){

    return DIFFICULTY_SETTINGS[difficultyKey] || DIFFICULTY_SETTINGS.basic;
}

function getScaledSpawnRateStep(){

    return SPAWN_RATE_STEP * currentDifficulty.spawnRateStepMultiplier;
}

function getScaledFallSpeedStep(){

    return FALL_SPEED_STEP * currentDifficulty.fallSpeedStepMultiplier;
}

function spawnDot(){

    const colorPool =
        COLORS.slice(0, availableColors);
    const colorIndex =
        Math.floor(
            Math.random()*colorPool.length
        );

    const color =
        colorPool[colorIndex];

    revealColor(colorIndex);

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

    if(!currentDifficulty.progressionEnabled){

        availableColors = currentDifficulty.maxColors;
        level = availableColors;

        if(old !== availableColors){
            updateButtons();
        }

        return;
    }

    availableColors = COLOR_UNLOCKS.reduce((unlocked,threshold)=>{

        return score >= threshold.score ? threshold.colors : unlocked;

    },currentDifficulty.startColors);

    availableColors = Math.min(currentDifficulty.maxColors,availableColors);

    level = availableColors;

    if(old !== availableColors){
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

            spawnRate = Math.max(MIN_SPAWN_RATE,spawnRate - getScaledSpawnRateStep());
        }

        fallSpeed += getScaledFallSpeedStep();
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

function startGame(difficultyKey = "basic"){

    menuEl.style.display = "none";
    gameOverEl.style.display = "none";

    resetGame(difficultyKey);

    beginRun();
}

function restartGame(difficultyKey = "basic"){

    gameOverEl.style.display = "none";

    resetGame(difficultyKey);

    beginRun();
}

function resetGame(difficultyKey = currentDifficulty.key){

    currentDifficulty = getDifficultyConfig(difficultyKey);

    dots.forEach(d=>d.el.remove());
    projectiles.forEach(p=>p.el.remove());

    dots = [];
    projectiles = [];

    score = 0;
    combo = 0;
    level = currentDifficulty.startColors;

    availableColors = currentDifficulty.startColors;
    revealedColors = currentDifficulty.revealedColors;

    spawnRate = BASE_SPAWN_RATE * currentDifficulty.spawnRateMultiplier;
    fallSpeed = BASE_FALL_SPEED * currentDifficulty.fallSpeedMultiplier;
    spawnTimer = 0;
    lastTime = 0;
    lastWarningTime = -Infinity;

    updateDifficulty();
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
    DIFFICULTY_SETTINGS,
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
            revealedColors,
            currentDifficulty: currentDifficulty.key,
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
