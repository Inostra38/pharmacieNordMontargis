// ==========================================
// Gestionnaire des Produits - Page d'Accueil
// VERSION OPTIMISÉE avec endpoint dédié + STYLES CATALOGUE
// ==========================================

class HomeProductsManager {
    constructor() {
        this.productsGrid = document.getElementById('promotionsGrid');
        this.statusMessage = document.getElementById('statusMessage');
        this.statusText = document.getElementById('statusText');
        this.refreshBtn = document.getElementById('refreshBtn');
        
        this.init();
    }

    /**
     * Initialiser le gestionnaire
     */
    init() {
        console.log('🏠 Initialisation du gestionnaire de produits (page d\'accueil)...');
        this.loadFeaturedProducts();
        
        // Bouton de rafraîchissement
        if (this.refreshBtn) {
            this.refreshBtn.addEventListener('click', () => {
                this.loadFeaturedProducts();
            });
        }
    }

    /**
     * 🚀 OPTIMISÉ : Charger les produits via l'endpoint dédié /home
     * - Stock > 0 uniquement
     * - Petits Prix + Promos
     * - Max 15 produits
     * - Ultra-rapide (8-15 Ko au lieu de 800 Ko)
     */
    async loadFeaturedProducts() {
        try {
            console.log('🔥 Chargement ultra-rapide des produits (endpoint optimisé)...');
            this.showLoading();
            
            const startTime = performance.now();
            
            // NOUVEAU : endpoint ultra-rapide dédié à la page d'accueil
            const response = await apiService.getHomeProducts();
            
            const endTime = performance.now();
            const totalTime = Math.round(endTime - startTime);
            
            console.log('✅ Réponse API Home:', response);
            console.log(`⚡ Temps de chargement: ${totalTime}ms`);
            
            const products = response.data.products || [];
            
            console.log(`📦 ${products.length} produits reçus (Petits Prix + Promos en stock)`);
            
            if (products.length > 0) {
                this.renderProducts(products);
                this.hideStatus();
                
                // Afficher le temps de chargement en dev
                if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                    console.log(`🎯 Performance: ${totalTime}ms pour ${products.length} produits`);
                }
            } else {
                this.showEmptyState();
            }
            
        } catch (error) {
            console.error('❌ Erreur lors du chargement des produits:', error);
            this.showError('Impossible de charger les produits. Veuillez réessayer.');
        }
    }

    /**
     * Afficher les produits dans la grille
     */
    renderProducts(products) {
        if (!this.productsGrid) return;
        
        this.productsGrid.innerHTML = products.map(product => this.createProductCard(product)).join('');
        
        // Attacher les événements aux boutons Réserver
        this.attachReserveButtons();
    }

    /**
     * Attacher les événements aux boutons Réserver
     */
    async attachReserveButtons() {
        const reserveButtons = this.productsGrid.querySelectorAll('.reserve-btn');
        
        reserveButtons.forEach(btn => {
            btn.addEventListener('click', async () => {
                console.log('🛒 Clic sur Réserver (home)');
                
                const product = {
                    id: btn.dataset.id,
                    name: btn.dataset.name,
                    price: parseFloat(btn.dataset.price),
                    cip: btn.dataset.cip
                };
                
                console.log('Produit à ajouter:', product);
                
                // Vérifier que cartManager existe
                if (!window.cartManager) {
                    console.warn('⚠️ cartManager pas encore prêt, attente...');
                    
                    // Attendre jusqu'à 2 secondes
                    let attempts = 0;
                    while (!window.cartManager && attempts < 20) {
                        await new Promise(resolve => setTimeout(resolve, 100));
                        attempts++;
                    }
                    
                    if (!window.cartManager) {
                        console.error('❌ cartManager non trouvé après 2 secondes !');
                        alert('Erreur : Le panier n\'est pas initialisé. Rechargez la page.');
                        return;
                    }
                    
                    console.log('✅ cartManager maintenant disponible');
                }
                
                // Ajouter au panier
                try {
                    window.cartManager.addItem(product);
                    console.log('✅ Produit ajouté au panier depuis home');
                    
                    // Feedback visuel
                    const originalHTML = btn.innerHTML;
                    btn.innerHTML = '<span class="material-symbols-outlined">check</span> Réservé !';
                    btn.classList.add('bg-green-600', 'hover:bg-green-700');
                    btn.classList.remove('bg-teal-600', 'hover:bg-teal-700');
                    
                    setTimeout(() => {
                        btn.innerHTML = originalHTML;
                        btn.classList.remove('bg-green-600', 'hover:bg-green-700');
                        btn.classList.add('bg-teal-600', 'hover:bg-teal-700');
                    }, 1500);
                    
                } catch (error) {
                    console.error('❌ Erreur ajout panier:', error);
                    alert('Erreur lors de l\'ajout au panier : ' + error.message);
                }
            });
        });
    }

    /**
     * Échapper les caractères HTML
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Normaliser une chaîne (pour comparaisons)
     */
    norm(s) {
        return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }

    /**
     * Formater un prix
     */
    formatPrice(val) {
        if (typeof val === 'number' && Number.isFinite(val)) {
            return val.toFixed(2).replace('.', ',') + ' €';
        }
        return 'Prix sur demande';
    }

    /**
     * Créer une carte produit (STYLE CATALOGUE)
     */
    createProductCard(product) {
        // Labels de promotion
        const promoLabel = (product.promotions || product.promo_libelle || '').trim();
        const promoNorm = this.norm(promoLabel);
        
        // Badges
        let badgesHtml = '';
        
        // Badge "Petits Prix" ou "Promotions"
        if (promoNorm === 'petits prix') {
            badgesHtml += `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">💰 Petits Prix</span>`;
        } else if (promoLabel) {
            badgesHtml += `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">🔥 ${this.escapeHtml(promoLabel)}</span>`;
        }
        
        // Badge ordonnance (MODIFIÉ : on vérifie `product.tableau`)
        if (product.tableau) { //
            badgesHtml += `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">📋 Ordonnance</span>`;
        }
        
        // Prix (LOGIQUE DU CATALOGUE)
        let priceHTML = '';
        
        // Lot si présent
        let lotHTML = '';
        if (typeof product.lot_size === 'number' && product.lot_size > 1 && typeof product.lot_total === 'number') {
            const isPrixPar = promoNorm.includes('prix par');
            const lotPrice = `<span class="price-promo">${this.formatPrice(product.lot_total)}</span>`;
            const lotText = isPrixPar ? `le lot de ${product.lot_size}` : `les ${product.lot_size}`;
            lotHTML = `<span class="lot-inline">${isPrixPar ? lotPrice + ' ' + lotText : 'soit ' + lotPrice + ' ' + lotText}</span>`;
        }
        
        // Déterminer le prix à afficher
        if (promoNorm === 'petits prix') {
            const val = typeof product.prix_promo === 'number' ? product.prix_promo : product.prix;
            priceHTML = `<div class="flex items-baseline gap-2"><span class="price-promo">${this.formatPrice(val)}</span>${lotHTML}</div>`;
        } else if (typeof product.prix_promo === 'number' && Number.isFinite(product.prix_promo)) {
            priceHTML = `<div class="flex items-baseline gap-2"><span class="price-old">${this.formatPrice(product.prix)}</span><span class="price-promo">${this.formatPrice(product.prix_promo)}</span>${lotHTML}</div>`;
        } else {
            priceHTML = `<div class="flex items-baseline gap-2"><span class="text-xl font-bold text-gray-800 dark:text-white">${this.formatPrice(product.prix)}</span>${lotHTML}</div>`;
        }
        
        // Statut de disponibilité
        let availabilityHtml = '';
        if (product.stock === 0) {
            availabilityHtml = '<span class="text-xs text-red-600 dark:text-red-400 font-medium">Rupture</span>';
        } else if (product.stock < 10) {
            availabilityHtml = '<span class="text-xs text-orange-600 dark:text-orange-400 font-medium">Stock limité</span>';
        } else {
            availabilityHtml = '<span class="text-xs text-green-600 dark:text-green-400 font-medium">En stock</span>';
        }

        // --- NOUVELLE LOGIQUE POUR LE BOUTON ---
        let buttonHtml = '';
        if (product.tableau) {
            // Si ordonnance requise, afficher un bouton bleu "Sur ordonnance" désactivé
            buttonHtml = `
                <button 
                    class="w-full bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2 cursor-not-allowed"
                    disabled
                    title="Ce produit nécessite une ordonnance et ne peut pas être réservé."
                >
                    <span class="material-symbols-outlined text-sm">assignment</span>
                    Sur ordonnance
                </button>
            `;
        } else {
            // Sinon, afficher le bouton "Réserver" normal
            buttonHtml = `
                <button 
                    class="reserve-btn w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2 px-4 rounded-lg transition flex items-center justify-center gap-2"
                    data-id="${product.id || product.identifiant}"
                    data-name="${this.escapeHtml(product.libelle)}"
                    data-price="${product.prix_promo || product.prix}"
                    data-cip="${product.code_cip || product.cip}"
                >
                    <span class="material-symbols-outlined text-sm">shopping_cart</span>
                    Réserver
                </button>
            `;
        }
        // --- FIN DE LA NOUVELLE LOGIQUE ---

        return `
            <article class="bg-white dark:bg-gray-700 rounded-lg shadow-md hover:shadow-xl transition-all duration-300 hover:scale-105 overflow-hidden relative group">
                <div class="p-4">
                    <div class="flex flex-wrap gap-2 mb-3">
                        ${badgesHtml}
                    </div>
                    
                    <h3 class="font-semibold text-gray-800 dark:text-white mb-2 line-clamp-2 h-12 text-sm">${product.libelle}</h3>
                    
                    <p class="text-xs text-gray-600 dark:text-gray-400 mb-3">
                        ${product.fournisseur || product.marque ? (product.fournisseur || product.marque) + ' • ' : ''}CIP ${product.code_cip || product.cip || '?'}
                    </p>
                    
                    <div class="mb-3">
                        ${priceHTML}
                    </div>
                    
                    <div class="flex items-center justify-between mb-3">
                        ${availabilityHtml}
                    </div>
                    
                    ${buttonHtml}
                </div>
            </article>
        `;
    }

    /**
     * Afficher l'état de chargement
     */
    showLoading() {
        if (this.productsGrid) {
            this.productsGrid.innerHTML = `
                <div class="col-span-full flex justify-center items-center py-12">
                    <div class="text-center">
                        <div class="inline-block animate-spin rounded-full h-12 w-12 border-4 border-teal-500 border-t-transparent mb-4"></div>
                        <p class="text-gray-600 dark:text-gray-400">Chargement rapide...</p>
                    </div>
                </div>
            `;
        }
    }

    /**
     * Afficher un état vide
     */
    showEmptyState() {
        if (this.productsGrid) {
            this.productsGrid.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <span class="text-6xl mb-4 block">📦</span>
                    <p class="text-gray-600 dark:text-gray-400 text-lg">Aucune promotion disponible pour le moment</p>
                    <p class="text-gray-500 dark:text-gray-500 text-sm mt-2">Consultez notre catalogue complet pour découvrir tous nos produits</p>
                </div>
            `;
        }
    }

    /**
     * Afficher un message d'erreur
     */
    showError(message) {
        if (this.productsGrid) {
            this.productsGrid.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <span class="text-6xl mb-4 block">⚠️</span>
                    <p class="text-red-600 dark:text-red-400 text-lg mb-4">${message}</p>
                    <button 
                        onclick="homeProducts.loadFeaturedProducts()" 
                        class="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2 rounded-lg transition"
                    >
                        Réessayer
                    </button>
                </div>
            `;
        }
    }

    /**
     * Afficher/masquer le message de statut
     */
    showStatus(message, type = 'info') {
        if (this.statusMessage && this.statusText) {
            this.statusText.textContent = message;
            this.statusMessage.classList.remove('hidden');
            
            setTimeout(() => this.hideStatus(), 3000);
        }
    }

    hideStatus() {
        if (this.statusMessage) {
            this.statusMessage.classList.add('hidden');
        }
    }
}

