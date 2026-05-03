let currentUser = null;
let currentGoal = null;

function render() {
    const app = document.getElementById('app');
    
    if (!currentUser) {
        app.innerHTML = renderOnboarding();
        return;
    }

    app.innerHTML = `
        <div class="app-container">
            <aside class="sidebar">
                <div class="logo"><h2>PathAI</h2></div>
                <nav class="nav-menu">
                    <a href="#" class="nav-item" onclick="showPage('dashboard')">
                        <span class="icon">🎯</span>
                        <span>Current Path</span>
                    </a>
                    <a href="#" class="nav-item" onclick="showPage('orbit')">
                        <span class="icon">🪐</span>
                        <span>Orbit</span>
                    </a>
                    <a href="#" class="nav-item" onclick="showPage('archive')">
                        <span class="icon">🏆</span>
                        <span>Archive</span>
                    </a>
                    <a href="#" class="nav-item" onclick="showPage('identity')">
                        <span class="icon">👤</span>
                        <span>Identity</span>
                    </a>
                </nav>
                <div class="user-status">
                    <p class="user-name">${currentUser.username}</p>
                    ${currentUser.age ? `<p class="user-info">${currentUser.age} years old</p>` : ''}
                    ${currentUser.industry ? `<p class="user-info">${currentUser.industry}</p>` : ''}
                </div>
                <div class="logout">
                    <a href="#" onclick="logout()">Logout</a>
                </div>
            </aside>
            <main class="main-content">
                <header class="top-bar">
                    <div class="progress-section">
                        ${currentGoal ? `
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${getProgress(currentGoal)}%"></div>
                        </div>
                        <span class="progress-text">${getProgress(currentGoal)}%</span>
                        ` : ''}
                    </div>
                    <div class="tier-status">
                        ${currentGoal ? `Tier ${currentGoal.currentTier}: ${getCompletedInTier(currentGoal)}/10 Quest` : ''}
                    </div>
                    <button class="quick-add" onclick="showQuickAdd()">+</button>
                </header>
                <div id="page-content"></div>
            </main>
            <div class="fab" onclick="showQuickAdd()" title="AI Helper">🤖</div>
        </div>
        <div class="modal" id="quickAddModal">
            <div class="modal-content">
                <h3>New Goal</h3>
                <input type="text" id="goalInput" placeholder="What is your goal?">
                <button class="btn-primary" onclick="createGoal()">Create Roadmap</button>
                <button class="btn-close" onclick="closeModal()">×</button>
            </div>
        </div>
    `;

    showPage('dashboard');
}

function showPage(page) {
    const content = document.getElementById('page-content');
    switch (page) {
        case 'dashboard':
            content.innerHTML = renderDashboard();
            break;
        case 'orbit':
            content.innerHTML = renderOrbit();
            break;
        case 'archive':
            content.innerHTML = renderArchive();
            break;
        case 'identity':
            content.innerHTML = renderIdentity();
            break;
    }
}

function renderOnboarding() {
    return `
        <div class="auth-page">
            <div class="auth-container">
                <div class="auth-card">
                    <h1>Welcome to PathAI</h1>
                    <p class="tagline">Your journey starts here</p>
                    <form class="auth-form" onsubmit="handleRegister(event)">
                        <div class="form-group">
                            <label>Username</label>
                            <input type="text" name="username" required placeholder="Choose your name">
                        </div>
                        <div class="form-group">
                            <label>Password</label>
                            <input type="password" name="password" required placeholder="Create a password">
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Age</label>
                                <input type="number" name="age" min="1" max="120" placeholder="Your age">
                            </div>
                            <div class="form-group">
                                <label>Industry</label>
                                <select name="industry">
                                    <option value="">Select industry</option>
                                    <option value="technology">Technology</option>
                                    <option value="business">Business</option>
                                    <option value="creative">Creative Arts</option>
                                    <option value="health">Health & Medicine</option>
                                    <option value="education">Education</option>
                                    <option value="science">Science</option>
                                    <option value="sports">Sports</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Interests</label>
                            <input type="text" name="interests" placeholder="What interests you? (comma separated)">
                        </div>
                        <div class="form-group">
                            <label>Current Activity</label>
                            <select name="activity_type">
                                <option value="">Select your situation</option>
                                <option value="student">Student</option>
                                <option value="employed">Employed</option>
                                <option value="self_employed">Self-Employed</option>
                                <option value="entrepreneur">Entrepreneur</option>
                                <option value="career_changer">Career Changer</option>
                                <option value="hobbyist">Hobbyist</option>
                            </select>
                        </div>
                        <button type="submit" class="btn-primary btn-full">Start Your Journey</button>
                    </form>
                    <p class="auth-switch">Already have an account? <a href="#" onclick="showLogin()">Login</a></p>
                </div>
            </div>
        </div>
    `;
}

