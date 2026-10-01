/* =========================================================
   GH Studio — Firebase Configuration (Template de Exemplo)
   ========================================================= */

// ── Instruções de Configuração ──
// 1. Crie uma cópia deste arquivo com o nome 'firebase-config.js' na pasta /js
// 2. Substitua os valores abaixo pelas credenciais do seu projeto Firebase.
// 3. Obtenha em: https://console.firebase.google.com → Configurações do Projeto → Seus Aplicativos (Web)

const firebaseConfig = {
    apiKey: "SUA_API_KEY_AQUI",
    authDomain: "seu-projeto.firebaseapp.com",
    projectId: "seu-projeto-id",
    storageBucket: "seu-projeto.firebasestorage.app",
    messagingSenderId: "000000000000",
    appId: "1:000000000000:web:0000000000000000000000",
    measurementId: "G-XXXXXXXXXX"
};

// ── Detecção de Modo Demo ──
const IS_DEMO_MODE = firebaseConfig.apiKey === "SUA_API_KEY_AQUI" || firebaseConfig.apiKey === "YOUR_API_KEY";

let auth = null;
let db = null;
let storage = null;

if (!IS_DEMO_MODE) {
    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        if (typeof firebase.auth === 'function') {
            auth = firebase.auth();
        }
        if (typeof firebase.firestore === 'function') {
            db = firebase.firestore();
            db.enablePersistence({ synchronizeTabs: true }).catch((err) => {
                if (err.code === 'failed-precondition') {
                    console.warn('Firestore persistence: Multiple tabs open.');
                } else if (err.code === 'unimplemented') {
                    console.warn('Firestore persistence: Browser not supported.');
                }
            });
        }
        storage = null;
        console.log('✅ Firebase inicializado com sucesso');
    } catch (e) {
        console.error('❌ Falha na inicialização do Firebase:', e);
    }
} else {
    console.log('🎮 Executando em MODO DEMO (localStorage local). Configure o js/firebase-config.js para ativar a sincronização em nuvem.');
}

// ── IP de Rede Local para pareamento com celular/tablet ──
const LOCAL_NETWORK_IP = "192.168.1.100";
const LOCAL_NETWORK_PORT = "3000";

function getReachableAppUrl() {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
        return `http://${LOCAL_NETWORK_IP}:${window.location.port || LOCAL_NETWORK_PORT}/`;
    }
    return window.location.origin + '/';
}
