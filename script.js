// --- LOCAL STORAGE "BACKEND" ---
const STORAGE_KEY = 'habitflow_v3_data';
const AUTH_KEY = 'habitflow_user';

function getStoredHabits() {
    const key = currentUser ? `${STORAGE_KEY}_${currentUser.name}` : STORAGE_KEY;
    const data = localStorage.getItem(key);
    if (!data) {
        return [
            { id: '1', name: 'Morning Yoga', description: 'Sun salutations', color: 'yellow', completed: false, progress: 45, icon: 'sun', streak: 5, lastCompletedDate: null, history: {} },
            { id: '2', name: 'Meditation', description: 'Deep breathing', color: 'green', completed: true, progress: 100, icon: 'wind', streak: 12, lastCompletedDate: new Date().toISOString().split('T')[0], history: {} },
            { id: '3', name: 'Coding', description: 'Project build', color: 'blue', completed: false, progress: 10, icon: 'code', streak: 2, lastCompletedDate: null, history: {} }
        ];
    }
    return JSON.parse(data);
}

function saveHabits(data) {
    const key = currentUser ? `${STORAGE_KEY}_${currentUser.name}` : STORAGE_KEY;
    localStorage.setItem(key, JSON.stringify(data));
    updateSummary();
}

// --- STATE MANAGEMENT ---
let habits = [];
let selectedColor = 'blue';
let filterMode = 'all';
let searchQuery = '';
let currentView = 'dashboard';
let currentUser = JSON.parse(localStorage.getItem(AUTH_KEY));
let authMode = 'login'; // 'login' or 'register'

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (!currentUser) {
        showAuthScreen();
    } else {
        initApp();
    }
});

function initApp() {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('welcome-screen').classList.remove('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    
    // Update UI with user name
    const nameDisplays = document.querySelectorAll('h1.font-display.mt-2, p.font-black.text-sm');
    nameDisplays.forEach(el => {
        if (el.innerText.includes('Sakshi') || el.innerText === '') {
            el.innerText = currentUser.name;
        }
    });

    habits = getStoredHabits();
    checkStreaks();
    renderHabits();
    updateSummary();
    renderCalendar();
    lucide.createIcons();
}

// Auth Handlers
function showAuthScreen() {
    document.getElementById('auth-screen').classList.remove('hidden');
    document.getElementById('welcome-screen').classList.add('hidden');
    document.getElementById('dashboard').classList.add('hidden');
}

function toggleAuthMode() {
    authMode = authMode === 'login' ? 'register' : 'login';
    document.getElementById('auth-title').innerText = authMode === 'login' ? 'Welcome Back' : 'Create Account';
    document.getElementById('auth-subtitle').innerText = authMode === 'login' ? 'Please enter your details' : 'Join the habit flow';
    document.getElementById('auth-toggle-text').innerText = authMode === 'login' ? "Don't have an account?" : "Already have an account?";
    document.getElementById('auth-toggle-btn').innerText = authMode === 'login' ? "Register" : "Login";
}

function handleAuthSubmit() {
    const name = document.getElementById('auth-name').value;
    const pass = document.getElementById('auth-pass').value;

    if (!name || !pass) {
        showToast('Please fill all fields');
        return;
    }

    if (authMode === 'register') {
        const users = JSON.parse(localStorage.getItem('habitflow_users_db') || '[]');
        if (users.find(u => u.name === name)) {
            showToast('User already exists');
            return;
        }
        users.push({ name, pass });
        localStorage.setItem('habitflow_users_db', JSON.stringify(users));
        showToast('Account created!');
    } else {
        const users = JSON.parse(localStorage.getItem('habitflow_users_db') || '[]');
        const user = users.find(u => u.name === name && u.pass === pass);
        if (!user && name !== 'Sakshi') { // Mock Sakshi default
            showToast('Invalid credentials');
            return;
        }
    }

    currentUser = { name };
    localStorage.setItem(AUTH_KEY, JSON.stringify(currentUser));
    initApp();
}

function logout() {
    localStorage.removeItem(AUTH_KEY);
    location.reload();
}

// Navigation
function hideWelcome() {
    const welcome = document.getElementById('welcome-screen');
    const dashboard = document.getElementById('dashboard');
    welcome.style.opacity = '0';
    welcome.style.pointerEvents = 'none';
    dashboard.classList.remove('opacity-0');
    dashboard.style.opacity = '1';
}

function switchView(viewId) {
    currentView = viewId;
    
    // Toggle View Visibility
    document.querySelectorAll('.app-view').forEach(view => {
        view.classList.add('hidden');
    });
    document.getElementById(`view-${viewId}`).classList.remove('hidden');

    // Update Sidebar Styling
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('bg-gray-50', 'text-[#5B6CFF]');
        link.classList.add('text-gray-400');
    });
    const activeLink = Array.from(document.querySelectorAll('.nav-link')).find(link => 
        link.innerText.toLowerCase().includes(viewId)
    );
    if (activeLink) {
        activeLink.classList.remove('text-gray-400');
        activeLink.classList.add('bg-gray-50', 'text-[#5B6CFF]');
    }

    if (viewId === 'calendar') renderCalendar();
    lucide.createIcons();
}

