// = = = = = = = = = = = = = = = = = = = = = = = = =
// Catalogue - Version avec Pagination Intégrée v3.1
// Chargement automatique par boucle while
// = = = = = = = = = = = = = = = = = = = = = = = = =

// Vérifie si CONFIG est défini, sinon log une erreur claire.
if (typeof CONFIG === 'undefined') {
    console.error('ERREUR CRITIQUE: CONFIG non défini. Assurez-vous que config.js est chargé AVANT catalogue.js');
}
const API_URL = CONFIG ? CONFIG.API.BASE_URL : '';

// --- Product Cache avec Pagination Automatique ---
window.productCache = {
    products: [],
    metadata: null,
    initialized: false,
    totalProducts: 0,
    BATCH_SIZE: 500,
    
    async load() {
        console.log('🔄 Chargement progressif des produits...');
        
        if (this.initialized && this.products.length > 0) {
            console.log(`✅ Cache: ${this.products.length} produits`);
            return this.products;
        }
        
        // Charger le premier batch
        await this.loadBatch(0);
        this.initialized = true;
        
        // Charger le reste en arrière-plan avec boucle while
        this.loadRemainingBatches();
        
        return this.products;
    },
    
    async loadBatch(batchNumber) {
        const offset = batchNumber * this.BATCH_SIZE;
        const startTime = performance.now();
        
        console.log(`📦 Batch ${batchNumber} (offset: ${offset})`);
        
        try {
            const response = await window.apiService.getProducts({
                limit: this.BATCH_SIZE,
                offset: offset
            });
            
            const duration = Math.round(performance.now() - startTime);
            
            // Parser la réponse API
            let items = [];
            let total = 0;
            let cached = false;
            let updatedAt = null;
            let stockUpdatedAt = null;
            
            if (Array.isArray(response)) {
                items = response;
                total = response.length;
            } else if (response && response.success && response.data) {
                if (Array.isArray(response.data.products)) {
                    items = response.data.products;
                    total = response.data.total || items.length;
                    cached = response.data.cached || false;
                } else if (Array.isArray(response.data)) {
                    items = response.data;
                    total = response.total || items.length;
                    cached = response.cached || false;
                } else if (response.data.items && Array.isArray(response.data.items)) {
                    items = response.data.items;
                    total = response.data.total || items.length;
                    cached = response.data.cached || false;
                }
                updatedAt = response.updatedAt || response.data.updatedAt;
                stockUpdatedAt = response.stockUpdatedAt || response.data.stockUpdatedAt;
            } else if (response && response.data) {
                if (Array.isArray(response.data.products)) {
                    items = response.data.products;
                    total = response.data.total || items.length;
                    cached = response.data.cached || false;
                } else if (Array.isArray(response.data.items)) {
                    items = response.data.items;
                    total = response.data.total || items.length;
                    cached = response.data.cached || false;
                } else if (Array.isArray(response.data)) {
                    items = response.data;
                    total = response.total || items.length;
                    cached = response.cached || false;
                }
                updatedAt = response.updatedAt || response.data.updatedAt;
                stockUpdatedAt = response.stockUpdatedAt || response.data.stockUpdatedAt;
            } else if (response && Array.isArray(response.items)) {
                items = response.items;
                total = response.total || items.length;
                cached = response.cached || false;
                updatedAt = response.updatedAt;
                stockUpdatedAt = response.stockUpdatedAt;
            }
            
            if (!Array.isArray(items)) {
                items = [];
            }
            
            if (batchNumber === 0) {
                this.metadata = {
                    updatedAt: updatedAt || new Date().toISOString(),
                    stockUpdatedAt: stockUpdatedAt || new Date().toISOString()
                };
                this.totalProducts = total || 0;
                console.log(`📊 Total déclaré: ${this.totalProducts} produits`);
            }
            
            // Ajouter les produits (pas de filtre doublons pour l'instant)
            if (items.length > 0) {
                this.products.push(...items);
            }
            
            const cacheStatus = cached ? '🟢 HIT' : '🔴 MISS';
            console.log(`✅ Batch ${batchNumber}: ${items.length} produits - ${duration}ms (${cacheStatus})`);
            console.log(`   Total chargé: ${this.products.length}`);
            
            return { response, itemsCount: items.length };
            
        } catch (error) {
            console.error(`❌ Erreur batch ${batchNumber}:`, error);
            return { response: null, itemsCount: 0 };
        }
    },
    
    async loadRemainingBatches() {
        if (this.totalProducts <= this.BATCH_SIZE) {
            console.log('✅ Un seul batch, chargement complet');
            return;
        }
        
        let batchNumber = 1;
        let continueLoading = true;
        
        console.log(`🔄 Chargement arrière-plan: mode automatique (batches de ${this.BATCH_SIZE})`);
        
        while (continueLoading) {
            const result = await this.loadBatch(batchNumber);
            
            // Si moins de BATCH_SIZE items, c'est le dernier batch
            if (result.itemsCount < this.BATCH_SIZE) {
                console.log(`🏁 Dernier batch détecté (${result.itemsCount} produits)`);
                continueLoading = false;
            }
            
            // Vérifier aussi si on a atteint le total déclaré
            if (this.totalProducts > 0 && this.products.length >= this.totalProducts) {
                console.log(`🏁 Total atteint (${this.products.length}/${this.totalProducts})`);
                continueLoading = false;
            }
            
            batchNumber++;
            
            // Petit délai entre chaque batch
            if (continueLoading) {
                await new Promise(r => setTimeout(r, 100));
            }
        }
        
        console.log(`✅ Complet: ${this.products.length} produits chargés en ${batchNumber} batches`);
    },
    
    getMetadata() {
        return this.metadata;
    }
};

