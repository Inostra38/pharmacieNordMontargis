// ==========================================
// Panier - Cart Manager - AVEC LOGIQUE PROMOTIONS (Lots, % sur 2e, Remise fixe €)
// Version corrigée intégrant les promotions
// ==========================================

class CartManager {
    constructor() {
        this.items = [];
        this.loadFromStorage();
        // L'appel initial à updateBadge et render se fera après l'init complet (voir fin du fichier)
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
            localStorage.removeItem('cart'); // Nettoyer si corrompu
        }
    }

    saveToStorage() {
        try {
            localStorage.setItem('cart', JSON.stringify(this.items));
            // console.log('💾 Panier sauvegardé:', this.items.length, 'items'); // Moins de logs pour clarté
        } catch (error) {
            console.error('❌ Erreur sauvegarde panier:', error);
        }
    }

    /**
     * Ajoute un produit au panier (avec infos promo)
     */
    addItem(product) {
        console.log('🛒 CartManager.addItem appelé avec:', product);

        // Validation améliorée pour inclure basePrice (important pour promos type % sur 2e)
        // Vérifie que price et basePrice sont bien des nombres.
        if (!product || !product.id || !product.name || typeof product.price !== 'number' || typeof product.basePrice !== 'number') {
            console.error('❌ Produit invalide ou incomplet (manque id, name, price ou basePrice):', product);
            // Afficher une alerte plus précise
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
            // Ajouter le nouveau produit avec TOUTES les infos de promotion
            const newItem = {
                id: product.id,
                name: product.name,
                price: product.price,             // Prix unitaire final (promo simple ou remise fixe déjà appliquée)
                basePrice: product.basePrice,     // Prix unitaire AVANT promo
                cip: product.cip || 'N/A',
                quantity: 1,
                // Récupération des infos promo depuis l'objet product passé en argument
                promoLibelle: product.promoLibelle || '',
                lotSize: product.lotSize || null, // Sera null si non défini ou non numérique > 1
                lotTotal: product.lotTotal || null, // Sera null si non défini ou non numérique
            };
            // Assurer la cohérence des données de lot (important !)
            if (!(typeof newItem.lotSize === 'number' && newItem.lotSize > 1 && typeof newItem.lotTotal === 'number')) {
                 newItem.lotSize = null;
                 newItem.lotTotal = null;
            }
            // Log de debug pour l'ajout
            console.log('DEBUG addItem - Nouvel item prêt à être ajouté:', newItem);
            this.items.push(newItem);
            console.log('✅ Nouveau produit ajouté (avec infos promo):', newItem);
        }

        this.saveToStorage();
        this.updateBadge();
        this.render(); // Met à jour l'affichage du panier (drawer)

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
            const validQuantity = Math.max(1, parseInt(quantity) || 1); // Assure un entier >= 1
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
        // Log de debug pour voir les items avant calcul
        console.log('DEBUG getTotal - Calcul démarré pour les items:', JSON.parse(JSON.stringify(this.items))); // Copie pour éviter mutation
        let total = 0;

        this.items.forEach(item => {
            // Log de debug pour chaque item
            console.log(`DEBUG getTotal - Traitement item: ${item.name}, Qty: ${item.quantity}, PrixU: ${item.price}, Base: ${item.basePrice}, Promo: "${item.promoLibelle}", LotSize: ${item.lotSize}, LotTotal: ${item.lotTotal}`);

            const quantity = item.quantity;
            // Assurer que les prix sont bien des nombres pour le calcul
            const unitPrice = (typeof item.price === 'number') ? item.price : 0;
            const basePrice = (typeof item.basePrice === 'number') ? item.basePrice : unitPrice; // Fallback au unitPrice si basePrice manque
            const promoText = (item.promoLibelle || '').toLowerCase();
            const lotSize = item.lotSize;
            const lotTotal = item.lotTotal;

            let itemTotal = 0;

            // --- LOGIQUE DES PROMOTIONS ---

            // 1. Priorité aux Lots (ex: 3 pour 9.99€)
            if (typeof lotSize === 'number' && lotSize > 1 && typeof lotTotal === 'number' && quantity >= lotSize) {
                const numLots = Math.floor(quantity / lotSize);
                const remainingQty = quantity % lotSize;
                itemTotal = (numLots * lotTotal) + (remainingQty * unitPrice); // unitPrice ici est correct
                console.log(`  📦 Lot appliqué pour "${item.name}": ${numLots} lot(s) à ${this.formatPrice(lotTotal)} + ${remainingQty} unité(s) à ${this.formatPrice(unitPrice)} = ${this.formatPrice(itemTotal)}`);

            // 2. Gestion "-X% sur le 2ème"
            // S'assurer qu'on a un basePrice valide > 0 pour ce calcul
            } else if ((promoText.includes('sur le 2') || promoText.includes('sur le deux')) && basePrice > 0) {
                 const discountMatch = promoText.match(/(\d+)[\s%]*%/);
                 const discountPercent = discountMatch ? parseInt(discountMatch[1]) / 100 : 0;
                 if (discountPercent > 0) {
                    const numPairs = Math.floor(quantity / 2);
                    const remainingQty = quantity % 2;
                    // La réduction s'applique sur le PRIX DE BASE
                    const discountedPrice = basePrice * (1 - discountPercent);
                    itemTotal = (numPairs * (basePrice + discountedPrice)) + (remainingQty * basePrice); // L'unité seule est au prix de base
                    console.log(`  📉 Promo "-${discountPercent*100}% sur 2e" pour "${item.name}": ${numPairs} paire(s) à (${this.formatPrice(basePrice)} + ${this.formatPrice(discountedPrice)}) + ${remainingQty} unité(s) à ${this.formatPrice(basePrice)} = ${this.formatPrice(itemTotal)}`);
                 } else {
                     itemTotal = quantity * unitPrice; // Fallback si le % n'est pas trouvé
                     console.log(`  ❓ Promo sur 2e non reconnue (% manquant?) pour "${item.name}", utilisation prix unitaire: ${quantity} * ${this.formatPrice(unitPrice)} = ${this.formatPrice(itemTotal)}`);
                 }

            // 3. Gestion "-X€" ou "X€ de remise" (utilise le unitPrice déjà calculé)
            } else if (promoText.includes('€') && (promoText.includes('remise') || promoText.includes('reduction') || promoText.startsWith('-'))) {
                 itemTotal = quantity * unitPrice; // Le prix unitaire contient déjà la remise
                 const amountMatch = promoText.match(/(\d+[,.]?\d*)[\s€]*€/);
                 const discountAmount = amountMatch ? parseFloat(amountMatch[1].replace(',', '.')) : '?';
                 console.log(`  💶 Remise fixe (${discountAmount}€) déjà appliquée pour "${item.name}" via prix unitaire: ${quantity} * ${this.formatPrice(unitPrice)} = ${this.formatPrice(itemTotal)}`);

            // 4. Cas par défaut (pas de promo spéciale reconnue)
            } else {
                itemTotal = quantity * unitPrice;
                console.log(`  🛒 Cas standard pour "${item.name}": ${quantity} * ${this.formatPrice(unitPrice)} = ${this.formatPrice(itemTotal)}`);
            }

            // Log de debug pour le sous-total
            console.log(`DEBUG getTotal - Sous-total calculé pour ${item.name}: ${this.formatPrice(itemTotal)}`);
            total += itemTotal;
        });

        console.log(`💰 TOTAL PANIER FINAL: ${this.formatPrice(total)}`);
        return total;
    }


    getTotalItems() {
        return this.items.reduce((sum, item) => sum + item.quantity, 0);
    }

    updateBadge() {
        const badge = document.getElementById('cartBadge');
        if (!badge) {
            return; // Pas critique si absent
        }
        const totalItems = this.getTotalItems();
        if (totalItems > 0) {
            badge.textContent = totalItems;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }

    formatPrice(price) {
        if (typeof price !== 'number' || !Number.isFinite(price)) {
            return 'N/A'; // Retourne 'N/A' si le prix n'est pas un nombre valide
        }
        return price.toFixed(2).replace('.', ',') + ' €';
    }

    /**
     * Affiche le panier dans le drawer (Mis à jour pour afficher prix barré et promo)
     */
    render() {
        const container = document.getElementById('cartItems');
        const totalElement = document.getElementById('cartTotal');
        const validateButton = document.getElementById('validateCart'); // C'est un <a>

        if (!container || !totalElement) {
             console.warn('⚠️ Éléments du drawer panier (#cartItems, #cartTotal) non trouvés. Rendu annulé.');
            return;
        }

        console.log('🎨 Rendu du drawer panier avec', this.items.length, 'produits...');
        const currentTotal = this.getTotal(); // Calculer le total AVEC promotions pour l'affichage final

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
            // Recalculer le total de la ligne pour affichage (utilise la même logique que getTotal)
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
                 } else { lineTotal = quantity * unitPrice; } // Fallback
            } else { // Inclut remise fixe et cas standard car unitPrice est déjà correct
                lineTotal = quantity * unitPrice;
            }

            // Vérifier si le prix de base est différent du prix unitaire final
            const showBasePrice = typeof item.basePrice === 'number' && item.basePrice.toFixed(2) !== item.price.toFixed(2);
            // Identifier si c'est une remise fixe (pour l'affichage)
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


    attachCartEvents() {
        const container = document.getElementById('cartItems');
        if (!container) return;

        // Utiliser la délégation d'événements pour les boutons
        container.addEventListener('click', (e) => {
            const target = e.target.closest('button'); // Cible le bouton ou son parent bouton
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
        });

        // Attacher listener 'change' aux inputs
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
        // Rendre le drawer seulement s'il existe sur la page
        if (document.getElementById('cartItems')) {
             window.cartManager.render();
        }

        document.dispatchEvent(new CustomEvent('cartManagerReady'));
        console.log('🚀 Événement "cartManagerReady" déclenché.');
    });
}

console.log('✅ Cart-v2.js chargé (vAvecPromo Complet)');