// ==========================================
// Gestionnaire des Produits - Page d'Accueil
// VERSION 3.0 ULTRA-OPTIMISÉE - Triple cache
// ==========================================

class HomeProductsManager {
    constructor() {
        this.productsGrid = document.getElementById('promotionsGrid');
        this.statusMessage = document.getElementById('statusMessage');
        this.statusText = document.getElementById('statusText');
        this.refreshBtn = document.getElementById('refreshBtn');
        
        // Cache IndexedDB pour la page d'accueil
        this.CACHE_KEY = 'home_products_cache';
        this.CACHE_TTL = 24 * 60 * 60 * 1000; // 24 heures
        
        this.init();
    }

    /**
     * Initialiser le gestionnaire
     */
    init() {
        console.log('🏠 Initialisation du gestionnaire (page d\'accueil v3.0 - Triple cache)...');
        this.loadFeaturedProducts();
        
        // Bouton de rafraîchissement
        if (this.refreshBtn) {
            this.refreshBtn.addEventListener('click', () => {
                this.forceRefresh();
            });
        }
    }

    /**
     * ⚡ NOUVEAU : Charger avec triple cache
     */
    async loadFeaturedProducts() {
        try {
            console.log('🔥 Chargement ultra-optimisé (triple cache)...');
            this.showSkeletonLoader();
            
            // 1️⃣ NIVEAU 1 : Vérifier IndexedDB (instantané)
            const cachedProducts = await this.loadFromCache();
            
            if (cachedProducts && cachedProducts.length > 0) {
                console.log(`⚡ IndexedDB: ${cachedProducts.length} produits chargés instantanément`);
                this.renderProducts(cachedProducts);
                this.hideStatus();
                
                // Vérifier en arrière-plan s'il y a des mises à jour
                this.checkForUpdatesInBackground();
                return;
            }
            
            // 2️⃣ NIVEAU 2 : Cache vide → Charger depuis API
            await this.loadFromAPI();
            
        } catch (error) {
            console.error('❌ Erreur lors du chargement des produits:', error);
            this.showError('Impossible de charger les produits. Veuillez réessayer.');
        }
    }

    /**
     * ⚡ Charger depuis IndexedDB (< 100ms)
     */
    async loadFromCache() {
        try {
            const cached = localStorage.getItem(this.CACHE_KEY);
            if (!cached) return null;
            
            const data = JSON.parse(cached);
            const age = Date.now() - data.timestamp;
            
            // Utiliser le cache même un peu vieux (< 24h)
            if (age < this.CACHE_TTL) {
                const ageMinutes = Math.round(age / 60000);
                console.log(`📂 Cache local: ${data.products.length} produits (${ageMinutes} min)`);
                return data.products;
            }
            
            console.log('⏰ Cache local expiré');
            return null;
        } catch (error) {
            console.warn('⚠️ Erreur lecture cache local:', error);
            return null;
        }
    }

    /**
     * 💾 Sauvegarder dans IndexedDB
     */
    async saveToCache(products) {
        try {
            const data = {
                products: products,
                timestamp: Date.now()
            };
            localStorage.setItem(this.CACHE_KEY, JSON.stringify(data));
            console.log('💾 Produits sauvegardés dans le cache local');
        } catch (error) {
            console.warn('⚠️ Erreur sauvegarde cache local:', error);
        }
    }

    /**
     * 📡 Charger depuis API (avec cache Backend + Apps Script)
     */
    async loadFromAPI() {
        const startTime = performance.now();
        const response = await apiService.getHomeProducts();
        const endTime = performance.now();
        const totalTime = Math.round(endTime - startTime);
        
        console.log('✅ Réponse API Home:', response);
        console.log(`⚡ Temps de chargement: ${totalTime}ms`);
        
        const products = response.data.products || [];
        console.log(`📦 ${products.length} produits reçus`);
        
        if (products.length > 0) {
            this.renderProducts(products);
            this.hideStatus();
            
            // Sauvegarder dans le cache local
            await this.saveToCache(products);
        } else {
            this.showEmptyState();
        }
    }

