// ==========================================
// Service API - VERSION SÉCURISÉE avec CSRF
// Toutes les requêtes passent par le backend
// ==========================================

const apiService = {
    /**
     * 🔥 NOUVEAU : Récupérer les produits optimisés pour la page d'accueil
     * - Stock > 0 uniquement
     * - Petits Prix OU Promos
     * - Max 15 produits
     * - Ultra-rapide (exit rapide côté backend)
     */
    async getHomeProducts() {
        try {
            // Vérifier que CONFIG et csrfManager sont chargés
            if (typeof CONFIG === 'undefined') {
                console.error('❌ CONFIG n\'est pas défini');
                throw new Error('Configuration non chargée');
            }

            if (typeof window.csrfManager === 'undefined') {
                console.error('❌ csrfManager n\'est pas défini');
                throw new Error('CSRF Manager non chargé');
            }

            const url = `${CONFIG.API.ENDPOINTS.PRODUCTS_HOME}?t=${Date.now()}`;
            console.log('🏠 Requête API Home sécurisée:', url);
            
            const startTime = performance.now();
            
            // ✅ Utiliser secureFetch au lieu de fetch
            const response = await window.csrfManager.secureFetch(url, {
                method: 'GET'
            });
            
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }
            
            const result = await response.json();
            
            const endTime = performance.now();
            const loadTime = Math.round(endTime - startTime);
            
            console.log(`✅ Données Home reçues en ${loadTime}ms`);
            console.log(`📦 ${result.data?.items?.length || 0} produits`);
            
            return {
                success: true,
                data: {
                    products: result.data?.items || [],
                    updatedAt: result.data?.stockUpdatedAt || result.data?.updatedAt,
                    loadTime: loadTime,
                    cached: result.cached || false
                }
            };
            
        } catch (error) {
            console.error('❌ Erreur API getHomeProducts:', error);
            throw error;
        }
    },

    /**
     * Récupérer tous les produits (route standard)
     */
    async getProducts(filters = {}) {
        try {
            // Vérifier que CONFIG et csrfManager sont chargés
            if (typeof CONFIG === 'undefined') {
                console.error('❌ CONFIG n\'est pas défini');
                throw new Error('Configuration non chargée');
            }

            if (typeof window.csrfManager === 'undefined') {
                console.error('❌ csrfManager n\'est pas défini');
                throw new Error('CSRF Manager non chargé');
            }

            // Construire l'URL avec les paramètres
            const params = new URLSearchParams();
            
            // Paramètre de recherche
            if (filters.search) {
                params.append('q', filters.search);
            }
            
            // Limite et offset pour pagination
            params.append('limit', filters.limit || 1000);
            params.append('offset', filters.offset || 0);
            
            // Produits mis en avant uniquement
            if (filters.featured) {
                params.append('featured', '1');
            }

            const url = `${CONFIG.API.ENDPOINTS.PRODUCTS}?${params.toString()}`;
            console.log('📡 Requête API sécurisée:', url);
            
            const startTime = performance.now();
            
            // ✅ Utiliser secureFetch au lieu de fetch
            const response = await window.csrfManager.secureFetch(url, {
                method: 'GET'
            });
            
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }
            
            const result = await response.json();
            
            const endTime = performance.now();
            const loadTime = Math.round(endTime - startTime);
            
            console.log(`✅ Données reçues en ${loadTime}ms (cached: ${result.cached || false})`);
            console.log('🔍 Premier item:', result.data?.items?.[0]);
            
            // Adapter le format de réponse pour le frontend
            const adaptedData = {
                success: true,
                data: {
                    products: (result.data?.items || []).map(item => ({
                        // Mapping des champs de l'API vers le format attendu
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
                        tableau: item.ordonnance ? 'Liste I' : '',
                        
                        // Données complètes de l'item original
                        ...item
                    })),
                    total: result.data?.total || 0,
                    count: result.data?.count || 0,
                    cached: result.cached || false,
                    cacheAge: result.cacheAge || 0,
                    loadTime: loadTime
                }
            };
            
            console.log(`📊 Total produits: ${adaptedData.data.products.length}`);
            return adaptedData;
            
        } catch (error) {
            console.error('❌ Erreur API getProducts:', error);
            
            // Gestion spécifique erreur CSRF
            if (error.message.includes('403') || error.message.includes('CSRF')) {
                alert(CONFIG.MESSAGES.ERROR.CSRF);
                window.location.reload();
            }
            
            throw error;
        }
    },

    /**
     * Récupérer les marques/laboratoires
     */
    async getBrands() {
        try {
            if (typeof window.csrfManager === 'undefined') {
                console.error('❌ csrfManager n\'est pas défini');
                throw new Error('CSRF Manager non chargé');
            }

            const url = CONFIG.API.ENDPOINTS.BRANDS;
            console.log('📡 Requête API brands:', url);
            
            const response = await window.csrfManager.secureFetch(url, {
                method: 'GET'
            });
            
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }
            
            const result = await response.json();
            return result.data || [];
            
        } catch (error) {
            console.error('❌ Erreur API getBrands:', error);
            throw error;
        }
    },

    /**
     * Récupérer un produit par ID
     */
    async getProductById(id) {
        try {
            if (typeof window.csrfManager === 'undefined') {
                console.error('❌ csrfManager n\'est pas défini');
                throw new Error('CSRF Manager non chargé');
            }

            // Recherche par ID
            const url = `${CONFIG.API.ENDPOINTS.PRODUCTS}?q=${id}&limit=1`;
            console.log('📡 Requête API:', url);
            
            const response = await window.csrfManager.secureFetch(url, {
                method: 'GET'
            });
            
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.data?.items && result.data.items.length > 0) {
                return {
                    success: true,
                    data: result.data.items[0]
                };
            }
            
            return {
                success: false,
                message: 'Produit non trouvé'
            };
            
        } catch (error) {
            console.error('❌ Erreur API getProductById:', error);
            throw error;
        }
    },

    /**
     * Récupérer les catégories (non disponible dans l'API)
     */
    async getCategories() {
        return {
            success: true,
            data: []
        };
    }
};

// Rendre apiService accessible globalement
if (typeof window !== 'undefined') {
    window.apiService = apiService;
}

console.log('✅ API Service chargé (VERSION SÉCURISÉE avec CSRF)');