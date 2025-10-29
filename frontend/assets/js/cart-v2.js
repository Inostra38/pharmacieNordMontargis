// ==========================================
// Panier - Cart Manager - AVEC LOGIQUE PROMOTIONS (Lots, % sur 2e, Remise fixe €)
// Version corrigée - BUG FIX: Sensibilité boutons +/- (suppression listeners multiples)
// ==========================================

class CartManager {
    constructor() {
        this.items = [];
        this.clickHandler = null; // Stocker le handler pour pouvoir le supprimer
        this.loadFromStorage();
        console.log('✅ Panier initialisé (structure)');
    }

    loadFromStorage() {
        try {
            const saved = localStorage.getItem('cart');
            this.items = saved ? JSON.parse(saved) : [];
            console.log('💾 Panier chargé depuis localStorage:', this.items.length, 'items');
        } catch (error) {
            console.error('❌ Erreur chargement panier:', error);
            this.items = [];
            localStorage.removeItem('cart');
        }
    }

    saveToStorage() {
        try {
            localStorage.setItem('cart', JSON.stringify(this.items));
        } catch (error) {
            console.error('❌ Erreur sauvegarde panier:', error);
        }
    }

    /**
     * Ajoute un produit au panier (avec infos promo)
     */
    addItem(product) {
        console.log('🛒 CartManager.addItem appelé avec:', product);

        if (!product || !product.id || !product.name || typeof product.price !== 'number' || typeof product.basePrice !== 'number') {
            console.error('❌ Produit invalide ou incomplet (manque id, name, price ou basePrice):', product);
            if (typeof product.price !== 'number') console.error('-> Prix manquant ou invalide');
            if (typeof product.basePrice !== 'number') console.error('-> Prix de base manquant ou invalide');
            alert('Erreur : Informations produit manquantes ou invalides pour l\'ajout au panier.');
            return;
        }

        const existingIndex = this.items.findIndex(item => item.id === product.id);

        if (existingIndex !== -1) {
            this.items[existingIndex].quantity += 1;
            console.log('✅ Quantité incrémentée:', this.items[existingIndex]);
        } else {
            const newItem = {
                id: product.id,
                name: product.name,
                price: product.price,
                basePrice: product.basePrice,
                cip: product.cip || 'N/A',
                quantity: 1,
                promoLibelle: product.promoLibelle || '',
                lotSize: product.lotSize || null,
                lotTotal: product.lotTotal || null,
            };
            if (!(typeof newItem.lotSize === 'number' && newItem.lotSize > 1 && typeof newItem.lotTotal === 'number')) {
                newItem.lotSize = null;
                newItem.lotTotal = null;
            }
            console.log('DEBUG addItem - Nouvel item prêt à être ajouté:', newItem);
            this.items.push(newItem);
            console.log('✅ Nouveau produit ajouté (avec infos promo):', newItem);
        }

        this.saveToStorage();
        this.updateBadge();
        this.render();

        console.log('📦 Contenu actuel du panier:', this.items);
    }

    removeItem(productId) {
        console.log('🗑️ Suppression produit ID:', productId);
        this.items = this.items.filter(item => item.id !== productId);
        this.saveToStorage();
        this.updateBadge();
        this.render();
    }

    updateQuantity(productId, quantity) {
        const item = this.items.find(item => item.id === productId);
        if (item) {
            const validQuantity = Math.max(1, parseInt(quantity) || 1);
            item.quantity = validQuantity;
            console.log(`🔄 Quantité mise à jour pour ${item.name}: ${item.quantity}`);
            this.saveToStorage();
            this.updateBadge();
            this.render();
        }
    }

    clear() {
        this.items = [];
        this.saveToStorage();
        this.updateBadge();
        this.render();
        console.log('🗑️ Panier vidé');
    }

