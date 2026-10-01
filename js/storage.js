/* =========================================================
   GH Studio — Storage Module (Firebase Storage + IndexedDB)
   Handles image uploads, client-side compression, and caching
   ========================================================= */

const StorageService = {
    _db: null,

    // ── Open / Init IndexedDB for Demo Mode ──
    async _initIndexedDB() {
        if (this._db) return this._db;
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('GHStudio_Storage', 1);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('images')) {
                    db.createObjectStore('images', { keyPath: 'id' });
                }
            };
            request.onsuccess = (e) => {
                this._db = e.target.result;
                resolve(this._db);
            };
            request.onerror = (e) => {
                console.error('IndexedDB error:', e);
                reject(e);
            };
        });
    },

    // ── Client-side Image Compression ──
    async compressImage(file, maxWidth = 1200, maxHeight = 1200, quality = 0.82) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    let { width, height } = img;
                    if (width > maxWidth || height > maxHeight) {
                        if (width / height > maxWidth / maxHeight) {
                            height = Math.round((height * maxWidth) / width);
                            width = maxWidth;
                        } else {
                            width = Math.round((width * maxHeight) / height);
                            height = maxHeight;
                        }
                    }

                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
                    resolve({
                        dataUrl: compressedDataUrl,
                        width,
                        height
                    });
                };
                img.onerror = reject;
            };
            reader.onerror = reject;
        });
    },

    // ── Upload Image (Firebase Storage or IndexedDB fallback) ──
    async upload(file, folder = 'references') {
        const fileId = `${folder}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        
        // 1. Compress image first
        const { dataUrl } = await this.compressImage(file);

        if (!IS_DEMO_MODE && storage) {
            try {
                const uid = Auth.getUid() || 'public';
                const path = `users/${uid}/${folder}/${fileId}.jpg`;
                const ref = storage.ref(path);

                // Convert dataUrl to blob
                const res = await fetch(dataUrl);
                const blob = await res.blob();

                const snapshot = await ref.put(blob, { contentType: 'image/jpeg' });
                const downloadURL = await snapshot.ref.getDownloadURL();
                return { id: fileId, url: downloadURL };
            } catch (err) {
                console.warn('Firebase Storage upload failed, falling back to local storage:', err);
            }
        }

        // 2. Demo Mode: Save in IndexedDB
        try {
            const db = await this._initIndexedDB();
            await new Promise((resolve, reject) => {
                const tx = db.transaction('images', 'readwrite');
                const store = tx.objectStore('images');
                store.put({ id: fileId, dataUrl, createdAt: new Date().toISOString() });
                tx.oncomplete = resolve;
                tx.onerror = reject;
            });
            return { id: fileId, url: dataUrl };
        } catch (e) {
            console.error('Failed to store image in IndexedDB:', e);
            // Emergency fallback: return dataUrl directly
            return { id: fileId, url: dataUrl };
        }
    },

    // ── Get Image URL by ID ──
    async get(idOrUrl) {
        if (!idOrUrl) return null;
        if (idOrUrl.startsWith('http') || idOrUrl.startsWith('data:') || idOrUrl.startsWith('/') || idOrUrl.startsWith('assets/')) {
            return idOrUrl;
        }

        try {
            const db = await this._initIndexedDB();
            return new Promise((resolve) => {
                const tx = db.transaction('images', 'readonly');
                const store = tx.objectStore('images');
                const req = store.get(idOrUrl);
                req.onsuccess = () => resolve(req.result ? req.result.dataUrl : null);
                req.onerror = () => resolve(null);
            });
        } catch (e) {
            return null;
        }
    },

    // ── Delete Image ──
    async delete(idOrUrl) {
        if (!IS_DEMO_MODE && storage && idOrUrl?.includes('firebasestorage')) {
            try {
                const ref = storage.refFromURL(idOrUrl);
                await ref.delete();
            } catch (e) {
                console.warn('Could not delete from Firebase Storage:', e);
            }
        }

        try {
            const db = await this._initIndexedDB();
            const tx = db.transaction('images', 'readwrite');
            tx.objectStore('images').delete(idOrUrl);
        } catch (e) {}
        return true;
    }
};