    /**
     * 🔄 Vérifier les mises à jour en arrière-plan
     */
    async checkForUpdatesInBackground() {
        console.log('🔄 Vérification des mises à jour en arrière-plan...');
        
        try {
            const response = await apiService.getHomeProducts();
            const newProducts = response.data.products || [];
            
            // Comparer avec le cache actuel
            const cachedData = localStorage.getItem(this.CACHE_KEY);
            if (!cachedData) return;
            
            const cached = JSON.parse(cachedData);
            
            // Détection basique de changements
            const hasChanges = newProducts.length !== cached.products.length ||
                               newProducts[0]?.id !== cached.products[0]?.id;
            
            if (hasChanges) {
                console.log('🔄 Changements détectés, mise à jour silencieuse...');
                await this.saveToCache(newProducts);
                this.notifyUpdate();
            } else {
                console.log('✅ Catalogue à jour (pas de changements)');
            }
            
        } catch (error) {
            console.warn('⚠️ Erreur vérification mises à jour:', error);
        }
    }

    /**
     * 📢 Notification discrète de mise à jour
     */
    notifyUpdate() {
    const notification = document.createElement('div');
    notification.className = 'fixed bottom-4 right-4 bg-teal-600 text-white px-6 py-3 rounded-lg shadow-lg z-50';

    const container = document.createElement('div');
    container.className = 'flex items-center gap-3';

    // Contenu (icône et texte)
    container.innerHTML = `
        <span class="material-symbols-outlined">update</span>
        <span>Nouvelles promos disponibles !</span>
    `;

    // Bouton "Actualiser"
    const reloadBtn = document.createElement('button');
    reloadBtn.className = 'ml-2 underline hover:no-underline';
    reloadBtn.textContent = 'Actualiser';
    reloadBtn.addEventListener('click', () => {
        location.reload();
    });

    // Bouton "Fermer"
    const closeBtn = document.createElement('button');
    closeBtn.className = 'ml-2';
    closeBtn.textContent = '✕';
    closeBtn.setAttribute('aria-label', 'Fermer la notification');
    closeBtn.addEventListener('click', () => {
        notification.remove();
    });

    // Assemblage
    container.appendChild(reloadBtn);
    container.appendChild(closeBtn);
    notification.appendChild(container);
    document.body.appendChild(notification);

    // Suppression automatique
    setTimeout(() => {
        if (document.body.contains(notification)) {
            notification.remove();
        }
    }, 8000);
}

    /**
     * 🔄 Forcer le rafraîchissement (bouton)
     */
    async forceRefresh() {
        console.log('🔄 Rafraîchissement forcé...');
        
        // Vider le cache local
        localStorage.removeItem(this.CACHE_KEY);
        
        // Recharger depuis l'API
        this.showSkeletonLoader();
        await this.loadFromAPI();
    }

    /**
     * Afficher le skeleton loader
     */
    showSkeletonLoader() {
        if (!this.productsGrid) return;
        
        const skeletonHTML = `
            <div class="bg-white dark:bg-gray-700 rounded-lg shadow-md p-4 animate-pulse">
                <div class="h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4 mb-3"></div>
                <div class="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/2 mb-3"></div>
                <div class="h-6 bg-gray-200 dark:bg-gray-600 rounded w-1/3 mb-3"></div>
                <div class="h-10 bg-gray-200 dark:bg-gray-600 rounded"></div>
            </div>
        `;
        
        this.productsGrid.innerHTML = Array(6).fill(skeletonHTML).join('');
    }

    /**
     * Afficher les produits
     */
    renderProducts(products) {
        if (!this.productsGrid) {
            console.error('❌ productsGrid non trouvé');
            return;
        }
        
        if (!Array.isArray(products) || products.length === 0) {
            this.showEmptyState();
            return;
        }
        
        console.log(`🎨 Rendu de ${products.length} produits...`);
        
        this.productsGrid.innerHTML = products.map(product => 
            this.renderProduct(product)
        ).join('');
        
        // Attacher les événements "Réserver"
        this.attachReserveButtons();
    }

