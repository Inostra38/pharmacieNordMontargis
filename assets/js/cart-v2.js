// ==========================================
// Panier - Cart Manager
// ==========================================

class CartManager {
    constructor() {
        this.items = [];
        this.loadFromStorage();
        this.updateBadge();
        console.log('✅ Panier initialisé');
        console.log('📦 Items dans le panier:', this.items.length);
    }

    loadFromStorage() {
        try {
            const saved = localStorage.getItem('cart');
            this.items = saved ? JSON.parse(saved) : [];
            console.log('💾 Panier chargé depuis localStorage:', this.items.length, 'items');
        } catch (error) {
            console.error('❌ Erreur chargement panier:', error);
            this.items = [];
        }
    }

    saveToStorage() {
        try {
            localStorage.setItem('cart', JSON.stringify(this.items));
            console.log('💾 Panier sauvegardé:', this.items.length, 'items');
        } catch (error) {
            console.error('❌ Erreur sauvegarde panier:', error);
        }
    }

    addItem(product) {
        console.log('🛒 CartManager.addItem appelé avec:', product);
        
        // Validation du produit
        if (!product || !product.id) {
            console.error('❌ Produit invalide:', product);
            alert('Erreur : Produit invalide');
            return;
        }
        
        if (!product.name || !product.price) {
            console.error('❌ Produit incomplet:', product);
            alert('Erreur : Informations produit manquantes');
            return;
        }
        
        // Vérifier si le produit existe déjà
        const existingIndex = this.items.findIndex(item => item.id === product.id);
        
        if (existingIndex !== -1) {
            // Incrémenter la quantité
            this.items[existingIndex].quantity += 1;
            console.log('✅ Quantité incrémentée:', this.items[existingIndex]);
        } else {
            // Ajouter le nouveau produit
            const newItem = {
                id: product.id,
                name: product.name,
                price: parseFloat(product.price),
                cip: product.cip || 'N/A',
                quantity: 1
            };
            this.items.push(newItem);
            console.log('✅ Nouveau produit ajouté:', newItem);
        }
        
        this.saveToStorage();
        this.updateBadge();
        this.render();
        
        console.log('✅ Panier mis à jour. Total items:', this.items.length);
        console.log('📦 Contenu du panier:', this.items);
    }

    removeItem(productId) {
        console.log('🗑️ Suppression produit:', productId);
        this.items = this.items.filter(item => item.id !== productId);
        this.saveToStorage();
        this.updateBadge();
        this.render();
    }

    updateQuantity(productId, quantity) {
        const item = this.items.find(item => item.id === productId);
        if (item) {
            item.quantity = Math.max(1, quantity);
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
    }

    getTotal() {
        return this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }

    getTotalItems() {
        return this.items.reduce((sum, item) => sum + item.quantity, 0);
    }

    updateBadge() {
        const badge = document.getElementById('cartBadge');
        if (!badge) {
            console.warn('⚠️ Badge panier non trouvé');
            return;
        }
        
        const totalItems = this.getTotalItems();
        
        if (totalItems > 0) {
            badge.textContent = totalItems;
            badge.classList.remove('hidden');
            console.log('🔔 Badge mis à jour:', totalItems);
        } else {
            badge.classList.add('hidden');
        }
    }

    formatPrice(price) {
        return parseFloat(price).toFixed(2).replace('.', ',') + ' €';
    }

    render() {
        const container = document.getElementById('cartItems');
        const totalElement = document.getElementById('cartTotal');
        
        if (!container || !totalElement) {
            console.warn('⚠️ Éléments du panier non trouvés dans le DOM');
            console.warn('cartItems:', !!container, 'cartTotal:', !!totalElement);
            return;
        }
        
        console.log('🎨 Rendu du panier avec', this.items.length, 'items');
        
        if (this.items.length === 0) {
            container.innerHTML = '<p class="text-center text-gray-500 dark:text-gray-400 py-8">Votre panier est vide</p>';
            totalElement.textContent = '0,00 €';
            return;
        }
        
        // Générer le HTML du panier
        container.innerHTML = this.items.map(item => `
            <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-3" data-id="${item.id}">
                <div class="flex justify-between items-start mb-2">
                    <h3 class="font-semibold text-gray-800 dark:text-white flex-1 pr-2">${item.name}</h3>
                    <button class="remove-item text-red-500 hover:text-red-700 transition" data-id="${item.id}">
                        <span class="material-symbols-outlined">delete</span>
                    </button>
                </div>
                <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">CIP: ${item.cip}</p>
                <div class="flex justify-between items-center">
                    <div class="flex items-center gap-2">
                        <button class="qty-minus bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 w-8 h-8 rounded flex items-center justify-center transition" data-id="${item.id}">
                            <span class="material-symbols-outlined text-sm">remove</span>
                        </button>
                        <input 
                            type="number" 
                            class="qty-input w-16 text-center border border-gray-300 dark:border-gray-600 rounded px-2 py-1 dark:bg-gray-600 dark:text-white" 
                            value="${item.quantity}" 
                            min="1"
                            data-id="${item.id}"
                        >
                        <button class="qty-plus bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 w-8 h-8 rounded flex items-center justify-center transition" data-id="${item.id}">
                            <span class="material-symbols-outlined text-sm">add</span>
                        </button>
                    </div>
                    <div class="text-right">
                        <p class="text-sm text-gray-600 dark:text-gray-400">${this.formatPrice(item.price)} / unité</p>
                        <p class="font-bold text-teal-600 dark:text-teal-400">${this.formatPrice(item.price * item.quantity)}</p>
                    </div>
                </div>
            </div>
        `).join('');
        
        // Mettre à jour le total
        totalElement.textContent = this.formatPrice(this.getTotal());
        
        // Attacher les événements
        this.attachCartEvents();
        
        console.log('✅ Panier rendu avec succès');
    }

    attachCartEvents() {
        const container = document.getElementById('cartItems');
        if (!container) return;
        
        // Boutons supprimer
        container.querySelectorAll('.remove-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                this.removeItem(id);
            });
        });
        
        // Boutons quantité
        container.querySelectorAll('.qty-minus').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                const item = this.items.find(item => item.id === id);
                if (item && item.quantity > 1) {
                    this.updateQuantity(id, item.quantity - 1);
                }
            });
        });
        
        container.querySelectorAll('.qty-plus').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                const item = this.items.find(item => item.id === id);
                if (item) {
                    this.updateQuantity(id, item.quantity + 1);
                }
            });
        });
        
        // Input quantité
        container.querySelectorAll('.qty-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const id = e.target.dataset.id;
                const quantity = parseInt(e.target.value) || 1;
                this.updateQuantity(id, quantity);
            });
        });
    }
}

// Initialiser le panier au chargement avec vérification
if (typeof window !== 'undefined') {
    // S'assurer que le DOM est prêt
    function initCart() {
        console.log('🔄 Tentative d\'initialisation du panier...');
        
        // Vérifier que les éléments existent
        const cartBadge = document.getElementById('cartBadge');
        const cartItems = document.getElementById('cartItems');
        const cartTotal = document.getElementById('cartTotal');
        
        if (!cartBadge || !cartItems || !cartTotal) {
            console.warn('⚠️ Éléments du panier non encore disponibles, nouvelle tentative dans 100ms...');
            setTimeout(initCart, 100);
            return;
        }
        
        console.log('✅ Éléments du panier trouvés, initialisation...');
        window.cartManager = new CartManager();
        console.log('✅ window.cartManager créé et accessible');
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCart);
    } else {
        initCart();
    }
}

console.log('✅ Cart-v2.js chargé');