    /**
     * Calcule le prix TOTAL du panier en appliquant les promotions
     */
    getTotal() {
        console.log('DEBUG getTotal - Calcul démarré pour les items:', JSON.parse(JSON.stringify(this.items)));
        let total = 0;

        this.items.forEach(item => {
            console.log(`DEBUG getTotal - Traitement item: ${item.name}, Qty: ${item.quantity}, PrixU: ${item.price}, Base: ${item.basePrice}, Promo: "${item.promoLibelle}", LotSize: ${item.lotSize}, LotTotal: ${item.lotTotal}`);

            const quantity = item.quantity;
            const unitPrice = (typeof item.price === 'number') ? item.price : 0;
            const basePrice = (typeof item.basePrice === 'number') ? item.basePrice : unitPrice;
            const promoText = (item.promoLibelle || '').toLowerCase();
            const lotSize = item.lotSize;
            const lotTotal = item.lotTotal;

            let itemTotal = 0;

            // --- LOGIQUE DES PROMOTIONS ---

            // 1. Promotion par LOT (ex: 3 pour 10€)
            if (typeof lotSize === 'number' && lotSize > 1 && typeof lotTotal === 'number' && quantity >= lotSize) {
                const numLots = Math.floor(quantity / lotSize);
                const remainingQty = quantity % lotSize;
                itemTotal = (numLots * lotTotal) + (remainingQty * unitPrice);
                console.log(`  → Promo LOT détectée: ${numLots} lot(s) à ${lotTotal}€ + ${remainingQty} unité(s) à ${unitPrice}€ = ${itemTotal.toFixed(2)}€`);
            }
            // 2. Promotion "% sur le 2e" (ex: -50% sur le 2e)
            else if ((promoText.includes('sur le 2') || promoText.includes('sur le deux')) && basePrice > 0) {
                const discountMatch = promoText.match(/(\d+)[\s%]*%/);
                const discountPercent = discountMatch ? parseInt(discountMatch[1]) / 100 : 0;
                if (discountPercent > 0) {
                    const numPairs = Math.floor(quantity / 2);
                    const remainingQty = quantity % 2;
                    const discountedPrice = basePrice * (1 - discountPercent);
                    itemTotal = (numPairs * (basePrice + discountedPrice)) + (remainingQty * basePrice);
                    console.log(`  → Promo "% sur le 2e" détectée: ${numPairs} paire(s) (${basePrice}€ + ${discountedPrice.toFixed(2)}€) + ${remainingQty} à ${basePrice}€ = ${itemTotal.toFixed(2)}€`);
                } else {
                    itemTotal = quantity * unitPrice;
                    console.log(`  → Promo "% sur le 2e" trouvée mais pourcentage invalide, fallback: ${itemTotal.toFixed(2)}€`);
                }
            }
            // 3. Cas standard (inclut remise fixe déjà appliquée dans unitPrice)
            else {
                itemTotal = quantity * unitPrice;
                console.log(`  → Calcul standard: ${quantity} × ${unitPrice}€ = ${itemTotal.toFixed(2)}€`);
            }

            total += itemTotal;
        });

        console.log(`💰 Total panier calculé: ${total.toFixed(2)}€`);
        return total;
    }

    updateBadge() {
        const badge = document.getElementById('cartBadge');
        if (!badge) return;

        const totalItems = this.items.reduce((sum, item) => sum + item.quantity, 0);
        badge.textContent = totalItems;
        badge.style.display = totalItems > 0 ? 'flex' : 'none';
    }

    formatPrice(price) {
        if (typeof price !== 'number' || !Number.isFinite(price)) {
            return 'N/A';
        }
        return price.toFixed(2).replace('.', ',') + ' €';
    }

