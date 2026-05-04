/**
 * MF_CORE ENGINE V5 - ELITE MOBILE EDITION
 * LEAD DEVELOPER: MATHEUS ARAUJO MACEDO
 */

const CORE_CONFIG = {
    URL: 'https://hzhjnvzzgskysswptzlx.supabase.co',
    KEY: 'sb_publishable_kKjKhA_wIo9Gsgc0di-C_Q_LKqxIi4e',
    TABLE: 'tarefas_escola'
};

const _client = supabase.createClient(CORE_CONFIG.URL, CORE_CONFIG.KEY);

const AppState = {
    user: null,
    tasks: [],
};

/**
 * [1] AUTENTICAÇÃO
 */
async function login() {
    const emailEl = document.getElementById('email');
    const passEl = document.getElementById('password');
    const btnEl = document.getElementById('login-btn');

    if (!emailEl.value || !passEl.value) {
        triggerNotification("ERRO: Preencha UID e KEY.", "error");
        return;
    }

    setLoading(true, btnEl, "AUTHENTICATING...");

    try {
        const { data, error } = await _client.auth.signInWithPassword({
            email: emailEl.value,
            password: passEl.value
        });

        if (error) throw error;

        AppState.user = data.user;
        triggerNotification(`SYSTEM ONLINE // BEM-VINDO`, "success");
        transitionToDashboard();
    } catch (err) {
        triggerNotification(`ACESSO NEGADO: Dados inválidos`, "error");
    } finally {
        setLoading(false, btnEl, "INITIALIZE_CORE");
    }
}

async function logout() {
    await _client.auth.signOut();
    window.location.reload();
}

/**
 * [2] CRUD (Supabase)
 */
async function loadDataPipeline() {
    try {
        const { data: tasks, error } = await _client
            .from(CORE_CONFIG.TABLE)
            .select('*')
            .order('inserido_em', { ascending: false });

        if (error) throw error;

        AppState.tasks = tasks;
        renderTaskEngine();
    } catch (err) {
        triggerNotification("ERRO DB: Falha na sincronização", "error");
    }
}

async function addTask() {
    const inputMateria = document.getElementById('materia');
    const inputCapitulo = document.getElementById('capitulo');
    const inputInicio = document.getElementById('data_inicio');
    const inputFim = document.getElementById('data_fim');
    const inputOrigem = document.getElementById('origem');

    if (!inputMateria.value || !inputCapitulo.value) {
        triggerNotification("AVISO: Disciplina e Módulo obrigatórios.", "error");
        return;
    }

    const payload = {
        user_id: AppState.user.id,
        materia: inputMateria.value.trim(),
        capitulo: inputCapitulo.value.trim(),
        data_inicio: inputInicio.value || new Date().toISOString().split('T')[0],
        data_fim: inputFim.value || null,
        origem: inputOrigem.value,
        concluida: false
    };

    const { error } = await _client.from(CORE_CONFIG.TABLE).insert([payload]);

    if (!error) {
        inputMateria.value = '';
        inputCapitulo.value = '';
        inputInicio.value = '';
        inputFim.value = '';
        
        triggerNotification("SUCESSO: Log injetado no sistema.", "success");
        
        // Em mobile, pode ser legal dar um scroll suave para a grid
        if(window.innerWidth <= 768) {
            document.querySelector('.data-grid').scrollIntoView({ behavior: 'smooth' });
        }
        
        loadDataPipeline();
    } else {
        triggerNotification(`FALHA: ${error.message}`, "error");
    }
}

async function toggleTaskStatus(id, currentStatus) {
    const { error } = await _client.from(CORE_CONFIG.TABLE).update({ concluida: !currentStatus }).eq('id', id);
    if (!error) loadDataPipeline();
}

async function deleteTaskEntry(id) {
    if (!confirm("CRÍTICO: Excluir este registro permanentemente?")) return;

    const { error } = await _client.from(CORE_CONFIG.TABLE).delete().eq('id', id);
    if (!error) {
        triggerNotification("INFO: Registro apagado.", "success");
        loadDataPipeline();
    }
}

/**
 * [3] RENDERIZAÇÃO DOM
 */
function renderTaskEngine() {
    const containerPending = document.getElementById('list-pending');
    const containerCompleted = document.getElementById('list-completed');
    
    let countAct = 0;
    let countDone = 0;

    containerPending.innerHTML = '';
    containerCompleted.innerHTML = '';

    AppState.tasks.forEach(task => {
        const card = document.createElement('div');
        card.className = `task-card ${task.concluida ? 'is-completed' : ''}`;
        card.innerHTML = `
            <span class="badge-source">${task.origem.toUpperCase()}</span>
            <h4>${task.materia}</h4>
            <div class="task-info">
                <p>MÓDULO: <b>${task.capitulo}</b></p>
                <p>TIMELINE: <b>${formatSmartDate(task.data_inicio)} — ${formatSmartDate(task.data_fim)}</b></p>
            </div>
            <div class="task-actions">
                <button onclick="toggleTaskStatus('${task.id}', ${task.concluida})" class="btn-card-action">
                    ${task.concluida ? 'REABRIR' : 'FINALIZAR'}
                </button>
                ${task.concluida ? `<button onclick="deleteTaskEntry('${task.id}')" class="btn-delete">DELETAR</button>` : ''}
            </div>
        `;

        if (task.concluida) {
            containerCompleted.appendChild(card);
            countDone++;
        } else {
            containerPending.appendChild(card);
            countAct++;
        }
    });

    document.getElementById('count-active').innerText = countAct;
    document.getElementById('count-done').innerText = countDone;
}

/**
 * [4] HELPERS
 */
function transitionToDashboard() {
    const auth = document.getElementById('auth-container');
    const app = document.getElementById('app-container');
    
    auth.style.opacity = '0';
    setTimeout(() => {
        auth.style.display = 'none';
        app.style.display = 'block';
        loadDataPipeline();
    }, 300);
}

function formatSmartDate(dateString) {
    if (!dateString) return "ABERTO";
    return new Date(dateString).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' });
}

function setLoading(state, element, text) {
    element.disabled = state;
    element.querySelector('.btn-text').innerText = text;
    element.style.opacity = state ? '0.6' : '1';
}

function triggerNotification(msg, type) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerText = msg;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(100%)';
        setTimeout(() => toast.remove(), 400);
    }, 3500);
}

// Boot
window.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await _client.auth.getSession();
    if (session) {
        AppState.user = session.user;
        transitionToDashboard();
    }
});