// Initialiser au chargement de la page
let homeProducts;

document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ DOM chargé, initialisation du HomeProductsManager optimisé...');
    homeProducts = new HomeProductsManager();
    
    // Gestion du drawer panier
    const cartBtn = document.getElementById('cartButton');
    const cartDrawer = document.getElementById('cartDrawer');
    const cartOverlay = document.getElementById('cartOverlay');
    const closeCart = document.getElementById('closeCart');
    
    if (cartBtn && cartDrawer && cartOverlay && closeCart) {
        // Ouvrir le panier
        cartBtn.addEventListener('click', () => {
            cartDrawer.classList.remove('-translate-x-full');
            cartOverlay.classList.remove('hidden');
            
            // Rafraîchir l'affichage du panier
            if (window.cartManager) {
                window.cartManager.render();
            }
        });
        
        // Fermer le panier (croix)
        closeCart.addEventListener('click', () => {
            cartDrawer.classList.add('-translate-x-full');
            cartOverlay.classList.add('hidden');
        });
        
        // Fermer le panier (overlay)
        cartOverlay.addEventListener('click', () => {
            cartDrawer.classList.add('-translate-x-full');
            cartOverlay.classList.add('hidden');
        });
        
        // Valider le panier
        const validateCart = document.getElementById('validateCart');
        if (validateCart) {
            validateCart.addEventListener('click', () => {
                if (window.cartManager && window.cartManager.items.length > 0) {
                    alert('Fonctionnalité de validation en développement');
                }
            });
        }
    }
});