/* =========================================================
   GH Studio — Authentication Module
   ========================================================= */

const Auth = {
    currentUser: null,

    // ── Initialize Auth State Listener ──
    init(onLogin, onLogout) {
        if (IS_DEMO_MODE || typeof auth === 'undefined' || !auth) {
            // Demo mode or Firebase unavailable: check localStorage for demo/guest session
            const demoUser = localStorage.getItem('gh_demo_user');
            if (demoUser) {
                try {
                    this.currentUser = JSON.parse(demoUser);
                    onLogin(this.currentUser);
                    return;
                } catch(e) {}
            }
            this.currentUser = null;
            onLogout();
            return;
        }

        // Firebase Auth state listener
        auth.onAuthStateChanged((user) => {
            if (user) {
                this.currentUser = {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName || user.email.split('@')[0],
                    photoURL: user.photoURL,
                    isGuest: false
                };
                onLogin(this.currentUser);
            } else {
                // If not logged in Firebase, verify if a guest/demo session exists
                const demoUser = localStorage.getItem('gh_demo_user');
                if (demoUser) {
                    try {
                        this.currentUser = JSON.parse(demoUser);
                        onLogin(this.currentUser);
                        return;
                    } catch(e) {}
                }
                this.currentUser = null;
                onLogout();
            }
        });
    },

    // ── Login with Email/Password ──
    async login(email, password, remember = true) {
        if (IS_DEMO_MODE || typeof auth === 'undefined' || !auth) {
            // Demo login: accept any credentials
            const user = {
                uid: 'demo_user_' + Date.now(),
                email: email,
                displayName: email.split('@')[0],
                photoURL: null,
                isGuest: true
            };
            localStorage.setItem('gh_demo_user', JSON.stringify(user));
            this.currentUser = user;
            return { success: true, user };
        }

        try {
            if (auth.setPersistence && typeof firebase !== 'undefined' && firebase.auth) {
                const persistence = remember 
                    ? firebase.auth.Auth.Persistence.LOCAL 
                    : firebase.auth.Auth.Persistence.SESSION;
                await auth.setPersistence(persistence).catch(() => {});
            }
            const result = await auth.signInWithEmailAndPassword(email, password);
            return { success: true, user: result.user };
        } catch (error) {
            return { success: false, error: this._getErrorMessage(error.code) };
        }
    },

    // ── Login with Google (1-Click) ──
    async loginWithGoogle() {
        if (IS_DEMO_MODE || typeof auth === 'undefined' || !auth) {
            const user = {
                uid: 'google_user_' + Date.now(),
                email: 'leonardo.demo@gmail.com',
                displayName: 'Leonardo (Google)',
                photoURL: null,
                isGuest: true
            };
            localStorage.setItem('gh_demo_user', JSON.stringify(user));
            this.currentUser = user;
            return { success: true, user };
        }

        try {
            if (typeof firebase === 'undefined' || !firebase.auth) {
                throw new Error('Firebase Auth não carregado');
            }
            const provider = new firebase.auth.GoogleAuthProvider();
            provider.addScope('profile');
            provider.addScope('email');
            provider.setCustomParameters({ prompt: 'select_account' });

            const result = await auth.signInWithPopup(provider);
            const user = result.user;
            this.currentUser = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || user.email.split('@')[0],
                photoURL: user.photoURL,
                isGuest: false
            };
            return { success: true, user: this.currentUser };
        } catch (error) {
            console.error('Google Auth error:', error);
            if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
                return { success: false, error: 'O login com Google foi cancelado antes de ser concluído.' };
            }
            if (error.code === 'auth/popup-blocked') {
                try {
                    const provider = new firebase.auth.GoogleAuthProvider();
                    await auth.signInWithRedirect(provider);
                    return { success: true, redirecting: true };
                } catch (rErr) {
                    return { success: false, error: 'O navegador bloqueou a janela do Google. Habilite pop-ups para este site ou acesse como Convidado.' };
                }
            }
            return { success: false, error: this._getErrorMessage(error.code) };
        }
    },

    // ── Login as Guest / Demo Mode ──
    loginAsGuest() {
        const user = {
            uid: 'guest_' + Date.now(),
            email: 'convidado.studio@ghstudio.app',
            displayName: 'Tatuador Convidado',
            photoURL: null,
            isGuest: true
        };
        localStorage.setItem('gh_demo_user', JSON.stringify(user));
        this.currentUser = user;
        return { success: true, user };
    },

    // ── Register New User ──
    async register(name, email, password) {
        if (IS_DEMO_MODE || typeof auth === 'undefined' || !auth) {
            const user = {
                uid: 'demo_user_' + Date.now(),
                email: email,
                displayName: name,
                photoURL: null,
                isGuest: true
            };
            localStorage.setItem('gh_demo_user', JSON.stringify(user));
            this.currentUser = user;
            return { success: true, user };
        }

        try {
            const result = await auth.createUserWithEmailAndPassword(email, password);
            await result.user.updateProfile({ displayName: name });
            return { success: true, user: result.user };
        } catch (error) {
            return { success: false, error: this._getErrorMessage(error.code) };
        }
    },

    // ── Reset Password ──
    async resetPassword(email) {
        if (IS_DEMO_MODE || typeof auth === 'undefined' || !auth) {
            return { success: true, message: 'Em modo local/demo não há envio de email. Use qualquer credencial para login.' };
        }

        try {
            await auth.sendPasswordResetEmail(email);
            return { success: true, message: 'Email de recuperação enviado! Verifique sua caixa de entrada.' };
        } catch (error) {
            return { success: false, error: this._getErrorMessage(error.code) };
        }
    },

    // ── Update Profile & Security Credentials ──
    async updateProfileAndSecurity({ name, email, password }) {
        const results = {
            nameUpdated: false,
            emailUpdated: false,
            passwordUpdated: false,
            errors: []
        };

        const isDemo = IS_DEMO_MODE || typeof auth === 'undefined' || !auth || !auth.currentUser;

        // 1. Atualizar Nome
        if (name && name.trim()) {
            const cleanName = name.trim();
            if (!isDemo && auth.currentUser) {
                try {
                    await auth.currentUser.updateProfile({ displayName: cleanName });
                    results.nameUpdated = true;
                } catch (err) {
                    console.warn('Erro ao atualizar displayName no Firebase:', err);
                    results.errors.push('Nome: ' + this._getErrorMessage(err.code));
                }
            } else {
                results.nameUpdated = true;
            }

            if (this.currentUser) {
                this.currentUser.displayName = cleanName;
            }
            const demoUser = localStorage.getItem('gh_demo_user');
            if (demoUser) {
                try {
                    const u = JSON.parse(demoUser);
                    u.displayName = cleanName;
                    localStorage.setItem('gh_demo_user', JSON.stringify(u));
                } catch (e) {}
            }
        }

        // 2. Atualizar E-mail
        if (email && email.trim() && (!this.currentUser || email.trim() !== this.currentUser.email)) {
            const cleanEmail = email.trim();
            if (!isDemo && auth.currentUser) {
                try {
                    if (typeof auth.currentUser.verifyBeforeUpdateEmail === 'function') {
                        await auth.currentUser.verifyBeforeUpdateEmail(cleanEmail);
                    } else {
                        await auth.currentUser.updateEmail(cleanEmail);
                    }
                    results.emailUpdated = true;
                } catch (err) {
                    console.warn('Erro ao atualizar email no Firebase:', err);
                    results.errors.push('E-mail: ' + this._getErrorMessage(err.code));
                }
            } else {
                results.emailUpdated = true;
            }

            if (this.currentUser) {
                this.currentUser.email = cleanEmail;
            }
            const demoUser = localStorage.getItem('gh_demo_user');
            if (demoUser) {
                try {
                    const u = JSON.parse(demoUser);
                    u.email = cleanEmail;
                    localStorage.setItem('gh_demo_user', JSON.stringify(u));
                } catch (e) {}
            }
        }

        // 3. Atualizar Senha
        if (password && password.trim()) {
            const cleanPass = password.trim();
            if (cleanPass.length < 6) {
                results.errors.push('A nova senha deve ter no mínimo 6 caracteres.');
            } else {
                if (!isDemo && auth.currentUser) {
                    try {
                        await auth.currentUser.updatePassword(cleanPass);
                        results.passwordUpdated = true;
                    } catch (err) {
                        console.warn('Erro ao atualizar senha no Firebase:', err);
                        results.errors.push('Senha: ' + this._getErrorMessage(err.code));
                    }
                } else {
                    results.passwordUpdated = true;
                }
            }
        }

        return results;
    },

    // ── Logout ──
    async logout() {
        localStorage.removeItem('gh_demo_user');
        if (typeof auth !== 'undefined' && auth && auth.currentUser) {
            try {
                await auth.signOut();
            } catch (error) {
                console.error('Logout error:', error);
            }
        }
        this.currentUser = null;
        window.location.href = 'login.html';
    },

    // ── Get Current User ID ──
    getUid() {
        return this.currentUser?.uid || null;
    },

    // ── Get Current User Object ──
    getUser() {
        return this.currentUser || null;
    },

    // ── Auth Guard (for protected pages) ──
    requireAuth() {
        if (IS_DEMO_MODE || typeof auth === 'undefined' || !auth) {
            const demoUser = localStorage.getItem('gh_demo_user');
            if (!demoUser) {
                window.location.href = 'login.html';
                return false;
            }
            return true;
        }
        return true;
    },

    // ── Error Messages (PT-BR) ──
    _getErrorMessage(code) {
        const messages = {
            'auth/user-not-found': 'Usuário não encontrado. Verifique o email ou crie uma conta.',
            'auth/wrong-password': 'Senha incorreta. Tente novamente.',
            'auth/email-already-in-use': 'Este email já está cadastrado. Faça login ou recupere a senha.',
            'auth/weak-password': 'A senha deve ter pelo menos 6 caracteres.',
            'auth/invalid-email': 'Formato de email inválido. Verifique o endereço digitado.',
            'auth/too-many-requests': 'Muitas tentativas sem sucesso. Aguarde alguns instantes e tente novamente.',
            'auth/network-request-failed': 'Erro de conexão com o Firebase. Verifique sua internet.',
            'auth/invalid-credential': 'Email ou senha incorretos. Verifique suas credenciais.',
            'auth/popup-blocked': 'O navegador bloqueou a janela do Google. Habilite pop-ups para este site.',
            'auth/popup-closed-by-user': 'O login com Google foi fechado antes de concluir.',
            'auth/cancelled-popup-request': 'A solicitação de login com Google foi cancelada.',
            'auth/account-exists-with-different-credential': 'Já existe uma conta com este mesmo email usando outro método.',
            'auth/operation-not-allowed': 'O provedor de login selecionado ainda não foi ativado no Console do Firebase (Authentication > Sign-in method).',
            'auth/unauthorized-domain': 'Domínio não autorizado pelo Firebase. Adicione "gh-studio-gestao.web.app" no Console do Firebase (Authentication > Settings > Authorized domains).',
            'auth/internal-error': 'Erro interno nos servidores do Firebase. Tente novamente ou entre como Convidado.',
            'auth/api-key-not-valid': 'Chave de API do Firebase inválida. Verifique js/firebase-config.js.'
        };
        return messages[code] || `Ocorreu um erro no Firebase (${code || 'desconhecido'}). Tente novamente ou entre como Convidado.`;
    }
};
