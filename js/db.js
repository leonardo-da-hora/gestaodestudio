/* =========================================================
   GH Studio — Database Module (Firestore + localStorage)
   Unified DataStore API
   ========================================================= */

// ── Helper: Generate unique ID ──
const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
};

// ── LocalDB: localStorage fallback ──
const LocalDB = {
    _get(collection) {
        const data = localStorage.getItem(`gh_${collection}`);
        return data ? JSON.parse(data) : [];
    },

    _set(collection, data) {
        localStorage.setItem(`gh_${collection}`, JSON.stringify(data));
    },

    async getAll(collection, filters = {}) {
        let items = this._get(collection);

        // Apply filters
        if (filters.orderBy) {
            const [field, dir] = filters.orderBy;
            items.sort((a, b) => {
                if (dir === 'desc') return a[field] > b[field] ? -1 : 1;
                return a[field] < b[field] ? -1 : 1;
            });
        }

        if (filters.where) {
            filters.where.forEach(([field, op, value]) => {
                items = items.filter(item => {
                    switch (op) {
                        case '==': return item[field] === value;
                        case '!=': return item[field] !== value;
                        case '>=': return item[field] >= value;
                        case '<=': return item[field] <= value;
                        case '>': return item[field] > value;
                        case '<': return item[field] < value;
                        default: return true;
                    }
                });
            });
        }

        if (filters.limit) {
            items = items.slice(0, filters.limit);
        }

        return items;
    },

    async getById(collection, id) {
        const items = this._get(collection);
        return items.find(i => String(i.id) === String(id)) || null;
    },

    async add(collection, data) {
        const items = this._get(collection);
        const newItem = { ...data, id: data.id || generateId(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        items.push(newItem);
        this._set(collection, items);
        return newItem;
    },

    async update(collection, id, data) {
        const items = this._get(collection);
        const index = items.findIndex(i => String(i.id) === String(id));
        if (index === -1) throw new Error('Item não encontrado');
        items[index] = { ...items[index], ...data, updatedAt: new Date().toISOString() };
        this._set(collection, items);
        return items[index];
    },

    async delete(collection, id) {
        let items = this._get(collection);
        items = items.filter(i => String(i.id) !== String(id));
        this._set(collection, items);
        return true;
    }
};

// ── FirestoreDB: Cloud database ──
const FirestoreDB = {
    _userPath(collection) {
        const uid = Auth.getUid();
        if (!uid) throw new Error('Usuário não autenticado');
        return `users/${uid}/${collection}`;
    },

    async getAll(collection, filters = {}) {
        let ref = db.collection(this._userPath(collection));

        const snapshot = await ref.get();
        let items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // In-memory where filtering avoids missing Firestore composite index errors
        if (filters.where && Array.isArray(filters.where)) {
            filters.where.forEach(([field, op, value]) => {
                items = items.filter(item => {
                    const itemVal = item[field];
                    switch (op) {
                        case '==': return itemVal === value;
                        case '!=': return itemVal !== value;
                        case '>=': return itemVal >= value;
                        case '<=': return itemVal <= value;
                        case '>': return itemVal > value;
                        case '<': return itemVal < value;
                        default: return true;
                    }
                });
            });
        }

        // In-memory ordering
        if (filters.orderBy && Array.isArray(filters.orderBy)) {
            const [field, dir] = filters.orderBy;
            const mult = (dir || 'asc').toLowerCase() === 'desc' ? -1 : 1;
            items.sort((a, b) => {
                const valA = a[field] ?? '';
                const valB = b[field] ?? '';
                if (valA === valB) return 0;
                return (valA < valB ? -1 : 1) * mult;
            });
        }

        if (filters.limit && typeof filters.limit === 'number') {
            items = items.slice(0, filters.limit);
        }

        return items;
    },

    async getById(collection, id) {
        const doc = await db.collection(this._userPath(collection)).doc(id).get();
        return doc.exists ? { id: doc.id, ...doc.data() } : null;
    },

    async add(collection, data) {
        const docData = { ...data, createdAt: firebase.firestore.FieldValue.serverTimestamp(), updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
        const ref = await db.collection(this._userPath(collection)).add(docData);
        return { id: ref.id, ...data };
    },

    async update(collection, id, data) {
        const docData = { ...data, updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
        await db.collection(this._userPath(collection)).doc(id).update(docData);
        return { id, ...data };
    },

    async delete(collection, id) {
        await db.collection(this._userPath(collection)).doc(id).delete();
        return true;
    },

    subscribeToChanges(collections, callback) {
        if (IS_DEMO_MODE || !db) return () => {};
        const unsubscribers = [];
        try {
            collections.forEach(col => {
                const unsub = db.collection(this._userPath(col)).onSnapshot((snapshot) => {
                    if (!snapshot.metadata.hasPendingWrites) {
                        callback(col);
                    }
                }, (err) => {
                    console.warn(`Firestore onSnapshot warning on ${col}:`, err);
                });
                unsubscribers.push(unsub);
            });
        } catch (e) {
            console.warn('subscribeToChanges error:', e);
        }
        return () => unsubscribers.forEach(u => typeof u === 'function' && u());
    }
};

// ── Unified DataStore ──
const DataStore = {
    _getDB() {
        if (IS_DEMO_MODE || !db || (typeof Auth !== 'undefined' && !Auth.getUid())) {
            return LocalDB;
        }
        return FirestoreDB;
    },

    // ── Clientes ──
    async getClientes() {
        try {
            let items = await this._getDB().getAll('clientes', { orderBy: ['nome', 'asc'] });
            
            // Se o banco estiver vazio, verificar backup local
            if (!items || items.length === 0) {
                try {
                    const local = localStorage.getItem('gh_clientes');
                    if (local) {
                        const parsed = JSON.parse(local);
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            items = parsed;
                        }
                    }
                } catch (le) {}
            }

            // Se ainda assim estiver vazio, inicializar os clientes padrão do estúdio
            if (!items || items.length === 0) {
                await this._seedDefaultClientes();
                items = await this._getDB().getAll('clientes', { orderBy: ['nome', 'asc'] });
            }

            if (Array.isArray(items) && items.length > 0) {
                try { localStorage.setItem('gh_clientes', JSON.stringify(items)); } catch (e) {}
            }
            return items || [];
        } catch (e) {
            console.warn('Could not read clientes from db, trying local backup:', e);
            try {
                const local = localStorage.getItem('gh_clientes');
                if (local) return JSON.parse(local);
            } catch (le) {}
            return [];
        }
    },

    async _seedDefaultClientes() {
        const clientesData = [
            { nome: 'Lucas Oliveira', telefone: '(11) 98765-4321', email: 'lucas@email.com', sessoes: 5, totalGasto: 4800, notas: 'Estilo Blackwork' },
            { nome: 'Mariana Santos', telefone: '(11) 97654-3210', email: 'mariana@email.com', sessoes: 3, totalGasto: 2700, notas: 'Fine Line Floral' },
            { nome: 'Rafael Costa', telefone: '(21) 99876-5432', email: 'rafael@email.com', sessoes: 2, totalGasto: 1800, notas: 'Fechamento de braço' },
            { nome: 'Juliana Ferreira', telefone: '(11) 91234-5678', email: 'juliana@email.com', sessoes: 4, totalGasto: 3500, notas: 'Tatuagem anatômica' },
            { nome: 'Pedro Almeida', telefone: '(11) 98877-6655', email: 'pedro@email.com', sessoes: 1, totalGasto: 600, notas: 'Primeira tattoo' },
            { nome: 'Camila Rodrigues', telefone: '(21) 93344-5566', email: 'camila@email.com', sessoes: 6, totalGasto: 5200, notas: 'Cliente VIP' },
            { nome: 'Diego Martins', telefone: '(11) 95566-7788', email: 'diego@email.com', sessoes: 2, totalGasto: 1500, notas: 'Old School tradicional' },
            { nome: 'Bianca Lima', telefone: '(11) 94455-6677', email: 'bianca@email.com', sessoes: 3, totalGasto: 2100, notas: 'Aquarela e botânico' }
        ];

        for (const c of clientesData) {
            try {
                await this._getDB().add('clientes', c);
            } catch (err) {
                await LocalDB.add('clientes', c);
            }
        }
        try {
            const all = await this._getDB().getAll('clientes');
            localStorage.setItem('gh_clientes', JSON.stringify(all));
        } catch (e) {}
    },

    async getClienteById(id) {
        return this._getDB().getById('clientes', id);
    },

    async addCliente(data) {
        const item = {
            nome: data.nome,
            telefone: data.telefone || '',
            email: data.email || '',
            notas: data.notas || '',
            sessoes: data.sessoes || 0,
            totalGasto: data.totalGasto || 0
        };

        let result = null;
        try {
            result = await this._getDB().add('clientes', item);
        } catch (e) {
            console.warn('Erro ao salvar no banco primário, usando LocalDB:', e);
            result = await LocalDB.add('clientes', item);
        }

        // Manter sempre sincronizado no localStorage
        try {
            const local = JSON.parse(localStorage.getItem('gh_clientes') || '[]');
            const exists = local.some(c => c.id === result.id);
            if (!exists) local.unshift(result);
            localStorage.setItem('gh_clientes', JSON.stringify(local));
        } catch (e) {}

        return result;
    },

    async updateCliente(id, data) {
        return this._getDB().update('clientes', id, data);
    },

    async deleteCliente(id) {
        await this.deleteAnamnese(id).catch(() => {});
        return this._getDB().delete('clientes', id);
    },

    // ── Termo de Consentimento & Ficha de Anamnese ──
    async saveAnamnese(clienteId, anamneseData) {
        if (!clienteId) throw new Error('ID do cliente obrigatório');
        const payload = {
            ...anamneseData,
            clienteId,
            assinado: true,
            updatedAt: new Date().toISOString()
        };
        // Update client record directly
        await this.updateCliente(clienteId, { anamnese: payload });
        // Also persist in anamneses collection
        try {
            const existing = await this._getDB().getById('anamneses', clienteId);
            if (existing) {
                await this._getDB().update('anamneses', clienteId, payload);
            } else {
                await this._getDB().add('anamneses', { id: clienteId, ...payload });
            }
        } catch (e) {
            console.warn('Could not mirror to anamneses collection:', e);
        }
        return payload;
    },

    async getAnamnese(clienteId) {
        if (!clienteId) return null;
        try {
            const cliente = await this.getClienteById(clienteId);
            if (cliente && cliente.anamnese) return cliente.anamnese;
            const anam = await this._getDB().getById('anamneses', clienteId);
            return anam || null;
        } catch (e) {
            console.warn('Error fetching anamnese:', e);
            return null;
        }
    },

    async deleteAnamnese(clienteId) {
        if (!clienteId) return;
        try {
            await this.updateCliente(clienteId, { anamnese: null });
            await this._getDB().delete('anamneses', clienteId).catch(() => {});
        } catch (e) {
            console.warn('Error deleting anamnese:', e);
        }
    },

    // ── Sincronização Dinâmica de Estatísticas do Cliente ──
    async syncClientStats(clientIdOrName) {
        if (!clientIdOrName) return;
        try {
            let cliente = null;
            if (typeof clientIdOrName === 'string') {
                cliente = await this.getClienteById(clientIdOrName);
                if (!cliente) {
                    const all = await this.getClientes();
                    const searchLower = clientIdOrName.trim().toLowerCase();
                    cliente = all.find(c => (c.nome || '').trim().toLowerCase() === searchLower);
                }
            } else if (clientIdOrName && clientIdOrName.id) {
                cliente = clientIdOrName;
            }

            if (!cliente) return;

            const [transacoes, agendamentos, sinais] = await Promise.all([
                this.getTransacoes(),
                this.getAgendamentos(),
                this.getSinais()
            ]);

            const clientNameLower = (cliente.nome || '').trim().toLowerCase();
            const clientId = cliente.id;

            const isMatch = (item) => {
                if (!item) return false;
                if (item.clienteId && item.clienteId === clientId) return true;
                if (item.cliente && clientNameLower && item.cliente.trim().toLowerCase() === clientNameLower) return true;
                return false;
            };

            const clientTxs = transacoes.filter(t => isMatch(t) && t.tipo === 'entrada' && t.status !== 'cancelado');
            const totalGasto = clientTxs.reduce((sum, t) => sum + (parseFloat(t.valor) || 0), 0);

            const clientAg = agendamentos.filter(a => isMatch(a) && a.status !== 'cancelado');
            const clientSi = sinais.filter(s => isMatch(s));

            let sessoes = Math.max(clientAg.length, clientSi.length);
            if (sessoes === 0 && clientTxs.length > 0) {
                const directSessions = clientTxs.filter(t => t.categoria !== 'restante');
                sessoes = directSessions.length || clientTxs.length;
            }

            await this.updateCliente(clientId, { totalGasto, sessoes });
            return { totalGasto, sessoes };
        } catch (e) {
            console.warn('Could not sync client stats:', e);
        }
    },

    async syncAllClientStats() {
        try {
            const [clientes, transacoes, agendamentos, sinais] = await Promise.all([
                this.getClientes(),
                this.getTransacoes(),
                this.getAgendamentos(),
                this.getSinais()
            ]);

            if (!clientes || clientes.length === 0) return;

            const updates = [];
            for (const c of clientes) {
                const clientNameLower = (c.nome || '').trim().toLowerCase();
                const clientId = c.id;

                const isMatch = (item) => {
                    if (!item) return false;
                    if (item.clienteId && item.clienteId === clientId) return true;
                    if (item.cliente && clientNameLower && item.cliente.trim().toLowerCase() === clientNameLower) return true;
                    return false;
                };

                const clientTxs = transacoes.filter(t => isMatch(t) && t.tipo === 'entrada' && t.status !== 'cancelado');
                const totalGasto = clientTxs.reduce((sum, t) => sum + (parseFloat(t.valor) || 0), 0);

                const clientAg = agendamentos.filter(a => isMatch(a) && a.status !== 'cancelado');
                const clientSi = sinais.filter(s => isMatch(s));

                let sessoes = Math.max(clientAg.length, clientSi.length);
                if (sessoes === 0 && clientTxs.length > 0) {
                    const directSessions = clientTxs.filter(t => t.categoria !== 'restante');
                    sessoes = directSessions.length || clientTxs.length;
                }

                if (c.totalGasto !== totalGasto || c.sessoes !== sessoes) {
                    c.totalGasto = totalGasto;
                    c.sessoes = sessoes;
                    updates.push(this.updateCliente(clientId, { totalGasto, sessoes }).catch(err => {
                        console.warn(`Could not sync stats for client ${c.nome}:`, err);
                    }));
                }
            }

            if (updates.length > 0) {
                await Promise.all(updates);
            }
        } catch (e) {
            console.error('Error syncing all client stats:', e);
        }
    },

    // ── Agendamentos ──
    async getAgendamentos(filters = {}) {
        const queryFilters = { orderBy: ['data', 'asc'] };
        if (filters.dateFrom) {
            queryFilters.where = queryFilters.where || [];
            queryFilters.where.push(['data', '>=', filters.dateFrom]);
        }
        if (filters.dateTo) {
            queryFilters.where = queryFilters.where || [];
            queryFilters.where.push(['data', '<=', filters.dateTo]);
        }
        if (filters.status) {
            queryFilters.where = queryFilters.where || [];
            queryFilters.where.push(['status', '==', filters.status]);
        }
        return this._getDB().getAll('agendamentos', queryFilters);
    },

    async addAgendamento(data) {
        const ag = await this._getDB().add('agendamentos', {
            clienteId: data.clienteId || '',
            cliente: data.cliente,
            descricao: data.descricao || '',
            data: data.data,
            horaInicio: data.horaInicio,
            horaFim: data.horaFim,
            valor: parseFloat(data.valor !== undefined ? data.valor : (data.valorTotal || 0)) || 0,
            valorTotal: parseFloat(data.valorTotal !== undefined ? data.valorTotal : (data.valor || 0)) || 0,
            valorSinal: parseFloat(data.valorSinal) || 0,
            sinalPago: data.sinalPago || 'sim',
            status: data.status || 'agendado',
            referencia: data.referencia || '',
            referenciaUrl: data.referenciaUrl || data.referencia || ''
        });
        const targetClient = data.clienteId || data.cliente;
        if (targetClient) await this.syncClientStats(targetClient);
        return ag;
    },

    async updateAgendamento(id, data) {
        const res = await this._getDB().update('agendamentos', id, data);
        await this.syncAllClientStats();
        return res;
    },

    async deleteAgendamento(id) {
        try {
            const item = await this._getDB().getById('agendamentos', id);
            if (item) {
                const [allSinais, allTxs, allReceber] = await Promise.all([
                    this.getSinais().catch(() => []),
                    this.getTransacoes().catch(() => []),
                    this.getValoresReceber().catch(() => [])
                ]);

                const clientName = (item.cliente || '').trim().toLowerCase();
                const clientId = item.clienteId || '';
                const apptDate = item.data;
                const apptDesc = (item.descricao || '').trim().toLowerCase();
                const apptSinalVal = parseFloat(item.valorSinal) || 0;

                const isClientMatch = (otherClient, otherClientId) => {
                    if (clientId && otherClientId && clientId === otherClientId) return true;
                    if (clientName && otherClient && otherClient.trim().toLowerCase() === clientName) return true;
                    return false;
                };

                // 1. Linked Sinais
                const linkedSinais = allSinais.filter(s => {
                    if (s.agendamentoId && s.agendamentoId === id) return true;
                    if (item.sinalId && s.id === item.sinalId) return true;
                    if (isClientMatch(s.cliente, s.clienteId)) {
                        if (s.dataSessao === apptDate || s.dataSinal === apptDate) return true;
                        if (apptSinalVal > 0 && Math.abs((parseFloat(s.valorSinal) || 0) - apptSinalVal) < 0.01) return true;
                    }
                    return false;
                });
                const linkedSinalIds = new Set(linkedSinais.map(s => s.id));
                const linkedTxIds = new Set();
                linkedSinais.forEach(s => { if (s.transacaoId) linkedTxIds.add(s.transacaoId); });

                // 2. Linked Transacoes (sinais pagos ou lançamentos vinculados)
                const linkedTxs = allTxs.filter(t => {
                    if (t.agendamentoId && t.agendamentoId === id) return true;
                    if (t.sinalId && linkedSinalIds.has(t.sinalId)) return true;
                    if (linkedTxIds.has(t.id)) return true;
                    if (isClientMatch(t.cliente, t.clienteId)) {
                        const isSinalTx = t.categoria === 'sinal' || (t.descricao && t.descricao.toLowerCase().includes('sinal'));
                        if (isSinalTx) {
                            if (apptSinalVal > 0 && Math.abs((parseFloat(t.valor) || 0) - apptSinalVal) < 0.01) return true;
                            if (t.data === apptDate) return true;
                        }
                    }
                    return false;
                });
                linkedTxs.forEach(t => linkedTxIds.add(t.id));

                // 3. Linked Valores a Receber (sinal pendente ou restante da sessão)
                const linkedReceber = allReceber.filter(vr => {
                    if (vr.agendamentoId && vr.agendamentoId === id) return true;
                    if (vr.sinalId && linkedSinalIds.has(vr.sinalId)) return true;
                    if (vr.transacaoId && linkedTxIds.has(vr.transacaoId)) return true;
                    if (isClientMatch(vr.cliente, vr.clienteId)) {
                        if (vr.dataSessao === apptDate) return true;
                        const vrDesc = (vr.descricao || '').toLowerCase();
                        if (apptDesc && vrDesc.includes(apptDesc)) return true;
                        if (vr.dataVencimento === apptDate && (vrDesc.includes('sinal') || vrDesc.includes('restante'))) return true;
                    }
                    return false;
                });

                for (const s of linkedSinais) {
                    await this._getDB().delete('sinais', s.id).catch(() => {});
                }
                for (const t of linkedTxs) {
                    await this._getDB().delete('transacoes', t.id).catch(() => {});
                }
                for (const vr of linkedReceber) {
                    await this._getDB().delete('valoresReceber', vr.id).catch(() => {});
                }
            }
        } catch (cascadeErr) {
            console.warn('Error during agendamento cascade cleanup:', cascadeErr);
        }

        const res = await this._getDB().delete('agendamentos', id);
        await this.syncAllClientStats();
        return res;
    },

    // ── Transações ──
    async getTransacoes(filters = {}) {
        const queryFilters = { orderBy: ['data', 'desc'] };
        queryFilters.where = [];

        if (filters.tipo) queryFilters.where.push(['tipo', '==', filters.tipo]);
        if (filters.metodo && filters.metodo !== 'todos') queryFilters.where.push(['metodo', '==', filters.metodo]);
        if (filters.dateFrom) queryFilters.where.push(['data', '>=', filters.dateFrom]);
        if (filters.dateTo) queryFilters.where.push(['data', '<=', filters.dateTo]);

        if (queryFilters.where.length === 0) delete queryFilters.where;
        return this._getDB().getAll('transacoes', queryFilters);
    },

    async addTransacao(data) {
        const transacao = await this._getDB().add('transacoes', {
            tipo: data.tipo,
            descricao: data.descricao,
            cliente: data.cliente || '-',
            clienteId: data.clienteId || '',
            valor: parseFloat(data.valor) || 0,
            metodo: data.metodo,
            data: data.data,
            categoria: data.categoria || '',
            status: data.status || (data.tipo === 'entrada' ? 'recebido' : 'pago'),
            sinalId: data.sinalId || '',
            agendamentoId: data.agendamentoId || ''
        });

        // Always sync client stats dynamically
        const targetClient = data.clienteId || data.cliente;
        if (targetClient && targetClient !== '-') {
            await this.syncClientStats(targetClient);
        }

        return transacao;
    },

    async updateTransacao(id, data) {
        const res = await this._getDB().update('transacoes', id, data);
        await this.syncAllClientStats();
        return res;
    },

    async deleteTransacao(id) {
        const res = await this._getDB().delete('transacoes', id);
        await this.syncAllClientStats();
        return res;
    },

    // ── Sinais / Adiantamentos ──
    async getSinais() {
        return this._getDB().getAll('sinais', { orderBy: ['dataSessao', 'asc'] });
    },

    async addSinal(data) {
        const s = await this._getDB().add('sinais', {
            clienteId: data.clienteId || '',
            cliente: data.cliente,
            descricao: data.descricao || '',
            valorTotal: parseFloat(data.valorTotal) || 0,
            valorSinal: parseFloat(data.valorSinal) || 0,
            dataSinal: data.dataSinal,
            dataSessao: data.dataSessao || '',
            dataVencimento: data.dataVencimento || '',
            metodo: data.metodo || 'pix',
            transacaoId: data.transacaoId || '',
            agendamentoId: data.agendamentoId || ''
        });
        const targetClient = data.clienteId || data.cliente;
        if (targetClient) await this.syncClientStats(targetClient);
        return s;
    },

    async updateSinal(id, data) {
        const res = await this._getDB().update('sinais', id, data);
        await this.syncAllClientStats();
        return res;
    },

    async deleteSinal(id) {
        const res = await this._getDB().delete('sinais', id);
        await this.syncAllClientStats();
        return res;
    },

    // ── Valores a Receber ──
    async getValoresReceber() {
        return this._getDB().getAll('valoresReceber', { orderBy: ['dataVencimento', 'asc'] });
    },

    async addValorReceber(data) {
        return this._getDB().add('valoresReceber', {
            clienteId: data.clienteId || '',
            cliente: data.cliente,
            descricao: data.descricao || '',
            valorTotal: parseFloat(data.valorTotal) || 0,
            valorPago: parseFloat(data.valorPago) || 0,
            dataVencimento: data.dataVencimento,
            dataSessao: data.dataSessao || '',
            sinalId: data.sinalId || '',
            transacaoId: data.transacaoId || '',
            agendamentoId: data.agendamentoId || ''
        });
    },

    async updateValorReceber(id, data) {
        return this._getDB().update('valoresReceber', id, data);
    },

    async deleteValorReceber(id) {
        return this._getDB().delete('valoresReceber', id);
    },

    // ── Galeria / Portfólio ──
    async getGaleria(filters = {}) {
        const queryFilters = { orderBy: ['data', 'desc'] };
        queryFilters.where = [];
        if (filters.estilo && filters.estilo !== 'todos') {
            queryFilters.where.push(['estilo', '==', filters.estilo]);
        }
        if (queryFilters.where.length === 0) delete queryFilters.where;
        return this._getDB().getAll('galeria', queryFilters);
    },

    async addGaleriaItem(data) {
        return this._getDB().add('galeria', {
            titulo: data.titulo || 'Sem título',
            estilo: data.estilo || 'blackwork',
            clienteNome: data.clienteNome || '-',
            clienteId: data.clienteId || '',
            imagemUrl: data.imagemUrl || '',
            data: data.data || new Date().toISOString().split('T')[0],
            descricao: data.descricao || '',
            curtidas: data.curtidas || 0
        });
    },

    async updateGaleriaItem(id, data) {
        return this._getDB().update('galeria', id, data);
    },

    async deleteGaleriaItem(id) {
        return this._getDB().delete('galeria', id);
    },

    // ── Dashboard Aggregations (Filter by Target Month or Current Month) ──
    async getDashboardTotals(targetYearMonth = null) {
        const transacoes = await this.getTransacoes();
        const receber = await this.getValoresReceber();

        // Target month (defaults to current calendar month YYYY-MM)
        const now = new Date();
        const curYear = now.getFullYear();
        const curMonth = now.getMonth() + 1;
        const curYM = `${curYear}-${String(curMonth).padStart(2, '0')}`;
        const activeYM = targetYearMonth || curYM;
        const [targetYear, targetMonth] = activeYM.split('-').map(Number);

        // Filter transactions for this specific month
        const monthTx = transacoes.filter(t => {
            if (!t.data) return false;
            const parts = t.data.split('-');
            if (parts.length < 2) return false;
            return parseInt(parts[0], 10) === targetYear && parseInt(parts[1], 10) === targetMonth;
        });

        const entradas = monthTx
            .filter(t => t.tipo === 'entrada' && t.status !== 'cancelado')
            .reduce((acc, t) => acc + (parseFloat(t.valor) || 0), 0);

        const saidas = monthTx
            .filter(t => t.tipo === 'saida')
            .reduce((acc, t) => acc + (parseFloat(t.valor) || 0), 0);

        const lucro = entradas - saidas;

        // Pendentes a receber
        const pendentesList = receber.filter(v => (v.valorTotal - v.valorPago) > 0);
        const aReceber = pendentesList.reduce((acc, v) => acc + (v.valorTotal - v.valorPago), 0);

        // Previous month for growth trend comparison
        const prevDate = new Date(targetYear, targetMonth - 2, 1);
        const prevYear = prevDate.getFullYear();
        const prevMonth = prevDate.getMonth() + 1;
        const prevMonthTx = transacoes.filter(t => {
            if (!t.data) return false;
            const parts = t.data.split('-');
            if (parts.length < 2) return false;
            return parseInt(parts[0], 10) === prevYear && parseInt(parts[1], 10) === prevMonth;
        });
        const prevEntradas = prevMonthTx
            .filter(t => t.tipo === 'entrada' && t.status !== 'cancelado')
            .reduce((acc, t) => acc + (parseFloat(t.valor) || 0), 0);

        // All-time totals for reference
        const allTimeEntradas = transacoes
            .filter(t => t.tipo === 'entrada' && t.status !== 'cancelado')
            .reduce((acc, t) => acc + (parseFloat(t.valor) || 0), 0);

        return {
            entradas,
            saidas,
            lucro,
            aReceber,
            pendentes: pendentesList.length,
            currentMonthEntradas: entradas,
            prevEntradas,
            allTimeEntradas,
            yearMonth: activeYM,
            targetYear,
            targetMonth,
            isCurrentMonth: activeYM === curYM
        };
    },

    // ── Meta Mensal ──
    async getMetaMensal(anoMes) {
        const key = anoMes || new Date().toISOString().slice(0, 7);
        try {
            const item = await this._getDB().getById('configuracoes', `meta_${key}`);
            if (item && item.valor !== undefined) return parseFloat(item.valor) || 0;
        } catch (e) {}
        const local = localStorage.getItem(`gh_meta_${key}`);
        if (local !== null) return parseFloat(local) || 0;
        return 10000; // default 10k
    },

    async setMetaMensal(valor, anoMes) {
        const key = anoMes || new Date().toISOString().slice(0, 7);
        const num = parseFloat(valor) || 0;
        localStorage.setItem(`gh_meta_${key}`, num);
        try {
            const existing = await this._getDB().getById('configuracoes', `meta_${key}`);
            if (existing) {
                await this._getDB().update('configuracoes', `meta_${key}`, { valor: num, mes: key });
            } else {
                await this._getDB().add('configuracoes', { id: `meta_${key}`, valor: num, mes: key });
            }
        } catch (e) {
            console.warn('Could not persist meta to db:', e);
        }
        return num;
    },

    // ── WhatsApp Config & Templates ──
    async getWhatsAppConfig() {
        try {
            const item = await this._getDB().getById('configuracoes', 'whatsapp_config');
            if (item) return item;
        } catch (e) {}
        const local = localStorage.getItem('gh_whatsapp_config');
        if (local) {
            try { return JSON.parse(local); } catch (e) {}
        }
        return {
            chavePix: '',
            nomeEstudio: 'GH Studio',
            instagram: '@ghstudio',
            telefoneEstudio: ''
        };
    },

    async setWhatsAppConfig(config) {
        localStorage.setItem('gh_whatsapp_config', JSON.stringify(config));
        try {
            const existing = await this._getDB().getById('configuracoes', 'whatsapp_config');
            if (existing) {
                await this._getDB().update('configuracoes', 'whatsapp_config', config);
            } else {
                await this._getDB().add('configuracoes', { id: 'whatsapp_config', ...config });
            }
        } catch (e) {}
        return config;
    },

    // ── Orçamentos Inacabados / Consultas ──
    async getOrcamentos() {
        try {
            const items = await this._getDB().getAll('orcamentos', { orderBy: ['data', 'desc'] });
            if (Array.isArray(items) && items.length > 0) {
                try { localStorage.setItem('gh_orcamentos', JSON.stringify(items)); } catch (e) {}
                return items;
            }
        } catch (e) {
            console.warn('Could not read orcamentos from db, trying local backup:', e);
        }
        try {
            const local = localStorage.getItem('gh_orcamentos');
            if (local) return JSON.parse(local);
        } catch (e) {}
        return [];
    },

    async addOrcamento(data) {
        const item = {
            cliente: data.cliente || '',
            clienteId: data.clienteId || '',
            telefone: data.telefone || '',
            descricao: data.descricao || '',
            estilo: data.estilo || '',
            valorEstimado: parseFloat(data.valorEstimado) || 0,
            status: data.status || 'pendente', // 'pendente', 'em_negociacao', 'fechado', 'perdido'
            data: data.data || new Date().toISOString().split('T')[0],
            notas: data.notas || ''
        };

        let addedItem = null;
        try {
            addedItem = await this._getDB().add('orcamentos', item);
        } catch (err) {
            console.warn('Firestore add orcamento error, saving to local:', err);
            addedItem = { ...item, id: 'orc_' + Date.now() };
        }

        // Keep local backup synchronized
        try {
            const local = JSON.parse(localStorage.getItem('gh_orcamentos') || '[]');
            const exists = local.some(o => o.id === addedItem.id);
            if (!exists) local.unshift(addedItem);
            localStorage.setItem('gh_orcamentos', JSON.stringify(local));
        } catch (e) {}

        return addedItem;
    },

    async updateOrcamento(id, data) {
        try {
            const local = JSON.parse(localStorage.getItem('gh_orcamentos') || '[]');
            const idx = local.findIndex(o => o.id === id);
            if (idx !== -1) {
                local[idx] = { ...local[idx], ...data };
                localStorage.setItem('gh_orcamentos', JSON.stringify(local));
            }
        } catch (e) {}
        try {
            return await this._getDB().update('orcamentos', id, data);
        } catch (e) {
            return { id, ...data };
        }
    },

    async deleteOrcamento(id) {
        try {
            const local = JSON.parse(localStorage.getItem('gh_orcamentos') || '[]');
            const filtered = local.filter(o => o.id !== id);
            localStorage.setItem('gh_orcamentos', JSON.stringify(filtered));
        } catch (e) {}
        try {
            return await this._getDB().delete('orcamentos', id);
        } catch (e) {
            return true;
        }
    },

    // ── Controle de Estoque & Insumos ──
    async getEstoque(filters = {}) {
        try {
            let items = await this._getDB().getAll('estoque', { orderBy: ['nome', 'asc'] });
            if (Array.isArray(items) && items.length > 0) {
                try { localStorage.setItem('gh_estoque', JSON.stringify(items)); } catch (e) {}
            } else {
                try {
                    const local = localStorage.getItem('gh_estoque');
                    if (local) items = JSON.parse(local);
                } catch (e) {}
            }

            if (!items || items.length === 0) {
                await this.seedDefaultEstoque();
                items = await this._getDB().getAll('estoque', { orderBy: ['nome', 'asc'] });
            }

            if (filters.categoria && filters.categoria !== 'todos') {
                items = items.filter(i => i.categoria === filters.categoria);
            }
            if (filters.status && filters.status !== 'todos') {
                if (filters.status === 'esgotado') {
                    items = items.filter(i => (parseFloat(i.quantidade) || 0) <= 0);
                } else if (filters.status === 'baixo') {
                    items = items.filter(i => (parseFloat(i.quantidade) || 0) > 0 && (parseFloat(i.quantidade) || 0) <= (parseFloat(i.quantidadeMinima) || 0));
                } else if (filters.status === 'normal') {
                    items = items.filter(i => (parseFloat(i.quantidade) || 0) > (parseFloat(i.quantidadeMinima) || 0));
                }
            }
            if (filters.search) {
                const s = filters.search.toLowerCase();
                items = items.filter(i => 
                    (i.nome && i.nome.toLowerCase().includes(s)) ||
                    (i.marca && i.marca.toLowerCase().includes(s)) ||
                    (i.categoria && i.categoria.toLowerCase().includes(s))
                );
            }
            return items;
        } catch (e) {
            console.warn('Error fetching estoque:', e);
            try {
                const local = localStorage.getItem('gh_estoque');
                return local ? JSON.parse(local) : [];
            } catch (err) {
                return [];
            }
        }
    },

    async getEstoqueItemById(id) {
        return this._getDB().getById('estoque', id);
    },

    async addEstoqueItem(data) {
        const item = {
            nome: data.nome || 'Novo Material',
            categoria: data.categoria || 'geral', // agulhas, tintas, epi, preparacao, aftercare, geral
            quantidade: parseFloat(data.quantidade) || 0,
            quantidadeMinima: parseFloat(data.quantidadeMinima) || 1,
            unidade: data.unidade || 'un', // un, cx, frasco, pacote, rolo, pote
            precoCusto: parseFloat(data.precoCusto) || 0,
            marca: data.marca || '',
            fornecedor: data.fornecedor || '',
            notas: data.notas || '',
            ultimaMovimentacao: new Date().toISOString()
        };
        const res = await this._getDB().add('estoque', item);
        try {
            const all = await this.getEstoque();
            localStorage.setItem('gh_estoque', JSON.stringify(all));
        } catch (e) {}
        return res;
    },

    async updateEstoqueItem(id, data) {
        const payload = {
            ...data,
            quantidade: parseFloat(data.quantidade !== undefined ? data.quantidade : 0),
            quantidadeMinima: parseFloat(data.quantidadeMinima !== undefined ? data.quantidadeMinima : 1),
            precoCusto: parseFloat(data.precoCusto !== undefined ? data.precoCusto : 0),
            ultimaMovimentacao: new Date().toISOString()
        };
        const res = await this._getDB().update('estoque', id, payload);
        try {
            const all = await this.getEstoque();
            localStorage.setItem('gh_estoque', JSON.stringify(all));
        } catch (e) {}
        return res;
    },

    async deleteEstoqueItem(id) {
        const res = await this._getDB().delete('estoque', id);
        try {
            const all = await this.getEstoque();
            localStorage.setItem('gh_estoque', JSON.stringify(all));
        } catch (e) {}
        return res;
    },

    async ajustarEstoque(id, delta, motivo = 'Ajuste manual', gerarDespesa = false, despesaInfo = null) {
        const item = await this.getEstoqueItemById(id);
        if (!item) throw new Error('Item de estoque não encontrado');
        const novaQtd = Math.max((parseFloat(item.quantidade) || 0) + delta, 0);
        await this.updateEstoqueItem(id, { quantidade: novaQtd });

        // Optionally create transaction expense if it was a purchase
        if (gerarDespesa && delta > 0 && despesaInfo) {
            const valorTotal = parseFloat(despesaInfo.valor) || (delta * (parseFloat(item.precoCusto) || 0));
            if (valorTotal > 0) {
                await this.addTransacao({
                    tipo: 'saida',
                    descricao: despesaInfo.descricao || `Compra de estoque: ${delta} ${item.unidade} de ${item.nome}`,
                    cliente: '-',
                    valor: valorTotal,
                    metodo: despesaInfo.metodo || 'pix',
                    data: despesaInfo.data || new Date().toISOString().split('T')[0],
                    categoria: item.categoria === 'epi' ? 'epi' : 'materiais',
                    status: 'pago'
                });
            }
        }

        return { item, novaQtd };
    },

    async getEstoqueAlertas() {
        try {
            const itens = await this.getEstoque();
            return itens.filter(i => {
                const qtd = parseFloat(i.quantidade) || 0;
                const min = parseFloat(i.quantidadeMinima) || 0;
                return qtd <= min;
            });
        } catch (e) {
            return [];
        }
    },

    async seedDefaultEstoque() {
        const defaultItems = [
            { nome: 'Cartuchos de Agulha 3RL (Caixa c/ 20)', categoria: 'agulhas', quantidade: 8, quantidadeMinima: 3, unidade: 'cx', precoCusto: 65.00, marca: 'Aston / Electric Ink', fornecedor: 'Tattoo Supply SP', notas: 'Uso diário em Fine Line' },
            { nome: 'Cartuchos de Agulha 7RS (Caixa c/ 20)', categoria: 'agulhas', quantidade: 2, quantidadeMinima: 4, unidade: 'cx', precoCusto: 65.00, marca: 'Aston', fornecedor: 'Tattoo Supply SP', notas: 'Uso frequente em sombreamento' },
            { nome: 'Tinta Dynamic Triple Black (240ml)', categoria: 'tintas', quantidade: 3, quantidadeMinima: 1, unidade: 'frasco', precoCusto: 180.00, marca: 'Dynamic Ink', fornecedor: 'Importadora Tattoo', notas: 'Preto puro para traço e preenchimento' },
            { nome: 'Tinta Starbrite Scarlet Red (30ml)', categoria: 'tintas', quantidade: 1, quantidadeMinima: 2, unidade: 'frasco', precoCusto: 75.00, marca: 'Starbrite', fornecedor: 'Importadora Tattoo', notas: 'Vermelho vibrante' },
            { nome: 'Luvas Nitrílicas Pretas M (Caixa c/ 100)', categoria: 'epi', quantidade: 5, quantidadeMinima: 3, unidade: 'cx', precoCusto: 48.00, marca: 'Unigloves', fornecedor: 'Dental Distribuidora', notas: 'Tamanho M - Não estéril' },
            { nome: 'Vaselina Especial Tatuador 500g', categoria: 'aftercare', quantidade: 0, quantidadeMinima: 2, unidade: 'pote', precoCusto: 38.00, marca: 'Mboah', fornecedor: 'Tattoo Supply SP', notas: 'Zero impurezas - Com vitamina E' },
            { nome: 'Papel Hectográfico U-20 Transfer (100 folhas)', categoria: 'preparacao', quantidade: 45, quantidadeMinima: 20, unidade: 'un', precoCusto: 1.50, marca: 'U-20', fornecedor: 'Papelaria Técnica', notas: 'Para estêncil termocopiadora e manual' },
            { nome: 'Bobina Filme Plástico PVC (300m)', categoria: 'preparacao', quantidade: 2, quantidadeMinima: 1, unidade: 'rolo', precoCusto: 32.00, marca: 'Alpfilm', fornecedor: 'Distribuidora Embalagens', notas: 'Proteção de bancada, macas e cabos' }
        ];

        for (const item of defaultItems) {
            await this._getDB().add('estoque', {
                ...item,
                ultimaMovimentacao: new Date().toISOString()
            });
        }
    },

    // ── Seed Demo Data ──
    async seedDemoData() {
        // Check if data already exists
        const existingClientes = await this.getClientes();
        if (existingClientes.length > 0) return false;

        console.log('🌱 Seeding demo data...');

        // Seed Clientes
        const clientesData = [
            { nome: 'Lucas Oliveira', telefone: '(11) 98765-4321', email: 'lucas@email.com', sessoes: 5, totalGasto: 4800 },
            { nome: 'Mariana Santos', telefone: '(11) 97654-3210', email: 'mariana@email.com', sessoes: 3, totalGasto: 2700 },
            { nome: 'Rafael Costa', telefone: '(21) 99876-5432', email: 'rafael@email.com', sessoes: 2, totalGasto: 1800 },
            { nome: 'Juliana Ferreira', telefone: '(11) 91234-5678', email: 'juliana@email.com', sessoes: 4, totalGasto: 3500 },
            { nome: 'Pedro Almeida', telefone: '(11) 98877-6655', email: 'pedro@email.com', sessoes: 1, totalGasto: 600 },
            { nome: 'Camila Rodrigues', telefone: '(21) 93344-5566', email: 'camila@email.com', sessoes: 6, totalGasto: 5200 },
            { nome: 'Diego Martins', telefone: '(11) 95566-7788', email: 'diego@email.com', sessoes: 2, totalGasto: 1500 },
            { nome: 'Bianca Lima', telefone: '(11) 94455-6677', email: 'bianca@email.com', sessoes: 3, totalGasto: 2100 },
            { nome: 'Thiago Nascimento', telefone: '(21) 92233-4455', email: 'thiago@email.com', sessoes: 1, totalGasto: 800 },
            { nome: 'Amanda Souza', telefone: '(11) 96677-8899', email: 'amanda@email.com', sessoes: 4, totalGasto: 3200 },
        ];
        for (const c of clientesData) {
            await this._getDB().add('clientes', { ...c, notas: '' });
        }

        // Seed Agendamentos
        const agendamentosData = [
            { cliente: 'Lucas Oliveira', descricao: 'Leão realista no antebraço direito', data: '2026-09-24', horaInicio: '09:00', horaFim: '13:00', valor: 1200, status: 'agendado', referenciaUrl: 'assets/tattoo_lion.jpg' },
            { cliente: 'Mariana Santos', descricao: 'Floral delicado no ombro', data: '2026-09-24', horaInicio: '14:30', horaFim: '18:00', valor: 900, status: 'agendado', referenciaUrl: 'assets/tattoo_floral.jpg' },
            { cliente: 'Rafael Costa', descricao: 'Samurai blackwork na panturrilha', data: '2026-09-25', horaInicio: '10:00', horaFim: '14:00', valor: 1100, status: 'agendado', referenciaUrl: '' },
            { cliente: 'Juliana Ferreira', descricao: 'Borboleta fine line na costela', data: '2026-09-25', horaInicio: '15:00', horaFim: '17:30', valor: 700, status: 'agendado', referenciaUrl: '' },
            { cliente: 'Pedro Almeida', descricao: 'Escrita em letra cursiva no pulso', data: '2026-09-26', horaInicio: '10:00', horaFim: '11:30', valor: 350, status: 'agendado', referenciaUrl: '' },
            { cliente: 'Camila Rodrigues', descricao: 'Retoque no dragão oriental - manga', data: '2026-09-26', horaInicio: '13:00', horaFim: '17:00', valor: 800, status: 'agendado', referenciaUrl: 'assets/tattoo_dragon.jpg' },
            { cliente: 'Diego Martins', descricao: 'Caveira mexicana old school no braço', data: '2026-09-27', horaInicio: '09:30', horaFim: '13:00', valor: 950, status: 'agendado', referenciaUrl: '' },
            { cliente: 'Bianca Lima', descricao: 'Mandala pontilhismo no ombro', data: '2026-09-28', horaInicio: '11:00', horaFim: '14:30', valor: 650, status: 'agendado', referenciaUrl: '' },
            { cliente: 'Thiago Nascimento', descricao: 'Lobo geométrico no peito', data: '2026-09-29', horaInicio: '10:00', horaFim: '15:00', valor: 1400, status: 'agendado', referenciaUrl: '' },
            { cliente: 'Amanda Souza', descricao: 'Fênix neo-traditional na coxa', data: '2026-09-30', horaInicio: '09:00', horaFim: '14:00', valor: 1300, status: 'agendado', referenciaUrl: '' },
            { cliente: 'Lucas Oliveira', descricao: 'Fechamento de braço tribal', data: '2026-09-20', horaInicio: '09:00', horaFim: '16:00', valor: 2500, status: 'concluido', referenciaUrl: '' },
            { cliente: 'Camila Rodrigues', descricao: 'Rosa com espinhos na mão', data: '2026-09-19', horaInicio: '14:00', horaFim: '17:00', valor: 600, status: 'concluido', referenciaUrl: '' },
            { cliente: 'Juliana Ferreira', descricao: 'Coração anatômico no antebraço', data: '2026-09-22', horaInicio: '10:00', horaFim: '13:00', valor: 800, status: 'concluido', referenciaUrl: '' },
            { cliente: 'Mariana Santos', descricao: 'Constelação minimalista', data: '2026-09-21', horaInicio: '11:00', horaFim: '12:30', valor: 350, status: 'cancelado', referenciaUrl: '' },
        ];
        for (const a of agendamentosData) {
            await this._getDB().add('agendamentos', { ...a, clienteId: '', referencia: a.referenciaUrl });
        }

        // Seed Transações
        const transacoesData = [
            { tipo: 'entrada', descricao: 'Fechamento de braço tribal', cliente: 'Lucas Oliveira', valor: 2500, metodo: 'pix', data: '2026-09-20', categoria: '', status: 'recebido' },
            { tipo: 'entrada', descricao: 'Rosa com espinhos na mão', cliente: 'Camila Rodrigues', valor: 600, metodo: 'credito', data: '2026-09-19', categoria: '', status: 'recebido' },
            { tipo: 'entrada', descricao: 'Coração anatômico no antebraço', cliente: 'Juliana Ferreira', valor: 500, metodo: 'pix', data: '2026-09-22', categoria: '', status: 'parcial' },
            { tipo: 'entrada', descricao: 'Águia realista ombro', cliente: 'Bruno Cardoso', valor: 1800, metodo: 'pix', data: '2026-09-15', categoria: '', status: 'recebido' },
            { tipo: 'entrada', descricao: 'Lettering "Família" costela', cliente: 'Fernanda Dias', valor: 400, metodo: 'dinheiro', data: '2026-09-14', categoria: '', status: 'recebido' },
            { tipo: 'entrada', descricao: 'Dragão oriental manga completa', cliente: 'Camila Rodrigues', valor: 3000, metodo: 'credito', data: '2026-09-10', categoria: '', status: 'recebido' },
            { tipo: 'entrada', descricao: 'Geométrico antebraço', cliente: 'Marcos Paulo', valor: 700, metodo: 'debito', data: '2026-09-08', categoria: '', status: 'recebido' },
            { tipo: 'entrada', descricao: 'Retrato realista pet', cliente: 'Ana Clara', valor: 1200, metodo: 'pix', data: '2026-09-05', categoria: '', status: 'recebido' },
            { tipo: 'entrada', descricao: 'Cover-up floral', cliente: 'Patrícia Melo', valor: 950, metodo: 'pix', data: '2026-09-03', categoria: '', status: 'recebido' },
            { tipo: 'saida', descricao: 'Agulhas RL e RS - caixa', cliente: '-', valor: 280, metodo: 'pix', data: '2026-09-01', categoria: 'materiais', status: 'pago' },
            { tipo: 'saida', descricao: 'Tintas Intenze - 10 cores', cliente: '-', valor: 450, metodo: 'credito', data: '2026-09-02', categoria: 'materiais', status: 'pago' },
            { tipo: 'saida', descricao: 'Batoques descartáveis 500un', cliente: '-', valor: 85, metodo: 'pix', data: '2026-09-03', categoria: 'materiais', status: 'pago' },
            { tipo: 'saida', descricao: 'Luvas, máscara, avental - EPIs', cliente: '-', valor: 190, metodo: 'debito', data: '2026-09-05', categoria: 'epi', status: 'pago' },
            { tipo: 'saida', descricao: 'Aluguel do estúdio - Setembro', cliente: '-', valor: 2200, metodo: 'pix', data: '2026-09-05', categoria: 'aluguel', status: 'pago' },
            { tipo: 'saida', descricao: 'Energia elétrica - Setembro', cliente: '-', valor: 380, metodo: 'pix', data: '2026-09-10', categoria: 'energia', status: 'pago' },
            { tipo: 'saida', descricao: 'Internet fibra - Setembro', cliente: '-', valor: 150, metodo: 'debito', data: '2026-09-10', categoria: 'internet', status: 'pago' },
            { tipo: 'saida', descricao: 'Papel transfer e stencil', cliente: '-', valor: 120, metodo: 'pix', data: '2026-09-12', categoria: 'materiais', status: 'pago' },
            { tipo: 'saida', descricao: 'Manutenção máquina rotativa', cliente: '-', valor: 350, metodo: 'dinheiro', data: '2026-09-18', categoria: 'manutencao', status: 'pago' },
            // Transações do Mês Atual (Outubro)
            { tipo: 'entrada', descricao: 'Tatuagem Serpente Oriental', cliente: 'Lucas Oliveira', valor: 1800, metodo: 'pix', data: '2026-10-01', categoria: '', status: 'recebido' },
            { tipo: 'entrada', descricao: 'Sessão Lettering Minimalista', cliente: 'Amanda Souza', valor: 650, metodo: 'pix', data: '2026-10-01', categoria: '', status: 'recebido' },
            { tipo: 'entrada', descricao: 'Sinal Lobo Realista', cliente: 'Thiago Nascimento', valor: 400, metodo: 'pix', data: '2026-10-01', categoria: 'sinal', status: 'recebido' },
            { tipo: 'saida', descricao: 'Reposição Luvas e Agulhas (EPIs)', cliente: '-', valor: 320, metodo: 'pix', data: '2026-10-01', categoria: 'materiais', status: 'pago' },
        ];
        for (const t of transacoesData) {
            await this._getDB().add('transacoes', { ...t, clienteId: '' });
        }

        // Seed Sinais
        const sinaisData = [
            { cliente: 'Lucas Oliveira', descricao: 'Leão realista no antebraço', valorTotal: 1200, valorSinal: 300, dataSinal: '2026-09-18', dataSessao: '2026-09-24', metodo: 'pix' },
            { cliente: 'Rafael Costa', descricao: 'Samurai blackwork panturrilha', valorTotal: 1100, valorSinal: 250, dataSinal: '2026-09-15', dataSessao: '2026-09-25', metodo: 'pix' },
            { cliente: 'Diego Martins', descricao: 'Caveira mexicana old school', valorTotal: 950, valorSinal: 200, dataSinal: '2026-09-20', dataSessao: '2026-09-27', metodo: 'dinheiro' },
            { cliente: 'Thiago Nascimento', descricao: 'Lobo geométrico no peito', valorTotal: 1400, valorSinal: 400, dataSinal: '2026-09-22', dataSessao: '2026-09-29', metodo: 'credito' },
            { cliente: 'Amanda Souza', descricao: 'Fênix neo-traditional coxa', valorTotal: 1300, valorSinal: 300, dataSinal: '2026-09-19', dataSessao: '2026-09-30', metodo: 'pix' },
        ];
        for (const s of sinaisData) {
            await this._getDB().add('sinais', { ...s, clienteId: '' });
        }

        // Seed Valores a Receber
        const receberData = [
            { cliente: 'Juliana Ferreira', descricao: 'Coração anatômico no antebraço', valorTotal: 800, valorPago: 500, dataVencimento: '2026-09-29', dataSessao: '2026-09-22' },
            { cliente: 'Bianca Lima', descricao: 'Flores em aquarela antebraço', valorTotal: 700, valorPago: 200, dataVencimento: '2026-09-20', dataSessao: '2026-09-13' },
            { cliente: 'Pedro Almeida', descricao: 'Tribal ombro - 2ª sessão', valorTotal: 600, valorPago: 0, dataVencimento: '2026-09-25', dataSessao: '2026-09-08' },
        ];
        for (const r of receberData) {
            await this._getDB().add('valoresReceber', { ...r, clienteId: '' });
        }

        // Seed Galeria (Portfólio)
        const galeriaData = [
            {
                titulo: 'Leão Geométrico & Blackwork',
                estilo: 'blackwork',
                clienteNome: 'Lucas Oliveira',
                imagemUrl: 'assets/tattoo_lion.jpg',
                data: '2026-09-20',
                curtidas: 48,
                descricao: 'Trabalho de 6h no antebraço. Agulhas 3RL para detalhes e 7RS para whipped shading.'
            },
            {
                titulo: 'Floral Botânico Delicado',
                estilo: 'fineline',
                clienteNome: 'Mariana Santos',
                imagemUrl: 'assets/tattoo_floral.jpg',
                data: '2026-09-18',
                curtidas: 63,
                descricao: 'Composição de flores silvestres e folhas fluidas no ombro. Linhas finas 1RL e 3RL.'
            },
            {
                titulo: 'Dragão Oriental Irezumi',
                estilo: 'oriental',
                clienteNome: 'Camila Rodrigues',
                imagemUrl: 'assets/tattoo_dragon.jpg',
                data: '2026-09-10',
                curtidas: 91,
                descricao: 'Manga inteira estilo oriental japonês com ondas, escamas detalhadas e toques em carmim.'
            }
        ];
        for (const g of galeriaData) {
            await this._getDB().add('galeria', g);
        }

        console.log('✅ Demo data seeded successfully!');
        return true;
    },

    // ── Clear all data ──
    async clearAllData() {
        const collections = ['clientes', 'agendamentos', 'transacoes', 'sinais', 'valoresReceber', 'galeria', 'orcamentos', 'estoque'];
        if (IS_DEMO_MODE) {
            collections.forEach(col => {
                localStorage.removeItem(`gh_${col}`);
            });
            return true;
        }

        try {
            for (const col of collections) {
                const items = await FirestoreDB.getAll(col);
                for (const item of items) {
                    await FirestoreDB.delete(col, item.id);
                }
            }
            return true;
        } catch (e) {
            console.error('Error clearing Firestore data:', e);
            return false;
        }
    },

    // ── Realtime Listener for multi-device sync (PC <-> Mobile) ──
    subscribeToChanges(callback) {
        if (IS_DEMO_MODE || !db) return () => {};
        const collections = ['clientes', 'agendamentos', 'transacoes', 'sinais', 'valoresReceber', 'galeria', 'orcamentos', 'anamneses', 'configuracoes', 'estoque'];
        return FirestoreDB.subscribeToChanges(collections, callback);
    },

    // ── Sync Local Storage Data to Cloud Firestore ──
    async syncLocalToCloud() {
        if (IS_DEMO_MODE || !db) {
            throw new Error('Firebase não está configurado.');
        }
        const uid = Auth.getUid();
        if (!uid) {
            throw new Error('Faça login com sua conta do estúdio para enviar os dados para a nuvem.');
        }

        const collections = ['clientes', 'agendamentos', 'transacoes', 'sinais', 'valoresReceber', 'galeria', 'orcamentos', 'anamneses', 'estoque'];
        let totalSynced = 0;

        for (const col of collections) {
            const localItems = LocalDB._get(col);
            if (Array.isArray(localItems) && localItems.length > 0) {
                for (const item of localItems) {
                    const docId = String(item.id || generateId());
                    const cleanItem = { ...item };
                    delete cleanItem.id;
                    await db.collection(`users/${uid}/${col}`).doc(docId).set({
                        ...cleanItem,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });
                    totalSynced++;
                }
            }
        }

        // Sync Meta Mensal if present in localStorage
        const metaKeys = Object.keys(localStorage).filter(k => k.startsWith('gh_meta_'));
        for (const mk of metaKeys) {
            const mesKey = mk.replace('gh_meta_', '');
            const val = parseFloat(localStorage.getItem(mk)) || 0;
            await db.collection(`users/${uid}/configuracoes`).doc(`meta_${mesKey}`).set({
                valor: val,
                mes: mesKey,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            totalSynced++;
        }

        return totalSynced;
    },

    // ── Sync Cloud Data to Local Storage (Backup Offline) ──
    async syncCloudToLocal() {
        if (IS_DEMO_MODE || !db) return 0;
        const uid = Auth.getUid();
        if (!uid) return 0;

        const collections = ['clientes', 'agendamentos', 'transacoes', 'sinais', 'valoresReceber', 'galeria', 'orcamentos', 'anamneses', 'estoque'];
        let total = 0;
        for (const col of collections) {
            const cloudItems = await FirestoreDB.getAll(col);
            if (cloudItems && cloudItems.length > 0) {
                LocalDB._set(col, cloudItems);
                total += cloudItems.length;
            }
        }
        return total;
    },

    // ── Check Cloud vs Local Counts ──
    async getSyncStats() {
        const collections = ['clientes', 'agendamentos', 'transacoes', 'sinais', 'valoresReceber', 'orcamentos', 'estoque'];
        const stats = { local: 0, cloud: 0, isConnected: !IS_DEMO_MODE && !!db && !!Auth.getUid() };
        
        collections.forEach(col => {
            const local = LocalDB._get(col);
            stats.local += (local?.length || 0);
        });

        if (stats.isConnected) {
            try {
                for (const col of collections) {
                    const cloud = await FirestoreDB.getAll(col);
                    stats.cloud += (cloud?.length || 0);
                }
            } catch (e) {
                console.warn('Could not read cloud counts:', e);
            }
        }

        return stats;
    }
};

// Exportar globalmente
if (typeof window !== 'undefined') {
    window.DataStore = DataStore;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataStore;
}