// --- État et Cache ---
const state = {
    query: '',
    brand: '',
    showStock: false,
    displayMode: 'tous'
};
let ALL_PRODUCTS = [];
let BRANDS = [];

// --- Utilitaires ---
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const shuffle = (arr) => {
    if (!Array.isArray(arr)) return [];
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
};

const formatPrice = (val) => {
    if (typeof val === 'number' && Number.isFinite(val)) {
        return val.toFixed(2).replace('.', ',') + ' €';
    }
    return 'Prix sur demande';
};

const formatDate = (iso) => {
    if (!iso) return '—';
    try {
        const d = new Date(iso);
        if (isNaN(d.getTime())) return 'Date invalide';
        return new Intl.DateTimeFormat('fr-FR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        }).format(d);
    } catch (e) {
        console.warn("Erreur formatage date:", iso, e);
        return 'Date invalide';
    }
};

const availabilityBadge = (code, dispo) => {
    const c = (code || '').toLowerCase();
    const v = norm(dispo || '');
    if (c === 'stock' || v.includes('oui')) return '<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">✅ Disponible</span>';
    if (c === '24h' || v.includes('24')) return '<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300">🕐 24h</span>';
    if (c === '4j' || v.includes('4 jour')) return '<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">📦 4j</span>';
    return '<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300">❌ Indisponible</span>';
};

// --- API ---
async function fetchBrands() {
    try {
        if (typeof window.apiService === 'undefined') {
            console.error("fetchBrands: apiService n'est pas disponible.");
            return [];
        }

        const brands = await window.apiService.getBrands();

        if (!Array.isArray(brands)) {
            console.warn("fetchBrands: La réponse de l'API ne contient pas un tableau.", brands);
            return [];
        }

        return brands
            .filter(b => b && typeof b.label === 'string')
            .map(b => ({
                label: b.label,
                norm: norm(b.label),
                count: b.count || 0
            }));
    } catch (error) {
        console.error("Erreur dans fetchBrands:", error);
        return [];
    }
}

// --- Rendu ---
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}

