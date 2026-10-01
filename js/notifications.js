/* =========================================================
   GH Studio — Notifications & Smart Reminders System
   Calculates pending tasks, upcoming sessions & overdue debts
   ========================================================= */

const NotificationService = {
    notifications: [],
    readIds: new Set(JSON.parse(localStorage.getItem('gh_read_notifications') || '[]')),

    async init() {
        this._ensureDropdown();
        this._bindUI();
        await this.refresh();
    },

    _ensureDropdown() {
        let dropdown = document.getElementById('notificationsDropdown');
        if (!dropdown) {
            dropdown = document.createElement('div');
            dropdown.className = 'notifications-dropdown';
            dropdown.id = 'notificationsDropdown';
            const topBarActions = document.querySelector('.top-bar-actions');
            if (topBarActions) {
                topBarActions.appendChild(dropdown);
            } else {
                document.body.appendChild(dropdown);
            }
        }
        return dropdown;
    },

    async refresh() {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        const items = [];

        try {
            const [agendamentos, receber, clientes] = await Promise.all([
                DataStore.getAgendamentos().catch(() => []),
                DataStore.getValoresReceber().catch(() => []),
                DataStore.getClientes().catch(() => [])
            ]);

            const clientPhoneMap = {};
            clientes.forEach(c => { clientPhoneMap[c.nome] = c.telefone; });

            // 1. Sessões de Hoje
            agendamentos
                .filter(a => a.data === todayStr && a.status === 'agendado')
                .forEach(a => {
                    items.push({
                        id: `ag_today_${a.id}`,
                        type: 'today',
                        badge: 'Hoje',
                        title: `Sessão Hoje: ${a.cliente}`,
                        desc: `${a.horaInicio} às ${a.horaFim} • ${a.descricao}`,
                        date: a.data,
                        phone: clientPhoneMap[a.cliente] || null,
                        clientName: a.cliente,
                        action: {
                            label: 'Lembrar WhatsApp',
                            fn: `window.sendAppointmentReminder('${a.id}')`
                        }
                    });
                });

            // 2. Sessões de Amanhã
            agendamentos
                .filter(a => a.data === tomorrowStr && a.status === 'agendado')
                .forEach(a => {
                    items.push({
                        id: `ag_tomorrow_${a.id}`,
                        type: 'tomorrow',
                        badge: 'Amanhã',
                        title: `Sessão Amanhã: ${a.cliente}`,
                        desc: `${a.horaInicio} às ${a.horaFim} • ${a.descricao}`,
                        date: a.data,
                        phone: clientPhoneMap[a.cliente] || null,
                        clientName: a.cliente,
                        action: {
                            label: 'Confirmar WhatsApp',
                            fn: `window.sendAppointmentReminder('${a.id}')`
                        }
                    });
                });

            // 3. Pagamentos Vencidos ou Hoje
            receber
                .filter(r => (r.valorTotal - r.valorPago) > 0 && r.dataVencimento <= todayStr)
                .forEach(r => {
                    const pendente = r.valorTotal - r.valorPago;
                    const isLate = r.dataVencimento < todayStr;
                    items.push({
                        id: `rec_due_${r.id}`,
                        type: isLate ? 'alert' : 'warning',
                        badge: isLate ? 'Vencido' : 'Vence Hoje',
                        title: `Pagamento Pendente: ${r.cliente}`,
                        desc: `${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pendente)} • Ref: ${r.descricao}`,
                        date: r.dataVencimento,
                        phone: clientPhoneMap[r.cliente] || null,
                        clientName: r.cliente,
                        action: {
                            label: 'Cobrar no WhatsApp',
                            fn: `window.sendPaymentReminder('${r.id}')`
                        }
                    });
                });

            // 4. Alertas de Estoque Baixo ou Esgotado
            if (window.DataStore && typeof DataStore.getEstoqueAlertas === 'function') {
                const estoqueAlertas = await DataStore.getEstoqueAlertas().catch(() => []);
                estoqueAlertas.forEach(item => {
                    const qtd = parseFloat(item.quantidade) || 0;
                    const isEsgotado = qtd <= 0;
                    items.push({
                        id: `est_${item.id}_${qtd}`,
                        type: isEsgotado ? 'alert' : 'warning',
                        badge: isEsgotado ? 'Esgotado' : 'Estoque Baixo',
                        title: `📦 ${item.nome}`,
                        desc: isEsgotado 
                            ? `Item zerado no estúdio! Reabasteça antes das próximas sessões.` 
                            : `Apenas ${qtd} ${item.unidade || 'un'} restantes (mínimo: ${item.quantidadeMinima} ${item.unidade || 'un'}).`,
                        action: {
                            label: 'Ver Estoque',
                            fn: `window.navigateToPage ? window.navigateToPage('estoque') : null`
                        }
                    });
                });
            }
        } catch (e) {
            console.warn('Error calculating smart notifications:', e);
        }

        this.notifications = items;
        this._updateBadge();
        this._renderDropdown();
    },

    _updateBadge() {
        const btn = document.getElementById('btnNotifications');
        if (!btn) return;

        const unreadCount = this.notifications.filter(n => !this.readIds.has(n.id)).length;
        let badge = document.getElementById('notifBadge') || btn.querySelector('.notification-badge');

        if (unreadCount > 0) {
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'notification-badge';
                badge.id = 'notifBadge';
                btn.appendChild(badge);
            }
            badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
            badge.style.display = 'flex';
        } else if (badge) {
            badge.style.display = 'none';
        }
    },

    _renderDropdown() {
        const dropdown = this._ensureDropdown();
        const unreadList = this.notifications.filter(n => !this.readIds.has(n.id));

        if (this.notifications.length === 0) {
            dropdown.innerHTML = `
                <div class="notifications-header">
                    <span class="notifications-title">Notificações & Lembretes</span>
                </div>
                <div class="notifications-empty">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    <p>Tudo em ordem! Nenhum lembrete pendente.</p>
                </div>`;
            return;
        }

        dropdown.innerHTML = `
            <div class="notifications-header">
                <div>
                    <span class="notifications-title">Notificações</span>
                    <span class="notifications-count">${unreadList.length} novas</span>
                </div>
                <button class="btn-text-sm" id="btnMarkAllRead">Marcar todas como lidas</button>
            </div>
            <div class="notifications-list">
                ${this.notifications.map(n => {
                    const isRead = this.readIds.has(n.id);
                    return `
                    <div class="notification-item ${n.type} ${isRead ? 'read' : 'unread'}" data-id="${n.id}">
                        <div class="notif-badge-pill ${n.type}">${n.badge}</div>
                        <div class="notif-content">
                            <div class="notif-title">${n.title}</div>
                            <div class="notif-desc">${n.desc}</div>
                        </div>
                        ${n.action ? `
                        <div class="notif-actions">
                            <button class="btn-notif-action" onclick="event.stopPropagation(); ${n.action.fn}">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                                <span>${n.action.label}</span>
                            </button>
                        </div>` : ''}
                    </div>`;
                }).join('')}
            </div>`;

        const markBtn = dropdown.querySelector('#btnMarkAllRead');
        if (markBtn) {
            markBtn.onclick = () => {
                this.notifications.forEach(n => this.readIds.add(n.id));
                localStorage.setItem('gh_read_notifications', JSON.stringify([...this.readIds]));
                this._updateBadge();
                this._renderDropdown();
            };
        }
    },

    _bindUI() {
        const btn = document.getElementById('btnNotifications');
        if (!btn) return;

        this._ensureDropdown();

        btn.addEventListener('click', (e) => {
            window.toggleNotifications(e);
        });

        document.addEventListener('click', (e) => {
            const dropdown = document.getElementById('notificationsDropdown');
            if (dropdown && dropdown.classList.contains('active')) {
                if (!dropdown.contains(e.target) && !btn.contains(e.target)) {
                    dropdown.classList.remove('active');
                }
            }
        });
    }
};

// Global toggle function
window.toggleNotifications = function(e) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    const dropdown = NotificationService._ensureDropdown();
    const willOpen = !dropdown.classList.contains('active');
    dropdown.classList.toggle('active', willOpen);
    if (willOpen) {
        NotificationService.refresh();
    }
};

// Global export
window.NotificationService = NotificationService;

// Auto initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        NotificationService.init();
    });
} else {
    NotificationService.init();
}
