// ==========================================
// SELEÇÃO DE ELEMENTOS DO DOM
// ==========================================
const balanceEl = document.getElementById('total-balance');
const incomeEl = document.getElementById('total-income');
const expenseEl = document.getElementById('total-expense');
const dateDisplayEl = document.getElementById('current-date');
const themeToggleBtn = document.getElementById('theme-toggle');

const goalProgressBar = document.getElementById('goal-progress');
const goalTextEl = document.getElementById('goal-text');
const goalPercentEl = document.getElementById('goal-percent');

const form = document.getElementById('transaction-form');
const descriptionInput = document.getElementById('description');
const amountInput = document.getElementById('amount');
const typeInput = document.getElementById('type');
const categoryInput = document.getElementById('category');
const dateInput = document.getElementById('date');

const transactionsList = document.getElementById('transactions-list');
const emptyStateEl = document.getElementById('empty-state');
const searchInput = document.getElementById('search-input');
const filterTypeSelect = document.getElementById('filter-type');

// ==========================================
// ESTADO DO APLICATIVO
// ==========================================
let transactions = JSON.parse(localStorage.getItem('fintrack_transactions')) || [];
let currentTheme = localStorage.getItem('fintrack_theme') || 'dark';
let categoryChart = null;

// ==========================================
// INICIALIZAÇÃO
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // Configurar data atual
    initDate();
    
    // Configurar input de data do form para o dia de hoje
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;

    // Aplicar tema inicial
    applyTheme(currentTheme);

    // Inicializar visualização
    updateUI();

    // Adicionar Event Listeners
    form.addEventListener('submit', handleAddTransaction);
    themeToggleBtn.addEventListener('click', toggleTheme);
    searchInput.addEventListener('input', handleSearchAndFilter);
    filterTypeSelect.addEventListener('change', handleSearchAndFilter);
    transactionsList.addEventListener('click', handleDeleteClick);
});

// Exibe a data atual formatada em português
function initDate() {
    const options = { weekday: 'long', day: 'numeric', month: 'long' };
    const today = new Date();
    let dateStr = today.toLocaleDateString('pt-BR', options);
    // Capitalizar a primeira letra
    dateStr = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
    dateDisplayEl.innerHTML = `<i class="fa-regular fa-calendar-days"></i> ${dateStr}`;
}

// ==========================================
// OPERAÇÕES DE TRANSAÇÕES
// ==========================================

// Manipula o envio do formulário de transação
function handleAddTransaction(e) {
    e.preventDefault();

    const description = descriptionInput.value.trim();
    const amount = parseFloat(amountInput.value);
    const type = typeInput.value;
    const category = categoryInput.value;
    const date = dateInput.value;

    if (!description || isNaN(amount) || amount <= 0 || !type || !category || !date) {
        alert('Por favor, preencha todos os campos corretamente.');
        return;
    }

    const transaction = {
        id: generateID(),
        description,
        amount,
        type,
        category,
        date
    };

    transactions.push(transaction);
    saveToLocalStorage();
    
    // Atualizar UI
    updateUI();
    
    // Resetar Formulário
    form.reset();
    dateInput.value = new Date().toISOString().split('T')[0];
    descriptionInput.focus();

    // Pequeno feedback tátil/visual no botão de submit
    triggerSubmitFeedback();
}

// Gera um ID único simples
function generateID() {
    return '_' + Math.random().toString(36).substr(2, 9);
}

// Salva a lista de transações no LocalStorage
function saveToLocalStorage() {
    localStorage.setItem('fintrack_transactions', JSON.stringify(transactions));
}

// Manipula o clique na tabela de transações (deleção)
function handleDeleteClick(e) {
    // Verificar se o clique foi no botão de excluir ou no seu ícone
    const deleteBtn = e.target.closest('.btn-delete');
    if (!deleteBtn) return;

    const id = deleteBtn.dataset.id;
    
    // Animação de fade-out da linha antes de excluir
    const tr = deleteBtn.closest('tr');
    tr.style.transform = 'scale(0.95)';
    tr.style.opacity = '0';
    tr.style.transition = 'all 0.25s ease';

    setTimeout(() => {
        transactions = transactions.filter(t => t.id !== id);
        saveToLocalStorage();
        updateUI();
    }, 250);
}

// Feedback visual ao adicionar transação com sucesso
function triggerSubmitFeedback() {
    const btn = form.querySelector('.btn-submit');
    const originalText = btn.innerHTML;
    
    btn.style.background = 'var(--success)';
    btn.innerHTML = `<i class="fa-solid fa-circle-check"></i> Adicionado!`;
    
    setTimeout(() => {
        btn.style.background = '';
        btn.innerHTML = originalText;
    }, 1500);
}

// ==========================================
// ATUALIZAÇÃO DA UI & CÁLCULOS
// ==========================================

