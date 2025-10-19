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
            return null;
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
            url.searchParams.set('limit', '50000');
            url.searchParams.set('t', Date.now());

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            const products = data.items || [];

            console.log('✅ API:', products.length, 'produits reçus');

            // Sauvegarder dans le cache
            this.set(products, {
                total: data.total,
                updatedAt: data.stockUpdatedAt || data.updatedAt
            });

            return products;

        } catch (error) {
            console.error('❌ Erreur chargement API:', error);
            throw error;
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Obtenir les métadonnées du cache
     */
    getMetadata() {
        const cached = this.get();
        return cached ? cached.metadata : null;
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
    window.productCache = new ProductCacheManager();
}

console.log('✅ Cache Manager chargé');