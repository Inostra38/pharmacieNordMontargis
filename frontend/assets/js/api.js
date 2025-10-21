// ==========================================
// Service API - Adapté pour Google Apps Script existant
// VERSION OPTIMISÉE avec endpoint /home
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
            // Vérifier que CONFIG est chargé
            if (typeof CONFIG === 'undefined') {
                console.error('❌ CONFIG n\'est pas défini. Assurez-vous que config.js est chargé avant api.js');
                throw new Error('Configuration non chargée');
            }

            // Endpoint dédié ultra-rapide
            const url = `${CONFIG.API.BASE_URL}?home=1&t=${Date.now()}`;
            console.log('🏠 Requête API Home optimisée:', url);
            
            const startTime = performance.now();
            
            const response = await fetch(url, {
                method: 'GET',
                redirect: 'follow'
            });
            
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            
            const endTime = performance.now();
            const loadTime = Math.round(endTime - startTime);
            
            console.log(`✅ Données Home reçues en ${loadTime}ms`);
            console.log(`📦 ${data.items?.length || 0} produits (Petits Prix + Promos en stock)`);
            
            return {
                success: true,
                data: {
                    products: data.items || [],
                    updatedAt: data.stockUpdatedAt || data.updatedAt,
                    loadTime: loadTime
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
            // Vérifier que CONFIG est chargé
            if (typeof CONFIG === 'undefined') {
                console.error('❌ CONFIG n\'est pas défini. Assurez-vous que config.js est chargé avant api.js');
                throw new Error('Configuration non chargée');
            }

            // Construire l'URL avec les paramètres pour votre Google Apps Script
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

            const url = `${CONFIG.API.BASE_URL}?${params.toString()}`;
            console.log('📡 Requête API:', url);
            
            const response = await fetch(url, {
                method: 'GET',
                redirect: 'follow'
            });
            
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('✅ Données brutes reçues:', data);
            console.log('🔍 Premier item brut:', data.items?.[0]);
            
            // Adapter le format de réponse pour le frontend
            // Votre API retourne { items: [...], total: X, count: Y }
            // Le frontend attend { success: true, data: { products: [...] } }
            
            const adaptedData = {
                success: true,
                data: {
                    products: (data.items || []).map(item => ({
                        // Mapping des champs de votre API vers le format attendu
                        identifiant: item.id,
                        libelle: item.libelle,
                        code_cip: item.cip,
                        prix_vendu: item.prix,
                        prix_final: item.prix_promo || item.prix,
                        stock: item.stock,
                        fournisseur: item.marque,
                        categorie: 'Général', // Pas de catégorie dans votre API
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
                        total: data.total || 0,
                        count: data.count || 0,
                        offset: data.offset || 0,
                        limit: data.limit || 1000
                    }
                }
            };
            
            console.log('✅ Données adaptées:', adaptedData);
            console.log('🔍 Premier produit adapté:', adaptedData.data.products?.[0]);
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
            // Recherche par ID
            const url = `${CONFIG.API.BASE_URL}?q=${id}&limit=1`;
            console.log('📡 Requête API:', url);
            
            const response = await fetch(url, {
                method: 'GET',
                redirect: 'follow'
            });
            
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.items && data.items.length > 0) {
                return {
                    success: true,
                    data: data.items[0]
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
        // Votre API n'a pas de catégories, on retourne une liste vide
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

console.log('✅ API Service chargé (version optimisée avec endpoint /home)');