function toggleModal(id, show, editId = null) {
    const modal = document.getElementById(id);
    if (show) {
        modal.classList.add('active');
        if (id === 'add-modal') {
            if (editId) {
                const h = habits.find(h => h.id === editId);
                document.getElementById('modal-title').innerText = 'Edit Habit';
                document.getElementById('edit-id').value = editId;
                document.getElementById('habit-name').value = h.name;
                document.getElementById('habit-desc').value = h.description;
                document.getElementById('submit-btn').innerText = 'Save Changes';
                selectColor(h.color, document.querySelector(`.bg-${h.color}`));
            } else {
                document.getElementById('modal-title').innerText = 'New Habit';
                document.getElementById('edit-id').value = '';
                document.getElementById('habit-name').value = '';
                document.getElementById('habit-desc').value = '';
                document.getElementById('submit-btn').innerText = 'Create Habit';
            }
        }
    } else {
        modal.classList.remove('active');
    }
}

// Search & Filter
function handleSearchScroll() {
    searchQuery = document.getElementById('search-input').value.toLowerCase();
    renderHabits();
}

function setFilter(mode) {
    filterMode = mode;
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.classList.add('text-gray-400');
    });
    event.target.classList.add('active');
    event.target.classList.remove('text-gray-400');
    renderHabits();
}

// Logic Functions
function checkStreaks() {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    habits = habits.map(h => {
        // If not completed today and last completion was NOT yesterday or today, streak might reset
        if (h.lastCompletedDate && h.lastCompletedDate !== today && h.lastCompletedDate !== yesterday) {
            h.streak = 0;
        }
        // Also reset completed status if it's a new day
        if (h.lastCompletedDate !== today) {
            h.completed = false;
            h.progress = 0;
        }
        return h;
    });
    saveHabits(habits);
}

function handleHabitSubmit() {
    const editId = document.getElementById('edit-id').value;
    const name = document.getElementById('habit-name').value;
    const desc = document.getElementById('habit-desc').value;

    if (!name) return;

    if (editId) {
        habits = habits.map(h => h.id === editId ? { ...h, name, description: desc, color: selectedColor } : h);
        showToast('Habit updated!');
    } else {
        const h = {
            id: Date.now().toString(),
            name,
            description: desc || 'Daily Goal',
            color: selectedColor,
            completed: false,
            progress: 0,
            streak: 0,
            lastCompletedDate: null,
            history: {},
            icon: 'star'
        };
        habits.unshift(h);
    }
    
    saveHabits(habits);
    toggleModal('add-modal', false);
    renderHabits();
}

function toggleHabit(id) {
    const today = new Date().toISOString().split('T')[0];
    habits = habits.map(h => {
        if (h.id === id) {
            const completed = !h.completed;
            if (completed) {
                h.streak += 1;
                h.lastCompletedDate = today;
                h.history = h.history || {};
                h.history[today] = true;
                h.progress = 100;
                showToast(`Keep it up! 🔥 Streak: ${h.streak}`);
            } else {
                h.streak = Math.max(0, h.streak - 1);
                h.progress = 0;
                if (h.history) delete h.history[today];
            }
            return { ...h, completed };
        }
        return h;
    });
    saveHabits(habits);
    renderHabits();
}

function updateProgress(id, val) {
    habits = habits.map(h => {
        if (h.id === id) {
            const progress = parseInt(val);
            const completed = progress === 100;
            if (completed && !h.completed) {
                const today = new Date().toISOString().split('T')[0];
                h.streak += 1;
                h.lastCompletedDate = today;
                h.history = h.history || {};
                h.history[today] = true;
                showToast(`Goal Met! Streak: ${h.streak} 🔥`);
            }
            return { ...h, progress, completed };
        }
        return h;
    });
    saveHabits(habits);
    // Don't re-render full grid to avoid losing focus on slider
    updateSummary(); 
}

function resetData() {
    if (confirm('Are you sure you want to delete everything?')) {
        const key = currentUser ? `${STORAGE_KEY}_${currentUser.name}` : STORAGE_KEY;
        localStorage.removeItem(key);
        location.reload();
    }
}

