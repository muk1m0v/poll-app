const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'votes.json');

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
}

function readVotes() {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
}

function writeVotes(votes) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(votes, null, 2));
}

// Статистика
app.get('/api/stats', (req, res) => {
    const votes = readVotes();
    const total = votes.length;
    // ✅ Добавлен вариант '10-12'
    const choices = { '10-12': 0, '12-14': 0, '14-16': 0, '16-18': 0, '18-20': 0 };
    const voters = votes.map(v => ({ name: v.name, choice: v.choice, time: v.timestamp }));

    votes.forEach(v => {
        if (choices.hasOwnProperty(v.choice)) {
            choices[v.choice]++;
        }
    });

    const percentages = {};
    if (total > 0) {
        for (let key in choices) {
            percentages[key] = (choices[key] / total * 100).toFixed(1);
        }
    } else {
        for (let key in choices) {
            percentages[key] = '0.0';
        }
    }

    res.json({ total, choices, percentages, voters });
});

// Проверка, голосовал ли пользователь
app.get('/api/check/:name', (req, res) => {
    const name = req.params.name.trim();
    const votes = readVotes();
    const existing = votes.find(v => v.name.toLowerCase() === name.toLowerCase());
    res.json({ voted: !!existing, vote: existing || null });
});

// Голосование
app.post('/api/vote', (req, res) => {
    const { name, choice } = req.body;
    if (!name || !choice) {
        return res.status(400).json({ error: 'Имя и выбор обязательны' });
    }
    const trimmedName = name.trim();
    if (!/^[a-zA-Zа-яА-ЯёЁ]{4,12}$/.test(trimmedName)) {
        return res.status(400).json({ error: 'Имя должно содержать только буквы (4–12 символов)' });
    }
    const votes = readVotes();
    if (votes.find(v => v.name.toLowerCase() === trimmedName.toLowerCase())) {
        return res.status(400).json({ error: 'Это имя уже проголосовало' });
    }
    // ✅ Проверяем, что выбор допустим
    const validChoices = ['10-12', '12-14', '14-16', '16-18', '18-20'];
    if (!validChoices.includes(choice)) {
        return res.status(400).json({ error: 'Некорректный вариант' });
    }
    const newVote = {
        name: trimmedName,
        choice,
        timestamp: new Date().toISOString()
    };
    votes.push(newVote);
    writeVotes(votes);
    res.json({ success: true, vote: newVote });
});

app.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
});