function renderProduct(item) {
    if (!item) return '';

    const av = availabilityBadge(item.availability_code, item.disponibilite);
    const requiresPrescription = item.ordonnance;
    const promoLabel = (item.promo_libelle || '').trim();
    const promoNorm = norm(promoLabel);
    const lotSize = item.lot_size;
    const lotTotal = item.lot_total;
    const basePrice = item.prix;
    const finalUnitPrice = item.prix_promo || item.prix;

    let badges = '';
    if (requiresPrescription) badges += '<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 dark:bg-rose-900 dark:text-rose-300">📋 Ordonnance</span>';
    if (promoLabel) badges += `<span class="inline-flex items-center px-2.5 py-1 ml-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">🔥 ${escapeHtml(promoLabel)}</span>`;

    let priceHTML = '';
    let lotHTML = '';
    
    if (typeof lotSize === 'number' && lotSize > 1 && typeof lotTotal === 'number') {
        const isPrixPar = promoNorm.includes('prix par');
        const lotPrice = `<span class="price-promo">${formatPrice(lotTotal)}</span>`;
        const lotText = isPrixPar ? `le lot de ${lotSize}` : `les ${lotSize}`;
        lotHTML = `<span class="lot-inline">${isPrixPar ? lotPrice + ' ' + lotText : 'soit ' + lotPrice + ' ' + lotText}</span>`;
    }
    if (promoNorm === 'petits prix') {
        priceHTML = `<div class="flex items-baseline gap-2"><span class="price-promo">${formatPrice(finalUnitPrice)}</span>${lotHTML}</div>`;
    } else if (typeof item.prix_promo === 'number' && Number.isFinite(item.prix_promo)) {
        priceHTML = `<div class="flex items-baseline gap-2"><span class="price-old">${formatPrice(basePrice)}</span><span class="price-promo">${formatPrice(finalUnitPrice)}</span>${lotHTML}</div>`;
    } else {
        priceHTML = `<div class="flex items-baseline gap-2"><span class="text-xl font-bold text-gray-800 dark:text-white">${formatPrice(basePrice)}</span>${lotHTML}</div>`;
    }

    let buttonHtml = '';
    if (requiresPrescription) {
        buttonHtml = `<a href="secure.ordonnance.html" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2" title="Ce produit nécessite une ordonnance. Cliquez pour envoyer la vôtre."><span class="material-symbols-outlined">upload_file</span> Envoyer l'ordonnance</a>`;
    } else {
        buttonHtml = `<button class="reserve-btn w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2" data-id="${item.id}" data-name="${escapeHtml(item.libelle)}" data-price="${finalUnitPrice}" data-base-price="${basePrice}" data-cip="${item.cip || ''}" data-promo-libelle="${escapeHtml(promoLabel)}" data-lot-size="${lotSize || ''}" data-lot-total="${lotTotal || ''}"><span class="material-symbols-outlined">shopping_cart</span> Réserver</button>`;
    }

    return `
        <div class="product-card bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden">
            <div class="p-5">
                <div class="flex flex-wrap gap-2 mb-3">${av} ${badges}</div>
                <h3 class="font-semibold text-lg text-gray-800 dark:text-white mb-2 line-clamp-2" title="${escapeHtml(item.libelle)}">${item.libelle || 'Produit'}</h3>
                <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">${item.marque ? escapeHtml(item.marque) + ' • ' : ''}CIP ${item.cip || '?'}</p>
                <div class="mb-3 min-h-[2.5rem] flex items-end">${priceHTML}</div>
                <p class="text-xs text-gray-500 dark:text-gray-500 mb-4">Stock : ${typeof item.stock === 'number' ? item.stock : '—'}</p>
                ${buttonHtml}
            </div>
        </div>
    `;
}

function renderGrid(items) {
    const grid = document.getElementById('productsGrid');
    const resultsCountEl = document.getElementById('resultsCount');
    if (!grid || !resultsCountEl) {
        console.error("Élément #productsGrid ou #resultsCount introuvable pour renderGrid.");
        return;
    }

    grid.innerHTML = Array.isArray(items) ? items.map(item => renderProduct(item)).join('') : '';

    grid.querySelectorAll('.reserve-btn').forEach(btn => {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);

        newBtn.addEventListener('click', async function() {
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
                console.error('❌ cartManager non trouvé ! Le panier n\'est pas initialisé.');
                alert('Erreur : Le panier n\'est pas initialisé. Rechargez la page.');
                return;
            }

            try {
                window.cartManager.addItem(product);

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
                console.error('❌ Erreur ajout panier (Catalogue):', error);
                alert('Erreur lors de l\'ajout au panier : ' + error.message);
            }
        });
    });

    resultsCountEl.textContent = Array.isArray(items) ? items.length : 0;
}