// Atualiza todas as métricas, gráficos e listagens
function updateUI() {
    // 1. Filtrar e ordenar transações por data (mais recentes primeiro)
    const sortedTransactions = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));

    // 2. Renderizar Lista
    renderTransactions(sortedTransactions);

    // 3. Atualizar Estatísticas Superiores (Saldo, Receita, Despesa, Meta)
    updateStatistics();

    // 4. Renderizar/Atualizar Gráfico de Categorias
    renderChart();
}

// Renderiza as transações na tabela
function renderTransactions(listToRender) {
    transactionsList.innerHTML = '';

    if (listToRender.length === 0) {
        emptyStateEl.style.display = 'flex';
        return;
    }

    emptyStateEl.style.display = 'none';

    listToRender.forEach(t => {
        const tr = document.createElement('tr');
        
        // Formatar valores monetários e data
        const formattedAmount = formatCurrency(t.amount);
        const formattedDate = formatDate(t.date);
        
        const typeClass = t.type === 'income' ? 'val-income' : 'val-expense';
        const typeSymbol = t.type === 'income' ? '+' : '-';
        
        // Mapeamento de classe de categoria para estilo CSS
        const categoryClassMap = {
            'Alimentação': 'tag-alimentacao',
            'Moradia': 'tag-moradia',
            'Transporte': 'tag-transporte',
            'Lazer': 'tag-lazer',
            'Salário': 'tag-salario',
            'Investimentos': 'tag-investimentos',
            'Outros': 'tag-outros'
        };

        const categoryTagClass = categoryClassMap[t.category] || 'tag-outros';
        
        // Mapeamento de ícones por categoria
        const categoryIconMap = {
            'Alimentação': 'fa-utensils',
            'Moradia': 'fa-house',
            'Transporte': 'fa-car-side',
            'Lazer': 'fa-gamepad',
            'Salário': 'fa-money-bill-wave',
            'Investimentos': 'fa-chart-line',
            'Outros': 'fa-folder-open'
        };
        
        const iconClass = categoryIconMap[t.category] || 'fa-folder-open';

        tr.innerHTML = `
            <td style="font-weight: 500;">${t.description}</td>
            <td>
                <span class="category-tag ${categoryTagClass}">
                    <i class="fa-solid ${iconClass}"></i> ${t.category}
                </span>
            </td>
            <td style="color: var(--text-muted);">${formattedDate}</td>
            <td class="${typeClass}">${typeSymbol} ${formattedAmount}</td>
            <td>
                <button class="btn-delete" data-id="${t.id}" title="Excluir Transação">
                    <i class="fa-regular fa-trash-can"></i>
                </button>
            </td>
        `;
        transactionsList.appendChild(tr);
    });
}

// Calcula e atualiza os displays de valores e a meta
function updateStatistics() {
    let income = 0;
    let expense = 0;

    transactions.forEach(t => {
        if (t.type === 'income') {
            income += t.amount;
        } else {
            expense += t.amount;
        }
    });

    const balance = income - expense;

    // Atualizar displays principais
    balanceEl.textContent = formatCurrency(balance);
    incomeEl.textContent = formatCurrency(income);
    expenseEl.textContent = formatCurrency(expense);

    // Ajustar cor e indicador visual do saldo principal
    const balanceCard = balanceEl.closest('.stat-card');
    const trendIndicator = balanceCard.querySelector('.trend');

    if (balance >= 0) {
        balanceEl.className = 'stat-value';
        trendIndicator.className = 'trend up';
        trendIndicator.innerHTML = `<i class="fa-solid fa-circle-up"></i> Saúde estável`;
    } else {
        balanceEl.className = 'stat-value text-danger';
        trendIndicator.className = 'trend down';
        trendIndicator.innerHTML = `<i class="fa-solid fa-circle-down"></i> Saldo Negativo`;
    }

    // Atualizar Meta Mensal (Meta: Guardar 20% do total de receitas)
    // Se o saldo for negativo, o progresso é 0%
    const goalTarget = income * 0.20;
    let currentSaved = balance;

    if (goalTarget <= 0) {
        // Sem receitas ainda
        goalProgressBar.style.width = '0%';
        goalTextEl.textContent = 'R$ 0,00 / R$ 0,00';
        goalPercentEl.textContent = '0%';
    } else {
        // Garantir que a poupança atual não seja negativa para o gráfico
        const displaySaved = Math.max(0, currentSaved);
        let progressPercent = Math.round((displaySaved / goalTarget) * 100);
        progressPercent = Math.min(100, progressPercent); // Limitar a 100% visualmente
        
        goalProgressBar.style.width = `${progressPercent}%`;
        goalTextEl.textContent = `${formatCurrency(displaySaved)} / ${formatCurrency(goalTarget)}`;
        goalPercentEl.textContent = `${progressPercent}%`;

        // Troca a cor da barra dependendo do alcance
        if (progressPercent >= 100) {
            goalProgressBar.style.background = 'var(--success)';
            goalPercentEl.style.color = 'var(--success)';
        } else if (progressPercent >= 50) {
            goalProgressBar.style.background = 'var(--primary)';
            goalPercentEl.style.color = 'var(--primary)';
        } else {
            goalProgressBar.style.background = 'var(--warning)';
            goalPercentEl.style.color = 'var(--warning)';
        }
    }
}