    /**
     * Affiche le panier dans le drawer (Mis à jour pour afficher prix barré et promo)
     */
    render() {
        const container = document.getElementById('cartItems');
        const totalElement = document.getElementById('cartTotal');
        const validateButton = document.getElementById('validateCart');

        if (!container || !totalElement) {
            console.warn('⚠️ Éléments du drawer panier (#cartItems, #cartTotal) non trouvés. Rendu annulé.');
            return;
        }

        console.log('🎨 Rendu du drawer panier avec', this.items.length, 'produits...');
        const currentTotal = this.getTotal();

        if (this.items.length === 0) {
            container.innerHTML = '<p class="text-center text-gray-500 dark:text-gray-400 py-8">Votre panier est vide</p>';
            totalElement.textContent = '0,00 €';
            if (validateButton) {
                validateButton.classList.add('opacity-50', 'pointer-events-none');
                validateButton.setAttribute('aria-disabled', 'true');
            }
            return;
        }

        if (validateButton) {
            validateButton.classList.remove('opacity-50', 'pointer-events-none');
            validateButton.removeAttribute('aria-disabled');
        }

        container.innerHTML = this.items.map(item => {
            // Recalculer le total de la ligne pour affichage
            let lineTotal = 0;
            const quantity = item.quantity;
            const unitPrice = (typeof item.price === 'number') ? item.price : 0;
            const basePrice = (typeof item.basePrice === 'number') ? item.basePrice : unitPrice;
            const promoText = (item.promoLibelle || '').toLowerCase();
            const lotSize = item.lotSize;
            const lotTotal = item.lotTotal;

            if (typeof lotSize === 'number' && lotSize > 1 && typeof lotTotal === 'number' && quantity >= lotSize) {
                const numLots = Math.floor(quantity / lotSize);
                const remainingQty = quantity % lotSize;
                lineTotal = (numLots * lotTotal) + (remainingQty * unitPrice);
            } else if ((promoText.includes('sur le 2') || promoText.includes('sur le deux')) && basePrice > 0) {
                const discountMatch = promoText.match(/(\d+)[\s%]*%/);
                const discountPercent = discountMatch ? parseInt(discountMatch[1]) / 100 : 0;
                if (discountPercent > 0) {
                    const numPairs = Math.floor(quantity / 2);
                    const remainingQty = quantity % 2;
                    const discountedPrice = basePrice * (1 - discountPercent);
                    lineTotal = (numPairs * (basePrice + discountedPrice)) + (remainingQty * basePrice);
                } else {
                    lineTotal = quantity * unitPrice;
                }
            } else {
                lineTotal = quantity * unitPrice;
            }

            const showBasePrice = typeof item.basePrice === 'number' && item.basePrice.toFixed(2) !== item.price.toFixed(2);
            const isFixedDiscount = promoText.includes('€') && (promoText.includes('remise') || promoText.includes('reduction') || promoText.startsWith('-'));

            return `
            <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-3" data-id="${item.id}">
                <div class="flex justify-between items-start mb-2">
                    <h3 class="font-semibold text-gray-800 dark:text-white flex-1 pr-2">${item.name}</h3>
                    <button class="remove-item text-red-500 hover:text-red-700 transition" data-id="${item.id}" aria-label="Supprimer ${item.name}">
                        <span class="material-symbols-outlined">delete</span>
                    </button>
                </div>
                <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">CIP: ${item.cip}</p>
                <div class="flex justify-between items-center">
                    <div class="flex items-center gap-2">
                        <button class="qty-minus bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 w-8 h-8 rounded flex items-center justify-center transition" data-id="${item.id}" aria-label="Diminuer quantité">
                            <span class="material-symbols-outlined text-sm">remove</span>
                        </button>
                        <input
                            type="number"
                            class="qty-input w-16 text-center border border-gray-300 dark:border-gray-600 rounded px-2 py-1 dark:bg-gray-600 dark:text-white"
                            value="${item.quantity}"
                            min="1"
                            step="1"
                            data-id="${item.id}"
                            aria-label="Quantité pour ${item.name}"
                        >
                        <button class="qty-plus bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 w-8 h-8 rounded flex items-center justify-center transition" data-id="${item.id}" aria-label="Augmenter quantité">
                            <span class="material-symbols-outlined text-sm">add</span>
                        </button>
                    </div>
                    <div class="text-right">
                        ${showBasePrice ? `<p class="text-xs text-gray-500 dark:text-gray-400 line-through">${this.formatPrice(basePrice)} / unité</p>` : ''}
                        <p class="text-sm text-gray-600 dark:text-gray-400 ${showBasePrice ? 'font-bold text-red-600 dark:text-red-400' : ''}">
                           ${this.formatPrice(unitPrice)} / unité ${isFixedDiscount ? '<span class="text-xs">(Remise incluse)</span>' : ''}
                        </p>
                        <p class="font-bold text-teal-600 dark:text-teal-400">${this.formatPrice(lineTotal)}</p>
                    </div>
                </div>
                ${item.promoLibelle ? `<p class="text-xs text-red-600 dark:text-red-400 mt-1 font-medium">${item.promoLibelle}</p>` : ''}
            </div>
        `}).join('');

        totalElement.textContent = this.formatPrice(currentTotal);
        this.attachCartEvents();
        console.log('✅ Drawer panier rendu avec succès');
    }

