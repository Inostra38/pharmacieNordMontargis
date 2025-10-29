// ==========================================
// Cache Manager - Gestion centralisée du cache produits
// VERSION SÉCURISÉE - Utilise apiService
// ==========================================

class ProductCacheManager {
    constructor() {
        this.CACHE_KEY = 'pharmacie_products_cache';
        this.TTL = 10 * 60 * 1000; // 10 minutes (correspond au cache serveur)
        this.isLoading = false;
    }

    /**
     * Récupérer le cache s'il est valide
     */
    get() {
        try {
            const cached = localStorage.getItem(this.CACHE_KEY);
            if (!cached) return null;

            const data = JSON.parse(cached);
            const now = Date.now();

            // Vérifier si le cache est encore valide
            if (now - data.timestamp < this.TTL) {
                console.log('✅ Cache valide, age:', Math.round((now - data.timestamp) / 1000 / 60), 'minutes');
                return data;
            }

            console.log('⏰ Cache expiré');
            this.clear();
            return null;
        } catch (error) {
            console.error('❌ Erreur lecture cache:', error);
            this.clear();
            return null;
        }
    }

    /**
     * Sauvegarder les produits dans le cache
     */
    set(products, metadata = {}) {
        try {
            const data = {
                products: products,
                timestamp: Date.now(),
                metadata: metadata,
                version: '2.0' // Version sécurisée
            };

            localStorage.setItem(this.CACHE_KEY, JSON.stringify(data));
            console.log('💾 Cache sauvegardé:', products.length, 'produits');
            return true;
        } catch (error) {
            console.error('❌ Erreur sauvegarde cache:', error);
            // Si quota dépassé, vider et réessayer
            if (error.name === 'QuotaExceededError') {
                this.clear();
                console.warn('⚠️ Quota localStorage dépassé, cache vidé');
            }
            return false;
        }
    }

    /**
     * Vider le cache
     */
    clear() {
        localStorage.removeItem(this.CACHE_KEY);
        console.log('🗑️ Cache vidé');
    }

    /**
     * Charger les produits (depuis cache ou API)
     */
    async load(forceRefresh = false) {
        if (this.isLoading) {
            console.log('⏳ Chargement déjà en cours...');
            // Retourner une promesse qui attend la fin du chargement en cours
            return new Promise(resolve => {
                const interval = setInterval(() => {
                    if (!this.isLoading) {
                        clearInterval(interval);
                        const cached = this.get();
                        resolve(cached ? cached.products : []);
                    }
                }, 100);
            });
        }

        // Essayer le cache d'abord
        if (!forceRefresh) {
            const cached = this.get();
            if (cached) {
                return cached.products;
            }
        }

        // Charger depuis l'API via apiService
        this.isLoading = true;
        console.log('📡 Chargement depuis l\'API (via backend sécurisé)...');

        try {
            // ✅ NOUVEAU : Utiliser apiService au lieu de fetch direct
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

            // Sauvegarder dans le cache
            this.set(products, {
                total: result.data.total || products.length,
                updatedAt: result.data.updatedAt,
                serverCached: result.data.cached
            });

            return products;

        } catch (error) {
            console.error('❌ Erreur chargement API:', error);
            
            // En cas d'erreur API, essayer de retourner un cache expiré s'il existe
            const expiredCache = JSON.parse(localStorage.getItem(this.CACHE_KEY) || 'null');
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
    getMetadata() {
        const cached = this.get();
        if (cached) {
            return cached.metadata;
        }
        // Essayer de lire même si expiré pour avoir la dernière date connue
        const expiredCache = JSON.parse(localStorage.getItem(this.CACHE_KEY) || 'null');
        return expiredCache ? expiredCache.metadata : null;
    }

    /**
     * Vérifier si le cache existe et est valide
     */
    isValid() {
        return this.get() !== null;
    }
}

// Instance globale
if (typeof window !== 'undefined') {
    // S'assurer que CONFIG est chargé avant d'instancier
    if (typeof CONFIG !== 'undefined') {
        window.productCache = new ProductCacheManager();
        console.log('✅ Cache Manager instancié (VERSION SÉCURISÉE)');
    } else {
        console.error('❌ CONFIG non défini avant Cache Manager. Vérifiez l\'ordre des scripts.');
    }
} else {
    console.log('✅ Cache Manager chargé (environnement non-navigateur)');
}