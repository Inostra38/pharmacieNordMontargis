// ==========================================
// CSRF Manager - Gestion des tokens CSRF côté client
// ==========================================

class CSRFManager {
    constructor() {
        this.token = null;
        this.tokenExpiry = null;
        this.isRefreshing = false;
        this.API_ENDPOINT = '/api/csrf-token';
        
        console.log('🛡️ CSRF Manager initialisé');
    }

    /**
     * Récupérer un nouveau token CSRF depuis le serveur
     */
    async fetchToken() {
        if (this.isRefreshing) {
            console.log('⏳ Récupération du token déjà en cours...');
            // Attendre que la récupération en cours se termine
            return new Promise((resolve) => {
                const checkInterval = setInterval(() => {
                    if (!this.isRefreshing) {
                        clearInterval(checkInterval);
                        resolve(this.token);
                    }
                }, 100);
            });
        }

        this.isRefreshing = true;

        try {
            console.log('🔄 Récupération du token CSRF...');
            
            const response = await fetch(this.API_ENDPOINT, {
                method: 'GET',
                credentials: 'include', // ✅ Important pour les cookies
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Erreur ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            this.token = data.csrfToken;
            this.tokenExpiry = Date.now() + data.expiresIn;
            
            console.log('✅ Token CSRF récupéré avec succès');
            console.log('⏰ Expire dans:', Math.round(data.expiresIn / 1000 / 60), 'minutes');
            
            return this.token;

        } catch (error) {
            console.error('❌ Erreur lors de la récupération du token CSRF:', error);
            throw error;
        } finally {
            this.isRefreshing = false;
        }
    }

    /**
     * Vérifier si le token est toujours valide
     */
    isTokenValid() {
        if (!this.token || !this.tokenExpiry) {
            return false;
        }

        // Considérer le token invalide 1 minute avant son expiration
        const bufferTime = 60 * 1000; // 1 minute
        return Date.now() < (this.tokenExpiry - bufferTime);
    }

    /**
     * Obtenir un token valide (récupère un nouveau si nécessaire)
     */
    async getToken() {
        if (this.isTokenValid()) {
            console.log('✅ Token CSRF existant valide');
            return this.token;
        }

        console.log('🔄 Token invalide ou expiré, récupération d\'un nouveau...');
        return await this.fetchToken();
    }

    /**
     * Wrapper fetch sécurisé avec gestion automatique du token CSRF
     * Remplace fetch() pour toutes les requêtes protégées
     */
    async secureFetch(url, options = {}) {
        try {
            // Récupérer un token valide
            const token = await this.getToken();

            // Préparer les headers avec le token CSRF
            const headers = {
                'Content-Type': 'application/json',
                'CSRF-Token': token,
                ...options.headers
            };

            // Préparer les options de la requête
            const fetchOptions = {
                ...options,
                credentials: 'include', // ✅ Important pour les cookies
                headers: headers
            };

            console.log('🔒 Requête sécurisée vers:', url);

            // Effectuer la requête
            const response = await fetch(url, fetchOptions);

            // Si erreur CSRF (403), essayer de rafraîchir le token et réessayer
            if (response.status === 403) {
                const errorData = await response.json().catch(() => ({}));
                
                if (errorData.code === 'CSRF_TOKEN_INVALID') {
                    console.warn('⚠️ Token CSRF invalide, tentative de rafraîchissement...');
                    
                    // Forcer la récupération d'un nouveau token
                    this.token = null;
                    this.tokenExpiry = null;
                    const newToken = await this.fetchToken();
                    
                    // Réessayer la requête avec le nouveau token
                    headers['CSRF-Token'] = newToken;
                    fetchOptions.headers = headers;
                    
                    console.log('🔄 Nouvelle tentative avec token rafraîchi...');
                    return await fetch(url, fetchOptions);
                }
            }

            return response;

        } catch (error) {
            console.error('❌ Erreur lors de la requête sécurisée:', error);
            throw error;
        }
    }

    /**
     * Réinitialiser le manager (utile en cas de déconnexion)
     */
    reset() {
        this.token = null;
        this.tokenExpiry = null;
        console.log('🔄 CSRF Manager réinitialisé');
    }
}

// ==========================================
// INITIALISATION GLOBALE
// ==========================================

// Créer une instance globale accessible partout
if (typeof window !== 'undefined') {
    window.csrfManager = new CSRFManager();
    console.log('✅ window.csrfManager disponible globalement');
} else {
    console.log('⚠️ Environnement non-navigateur détecté');
}