// Realiza a filtragem combinada de busca por texto e tipo de transação
function handleSearchAndFilter() {
    const searchText = searchInput.value.toLowerCase().trim();
    const filterType = filterTypeSelect.value;

    const filtered = transactions.filter(t => {
        const matchesSearch = t.description.toLowerCase().includes(searchText) || 
                              t.category.toLowerCase().includes(searchText);
        const matchesType = filterType === 'all' || t.type === filterType;
        
        return matchesSearch && matchesType;
    });

    // Ordenar e renderizar os resultados filtrados
    const sortedFiltered = filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    renderTransactions(sortedFiltered);
}

// ==========================================
// INTEGRAÇÃO DE GRÁFICOS (CHART.JS)
// ==========================================
function renderChart() {
    const canvas = document.getElementById('category-chart');
    if (!canvas) return;

    // Agrupar as despesas por categoria
    const categoryTotals = {};
    
    // Garantir que mostramos dados reais ou iniciais
    let hasExpenses = false;

    transactions.forEach(t => {
        if (t.type === 'expense') {
            hasExpenses = true;
            categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
        }
    });

    const labels = Object.keys(categoryTotals);
    const data = Object.values(categoryTotals);

    // Paleta de cores premium para o gráfico
    const chartColors = [
        '#f59e0b', // Alimentação (Amarelo/Laranja)
        '#3b82f6', // Moradia (Azul)
        '#6366f1', // Transporte (Índigo)
        '#ec4899', // Lazer (Rosa)
        '#10b981', // Salário (Verde) - caso seja listado como despesa por engano
        '#8b5cf6', // Investimentos (Roxo)
        '#6b7280'  // Outros (Cinza)
    ];

    // Se o gráfico já existir, destruí-lo antes de criar um novo para evitar bugs de sobreposição
    if (categoryChart) {
        categoryChart.destroy();
    }

    // Configurações dinâmicas de cores de acordo com o tema atual
    const isDark = document.body.classList.contains('dark-mode');
    const labelColor = isDark ? '#9ca3af' : '#4b5563';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';

    if (!hasExpenses) {
        // Renderizar um gráfico placeholder se não houver despesas cadastradas
        categoryChart = new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels: ['Nenhuma despesa'],
                datasets: [{
                    data: [1],
                    backgroundColor: [isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom',
                        labels: {
                            color: labelColor,
                            font: { family: 'Inter', size: 12 }
                        }
                    },
                    tooltip: { enabled: false }
                },
                cutout: '75%'
            }
        });
        return;
    }

    categoryChart = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: chartColors.slice(0, labels.length),
                borderColor: isDark ? '#1f2937' : '#ffffff',
                borderWidth: 2,
                hoverOffset: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        color: labelColor,
                        font: { family: 'Inter', size: 11, weight: '500' },
                        padding: 15,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const val = context.raw;
                            return ` R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                        }
                    },
                    backgroundColor: isDark ? '#1f2937' : '#ffffff',
                    titleColor: isDark ? '#ffffff' : '#1f2937',
                    bodyColor: isDark ? '#d1d5db' : '#4b5563',
                    borderColor: 'var(--bg-card-border)',
                    borderWidth: 1,
                    padding: 10,
                    boxPadding: 5
                }
            },
            cutout: '70%',
            animation: {
                animateScale: true,
                animateRotate: true
            }
        }
    });
}

// ==========================================
// CONFIGURAÇÕES DE TEMA (DARK / LIGHT MODE)
// ==========================================

function toggleTheme() {
    const isDark = document.body.classList.contains('dark-mode');
    const newTheme = isDark ? 'light' : 'dark';
    
    applyTheme(newTheme);
    localStorage.setItem('fintrack_theme', newTheme);
    
    // Atualizar as cores do gráfico
    renderChart();
}

function applyTheme(theme) {
    const icon = themeToggleBtn.querySelector('i');
    
    if (theme === 'light') {
        document.body.classList.remove('dark-mode');
        document.body.classList.add('light-mode');
        icon.className = 'fa-solid fa-sun';
    } else {
        document.body.classList.remove('light-mode');
        document.body.classList.add('dark-mode');
        icon.className = 'fa-solid fa-moon';
    }
}

// ==========================================
// FUNÇÕES AUXILIARES / FORMATADORES
// ==========================================

// Formata valores numéricos para moeda Real Brasileiro (BRL)
function formatCurrency(value) {
    return value.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

// Formata datas no formato AAAA-MM-DD para DD/MM/AAAA
function formatDate(dateStr) {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
}
