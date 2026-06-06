const game = document.getElementById("game");
const lane = document.getElementById("lane");
const controls = document.getElementById("controls");

const scoreEl = document.getElementById("score");
const comboEl = document.getElementById("combo");
const levelEl = document.getElementById("level");
const bestEl = document.getElementById("best");

const menuEl = document.getElementById("menu");

const gameOverEl = document.getElementById("gameOver");
const finalScoreEl = document.getElementById("finalScore");
const highScoreEl = document.getElementById("highScore");

let dots = [];
let projectiles = [];

let score = 0;
let combo = 0;
let level = 1;

let running = false;
let rafId = null;

let spawnTimer = 0;

let spawnRate = BASE_SPAWN_RATE;
let fallSpeed = BASE_FALL_SPEED;

let availableColors = 1;
let revealedColors = 1;

let lastTime = 0;
let lastWarningTime = -Infinity;
let highScore = loadHighScore();

const buttons = [];

COLORS.forEach((color,index)=>{

    const btn = document.createElement("button");

    btn.className = "colorBtn";
    btn.type = "button";
    btn.dataset.colorIndex = String(index);
    btn.setAttribute("aria-label", `Shoot color ${index + 1} with key ${COLOR_KEYS[index]}`);

    btn.style.background = color;
    btn.innerHTML = `<span class="colorKey">${COLOR_KEYS[index]}</span>`;

    btn.onclick = ()=>{

        if(running && isColorActive(index)){

            shoot(color);
        }
    };

    controls.appendChild(btn);

    buttons.push(btn);

    if(index > 0){
        btn.style.display = "none";
    }
});

for(let i=0;i<80;i++){

    const s = document.createElement("div");

    s.className = "star";

    const size = Math.random()*3+1;

    s.style.width = size + "px";
    s.style.height = size + "px";

    s.style.left = Math.random()*100 + "%";
    s.style.top = Math.random()*100 + "%";

    s.style.animationDelay = Math.random()*3 + "s";

    document.body.appendChild(s);
}

function loadHighScore(){

    try{

        const saved = localStorage.getItem(STORAGE_KEY);
        const parsed = Number.parseInt(saved,10);

        return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;

    }catch(error){

        return 0;
    }
}

function saveHighScore(value){

    highScore = Math.max(highScore,value);

    try{

        localStorage.setItem(STORAGE_KEY,String(highScore));

    }catch(error){

    }
}

function updateButtons(){

    buttons.forEach((btn,index)=>{

        const isActive = index < availableColors && index < revealedColors;
        const isRevealed = index < revealedColors;

        btn.disabled = !isActive;
        btn.style.display = isRevealed ? "" : "none";

        if(isRevealed){

            btn.setAttribute("aria-disabled", isActive ? "false" : "true");

            if(btn.animate && btn.dataset.justShown !== "true"){
                btn.dataset.justShown = "true";
                btn.animate([
                    {
                        transform:"scale(0.4)",
                        opacity:0
                    },
                    {
                        transform:"scale(1)",
                        opacity:1
                    }
                ],{
                    duration:300,
                    easing:"ease-out"
                });
            }

        }else{

            btn.setAttribute("aria-disabled", isActive ? "false" : "true");
            delete btn.dataset.justShown;
        }
    });
}

function revealColor(index){

    const nextVisible = index + 1;

    if(nextVisible > revealedColors){

        revealedColors = nextVisible;
        
        if(nextVisible > 1){
            comboPopup("NEW COLOR");
        }

        updateButtons();
    }
}

function isColorActive(index){

    return index < availableColors && index < revealedColors;
}

function updateHUD(){

    scoreEl.textContent = score;
    comboEl.textContent = combo;
    levelEl.textContent = level;
    bestEl.textContent = highScore;
}

function comboPopup(text){

    const el = document.createElement("div");

    el.className = "comboText";

    el.innerText = text;

    document.body.appendChild(el);

    setTimeout(()=>{
        el.remove();
    },900);
}