function renderDashboard() {
    if (!currentGoal) {
        return `
            <div class="dashboard">
                <div class="empty-state">
                    <h2>Welcome, ${currentUser.username}!</h2>
                    <p>Create your first goal to begin your journey.</p>
                    <button class="btn-primary" onclick="showQuickAdd()">+ Create Goal</button>
                </div>
            </div>
        `;
    }

    const quests = currentGoal.quests.filter(q => q.tierNumber === currentGoal.currentTier);
    
    return `
        <div class="dashboard">
            <div class="context-header">
                <h1>${currentUser.username}, ${currentUser.age || '?'} years old</h1>
                ${currentUser.industry ? `<p class="role">${currentUser.industry}</p>` : ''}
                <p class="mission">Current mission: ${getProgress(currentGoal)}% to "${currentGoal.title}"</p>
            </div>
            <div class="quest-path">
                <h2>Tier ${currentGoal.currentTier}</h2>
                <div class="quests-container">
                    ${quests.map(q => renderQuestCard(q)).join('')}
                </div>
                <div class="tier-preview">
                    <h3>Locked Tiers</h3>
                    <div class="locked-tiers">
                        ${[2,3,4,5,6,7,8,9,10].filter(t => t > currentGoal.currentTier).map(t => `
                            <div class="tier-box locked">
                                <span class="lock-icon">🔒</span>
                                <span>Tier ${t}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>
        <div class="confetti-container" id="confetti"></div>
    `;
}

function renderQuestCard(quest) {
    return `
        <div class="quest-card ${quest.isCompleted ? 'completed' : ''}" data-quest-id="${quest.id}">
            <div class="quest-checkbox" onclick="toggleQuest(${quest.id})">
                ${quest.isCompleted ? '✓' : ''}
            </div>
            <div class="quest-content">
                <h3>${quest.title}</h3>
            </div>
            <div class="quest-actions">
                <button class="action-btn" title="Decompose" onclick="decomposeQuest(${quest.id})">↗</button>
            </div>
        </div>
    `;
}

function renderOrbit() {
    const activeGoals = currentUser.goals.filter(g => g.isActive);
    return `
        <div class="orbit-view">
            <h2>Your Goal Galaxy</h2>
            <div class="planets-container">
                ${activeGoals.map(g => `
                    <div class="planet ${g.id === currentGoal?.id ? 'active' : ''}" onclick="setActiveGoal(${g.id})">
                        <div class="planet-icon">🎯</div>
                        <h3>${g.title}</h3>
                        <p>${getProgress(g)}% complete</p>
                        <span class="tier-badge">Tier ${g.currentTier}</span>
                    </div>
                `).join('')}
                ${activeGoals.length === 0 ? '<p class="empty-orbit">No goals yet. Create one!</p>' : ''}
            </div>
            <button class="btn-primary" onclick="showQuickAdd()">+ New Goal</button>
        </div>
    `;
}

function renderArchive() {
    const archivedGoals = currentUser.goals.filter(g => !g.isActive);
    return `
        <div class="archive-view">
            <h2>Hall of Fame</h2>
            <div class="archive-list">
                ${archivedGoals.map(g => `
                    <div class="archive-card">
                        <h3>${g.title}</h3>
                        <p>${g.quests.filter(q => q.isCompleted).length} / ${g.quests.length} quests completed</p>
                        <div class="archive-progress">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${getProgress(g)}%"></div>
                            </div>
                            <span>${getProgress(g)}%</span>
                        </div>
                        <button class="btn-secondary" onclick="restoreGoal(${g.id})">Restore</button>
                    </div>
                `).join('')}
                ${archivedGoals.length === 0 ? '<p class="empty-archive">No archived goals yet.</p>' : ''}
            </div>
        </div>
    `;
}

function renderIdentity() {
    return `
        <div class="identity-view">
            <h2>Your Profile</h2>
            <form class="identity-form" onsubmit="handleUpdateProfile(event)">
                <div class="form-group">
                    <label>Username</label>
                    <input type="text" value="${currentUser.username}" disabled>
                </div>
                <div class="form-group">
                    <label>Age</label>
                    <input type="number" name="age" value="${currentUser.age || ''}" min="1" max="120">
                </div>
                <div class="form-group">
                    <label>Industry</label>
                    <select name="industry">
                        <option value="">Select industry</option>
                        <option value="technology" ${currentUser.industry === 'technology' ? 'selected' : ''}>Technology</option>
                        <option value="business" ${currentUser.industry === 'business' ? 'selected' : ''}>Business</option>
                        <option value="creative" ${currentUser.industry === 'creative' ? 'selected' : ''}>Creative Arts</option>
                        <option value="health" ${currentUser.industry === 'health' ? 'selected' : ''}>Health & Medicine</option>
                        <option value="education" ${currentUser.industry === 'education' ? 'selected' : ''}>Education</option>
                        <option value="science" ${currentUser.industry === 'science' ? 'selected' : ''}>Science</option>
                        <option value="sports" ${currentUser.industry === 'sports' ? 'selected' : ''}>Sports</option>
                        <option value="other" ${currentUser.industry === 'other' ? 'selected' : ''}>Other</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Interests</label>
                    <input type="text" name="interests" value="${currentUser.interests || ''}" placeholder="Comma separated">
                </div>
                <div class="form-group">
                    <label>Current Activity</label>
                    <select name="activity_type">
                        <option value="">Select situation</option>
                        <option value="student" ${currentUser.activityType === 'student' ? 'selected' : ''}>Student</option>
                        <option value="employed" ${currentUser.activityType === 'employed' ? 'selected' : ''}>Employed</option>
                        <option value="self_employed" ${currentUser.activityType === 'self_employed' ? 'selected' : ''}>Self-Employed</option>
                        <option value="entrepreneur" ${currentUser.activityType === 'entrepreneur' ? 'selected' : ''}>Entrepreneur</option>
                        <option value="career_changer" ${currentUser.activityType === 'career_changer' ? 'selected' : ''}>Career Changer</option>
                        <option value="hobbyist" ${currentUser.activityType === 'hobbyist' ? 'selected' : ''}>Hobbyist</option>
                    </select>
                </div>
                <button type="submit" class="btn-primary">Save Changes</button>
            </form>
        </div>
    `;
}

async function handleRegister(e) {
    e.preventDefault();
    const form = e.target;
    const user = {
        username: form.username.value,
        password: form.password.value,
        age: form.age.value ? parseInt(form.age.value) : null,
        industry: form.industry.value,
        interests: form.interests.value,
        activityType: form.activity_type.value,
        goals: []
    };

    const existing = await db.getUserByUsername(user.username);
    if (existing) {
        alert('Username already exists!');
        return;
    }

    const id = await db.addUser(user);
    user.id = id;
    currentUser = user;
    render();
}

function showLogin() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="auth-page">
            <div class="auth-container">
                <div class="auth-card">
                    <h1>PathAI</h1>
                    <p class="tagline">Continue your journey</p>
                    <form class="auth-form" onsubmit="handleLogin(event)">
                        <div class="form-group">
                            <label>Username</label>
                            <input type="text" name="username" required placeholder="Enter your username">
                        </div>
                        <div class="form-group">
                            <label>Password</label>
                            <input type="password" name="password" required placeholder="Enter your password">
                        </div>
                        <button type="submit" class="btn-primary btn-full">Login</button>
                    </form>
                    <p class="auth-switch">New here? <a href="#" onclick="render()">Create account</a></p>
                </div>
            </div>
        </div>
    `;
}