// --- Ordre d'affichage ---
function getInitialProducts() {
    if (!Array.isArray(ALL_PRODUCTS)) return [];

    const items = [];
    const used = new Set();
    const productKey = p => p.id || p.cip;

    // 1. Featured
    ALL_PRODUCTS.filter(p => p && p.featured).forEach(p => {
        const key = productKey(p);
        if (key && !used.has(key)) { items.push(p); used.add(key); }
    });

    // 2. Petits Prix
    ALL_PRODUCTS.filter(p => p && norm(p.promo_libelle || '') === 'petits prix').forEach(p => {
        const key = productKey(p);
        if (key && !used.has(key)) { items.push(p); used.add(key); }
    });

    // 3. Promotions
    ALL_PRODUCTS.filter(p => {
        if (!p) return false;
        const key = productKey(p);
        if (!key || used.has(key) || p.featured || norm(p.promo_libelle || '') === 'petits prix') return false;
        const hasPromoPrice = typeof p.prix_promo === 'number' && Number.isFinite(p.prix_promo);
        const hasLot = typeof p.lot_size === 'number' && p.lot_size > 1;
        const hasLabel = !!(p.promo_libelle || '').trim();
        return hasPromoPrice || hasLot || hasLabel;
    }).forEach(p => {
        const key = productKey(p);
        if (key && !used.has(key)) { items.push(p); used.add(key); }
    });

    // 4. Aléatoire (limité à 150)
    const remaining = ALL_PRODUCTS.filter(p => p && !used.has(productKey(p)));
    const random = shuffle(remaining).slice(0, 150);
    random.forEach(p => {
        const key = productKey(p);
        if (key) { items.push(p); }
    });

    return items;
}

// --- Filtres ---
function applyFilters() {
    if (!Array.isArray(ALL_PRODUCTS)) {
        console.error("applyFilters: ALL_PRODUCTS n'est pas prêt.");
        return;
    }

    let items = [];
    const hasActiveFilters = (state.query && state.query.length >= 2) || state.brand || state.showStock;

    if (state.displayMode === 'tous') {
        items = hasActiveFilters ? [...ALL_PRODUCTS] : getInitialProducts();
    } else {
        items = [...ALL_PRODUCTS];
        if (state.displayMode === 'misEnAvant') items = items.filter(p => p && p.featured);
        else if (state.displayMode === 'promotions') items = items.filter(p => p && ( (typeof p.prix_promo === 'number' && Number.isFinite(p.prix_promo)) || (typeof p.lot_size === 'number' && p.lot_size > 1) || !!(p.promo_libelle || '').trim() ));
        else if (state.displayMode === 'petitsPrix') items = items.filter(p => p && norm(p.promo_libelle || '') === 'petits prix');
    }

    if (state.query && state.query.length >= 2) {
        const q = norm(state.query);
        items = items.filter(it => it && norm(`${it.libelle} ${it.marque} ${it.cip}`).includes(q));
    }
    if (state.brand) items = items.filter(it => it && norm(it.marque || '') === norm(state.brand));
    if (state.showStock) items = items.filter(it => it && (it.availability_code === 'stock' || norm(it.disponibilite || '').includes('oui')));

    renderGrid(items);
}

function resetFilters() {
    state.query = ''; 
    state.brand = '';
    state.showStock = false; 
    state.displayMode = 'tous';

    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    const labFilter = document.getElementById('labFilter');
    if (labFilter) labFilter.value = '';
    const stockFilter = document.getElementById('stockFilter');
    if (stockFilter) stockFilter.checked = false;
    const tousRadio = document.querySelector('input[name="displayMode"][value="tous"]');
    if (tousRadio) tousRadio.checked = true;

    renderGrid(getInitialProducts());
    console.log('🔄 Filtres réinitialisés.');
}

