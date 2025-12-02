// --- CONFIG (Players -> [Round1, Round2, ...]) ---
// რამდენი კაცი მიდის მისიაზე თითოეულ რაუნდში
const missionConfig = {
    3: [2, 2, 2, 2, 2],
    4: [2, 2, 2, 2, 2],
    5: [2, 3, 2, 3, 3],
    6: [2, 3, 4, 3, 4],
    7: [2, 3, 3, 4, 4], // 7+
    8: [3, 4, 4, 5, 5],
    9: [3, 4, 4, 5, 5],
    10: [3, 4, 4, 5, 5]
};

// --- STATE ---
let players = [];
let roles = []; // "Agent", "Traitor"
let currentLeaderIndex = 0;
let currentRound = 0;
let missionResults = []; // true = success, false = fail
let traitorCount = 1;
let selectedTeam = [];
let currentActionIndex = 0;
let currentMissionVotes = []; // "success", "fail"

// --- INIT ---
window.onload = function() {
    createParticles();
    loadPlayers();
    setTimeout(() => {
        document.getElementById('loadingScreen').style.display = 'none';
        document.getElementById('readyScreen').style.display = 'flex';
    }, 1500);
};

// --- NAV ---
function showMainPage() {
    document.getElementById('readyScreen').style.display = 'none';
    document.getElementById('mainContent').style.display = 'flex';
    showSection('setupSection');
    document.getElementById('logoArea').style.display = 'block';
}

function showSection(id) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    
    if(id !== 'setupSection') document.getElementById('logoArea').style.display = 'none';
    else document.getElementById('logoArea').style.display = 'block';
}

// --- PLAYER MANAGE ---
function addPlayer() {
    const input = document.getElementById('playerName');
    const name = input.value.trim();
    if(name && !players.some(p => p.name === name)) {
        players.push({ name });
        input.value = '';
        updatePlayerList();
        savePlayers();
    }
}