    /**
     * Attacher les événements aux boutons "Réserver"
     */
    attachReserveButtons() {
        const reserveButtons = this.productsGrid.querySelectorAll('.reserve-btn');
        
        reserveButtons.forEach(button => {
            // Supprimer les anciens listeners (éviter les doublons)
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            
            newButton.addEventListener('click', async function() {
                const product = {
                    id: this.dataset.id,
                    name: this.dataset.name,
                    price: parseFloat(this.dataset.price),
                    basePrice: parseFloat(this.dataset.basePrice),
                    cip: this.dataset.cip,
                    promoLibelle: this.dataset.promoLibelle,
                    lotSize: this.dataset.lotSize ? parseInt(this.dataset.lotSize) : null,
                    lotTotal: this.dataset.lotTotal ? parseFloat(this.dataset.lotTotal) : null,
                    requiresPrescription: false
                };
                
                if (!window.cartManager) {
                    console.error('❌ cartManager non trouvé !');
                    alert('Erreur : Le panier n\'est pas initialisé.');
                    return;
                }
                
                try {
                    window.cartManager.addItem(product);
                    
                    // Feedback visuel
                    const originalHTML = this.innerHTML;
                    this.innerHTML = '<span class="material-symbols-outlined">check</span> Réservé !';
                    this.classList.add('bg-green-600', 'hover:bg-green-700');
                    this.classList.remove('bg-teal-600', 'hover:bg-teal-700');
                    this.disabled = true;
                    
                    setTimeout(() => {
                        if(document.body.contains(this)) {
                            this.innerHTML = originalHTML;
                            this.classList.remove('bg-green-600', 'hover:bg-green-700');
                            this.classList.add('bg-teal-600', 'hover:bg-teal-700');
                            this.disabled = false;
                        }
                    }, 1500);
                    
                } catch (error) {
                    console.error('❌ Erreur ajout panier:', error);
                    alert('Erreur lors de l\'ajout au panier');
                }
            });
        });
    }