// --- Init ---
async function init() {
    console.log('🚀 Initialisation catalogue v3.1 (Pagination automatique)');

    const grid = document.getElementById('productsGrid');
    const loading = document.getElementById('loadingIndicator');
    const updateTimeEl = document.getElementById('updateTime');

    if (!grid || !loading || !updateTimeEl) {
        console.error('ERREUR CRITIQUE: Éléments init introuvables !');
        return;
    }

    loading.classList.remove('hidden');
    grid.innerHTML = Array(9).fill('').map(() =>
        `<div class="bg-white dark:bg-gray-800 rounded-xl shadow-md p-5 animate-pulse">
            <div class="h-4 rounded bg-gray-200 dark:bg-gray-700 w-3/4 mb-3"></div>
            <div class="h-3 rounded bg-gray-200 dark:bg-gray-700 w-full mb-2"></div>
            <div class="h-3 rounded bg-gray-200 dark:bg-gray-700 w-2/3"></div>
        </div>`
    ).join('');

    try {
        if (!window.productCache) throw new Error('productCache non disponible!');
        
        ALL_PRODUCTS = await window.productCache.load();
        if (!Array.isArray(ALL_PRODUCTS)) ALL_PRODUCTS = [];
        console.log(`✅ ${ALL_PRODUCTS.length} produits chargés.`);

        BRANDS = await fetchBrands();
        if (!Array.isArray(BRANDS)) BRANDS = [];
        console.log(`✅ ${BRANDS.length} marques chargées.`);

        const labFilter = document.getElementById('labFilter');
        if (labFilter) {
            labFilter.innerHTML = '<option value="">Tous les laboratoires</option>';
            BRANDS.sort((a, b) => a.label.localeCompare(b.label))
                  .forEach(b => {
                      const opt = document.createElement('option');
                      opt.value = b.label;
                      opt.textContent = `${b.label} (${b.count})`;
                      labFilter.appendChild(opt);
                  });
        }

        const initialProducts = getInitialProducts();
        renderGrid(initialProducts);

        const metadata = window.productCache.getMetadata();
        updateTimeEl.textContent = (metadata && metadata.updatedAt) ? `Mise à jour : ${formatDate(metadata.updatedAt)}` : 'Date indisponible';

        console.log('✅ Catalogue prêt !');

    } catch (error) {
        console.error('❌ Erreur initialisation catalogue:', error);
        
        grid.innerHTML = 
        `<div class="col-span-full text-center py-12">
            <p class="text-red-500 text-xl font-bold mb-2">❌ Erreur de chargement du catalogue</p>
            <p class="text-gray-600 dark:text-gray-400">${error.message || 'Une erreur inconnue est survenue.'}</p>
            <button id="retryButton" class="mt-4 bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700">Réessayer</button>
        </div>`;
        
        const retryButton = document.getElementById('retryButton');
        if (retryButton) {
            retryButton.addEventListener('click', () => location.reload());
        }
        
    } finally {
        loading.classList.add('hidden');
    }
}

// --- Events ---
document.addEventListener('DOMContentLoaded', () => {
    console.log('Catalogue.js v3.1: DOMContentLoaded');

    if (typeof CONFIG === 'undefined' || !window.productCache || !window.cartManager) {
        console.error("ERREUR: Dépendances manquantes (CONFIG, productCache, ou cartManager). L'initialisation est annulée.");
        const grid = document.getElementById('productsGrid');
        if(grid) grid.innerHTML = '<p class="col-span-full text-center text-red-500 font-bold py-10">Erreur critique lors du chargement. Veuillez recharger la page.</p>';
        return;
    }

    init();

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => { state.query = e.target.value.trim(); applyFilters(); }, 300);
        });
    } else { console.warn('Element #searchInput non trouvé'); }

    const labFilterEl = document.getElementById('labFilter');
    if (labFilterEl) labFilterEl.addEventListener('change', (e) => { state.brand = e.target.value; applyFilters(); });
    else console.warn('Element #labFilter non trouvé');

    const stockFilterEl = document.getElementById('stockFilter');
    if (stockFilterEl) stockFilterEl.addEventListener('change', (e) => { state.showStock = e.target.checked; applyFilters(); });
    else console.warn('Element #stockFilter non trouvé');

    const displayModeRadios = document.querySelectorAll('input[name="displayMode"]');
    if (displayModeRadios.length > 0) {
        displayModeRadios.forEach(radio => { radio.addEventListener('change', (e) => { state.displayMode = e.target.value; applyFilters(); }); });
    } else { console.warn('Elements input[name="displayMode"] non trouvés');}

    const resetFiltersBtnEl = document.getElementById('resetFiltersBtn');
    if (resetFiltersBtnEl) resetFiltersBtnEl.addEventListener('click', resetFilters);
    else console.warn('Element #resetFiltersBtn non trouvé');

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
    } else {
        console.warn('Un ou plusieurs éléments du drawer panier sont manquants.');
    }
});

console.log('✅ Catalogue v3.1 chargé (Pagination automatique avec boucle while)');