// ==========================================
// Cache Manager - Gestion centralisée du cache produits
// ==========================================

class ProductCacheManager {
    constructor() {
        this.CACHE_KEY = 'pharmacie_products_cache';
        this.TTL = 4 * 60 * 60 * 1000; // 4 heures en millisecondes
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
                version: '1.0'
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
            // Modification : retourner une promesse qui attend la fin du chargement en cours
            return new Promise(resolve => {
                const interval = setInterval(() => {
                    if (!this.isLoading) {
                        clearInterval(interval);
                        const cached = this.get(); // Récupérer le résultat frais
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

        // Charger depuis l'API
        this.isLoading = true;
        console.log('📡 Chargement depuis l\'API...');

        try {
            const url = new URL(CONFIG.API.BASE_URL);
            url.searchParams.set('limit', '50000'); // Toujours charger tout
            url.searchParams.set('t', Date.now()); // Cache busting

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status} - ${response.statusText}`);
            }

            const data = await response.json();
            // Vérification si la réponse est bien un objet avec 'items'
            if (typeof data !== 'object' || data === null || !Array.isArray(data.items)) {
                 console.error('❌ Réponse API invalide:', data);
                 throw new Error('Format de réponse API incorrect reçu.');
            }

            const products = data.items || [];

            console.log('✅ API:', products.length, 'produits reçus');

            // Sauvegarder dans le cache
            this.set(products, {
                total: data.total || products.length, // Utiliser la longueur si total manque
                updatedAt: data.stockUpdatedAt || data.updatedAt
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
        const cached = this.get(); // Utilise la logique de validation TTL
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
        console.log('✅ Cache Manager instancié');
    } else {
        console.error('❌ CONFIG non défini avant Cache Manager. Vérifiez l\'ordre des scripts.');
    }
} else {
     console.log('✅ Cache Manager chargé (environnement non-navigateur)');
}