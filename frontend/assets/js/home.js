// ==========================================
// Gestionnaire des Produits - Page d'Accueil
// VERSION OPTIMISÉE + GESTION PROMO POUR PANIER
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
     * Charger les produits via l'endpoint dédié /home
     */
    async loadFeaturedProducts() {
        try {
            console.log('🔥 Chargement ultra-rapide des produits (endpoint optimisé)...');
            this.showLoading();
            
            const startTime = performance.now();
            const response = await apiService.getHomeProducts(); //
            const endTime = performance.now();
            const totalTime = Math.round(endTime - startTime);
            
            console.log('✅ Réponse API Home:', response);
            console.log(`⚡ Temps de chargement: ${totalTime}ms`);
            
            const products = response.data.products || [];
            console.log(`📦 ${products.length} produits reçus (Petits Prix + Promos en stock)`);
            
            if (products.length > 0) {
                this.renderProducts(products);
                this.hideStatus();
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
        this.attachReserveButtons(); // Attacher les événements APRES avoir généré le HTML
    }

    /**
     * Attacher les événements aux boutons Réserver (Mis à jour pour lire toutes les données)
     */
    async attachReserveButtons() {
        const reserveButtons = this.productsGrid.querySelectorAll('.reserve-btn');
        
        reserveButtons.forEach(btn => {
            // Utiliser cloneNode pour s'assurer que les listeners précédents sont retirés si cette fonction est appelée plusieurs fois
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);

            newBtn.addEventListener('click', async () => {
                console.log('🛒 Clic sur Réserver (home)');
                
                // On récupère TOUTES les données depuis les attributs data-*
                const product = {
                    id: newBtn.dataset.id,
                    name: newBtn.dataset.name,
                    price: parseFloat(newBtn.dataset.price),          // Prix final unitaire affiché
                    basePrice: parseFloat(newBtn.dataset.basePrice), // Prix avant promo
                    cip: newBtn.dataset.cip,
                    promoLibelle: newBtn.dataset.promoLibelle,       // Libellé promo
                    lotSize: newBtn.dataset.lotSize ? parseInt(newBtn.dataset.lotSize) : null, // Taille lot
                    lotTotal: newBtn.dataset.lotTotal ? parseFloat(newBtn.dataset.lotTotal) : null, // Prix lot
                    requiresPrescription: false // Normalement pas possible ici car bouton différent
                };
                
                console.log('Produit à ajouter:', product);
                
                // Attendre que cartManager soit prêt
                if (!window.cartManager) {
                    console.warn('⚠️ cartManager pas encore prêt, attente...');
                    let attempts = 0;
                    while (!window.cartManager && attempts < 20) { // Attend max 2s
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
                    window.cartManager.addItem(product); // Envoie l'objet complet
                    console.log('✅ Produit ajouté au panier depuis home');
                    
                    // Feedback visuel
                    const originalHTML = newBtn.innerHTML;
                    newBtn.innerHTML = '<span class="material-symbols-outlined">check</span> Réservé !';
                    newBtn.classList.add('bg-green-600', 'hover:bg-green-700');
                    newBtn.classList.remove('bg-teal-600', 'hover:bg-teal-700');
                    
                    setTimeout(() => {
                        if (document.body.contains(newBtn)) { // Vérifier si le bouton existe toujours
                             newBtn.innerHTML = originalHTML;
                             newBtn.classList.remove('bg-green-600', 'hover:bg-green-700');
                             newBtn.classList.add('bg-teal-600', 'hover:bg-teal-700');
                        }
                    }, 1500);
                    
                } catch (error) {
                    console.error('❌ Erreur ajout panier:', error);
                    alert('Erreur lors de l\'ajout au panier : ' + error.message);
                }
            });
        });
        console.log(`✅ Événements attachés aux ${reserveButtons.length} boutons Réserver (Home)`);
    }

    /** Échapper les caractères HTML */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /** Normaliser une chaîne */
    norm(s) {
        return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }

    /** Formater un prix */
    formatPrice(val) {
        if (typeof val === 'number' && Number.isFinite(val)) {
            return val.toFixed(2).replace('.', ',') + ' €';
        }
        return 'Prix sur demande';
    }

    /**
     * Créer une carte produit (Mis à jour avec les data-* et bouton/lien dynamique)
     */
    createProductCard(product) {
        // --- Récupération des données produit ---
        const promoLabel = (product.promotions || product.promo_libelle || '').trim(); //
        const promoNorm = this.norm(promoLabel);
        const lotSize = product.lot_size;
        const lotTotal = product.lot_total;
        const requiresPrescription = product.tableau; //
        const basePrice = product.prix; // Prix avant promo
        const finalUnitPrice = product.prix_promo || product.prix; // Prix unitaire final
        
        // --- Badges ---
        let badgesHtml = '';
        if (promoNorm === 'petits prix') {
            badgesHtml += `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">💰 Petits Prix</span>`;
        } else if (promoLabel) {
            badgesHtml += `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">🔥 ${this.escapeHtml(promoLabel)}</span>`;
        }
        if (requiresPrescription) {
            badgesHtml += `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">📋 Ordonnance</span>`;
        }
        
        // --- Prix HTML ---
        let priceHTML = '';
        let lotHTML = '';
        if (typeof lotSize === 'number' && lotSize > 1 && typeof lotTotal === 'number') {
            const isPrixPar = promoNorm.includes('prix par');
            const lotPrice = `<span class="price-promo">${this.formatPrice(lotTotal)}</span>`;
            const lotText = isPrixPar ? `le lot de ${lotSize}` : `les ${lotSize}`;
            lotHTML = `<span class="lot-inline">${isPrixPar ? lotPrice + ' ' + lotText : 'soit ' + lotPrice + ' ' + lotText}</span>`;
        }
        if (promoNorm === 'petits prix') {
            priceHTML = `<div class="flex items-baseline gap-2"><span class="price-promo">${this.formatPrice(finalUnitPrice)}</span>${lotHTML}</div>`;
        } else if (typeof product.prix_promo === 'number' && Number.isFinite(product.prix_promo)) {
            priceHTML = `<div class="flex items-baseline gap-2"><span class="price-old">${this.formatPrice(basePrice)}</span><span class="price-promo">${this.formatPrice(finalUnitPrice)}</span>${lotHTML}</div>`;
        } else {
            priceHTML = `<div class="flex items-baseline gap-2"><span class="text-xl font-bold text-gray-800 dark:text-white">${this.formatPrice(basePrice)}</span>${lotHTML}</div>`;
        }
        
        // --- Disponibilité ---
        let availabilityHtml = '';
        if (product.stock === 0) { availabilityHtml = '<span class="text-xs text-red-600 dark:text-red-400 font-medium">Rupture</span>'; } 
        else if (product.stock < 10) { availabilityHtml = '<span class="text-xs text-orange-600 dark:text-orange-400 font-medium">Stock limité</span>'; } 
        else { availabilityHtml = '<span class="text-xs text-green-600 dark:text-green-400 font-medium">En stock</span>'; }

        // --- Bouton/Lien dynamique ---
        let buttonHtml = '';
        if (requiresPrescription) {
            buttonHtml = `
                <a
                    href="secure.ordonnance.html"
                    class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition flex items-center justify-center gap-2"
                    title="Ce produit nécessite une ordonnance. Cliquez pour envoyer la vôtre."
                >
                    <span class="material-symbols-outlined text-sm">upload_file</span>
                    Envoyer l'ordonnance
                </a>
            `;
        } else {
            // Bouton "Réserver" avec TOUS les data-* nécessaires
            buttonHtml = `
                <button 
                    class="reserve-btn w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2 px-4 rounded-lg transition flex items-center justify-center gap-2"
                    data-id="${product.id || product.identifiant}"
                    data-name="${this.escapeHtml(product.libelle)}"
                    data-price="${finalUnitPrice}"      /* Prix unitaire final */
                    data-base-price="${basePrice}"      /* Prix avant promo */
                    data-cip="${product.code_cip || product.cip}"
                    data-promo-libelle="${this.escapeHtml(promoLabel)}" /* Libellé promo */
                    data-lot-size="${lotSize || ''}"        /* Taille lot */
                    data-lot-total="${lotTotal || ''}"      /* Prix lot */
                >
                    <span class="material-symbols-outlined text-sm">shopping_cart</span>
                    Réserver
                </button>
            `;
        }

        // --- Rendu HTML Final ---
        return `
            <article class="bg-white dark:bg-gray-700 rounded-lg shadow-md hover:shadow-xl transition-all duration-300 hover:scale-105 overflow-hidden relative group">
                <div class="p-4">
                    <div class="flex flex-wrap gap-2 mb-3">${badgesHtml}</div>
                    <h3 class="font-semibold text-gray-800 dark:text-white mb-2 line-clamp-2 h-12 text-sm">${product.libelle}</h3>
                    <p class="text-xs text-gray-600 dark:text-gray-400 mb-3">
                        ${product.fournisseur || product.marque ? (product.fournisseur || product.marque) + ' • ' : ''}CIP ${product.code_cip || product.cip || '?'}
                    </p>
                    <div class="mb-3">${priceHTML}</div>
                    <div class="flex items-center justify-between mb-3">${availabilityHtml}</div>
                    ${buttonHtml}
                </div>
            </article>
        `;
    }

    // --- Fonctions showLoading, showEmptyState, showError, showStatus, hideStatus ---
    // (Ces fonctions restent identiques à votre version précédente)
    showLoading() { /* ... */ }
    showEmptyState() { /* ... */ }
    showError(message) { /* ... */ }
    showStatus(message, type = 'info') { /* ... */ }
    hideStatus() { /* ... */ }

} // Fin de la classe HomeProductsManager

// --- Initialisation ---
let homeProducts;
document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ DOM chargé, initialisation du HomeProductsManager optimisé...');
    homeProducts = new HomeProductsManager();
    
    // ... (Gestion du drawer panier identique) ...
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
        
        // Valider le panier (Lien <a> maintenant)
        // Pas besoin d'event listener ici car c'est un lien
    }
});