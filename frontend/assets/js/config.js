// ==========================================
// Configuration - Pharmacie Nord Montargis
// ==========================================

const CONFIG = {
    // API Google Apps Script
    API: {
        BASE_URL: 'https://script.google.com/macros/s/AKfycbyeUXfJ0PA51tiSVNRr15AiVJJLBcHaYZl7cFT0L9rJ0WWzKzVwPzpPzL-NqR1H7iXp/exec'
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
            GENERIC: 'Une erreur est survenue. Veuillez réessayer.'
        }
    }
};

// Rendre CONFIG accessible globalement
if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
}

// Log de confirmation
console.log('✅ Configuration chargée');
console.log('📡 API:', CONFIG.API.BASE_URL);