    /**
     * Attache les événements au panier (FIX: suppression des listeners multiples)
     */
    attachCartEvents() {
        const container = document.getElementById('cartItems');
        if (!container) return;

        // ✅ FIX 1: Supprimer l'ancien listener avant d'en ajouter un nouveau
        if (this.clickHandler) {
            container.removeEventListener('click', this.clickHandler);
        }

        // ✅ FIX 2: Créer et stocker le nouveau handler
        this.clickHandler = (e) => {
            const target = e.target.closest('button');
            if (!target) return;

            const id = target.dataset.id;
            if (!id) return;

            if (target.classList.contains('remove-item')) {
                this.removeItem(id);
            } else if (target.classList.contains('qty-minus')) {
                const item = this.items.find(i => i.id === id);
                if (item && item.quantity > 1) {
                    this.updateQuantity(id, item.quantity - 1);
                }
            } else if (target.classList.contains('qty-plus')) {
                const item = this.items.find(i => i.id === id);
                if (item) {
                    this.updateQuantity(id, item.quantity + 1);
                }
            }
        };

        // ✅ FIX 3: Ajouter le nouveau listener
        container.addEventListener('click', this.clickHandler);

        // ✅ FIX 4: Gérer les inputs avec un flag pour éviter les duplications
        container.querySelectorAll('.qty-input').forEach(input => {
            if (!input.hasAttribute('data-listener-attached')) {
                input.addEventListener('change', (e) => {
                    const id = e.target.dataset.id;
                    let quantity = parseInt(e.target.value);
                    if (isNaN(quantity) || quantity < 1) {
                        quantity = 1;
                        e.target.value = 1;
                    }
                    this.updateQuantity(id, quantity);
                });
                input.setAttribute('data-listener-attached', 'true');
            }
        });

        console.log('✅ Événements du panier attachés (listeners uniques)');
    }

} // Fin de la classe CartManager

// --- Initialisation (AMÉLIORÉE ET PLUS TOLÉRANTE) ---
if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('✅ DOM entièrement chargé. Initialisation du panier...');
        const cartBadge = document.getElementById('cartBadge');
        if (!cartBadge) {
            console.warn('⚠️ Élément #cartBadge introuvable sur cette page. Le panier s\'initialisera sans mettre à jour le badge.');
        } else {
            console.log('✅ Élément #cartBadge trouvé.');
        }

        window.cartManager = new CartManager();
        console.log('✅ window.cartManager créé et accessible');

        window.cartManager.updateBadge();
        if (document.getElementById('cartItems')) {
            window.cartManager.render();
        }

        document.dispatchEvent(new CustomEvent('cartManagerReady'));
        console.log('🚀 Événement "cartManagerReady" déclenché.');
    });
}

console.log('✅ Cart-v2.js chargé (vAvecPromo Complet - BUG FIX Sensibilité +/-)');