async function handleLogin(e) {
    e.preventDefault();
    const form = e.target;
    const user = await db.getUserByUsername(form.username.value);
    
    if (!user || user.password !== form.password.value) {
        alert('Invalid username or password!');
        return;
    }

    const goals = await db.getGoals(user.id);
    for (const goal of goals) {
        goal.quests = await db.getQuests(goal.id);
    }
    user.goals = goals;

    currentUser = user;
    currentGoal = goals.find(g => g.isActive) || goals[0] || null;
    render();
}

function logout() {
    currentUser = null;
    currentGoal = null;
    render();
}

function showQuickAdd() {
    document.getElementById('quickAddModal').classList.add('active');
    document.getElementById('goalInput').focus();
}

function closeModal() {
    document.getElementById('quickAddModal').classList.remove('active');
    document.getElementById('goalInput').value = '';
}

async function createGoal() {
    const title = document.getElementById('goalInput').value.trim();
    if (!title) return;

    const btn = document.querySelector('#quickAddModal .btn-primary');
    btn.textContent = 'Generating...';
    btn.disabled = true;

    const questsData = await generateRoadmap(currentUser, title);

    const goal = {
        userId: currentUser.id,
        title: title,
        createdAt: new Date().toISOString(),
        currentTier: 1,
        isActive: true,
        quests: []
    };

    const goalId = await db.addGoal(goal);
    goal.id = goalId;

    // Add all quests at once
    const questsToAdd = questsData.map(q => ({
        goalId: goalId,
        title: q.title,
        tierNumber: q.tier,
        order: q.order,
        isCompleted: false
    }));
    
    const questIds = await db.addQuests(questsToAdd);
    
    questsToAdd.forEach((quest, i) => {
        quest.id = questIds[i];
        goal.quests.push(quest);
    });

    currentUser.goals.forEach(g => g.isActive = false);
    goal.isActive = true;
    await db.updateGoal(goal);
    currentUser.goals = [...currentUser.goals.filter(g => g.id !== goalId), goal];
    currentGoal = goal;

    closeModal();
    btn.textContent = 'Create Roadmap';
    btn.disabled = false;
    render();
}

