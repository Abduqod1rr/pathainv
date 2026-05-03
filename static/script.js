document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('quickAddModal');
    const goalInput = document.getElementById('goalInput');
    const createGoalBtn = document.getElementById('createGoalBtn');
    const closeModalBtn = document.getElementById('closeModal');
    const quickAddBtns = document.querySelectorAll('#quickAddBtn, #emptyQuickAddBtn, #orbitAddBtn');
    const fabBtn = document.getElementById('fabBtn');

    quickAddBtns.forEach(btn => {
        if (btn) {
            btn.addEventListener('click', () => {
                modal.classList.add('active');
                goalInput.focus();
            });
        }
    });

    if (fabBtn) {
        fabBtn.addEventListener('click', () => {
            const activeGoalId = document.querySelector('.quest-card')?.closest('.dashboard');
            if (activeGoalId) {
                location.reload();
            } else {
                modal.classList.add('active');
            }
        });
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            modal.classList.remove('active');
        });
    }

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    }

    if (createGoalBtn) {
        createGoalBtn.addEventListener('click', createGoal);
    }

    if (goalInput) {
        goalInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                createGoal();
            }
        });
    }
});

async function createGoal() {
    const goalInput = document.getElementById('goalInput');
    const title = goalInput.value.trim();

    if (!title) return;

    const btn = document.getElementById('createGoalBtn');
    btn.textContent = 'Generating...';
    btn.disabled = true;

    try {
        const response = await fetch('/goal/create/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({ title })
        });

        const data = await response.json();

        if (data.success) {
            document.getElementById('quickAddModal').classList.remove('active');
            goalInput.value = '';
            location.reload();
        } else {
            alert('Error creating goal: ' + (data.error || 'Unknown error'));
        }
    } catch (err) {
        alert('Failed to create goal');
    }

    btn.textContent = 'Create Roadmap';
    btn.disabled = false;
}

async function toggleQuest(questId) {
    const card = document.querySelector(`[data-quest-id="${questId}"]`);
    const checkbox = card.querySelector('.quest-checkbox');

    try {
        const response = await fetch(`/quest/toggle/${questId}/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCookie('csrftoken')
            }
        });

        const data = await response.json();

        if (data.success) {
            if (data.is_completed) {
                card.classList.add('completed');
                checkbox.innerHTML = '✓';
                showConfetti();
            } else {
                card.classList.remove('completed');
                checkbox.innerHTML = '';
            }

            updateProgress(data.progress);
            updateTierStatus(data.current_tier);

            if (data.current_tier > 1) {
                setTimeout(() => location.reload(), 1000);
            }
        }
    } catch (err) {
        console.error('Error toggling quest:', err);
    }
}

function updateProgress(percentage) {
    const progressFill = document.querySelector('.progress-fill');
    const progressText = document.querySelector('.progress-text');

    if (progressFill) {
        progressFill.style.width = percentage + '%';
    }
    if (progressText) {
        progressText.textContent = percentage + '%';
    }
}

function updateTierStatus(tier) {
    const tierStatus = document.querySelector('.tier-status');
    if (tierStatus) {
        tierStatus.textContent = `Tier ${tier}: In Progress`;
    }
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

    setTimeout(() => {
        container.innerHTML = '';
    }, 4000);
}

const style = document.createElement('style');
style.textContent = `
    @keyframes confettiFall {
        to {
            transform: translateY(100vh) rotate(${Math.random() * 720}deg);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

async function setActiveGoal(goalId) {
    try {
        const response = await fetch(`/goal/set-active/${goalId}/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCookie('csrftoken')
            }
        });
        window.location.href = '/dashboard/';
    } catch (err) {
        console.error('Error setting active goal:', err);
    }
}

async function restoreGoal(goalId) {
    try {
        const response = await fetch(`/goal/set-active/${goalId}/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCookie('csrftoken')
            }
        });
        window.location.href = '/dashboard/';
    } catch (err) {
        console.error('Error restoring goal:', err);
    }
}

function decomposeQuest(questId) {
    alert('AI will decompose this quest into smaller sub-quests!');
}

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}