// Calendar Logic
function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    const today = new Date();
    let html = '';

    const days = ['S','M','T','W','T','F','S'];
    days.forEach(d => html += `<div class="text-center font-black text-[10px] text-gray-300 mb-2">${d}</div>`);

    for (let i = 27; i >= 0; i--) {
        const day = new Date();
        day.setDate(today.getDate() - i);
        const dayStr = day.toISOString().split('T')[0];
        
        const habitsDone = habits.filter(h => h.history && h.history[dayStr]);
        const count = habitsDone.length;
        const total = habits.length;
        const isCurrent = dayStr === today.toISOString().split('T')[0];
        
        let opacity = '0.05';
        if (count > 0) opacity = Math.max(0.3, count/total).toString();

        html += `
            <div onclick="showDayDetails('${dayStr}')" class="aspect-square rounded-xl flex flex-col items-center justify-center space-y-1 cursor-pointer hover:scale-105 transition-all ${count === total && total > 0 ? 'bg-[#A8E063]' : (count > 0 ? 'bg-blue-400' : 'bg-gray-100')} ${isCurrent ? 'ring-2 ring-black' : ''}" style="opacity: ${opacity}">
                <span class="text-[10px] font-black">${day.getDate()}</span>
                ${count > 0 ? `<span class="text-[8px] font-bold">${count}/${total}</span>` : ''}
            </div>
        `;
    }
    grid.innerHTML = html;
}

function showDayDetails(dateStr) {
    const details = document.getElementById('day-details');
    const habitsAtDate = habits.filter(h => h.history && h.history[dateStr]);
    const done = habitsAtDate.length;
    const total = habits.length;
    const remaining = total - done;

    const date = new Date(dateStr);
    const options = { month: 'short', day: 'numeric' };
    const formattedDate = date.toLocaleDateString(undefined, options);

    details.innerHTML = `
        <p class="text-gray-400 font-bold uppercase tracking-widest text-xs">${formattedDate}</p>
        <div class="text-5xl font-black font-display text-[#5B6CFF]">${done} / ${total}</div>
        <div class="space-y-3 mt-8">
            <div class="flex justify-between items-center p-4 bg-gray-50 rounded-2xl">
                <span class="font-bold text-gray-400">Completed</span>
                <span class="text-green-500 font-black">${done}</span>
            </div>
            <div class="flex justify-between items-center p-4 bg-gray-50 rounded-2xl">
                <span class="font-bold text-gray-400">Remaining</span>
                <span class="text-orange-500 font-black">${remaining}</span>
            </div>
        </div>
        <div class="pt-6">
            <p class="text-[10px] font-black text-gray-300 uppercase tracking-tighter">Consistency Score</p>
            <p class="text-2xl font-black">${total > 0 ? Math.round((done/total)*100) : 0}%</p>
        </div>
    `;
}

function deleteHabit(id) {
    habits = habits.filter(h => h.id !== id);
    saveHabits(habits);
    toggleModal('detail-modal', false);
    renderHabits();
}

// Summary Logic
function updateSummary() {
    const total = habits.length;
    const completedCount = habits.filter(h => h.completed).length;
    const percentage = total > 0 ? Math.round((completedCount / total) * 100) : 0;
    
    document.getElementById('summary-text').innerText = `You've completed ${completedCount}/${total} habits today`;
    document.getElementById('summary-percentage').innerText = `${percentage}%`;
    document.getElementById('summary-bar').style.width = `${percentage}%`;
    
    const maxStreak = habits.reduce((max, h) => Math.max(max, h.streak), 0);
    document.getElementById('top-streak').innerText = maxStreak;
}

// Rendering
function renderHabits() {
    const filtered = habits.filter(h => {
        const matchesSearch = h.name.toLowerCase().includes(searchQuery);
        if (filterMode === 'pending') return matchesSearch && !h.completed;
        if (filterMode === 'done') return matchesSearch && h.completed;
        return matchesSearch;
    });

    const grid = document.getElementById('habit-grid');
    grid.innerHTML = filtered.map((h, i) => `
        <div onclick="showDetail('${h.id}')" class="habit-card bg-${h.color} p-10 rounded-[40px] shadow-sm relative cursor-pointer min-h-[220px] flex flex-col justify-between" style="animation: fadeInUp 0.5s ease backwards ${i * 0.1}s">
            <div class="flex justify-between items-start">
                <div class="flex items-center space-x-3">
                    <div class="p-3 bg-black/10 rounded-2xl">
                        <i data-lucide="${h.icon || 'star'}"></i>
                    </div>
                    ${h.streak > 0 ? `<div class="bg-black/10 px-3 py-1 rounded-full text-xs font-black">🔥 ${h.streak}</div>` : ''}
                </div>
                <div onclick="event.stopPropagation(); toggleHabit('${h.id}')" class="check-btn ${h.completed ? 'completed' : ''}">
                    ${h.completed ? '<i data-lucide="check" class="w-6 h-6"></i>' : ''}
                </div>
            </div>
            <div>
                <h3 class="font-black text-3xl leading-tight mb-2 uppercase tracking-tight">${h.name}</h3>
                <div class="flex justify-between items-center text-sm font-bold opacity-60">
                    <span>${h.description}</span>
                    <span>${h.progress}%</span>
                </div>
                <div class="w-full h-1.5 bg-black/5 rounded-full mt-3 overflow-hidden">
                    <div class="h-full bg-black/20" style="width: ${h.progress}%"></div>
                </div>
            </div>
        </div>
    `).join('');
    lucide.createIcons();
}