async function toggleQuest(questId) {
    console.log('Toggle quest:', questId, 'type:', typeof questId);
    console.log('Available quests:', currentGoal.quests.map(q => ({id: q.id, title: q.title})));
    
    const quest = currentGoal.quests.find(q => q.id === questId);
    console.log('Found quest:', quest);
    
    if (!quest) {
        console.error('Quest not found!');
        return;
    }

    quest.isCompleted = !quest.isCompleted;
    console.log('Updated isCompleted:', quest.isCompleted);
    await db.updateQuest(quest);

    const currentTierCompleted = currentGoal.quests.filter(
        q => q.tierNumber === currentGoal.currentTier && q.isCompleted
    ).length;

    if (currentTierCompleted >= 10) {
        currentGoal.currentTier++;
        await db.updateGoal(currentGoal);
    }

    if (quest.isCompleted) {
        showConfetti();
    }

    render();
}

function getProgress(goal) {
    if (!goal.quests.length) return 0;
    const completed = goal.quests.filter(q => q.isCompleted).length;
    return Math.round((completed / goal.quests.length) * 100);
}

function getCompletedInTier(goal) {
    return goal.quests.filter(q => q.tierNumber === goal.currentTier && q.isCompleted).length;
}

async function setActiveGoal(goalId) {
    currentUser.goals.forEach(g => g.isActive = false);
    const goal = currentUser.goals.find(g => g.id === goalId);
    goal.isActive = true;
    await db.updateGoal(goal);
    currentGoal = goal;
    render();
}

async function restoreGoal(goalId) {
    const goal = currentUser.goals.find(g => g.id === goalId);
    goal.isActive = true;
    await db.updateGoal(goal);
    currentGoal = goal;
    currentUser.goals.forEach(g => {
        if (g.id !== goalId) g.isActive = false;
    });
    render();
}

function showConfetti() {
    const container = document.getElementById('confetti');
    const colors = ['#58a6ff', '#3fb950', '#f0883e', '#a371f7', '#ff7b72'];
    
    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.style.cssText = `
            position: absolute;
            width: 10px;
            height: 10px;
            background: ${colors[Math.floor(Math.random() * colors.length)]};
            left: ${Math.random() * 100}%;
            top: -10px;
            border-radius: ${Math.random() > 0.5 ? '50%' : '0'};
            animation: confettiFall ${2 + Math.random() * 2}s linear forwards;
        `;
        container.appendChild(confetti);
    }

    setTimeout(() => container.innerHTML = '', 4000);
}

async function handleUpdateProfile(e) {
    e.preventDefault();
    const form = e.target;
    currentUser.age = form.age.value ? parseInt(form.age.value) : null;
    currentUser.industry = form.industry.value;
    currentUser.interests = form.interests.value;
    currentUser.activityType = form.activity_type.value;
    await db.updateUser(currentUser);
    alert('Profile updated!');
    render();
}

async function decomposeQuest(questId) {
    const quest = currentGoal.quests.find(q => q.id === questId);
    if (!quest) return;
    alert('AI will decompose this quest: ' + quest.title);
}

document.addEventListener('DOMContentLoaded', () => {
    render();
});