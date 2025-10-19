// ==========================================
// Service API - Adapté pour Google Apps Script existant
// ==========================================

const apiService = {
    /**
     * Récupérer tous les produits (via cache ou API)
     */
    async getProducts(filters = {}) {
        try {
            // Vérifier que CONFIG est chargé
            if (typeof CONFIG === 'undefined') {
                console.error('❌ CONFIG n\'est pas défini. Assurez-vous que config.js est chargé avant api.js');
                throw new Error('Configuration non chargée');
            }

            // Vérifier que le cache manager est chargé
            if (typeof window.productCache === 'undefined') {
                console.error('❌ Cache Manager non chargé');
                throw new Error('Cache Manager non disponible');
            }

            console.log('🔍 getProducts appelé avec filtres:', filters);

            // Charger les produits (cache ou API)
            let items = await window.productCache.load(filters.forceRefresh);

            if (!items || items.length === 0) {
                throw new Error('Aucun produit disponible');
            }

            console.log('📦 Produits disponibles:', items.length);

            // Appliquer les filtres côté client si nécessaire
            if (filters.search) {
                const q = filters.search.toLowerCase();
                items = items.filter(item =>
                    (item.libelle || '').toLowerCase().includes(q) ||
                    (item.cip || '').toLowerCase().includes(q) ||
                    (item.marque || '').toLowerCase().includes(q)
                );
            }

            if (filters.featured) {
                items = items.filter(item => item.featured);
            }

            // Adapter le format de réponse pour le frontend
            const adaptedData = {
                success: true,
                data: {
                    products: items.map(item => ({
                        // Mapping des champs de votre API vers le format attendu
                        identifiant: item.id,
                        libelle: item.libelle,
                        code_cip: item.cip,
                        prix_vendu: item.prix,
                        prix_final: item.prix_promo || item.prix,
                        stock: item.stock,
                        fournisseur: item.marque,
                        categorie: 'Général',
                        image_url: item.image_url || CONFIG.IMAGE.PLACEHOLDER,
                        
                        // Promotion
                        promo_si_1: item.prix_promo,
                        promotions: item.promo_libelle || '',
                        
                        // Mise en avant
                        mise_en_avant: item.featured ? 1 : 0,
                        
                        // Sur ordonnance
                        tableau: item.ordonnance ? 1 : null,
                        
                        // Disponibilité
                        disponibilite: item.disponibilite,
                        availability: item.availability,
                        availability_code: item.availability_code,
                        
                        // Données brutes pour référence
                        _raw: item
                    })),
                    pagination: {
                        total: items.length,
                        count: items.length,
                        offset: 0,
                        limit: items.length
                    }
                }
            };
            
            console.log('✅ Données adaptées:', adaptedData.data.products.length, 'produits');
            return adaptedData;
            
        } catch (error) {
            console.error('Erreur API getProducts:', error);
            throw error;
        }
    },

    /**
     * Récupérer les marques/laboratoires
     */
    async getBrands() {
        try {
            const url = `${CONFIG.API.BASE_URL}?brands=1`;
            console.log('📡 Requête API brands:', url);
            
            const response = await fetch(url, {
                method: 'GET',
                redirect: 'follow'
            });
            
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            return data.brands || [];
            
        } catch (error) {
            console.error('Erreur API getBrands:', error);
            throw error;
        }
    },

    /**
     * Récupérer un produit par ID
     */
    async getProductById(id) {
        try {
            // Charger depuis le cache
            const items = await window.productCache.load();
            const product = items.find(item => item.id === id);
            
            if (product) {
                return {
                    success: true,
                    data: product
                };
            }
            
            return {
                success: false,
                message: 'Produit non trouvé'
            };
            
        } catch (error) {
            console.error('Erreur API getProductById:', error);
            throw error;
        }
    },

    /**
     * Récupérer les catégories (non disponible dans votre API)
     */
    async getCategories() {
        return {
            success: true,
            data: []
        };
    },

    /**
     * Forcer le rafraîchissement du cache
     */
    async refreshCache() {
        try {
            console.log('🔄 Rafraîchissement du cache...');
            await window.productCache.load(true);
            console.log('✅ Cache rafraîchi');
            return true;
        } catch (error) {
            console.error('❌ Erreur rafraîchissement cache:', error);
            return false;
        }
    }
};

// Rendre apiService accessible globalement
if (typeof window !== 'undefined') {
    window.apiService = apiService;
}

console.log('✅ API Service chargé (adapté Google Apps Script)');