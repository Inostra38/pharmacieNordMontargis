// ==========================================
// Cache Manager - Gestion centralisée du cache produits
// VERSION INDEXEDDB - Solution pérenne pour gros volumes
// ==========================================

class ProductCacheManager {
    constructor() {
        this.CACHE_KEY = 'pharmacie_products_cache';
        this.TTL = 10 * 60 * 1000; // 10 minutes (correspond au cache serveur)
        this.isLoading = false;
        
        // Configuration IndexedDB
        this.DB_NAME = 'PharmacieNordDB';
        this.DB_VERSION = 1;
        this.STORE_NAME = 'productsCache';
        this.db = null;
        
        // Initialiser IndexedDB
        this.initDB();
    }

    /**
     * Initialiser la base de données IndexedDB
     */
    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

            request.onerror = () => {
                console.error('❌ Erreur ouverture IndexedDB:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('✅ IndexedDB initialisé');
                
                // Migration automatique depuis localStorage si nécessaire
                this.migrateFromLocalStorage();
                
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Créer l'object store si nécessaire
                if (!db.objectStoreNames.contains(this.STORE_NAME)) {
                    db.createObjectStore(this.STORE_NAME);
                    console.log('🏗️ Object store créé:', this.STORE_NAME);
                }
            };
        });
    }

    /**
     * Migrer les données de localStorage vers IndexedDB
     */
    async migrateFromLocalStorage() {
        try {
            const localStorageData = localStorage.getItem(this.CACHE_KEY);
            
            if (localStorageData) {
                const data = JSON.parse(localStorageData);
                console.log('🔄 Migration des données localStorage → IndexedDB...');
                
                await this.setIDB(data);
                
                // Supprimer de localStorage après migration réussie
                localStorage.removeItem(this.CACHE_KEY);
                console.log('✅ Migration terminée, localStorage nettoyé');
            }
        } catch (error) {
            console.warn('⚠️ Erreur migration localStorage:', error);
        }
    }

    /**
     * Attendre que la DB soit prête
     */
    async waitForDB() {
        if (this.db) return this.db;
        
        // Attendre max 5 secondes
        for (let i = 0; i < 50; i++) {
            await new Promise(resolve => setTimeout(resolve, 100));
            if (this.db) return this.db;
        }
        
        throw new Error('IndexedDB non disponible après 5 secondes');
    }

    /**
     * Récupérer les données depuis IndexedDB
     */
    async getIDB() {
        try {
            const db = await this.waitForDB();
            
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.STORE_NAME], 'readonly');
                const store = transaction.objectStore(this.STORE_NAME);
                const request = store.get(this.CACHE_KEY);

                request.onsuccess = () => {
                    resolve(request.result);
                };

                request.onerror = () => {
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('❌ Erreur lecture IndexedDB:', error);
            return null;
        }
    }

    /**
     * Sauvegarder les données dans IndexedDB
     */
    async setIDB(data) {
        try {
            const db = await this.waitForDB();
            
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.STORE_NAME], 'readwrite');
                const store = transaction.objectStore(this.STORE_NAME);
                const request = store.put(data, this.CACHE_KEY);

                request.onsuccess = () => {
                    resolve(true);
                };

                request.onerror = () => {
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('❌ Erreur écriture IndexedDB:', error);
            return false;
        }
    }

    /**
     * Supprimer les données d'IndexedDB
     */
    async clearIDB() {
        try {
            const db = await this.waitForDB();
            
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.STORE_NAME], 'readwrite');
                const store = transaction.objectStore(this.STORE_NAME);
                const request = store.delete(this.CACHE_KEY);

                request.onsuccess = () => {
                    resolve(true);
                };

                request.onerror = () => {
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('❌ Erreur suppression IndexedDB:', error);
            return false;
        }
    }

    /**
     * Récupérer le cache s'il est valide (API synchrone compatible)
     * Note: Retourne une Promise pour compatibilité async
     */
    async get() {
        try {
            const cached = await this.getIDB();
            if (!cached) return null;

            const now = Date.now();

            // Vérifier si le cache est encore valide
            if (now - cached.timestamp < this.TTL) {
                console.log('✅ Cache valide, age:', Math.round((now - cached.timestamp) / 1000 / 60), 'minutes');
                return cached;
            }

            console.log('⏰ Cache expiré');
            await this.clear();
            return null;
        } catch (error) {
            console.error('❌ Erreur lecture cache:', error);
            await this.clear();
            return null;
        }
    }

    /**
     * Sauvegarder les produits dans le cache
     */
    async set(products, metadata = {}) {
        try {
            const data = {
                products: products,
                timestamp: Date.now(),
                metadata: metadata,
                version: '3.0' // Version IndexedDB
            };

            const success = await this.setIDB(data);
            
            if (success) {
                console.log('💾 Cache sauvegardé (IndexedDB):', products.length, 'produits');
                
                // Calculer et afficher la taille approximative
                const sizeInMB = (JSON.stringify(data).length / (1024 * 1024)).toFixed(2);
                console.log('📊 Taille du cache:', sizeInMB, 'MB');
            }
            
            return success;
        } catch (error) {
            console.error('❌ Erreur sauvegarde cache:', error);
            return false;
        }
    }

    /**
     * Vider le cache
     */
    async clear() {
        await this.clearIDB();
        console.log('🗑️ Cache vidé (IndexedDB)');
    }

    /**
     * Charger les produits (depuis cache ou API)
     */
    async load(forceRefresh = false) {
        if (this.isLoading) {
            console.log('⏳ Chargement déjà en cours...');
            // Retourner une promesse qui attend la fin du chargement en cours
            return new Promise(resolve => {
                const interval = setInterval(async () => {
                    if (!this.isLoading) {
                        clearInterval(interval);
                        const cached = await this.get();
                        resolve(cached ? cached.products : []);
                    }
                }, 100);
            });
        }

        // Essayer le cache d'abord
        if (!forceRefresh) {
            const cached = await this.get();
            if (cached) {
                return cached.products;
            }
        }

        // Charger depuis l'API via apiService
        this.isLoading = true;
        console.log('📡 Chargement depuis l\'API (via backend sécurisé)...');

        try {
            // ✅ Utiliser apiService
            if (typeof window.apiService === 'undefined') {
                throw new Error('apiService non disponible. Vérifiez que api.js est chargé.');
            }

            const result = await window.apiService.getProducts({
                limit: 50000 // Charger tous les produits
            });

            if (!result.success || !result.data || !Array.isArray(result.data.products)) {
                console.error('❌ Réponse API invalide:', result);
                throw new Error('Format de réponse API incorrect.');
            }

            const products = result.data.products;

            console.log('✅ API:', products.length, 'produits reçus');
            console.log('📊 Cache serveur:', result.data.cached ? 'utilisé' : 'rafraîchi');

            // Sauvegarder dans le cache (IndexedDB)
            await this.set(products, {
                total: result.data.total || products.length,
                updatedAt: result.data.updatedAt,
                serverCached: result.data.cached
            });

            return products;

        } catch (error) {
            console.error('❌ Erreur chargement API:', error);
            
            // En cas d'erreur API, essayer de retourner un cache expiré s'il existe
            const expiredCache = await this.getIDB();
            if (expiredCache && expiredCache.products) {
                console.warn('⚠️ Utilisation du cache expiré suite à une erreur API.');
                return expiredCache.products;
            }
            
            throw error; // Relancer l'erreur si aucun cache n'est disponible
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Obtenir les métadonnées du cache
     */
    async getMetadata() {
        const cached = await this.get();
        if (cached) {
            return cached.metadata;
        }
        // Essayer de lire même si expiré pour avoir la dernière date connue
        const expiredCache = await this.getIDB();
        return expiredCache ? expiredCache.metadata : null;
    }

    /**
     * Vérifier si le cache existe et est valide
     */
    async isValid() {
        const cache = await this.get();
        return cache !== null;
    }
}

// Instance globale
if (typeof window !== 'undefined') {
    // S'assurer que CONFIG est chargé avant d'instancier
    if (typeof CONFIG !== 'undefined') {
        window.productCache = new ProductCacheManager();
        console.log('✅ Cache Manager instancié (VERSION INDEXEDDB)');
    } else {
        console.error('❌ CONFIG non défini avant Cache Manager. Vérifiez l\'ordre des scripts.');
    }
} else {
    console.log('✅ Cache Manager chargé (environnement non-navigateur)');
}