function showDetail(id) {
    const h = habits.find(h => h.id === id);
    if (!h) return;

    const wrap = document.getElementById('detail-content-wrap');
    wrap.className = `modal-content w-full max-w-4xl min-h-[70vh] bg-${h.color} rounded-[50px] p-12 md:p-20 flex flex-col md:flex-row relative pointer-events-auto`;
    
    wrap.innerHTML = `
        <button onclick="toggleModal('detail-modal', false)" class="absolute top-10 right-10 w-12 h-12 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/40 transition-all">
            <i data-lucide="x"></i>
        </button>

        <div class="flex-1 flex flex-col justify-center items-center md:items-start text-center md:text-left">
            <div class="flex items-center space-x-4 mb-4">
                 <span class="px-6 py-2 bg-black/10 rounded-full font-black uppercase tracking-widest text-xs">${h.streak} Day Streak 🔥</span>
            </div>
            <h2 class="text-6xl md:text-8xl font-display font-black mb-8 leading-tight line-clamp-2">${h.name}</h2>
            <div class="w-full max-w-sm space-y-4">
                <div class="flex justify-between font-black uppercase text-xs tracking-widest opacity-50">
                    <span>Daily Progress</span>
                    <span id="detail-prog-text">${h.progress}%</span>
                </div>
                <input type="range" min="0" max="100" value="${h.progress}" oninput="updateDetailProgress(this, '${h.id}')" class="w-full">
            </div>
        </div>

        <div class="flex-1 flex flex-col items-center justify-center mt-12 md:mt-0">
            <div class="w-64 h-64 bg-[#FF9F1C] rounded-full flex items-center justify-center border-8 border-white/20 shadow-2xl animate-float relative overflow-hidden">
                <div class="absolute top-1/3 flex space-x-2 z-10">
                    <div class="w-16 h-8 bg-black rounded-b-xl rounded-t-sm shadow-lg"></div>
                    <div class="w-16 h-8 bg-black rounded-b-xl rounded-t-sm shadow-lg"></div>
                    <div class="absolute left-1/2 -translate-x-1/2 top-1 w-4 h-2 bg-black"></div>
                </div>
                <div class="absolute bottom-[20%] w-16 ${h.completed ? 'h-8 border-b-4 border-black rounded-b-full' : 'h-1 bg-black rounded-full'} transition-all"></div>
                ${h.completed ? '<div class="absolute inset-0 bg-yellow-400 opacity-20 animate-pulse"></div>' : ''}
            </div>
            
            <div class="flex flex-col space-y-4 w-full mt-16 max-w-md">
                 <div class="flex space-x-4">
                    <button onclick="toggleModal('add-modal', true, '${h.id}'); toggleModal('detail-modal', false)" class="flex-1 py-5 bg-white/20 hover:bg-white/30 text-black font-black rounded-[24px] flex items-center justify-center space-x-2">
                        <i data-lucide="edit" class="w-5 h-5"></i>
                        <span>Edit</span>
                    </button>
                    <button onclick="deleteHabit('${h.id}')" class="flex-1 py-5 bg-red-500/80 hover:bg-red-600 text-white font-black rounded-[24px] flex items-center justify-center space-x-2">
                        <i data-lucide="trash-2" class="w-5 h-5"></i>
                        <span>Delete</span>
                    </button>
                 </div>
                 <button onclick="toggleModal('detail-modal', false)" class="w-full py-6 bg-white text-black font-black text-xl rounded-[30px] shadow-xl ripple">
                    Back Home
                 </button>
            </div>
        </div>
    `;

    lucide.createIcons();
    toggleModal('detail-modal', true);
}

function updateDetailProgress(el, id) {
    document.getElementById('detail-prog-text').innerText = `${el.value}%`;
    updateProgress(id, el.value);
}

function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.innerText = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function selectColor(color, el) {
    selectedColor = color;
    document.querySelectorAll('.color-opt').forEach(opt => {
        opt.classList.add('opacity-50');
        opt.classList.remove('ring-4', 'ring-blue-100', 'border-4', 'border-white');
    });
    if (el) {
        el.classList.remove('opacity-50');
        el.classList.add('ring-4', 'ring-blue-100', 'border-4', 'border-white');
    }
}

// Initial Animations
const styleElem = document.createElement('style');
styleElem.textContent = `
    @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(30px); }
        to { opacity: 1; transform: translateY(0); }
    }
`;
document.head.appendChild(styleElem);

