// ========== Глобальные переменные ==========
let currentUser = null;       // { name }
let hasVoted = false;
let selectedChoice = null;

const API_BASE = '/api';

// DOM
const loginBlock = document.getElementById('loginBlock');
const voteBlock = document.getElementById('voteBlock');
const nameInput = document.getElementById('nameInput');
const nameError = document.getElementById('nameError');
const loginBtn = document.getElementById('loginBtn');
const userNameDisplay = document.getElementById('userNameDisplay');
const optionBtns = document.querySelectorAll('.option-btn');
const voteMessage = document.getElementById('voteMessage');
const themeBtn = document.getElementById('themeBtn');
const statsContent = document.getElementById('statsContent');
const modal = document.getElementById('confirmModal');
const modalConfirm = document.getElementById('modalConfirm');
const modalCancel = document.getElementById('modalCancel');

// ========== Тема ==========
let theme = localStorage.getItem('theme') || 'light';
applyTheme(theme);

themeBtn.addEventListener('click', () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    applyTheme(newTheme);
    localStorage.setItem('theme', newTheme);
});

function applyTheme(t) {
    theme = t;
    if (t === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeBtn.querySelector('.icon').textContent = '🌙';
    } else {
        document.documentElement.removeAttribute('data-theme');
        themeBtn.querySelector('.icon').textContent = '☀️';
    }
}

// ========== Валидация имени ==========
function validateName(name) {
    // Только буквы (русские и латинские), 4–12 символов
    return /^[a-zA-Zа-яА-ЯёЁ]{4,12}$/.test(name);
}

nameInput.addEventListener('input', () => {
    const name = nameInput.value.trim();
    if (name === '') {
        nameError.textContent = '';
        loginBtn.disabled = true;
        nameInput.classList.remove('error');
        return;
    }
    if (!validateName(name)) {
        nameError.textContent = 'Только буквы, от 4 до 12 символов';
        loginBtn.disabled = true;
        nameInput.classList.add('error');
    } else {
        nameError.textContent = '';
        loginBtn.disabled = false;
        nameInput.classList.remove('error');
    }
});

// ========== Вход ==========
loginBtn.addEventListener('click', async () => {
    const name = nameInput.value.trim();
    if (!validateName(name)) {
        nameError.textContent = 'Некорректное имя';
        return;
    }
    currentUser = { name };
    localStorage.setItem('pollUser', JSON.stringify(currentUser));
    const voted = await checkVoted(name);
    hasVoted = voted;
    // Переключаем интерфейс
    loginBlock.style.display = 'none';
    voteBlock.style.display = 'block';
    userNameDisplay.textContent = `👤 ${name}`;
    if (hasVoted) {
        voteMessage.textContent = '✅ Вы уже проголосовали. Спасибо!';
        optionBtns.forEach(btn => btn.disabled = true);
    } else {
        voteMessage.textContent = 'Выберите удобное время';
        optionBtns.forEach(btn => btn.disabled = false);
    }
    fetchStats();
});

// Проверка, голосовал ли пользователь
async function checkVoted(name) {
    try {
        const resp = await fetch(`${API_BASE}/check/${encodeURIComponent(name)}`);
        const data = await resp.json();
        return data.voted;
    } catch (e) {
        console.error('Ошибка проверки:', e);
        return false;
    }
}

// Восстановление сессии
window.addEventListener('DOMContentLoaded', async () => {
    const saved = localStorage.getItem('pollUser');
    if (saved) {
        try {
            const user = JSON.parse(saved);
            currentUser = user;
            const voted = await checkVoted(user.name);
            hasVoted = voted;
            loginBlock.style.display = 'none';
            voteBlock.style.display = 'block';
            userNameDisplay.textContent = `👤 ${user.name}`;
            if (hasVoted) {
                voteMessage.textContent = '✅ Вы уже проголосовали. Спасибо!';
                optionBtns.forEach(btn => btn.disabled = true);
            } else {
                voteMessage.textContent = 'Выберите удобное время';
                optionBtns.forEach(btn => btn.disabled = false);
            }
            fetchStats();
        } catch (e) {
            localStorage.removeItem('pollUser');
            loginBlock.style.display = 'block';
        }
    } else {
        loginBlock.style.display = 'block';
        fetchStats();
    }
});

// ========== Голосование ==========
optionBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        if (hasVoted) return;
        selectedChoice = btn.dataset.choice;
        modal.classList.add('active');
    });
});

modalConfirm.addEventListener('click', async () => {
    modal.classList.remove('active');
    if (!currentUser || !selectedChoice) return;
    try {
        const resp = await fetch(`${API_BASE}/vote`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: currentUser.name,
                choice: selectedChoice
            })
        });
        const data = await resp.json();
        if (data.success) {
            hasVoted = true;
            voteMessage.textContent = '✅ Ваш голос учтён! Спасибо.';
            optionBtns.forEach(btn => btn.disabled = true);
            fetchStats();
        } else {
            voteMessage.textContent = '❌ ' + (data.error || 'Ошибка');
        }
    } catch (e) {
        voteMessage.textContent = '❌ Ошибка соединения';
        console.error(e);
    }
});

modalCancel.addEventListener('click', () => {
    modal.classList.remove('active');
    selectedChoice = null;
});
modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.classList.remove('active');
        selectedChoice = null;
    }
});

// ========== Статистика ==========
async function fetchStats() {
    try {
        const resp = await fetch(`${API_BASE}/stats`);
        const data = await resp.json();
        renderStats(data);
    } catch (e) {
        statsContent.innerHTML = '<div class="stats-loading">Ошибка загрузки статистики</div>';
        console.error(e);
    }
}

function renderStats(data) {
    const { total, choices, percentages, voters } = data;
    if (total === 0) {
        statsContent.innerHTML = '<div class="stats-loading">Пока никто не проголосовал</div>';
        return;
    }

    const choiceLabels = {
        '12-14': '12:00–14:00',
        '14-16': '14:00–16:00',
        '16-18': '16:00–18:00',
        '18-20': '18:00–20:00'
    };
    const colors = {
        '12-14': '#34c759',
        '14-16': '#ff9500',
        '16-18': '#007aff',
        '18-20': '#af52de'
    };

    let html = `<div class="stats-summary">`;
    for (let key in choices) {
        html += `
            <div class="stat-item" style="border-left-color: ${colors[key]};">
                <div class="label">${choiceLabels[key]}</div>
                <div class="value">${choices[key]} <span class="percent">(${percentages[key]}%)</span></div>
            </div>
        `;
    }
    html += `</div><div style="margin-top:8px;color:var(--text-secondary);">Всего проголосовало: <strong>${total}</strong></div>`;

    html += `<div class="voters-list"><table>
        <thead><tr><th>Имя</th><th>Выбор</th><th>Время</th></tr></thead><tbody>`;
    voters.forEach(v => {
        const choiceLabel = choiceLabels[v.choice] || v.choice;
        const badgeClass = `choice-${v.choice}`;
        const timeStr = new Date(v.time).toLocaleString('ru-RU', { hour12: false });
        html += `<tr>
            <td>${v.name}</td>
            <td><span class="choice-badge ${badgeClass}">${choiceLabel}</span></td>
            <td style="font-size:12px;color:var(--text-secondary);">${timeStr}</td>
        </tr>`;
    });
    html += `</tbody></table></div>`;

    statsContent.innerHTML = html;
}

// Обновление статистики каждые 30 сек
setInterval(() => {
    if (document.visibilityState === 'visible') {
        fetchStats();
    }
}, 30000);