function updatePlayerList() {
    const list = document.getElementById('playerList');
    list.innerHTML = '';
    players.forEach((p, i) => {
        list.innerHTML += `
            <div class="player-item">
                <span>${p.name}</span>
                <button onclick="removePlayer(${i})" style="background:none;border:none;color:var(--neon-red);cursor:pointer;">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    });
}

function removePlayer(i) { players.splice(i, 1); updatePlayerList(); savePlayers(); }
function savePlayers() { localStorage.setItem('traitorPlayers', JSON.stringify(players)); }
function loadPlayers() {
    const data = localStorage.getItem('traitorPlayers');
    if(data) { players = JSON.parse(data); updatePlayerList(); }
}

// --- GAME LOGIC ---
function startGame() {
    if(players.length < 3) { alert('მინიმუმ 3 მოთამაშე!'); return; }
    
    traitorCount = parseInt(document.getElementById('traitorCount').value);
    if(traitorCount >= players.length) { alert('მოღალატეები მეტია ვიდრე მოთამაშეები!'); return; }

    // Assign Roles
    roles = Array(players.length).fill("Agent");
    let indices = [...Array(players.length).keys()];
    for(let i=0; i<traitorCount; i++) {
        let rand = Math.floor(Math.random() * indices.length);
        roles[indices[rand]] = "Traitor";
        indices.splice(rand, 1);
    }

    currentRound = 0;
    missionResults = [];
    currentLeaderIndex = Math.floor(Math.random() * players.length);
    
    // Start Role Reveal
    currentActionIndex = 0; // reusing variable for reveal index
    showRoleReveal();
}

// 1. ROLE REVEAL
function showRoleReveal() {
    showSection('roleSection');
    const p = players[currentActionIndex];
    document.getElementById('rolePlayerName').textContent = p.name;
    
    const card = document.getElementById('roleCard');
    card.classList.remove('flipped');
    document.getElementById('roleCardFront').innerHTML = `<div class="role-icon"><i class="fas fa-fingerprint"></i></div><div class="role-text" style="font-size:1rem; margin-top:10px">დააჭირე ვინაობის გასაგებად</div>`;
    document.getElementById('nextRoleBtn').style.display = 'none';
}

function revealRole() {
    const card = document.getElementById('roleCard');
    card.classList.add('flipped');
    const back = document.getElementById('roleCardBack');
    const role = roles[currentActionIndex];
    
    if(role === "Traitor") {
        back.className = "role-card-back traitor-role";
        // Find other traitors
        let otherTraitors = [];
        roles.forEach((r, i) => {
            if(r === "Traitor" && i !== currentActionIndex) otherTraitors.push(players[i].name);
        });
        
        let partnerText = otherTraitors.length > 0 ? `მეწყვილეები: ${otherTraitors.join(", ")}` : "შენ მარტო ხარ.";
        
        back.innerHTML = `
            <div class="role-icon"><i class="fas fa-user-secret"></i></div>
            <div class="role-title">მოღალატე</div>
            <p class="role-desc">შენი მიზანია მისიები ჩავარდეს.<br>${partnerText}</p>
        `;
    } else {
        back.className = "role-card-back";
        back.innerHTML = `
            <div class="role-icon"><i class="fas fa-shield-alt"></i></div>
            <div class="role-title">აგენტი</div>
            <p class="role-desc">შენი მიზანია მისიები შესრულდეს.<br>არ ენდო არავის!</p>
        `;
    }
    document.getElementById('nextRoleBtn').style.display = 'block';
}

function nextRole() {
    currentActionIndex++;
    if(currentActionIndex >= players.length) {
        startPlanningPhase();
    } else {
        showRoleReveal();
    }
}

// 2. PLANNING PHASE
function startPlanningPhase() {
    showSection('planningSection');
    document.getElementById('roundNum').textContent = currentRound + 1;
    document.getElementById('leaderName').textContent = players[currentLeaderIndex].name;
    
    // Status Bar
    const statusDiv = document.getElementById('missionStatusBar');
    statusDiv.innerHTML = '';
    for(let i=0; i<5; i++) {
        let className = "status-dot";
        if(i < missionResults.length) {
            className += missionResults[i] ? " success" : " fail";
            statusDiv.innerHTML += `<div class="${className}"><i class="fas ${missionResults[i] ? 'fa-check' : 'fa-times'}"></i></div>`;
        } else if (i === currentRound) {
            className += " active";
            statusDiv.innerHTML += `<div class="${className}">${i+1}</div>`;
        } else {
            statusDiv.innerHTML += `<div class="${className}">${i+1}</div>`;
        }
    }

    // Config Team Size
    const pCount = players.length > 10 ? 10 : players.length;
    const sizeArr = missionConfig[pCount] || missionConfig[7];
    const needed = sizeArr[currentRound];
    document.getElementById('teamSize').textContent = needed;
    
    // Team Selector
    const grid = document.getElementById('teamSelectionGrid');
    grid.innerHTML = '';
    selectedTeam = [];
    document.getElementById('startMissionBtn').disabled = true;

    players.forEach((p, i) => {
        grid.innerHTML += `
            <div class="select-card" id="sel_p_${i}" onclick="toggleTeamSelect(${i})">
                ${p.name}
            </div>
        `;
    });
}

function toggleTeamSelect(index) {
    const card = document.getElementById(`sel_p_${index}`);
    const pCount = players.length > 10 ? 10 : players.length;
    const sizeArr = missionConfig[pCount] || missionConfig[7];
    const max = sizeArr[currentRound];

    if(selectedTeam.includes(index)) {
        selectedTeam = selectedTeam.filter(id => id !== index);
        card.classList.remove('selected');
    } else {
        if(selectedTeam.length < max) {
            selectedTeam.push(index);
            card.classList.add('selected');
        }
    }

    document.getElementById('startMissionBtn').disabled = (selectedTeam.length !== max);
}

function startMission() {
    currentActionIndex = 0;
    currentMissionVotes = [];
    showActionPhase();
}

// 3. ACTION PHASE
function showActionPhase() {
    showSection('actionSection');
    const pIndex = selectedTeam[currentActionIndex];
    const p = players[pIndex];
    
    document.getElementById('actionPlayerName').textContent = p.name;
    document.getElementById('passPhoneDisplay').style.display = 'block';
    document.getElementById('actionControls').style.display = 'none';
    
    // Set reminder text based on role (hidden initially)
    const role = roles[pIndex];
    const reminder = document.getElementById('roleReminderText');
    const sabBtn = document.getElementById('sabotageBtn');
    
    if(role === 'Traitor') {
        reminder.textContent = "შენ ხარ მოღალატე. შეგიძლია ჩააგდო მისია.";
        sabBtn.disabled = false;
        sabBtn.style.opacity = "1";
    } else {
        reminder.textContent = "შენ ხარ აგენტი. ვალდებული ხარ შეასრულო მისია.";
        sabBtn.disabled = true;
        sabBtn.style.opacity = "0.5";
    }
}

function showActionButtons() {
    document.getElementById('passPhoneDisplay').style.display = 'none';
    document.getElementById('actionControls').style.display = 'block';
}

function submitMissionAction(action) {
    // Agent trying to sabotage check (frontend only security)
    const pIndex = selectedTeam[currentActionIndex];
    if(roles[pIndex] === 'Agent' && action === 'fail') return; 

    currentMissionVotes.push(action);
    
    currentActionIndex++;
    if(currentActionIndex >= selectedTeam.length) {
        calcResult();
    } else {
        showActionPhase();
    }
}

// 4. RESULT
function calcResult() {
    showSection('resultSection');
    
    // Shuffle votes so order doesn't reveal identity
    currentMissionVotes.sort(() => Math.random() - 0.5);
    
    const failCount = currentMissionVotes.filter(v => v === 'fail').length;
    const isSuccess = failCount === 0;
    
    missionResults.push(isSuccess);
    
    // Visuals
    const title = document.getElementById('missionResultTitle');
    const cardsDiv = document.getElementById('missionCardsReveal');
    const log = document.getElementById('missionLogText');
    
    title.textContent = isSuccess ? "მისია შესრულდა!" : "მისია ჩავარდა!";
    title.className = isSuccess ? "result-title res-success" : "result-title res-fail";
    
    cardsDiv.innerHTML = '';
    currentMissionVotes.forEach((v, i) => {
        setTimeout(() => {
            const cls = v === 'success' ? 'card-success' : 'card-fail';
            const icon = v === 'success' ? 'fa-check' : 'fa-radiation';
            cardsDiv.innerHTML += `<div class="reveal-card ${cls}"><i class="fas ${icon}"></i></div>`;
        }, i * 300);
    });
    
    // Generate Text Log
    const names = selectedTeam.map(i => players[i].name).join(', ');
    log.innerHTML = `
        გუნდი: <b>${names}</b><br><br>
        შედეგი: <span style="color:${isSuccess?'var(--neon-blue)':'var(--neon-red)'}">
        ${currentMissionVotes.length - failCount} შესრულება, ${failCount} საბოტაჟი.
        </span>
    `;
    
    if(!isSuccess && navigator.vibrate) navigator.vibrate([500, 200, 500]);
}

function nextRound() {
    // Check Game Over
    const successes = missionResults.filter(r => r).length;
    const fails = missionResults.filter(r => !r).length;
    
    if(successes >= 3) {
        gameOver("Agents");
    } else if (fails >= 3) {
        gameOver("Traitors");
    } else {
        // Rotate Leader
        currentLeaderIndex = (currentLeaderIndex + 1) % players.length;
        currentRound++;
        startPlanningPhase();
    }
}

// 5. GAME OVER
function gameOver(winner) {
    showSection('gameOverSection');
    const title = document.getElementById('finalResultTitle');
    const trophy = document.getElementById('finalTrophy');
    
    if(winner === "Agents") {
        title.textContent = "აგენტებმა გაიმარჯვეს!";
        title.style.color = "var(--neon-blue)";
        trophy.style.color = "var(--neon-blue)";
    } else {
        title.textContent = "მოღალატეებმა გაიმარჯვეს!";
        title.style.color = "var(--neon-red)";
        trophy.style.color = "var(--neon-red)";
    }
    
    // Reveal Traitors
    const list = document.getElementById('traitorsList');
    list.innerHTML = '';
    players.forEach((p, i) => {
        if(roles[i] === 'Traitor') {
            list.innerHTML += `<div class="t-name">${p.name}</div>`;
        }
    });
}

function restartGame() {
    showSection('setupSection');
}

// --- PARTICLES ---
function createParticles() {
    const c = document.getElementById("particles");
    for(let i=0; i<20; i++) {
        let p = document.createElement("div");
        p.className = "particle";
        p.style.left = Math.random()*100 + "%";
        p.style.animationDuration = (5 + Math.random()*10) + "s";
        c.appendChild(p);
    }
}
