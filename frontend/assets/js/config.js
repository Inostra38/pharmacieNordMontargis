// ==========================================
// Configuration - Pharmacie Nord Montargis
// VERSION SÉCURISÉE - Proxy via backend
// ==========================================

const CONFIG = {
    // API Backend (Proxy sécurisé)
    API: {
        // ✅ NOUVEAU : Toutes les requêtes passent par le backend
        BASE_URL: '/api/products',
        CSRF_TOKEN_URL: '/api/csrf-token',
        
        // Endpoints spécifiques
        ENDPOINTS: {
            PRODUCTS: '/api/products',
            PRODUCTS_HOME: '/api/products/home',
            BRANDS: '/api/products/brands',
            CART: '/api/cart',
            PRESCRIPTION: '/api/prescription'
        }
    },

    // Images (placeholder par défaut)
    IMAGE: {
        PLACEHOLDER: 'https://via.placeholder.com/300x300/0d9488/ffffff?text=Produit',
        MAX_SIZE: 5 * 1024 * 1024, // 5MB
        ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    },

    // Pagination
    PAGINATION: {
        DEFAULT_LIMIT: 50000,
        FEATURED_LIMIT: 60,
        RANDOM_LIMIT: 150
    },

    // Cache
    CACHE: {
        TTL: 10 * 60 * 1000, // 10 minutes (correspond au cache serveur)
        ENABLED: true
    },

    // Messages
    MESSAGES: {
        SUCCESS: {
            ADD_TO_CART: 'Produit réservé !',
            LOAD: 'Données chargées avec succès',
            REFRESH: 'Produits actualisés'
        },
        ERROR: {
            NETWORK: 'Erreur de connexion. Veuillez vérifier votre connexion internet.',
            SERVER: 'Erreur serveur. Veuillez réessayer plus tard.',
            NOT_FOUND: 'Ressource non trouvée.',
            NO_PRODUCTS: 'Aucun produit trouvé.',
            GENERIC: 'Une erreur est survenue. Veuillez réessayer.',
            CSRF: 'Votre session a expiré. Veuillez rafraîchir la page.'
        }
    }
};

// Rendre CONFIG accessible globalement
if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
}

// Log de confirmation
console.log('✅ Configuration chargée (VERSION SÉCURISÉE)');
console.log('📡 API Backend:', CONFIG.API.BASE_URL);
console.log('🛡️ Protection CSRF activée');