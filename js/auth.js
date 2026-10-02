/* =========================================================
   GH Studio — Authentication Module
   ========================================================= */

const Auth = {
    currentUser: null,

    // ── Initialize Auth State Listener ──
    init(onLogin, onLogout) {
        if (IS_DEMO_MODE) {
            // Demo mode: check localStorage for demo session
            const demoUser = localStorage.getItem('gh_demo_user');
            if (demoUser) {
                this.currentUser = JSON.parse(demoUser);
                onLogin(this.currentUser);
            } else {
                onLogout();
            }
            return;
        }

        // Firebase Auth state listener
        auth.onAuthStateChanged((user) => {
            if (user) {
                this.currentUser = {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName || user.email.split('@')[0],
                    photoURL: user.photoURL
                };
                onLogin(this.currentUser);
            } else {
                this.currentUser = null;
                onLogout();
            }
        });
    },

    // ── Login with Email/Password ──
    async login(email, password) {
        if (IS_DEMO_MODE) {
            // Demo login: accept any credentials
            const user = {
                uid: 'demo_user_' + Date.now(),
                email: email,
                displayName: email.split('@')[0],
                photoURL: null
            };
            localStorage.setItem('gh_demo_user', JSON.stringify(user));
            this.currentUser = user;
            return { success: true, user };
        }

        try {
            const result = await auth.signInWithEmailAndPassword(email, password);
            return { success: true, user: result.user };
        } catch (error) {
            return { success: false, error: this._getErrorMessage(error.code) };
        }
    },

    // ── Login with Google (1-Click) ──
    async loginWithGoogle() {
        if (IS_DEMO_MODE) {
            const user = {
                uid: 'google_user_' + Date.now(),
                email: 'leonardo.demo@gmail.com',
                displayName: 'Leonardo (Google)',
                photoURL: null
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
                photoURL: user.photoURL
            };
            return { success: true, user: this.currentUser };
        } catch (error) {
            console.error('Google Auth error:', error);
            if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
                return { success: false, error: 'O login com Google foi cancelado.' };
            }
            if (error.code === 'auth/popup-blocked') {
                try {
                    const provider = new firebase.auth.GoogleAuthProvider();
                    await auth.signInWithRedirect(provider);
                    return { success: true, redirecting: true };
                } catch (rErr) {
                    return { success: false, error: 'O navegador bloqueou a janela do Google. Habilite pop-ups para fazer login.' };
                }
            }
            return { success: false, error: this._getErrorMessage(error.code) };
        }
    },

    // ── Register New User ──
    async register(name, email, password) {
        if (IS_DEMO_MODE) {
            const user = {
                uid: 'demo_user_' + Date.now(),
                email: email,
                displayName: name,
                photoURL: null
            };
            localStorage.setItem('gh_demo_user', JSON.stringify(user));
            this.currentUser = user;
            return { success: true, user };
        }

        try {
            const result = await auth.createUserWithEmailAndPassword(email, password);
            // Update profile with display name
            await result.user.updateProfile({ displayName: name });
            return { success: true, user: result.user };
        } catch (error) {
            return { success: false, error: this._getErrorMessage(error.code) };
        }
    },

    // ── Reset Password ──
    async resetPassword(email) {
        if (IS_DEMO_MODE) {
            return { success: true, message: 'Em modo demo, não há envio de email. Use qualquer credencial para login.' };
        }

        try {
            await auth.sendPasswordResetEmail(email);
            return { success: true, message: 'Email de recuperação enviado! Verifique sua caixa de entrada.' };
        } catch (error) {
            return { success: false, error: this._getErrorMessage(error.code) };
        }
    },

    // ── Logout ──
    async logout() {
        if (IS_DEMO_MODE) {
            localStorage.removeItem('gh_demo_user');
            this.currentUser = null;
            window.location.href = 'login.html';
            return;
        }

        try {
            await auth.signOut();
            window.location.href = 'login.html';
        } catch (error) {
            console.error('Logout error:', error);
        }
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
        if (IS_DEMO_MODE) {
            const demoUser = localStorage.getItem('gh_demo_user');
            if (!demoUser) {
                window.location.href = 'login.html';
                return false;
            }
            return true;
        }
        // Firebase auth check happens via onAuthStateChanged
        return true;
    },

    // ── Error Messages (PT-BR) ──
    _getErrorMessage(code) {
        const messages = {
            'auth/user-not-found': 'Usuário não encontrado. Verifique o email ou crie uma conta.',
            'auth/wrong-password': 'Senha incorreta. Tente novamente.',
            'auth/email-already-in-use': 'Este email já está em uso. Tente fazer login.',
            'auth/weak-password': 'A senha deve ter pelo menos 6 caracteres.',
            'auth/invalid-email': 'Email inválido. Verifique o formato.',
            'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos.',
            'auth/network-request-failed': 'Erro de conexão. Verifique sua internet.',
            'auth/invalid-credential': 'Credenciais inválidas. Verifique email e senha.',
            'auth/popup-blocked': 'O navegador bloqueou o popup do Google. Habilite pop-ups para este site.',
            'auth/popup-closed-by-user': 'O login com Google foi cancelado antes de ser concluído.',
            'auth/account-exists-with-different-credential': 'Já existe uma conta com este mesmo email usando outro método.',
            'auth/operation-not-allowed': 'O login com Google ainda não foi ativado no Console do Firebase.'
        };
        return messages[code] || 'Ocorreu um erro. Tente novamente.';
    }
};