    /**
     * Échapper les caractères HTML
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }

    /**
     * Normaliser le texte (minuscules, sans accents)
     */
    normalize(str) {
        return String(str || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
    }

    /**
     * Formater un prix
     */
    formatPrice(value) {
        if (typeof value !== 'number' || !Number.isFinite(value)) {
            return 'Prix sur demande';
        }
        return value.toFixed(2).replace('.', ',') + ' €';
    }

    /**
     * Rendu d'un produit
     */
    renderProduct(product) {
        if (!product) return '';
        
        const promoLabel = (product.promo_libelle || '').trim();
        const promoNorm = this.normalize(promoLabel);
        const isPetitsPrix = promoNorm === 'petits prix';
        const lotSize = product.lot_size;
        const lotTotal = product.lot_total;
        const basePrice = product.prix;
        const finalUnitPrice = product.prix_promo || product.prix;
        
        // Badges
        let badgesHtml = '';
        if (isPetitsPrix) {
            badgesHtml += `<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-yellow-400 text-yellow-900">💰 Petits Prix</span>`;
        } else if (promoLabel) {
            badgesHtml += `<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">🔥 ${this.escapeHtml(promoLabel)}</span>`;
        }
        
        // Prix
        let priceHTML = '';
        if (typeof lotSize === 'number' && lotSize > 1 && typeof lotTotal === 'number') {
            const isPrixPar = promoNorm.includes('prix par');
            const lotPrice = `<span class="price-promo">${this.formatPrice(lotTotal)}</span>`;
            const lotText = isPrixPar ? `le lot de ${lotSize}` : `les ${lotSize}`;
            priceHTML = `
                <p class="price-wrap">
                    ${lotPrice}
                    <span class="lot-inline">${isPrixPar ? 'Par' : 'Pour'} ${lotText}</span>
                </p>
            `;
            if (typeof finalUnitPrice === 'number') {
                priceHTML += `<p class="text-xs text-gray-600 dark:text-gray-400">(${this.formatPrice(finalUnitPrice)}/unité)</p>`;
            }
        } else if (typeof product.prix_promo === 'number' && Number.isFinite(product.prix_promo) && typeof basePrice === 'number' && product.prix_promo < basePrice) {
            priceHTML = `
                <p class="text-red-600 dark:text-red-400 font-bold text-lg">
                    <span class="price-promo">${this.formatPrice(product.prix_promo)}</span>
                </p>
                <p class="text-xs text-gray-500 line-through">${this.formatPrice(basePrice)}</p>
            `;
        } else if (typeof basePrice === 'number') {
            priceHTML = `<p class="text-gray-800 dark:text-gray-200 font-semibold text-lg">${this.formatPrice(basePrice)}</p>`;
        } else {
            priceHTML = '<p class="text-gray-500 italic">Prix sur demande</p>';
        }
        
        // Disponibilité
        let availabilityHtml = '<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">✅ Disponible</span>';
        
        // Bouton
        const requiresPrescription = product.ordonnance;
        let buttonHtml = '';
        
        if (requiresPrescription) {
            buttonHtml = `
                <a href="secure.ordonnance.html" 
                   class="block w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold py-2 px-4 rounded-lg transition text-center flex items-center justify-center gap-2">
                    <span class="material-symbols-outlined text-sm">upload_file</span>
                    Envoyer l'ordonnance
                </a>
            `;
        } else {
            buttonHtml = `
                <button 
                    class="reserve-btn w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2 px-4 rounded-lg transition flex items-center justify-center gap-2"
                    data-id="${product.id || product.identifiant}"
                    data-name="${this.escapeHtml(product.libelle)}"
                    data-price="${finalUnitPrice}"
                    data-base-price="${basePrice}"
                    data-cip="${product.code_cip || product.cip}"
                    data-promo-libelle="${this.escapeHtml(promoLabel)}"
                    data-lot-size="${lotSize || ''}"
                    data-lot-total="${lotTotal || ''}"
                >
                    <span class="material-symbols-outlined text-sm">shopping_cart</span>
                    Réserver
                </button>
            `;
        }
        
        // Rendu HTML final
        return `
            <article class="bg-white dark:bg-gray-700 rounded-lg shadow-md hover:shadow-xl transition-all duration-300 hover:scale-105 overflow-hidden relative group">
                <div class="p-4">
                    <div class="flex flex-wrap gap-2 mb-3">${badgesHtml}</div>
                    <h3 class="font-semibold text-gray-800 dark:text-white mb-2 line-clamp-2 h-12 text-sm">
                        ${this.escapeHtml(product.libelle)}
                    </h3>
                    <p class="text-xs text-gray-600 dark:text-gray-400 mb-3">
                        ${product.fournisseur || product.marque ? (product.fournisseur || product.marque) + ' • ' : ''}
                        CIP ${product.code_cip || product.cip || '?'}
                    </p>
                    <div class="mb-3">${priceHTML}</div>
                    <div class="flex items-center justify-between mb-3">${availabilityHtml}</div>
                    ${buttonHtml}
                </div>
            </article>
        `;
    }

    /**
     * Afficher l'état vide
     */
    showEmptyState() {
        if (!this.productsGrid) return;
        
        this.productsGrid.innerHTML = `
            <div class="col-span-full text-center py-12">
                <div class="text-6xl mb-4">🔍</div>
                <p class="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
                    Aucune promotion disponible pour le moment
                </p>
                <p class="text-gray-500 dark:text-gray-500">
                    Revenez bientôt pour découvrir nos offres !
                </p>
            </div>
        `;
    }

    /**
     * Afficher une erreur
     */
    showError(message) {
        if (!this.productsGrid) return;
        
        this.productsGrid.innerHTML = `
            <div class="col-span-full text-center py-12">
                <div class="text-6xl mb-4">⚠️</div>
                <p class="text-xl font-semibold text-red-600 dark:text-red-400 mb-2">
                    Erreur de chargement
                </p>
                <p class="text-gray-600 dark:text-gray-400 mb-4">
                    ${message}
                </p>
                <button onclick="location.reload()" 
                        class="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors">
                    Réessayer
                </button>
            </div>
        `;
    }

    hideStatus() { /* Fonction existante */ }

} // Fin de la classe HomeProductsManager

// --- Initialisation ---
let homeProducts;
document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ DOM chargé, initialisation HomeProductsManager v3.0 (Triple cache)...');
    homeProducts = new HomeProductsManager();
    
    // Gestion du drawer panier
    const cartBtn = document.getElementById('cartButton');
    const cartDrawer = document.getElementById('cartDrawer');
    const cartOverlay = document.getElementById('cartOverlay');
    const closeCart = document.getElementById('closeCart');
    
    if (cartBtn && cartDrawer && cartOverlay && closeCart) {
        cartBtn.addEventListener('click', () => {
            cartDrawer.classList.remove('-translate-x-full');
            cartOverlay.classList.remove('hidden');
            if (window.cartManager) window.cartManager.render();
        });
        
        closeCart.addEventListener('click', () => {
            cartDrawer.classList.add('-translate-x-full');
            cartOverlay.classList.add('hidden');
        });
        
        cartOverlay.addEventListener('click', () => {
            cartDrawer.classList.add('-translate-x-full');
            cartOverlay.classList.add('hidden');
        });
    }
});

console.log('✅ home.js v3.0 chargé (Triple cache: Apps Script + Backend + LocalStorage)');