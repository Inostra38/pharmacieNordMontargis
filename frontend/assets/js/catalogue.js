// = = = = = = = = = = = = = = = = = = = = = = = = =
// Catalogue - Version Sans Catégories
// = = = = = = = = = = = = = = = = = = = = = = = = =

// Vérifie si CONFIG est défini, sinon log une erreur claire.
if (typeof CONFIG === 'undefined') {
    console.error('ERREUR CRITIQUE: CONFIG non défini. Assurez-vous que config.js est chargé AVANT catalogue.js');
}
const API_URL = CONFIG ? CONFIG.API.BASE_URL : ''; // Utilise CONFIG ou une chaîne vide par sécurité

// --- État et Cache ---
const state = {
    query: '',
    brand: '',
    // category: '', // Supprimé
    showStock: false,
    displayMode: 'tous'
};
let ALL_PRODUCTS = [];
let BRANDS = [];
// let CATEGORIES = new Set(); // Supprimé

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
        // ✅ NOUVEAU : Utiliser apiService au lieu de fetch direct
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

/**
 * Créer une carte produit (avec data-* promo et bouton/lien dynamique)
 */
function renderProduct(item) {
    if (!item) return '';

    const av = availabilityBadge(item.availability_code, item.disponibilite);
    const requiresPrescription = item.ordonnance;
    const promoLabel = (item.promo_libelle || '').trim();
    const promoNorm = norm(promoLabel);
    const lotSize = item.lot_size;
    const lotTotal = item.lot_total;
    const basePrice = item.prix; // Prix avant promo
    const finalUnitPrice = item.prix_promo || item.prix; // Prix unitaire final affiché

    let badges = '';
    if (requiresPrescription) badges += '<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 dark:bg-rose-900 dark:text-rose-300">📋 Ordonnance</span>';
    if (promoLabel) badges += `<span class="inline-flex items-center px-2.5 py-1 ml-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">🔥 ${escapeHtml(promoLabel)}</span>`;

    let priceHTML = '';
    let lotHTML = '';
    // Construction de l'affichage du prix (identique à avant)
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
        // Lien si ordonnance requise
        buttonHtml = `<a href="secure.ordonnance.html" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2" title="Ce produit nécessite une ordonnance. Cliquez pour envoyer la vôtre."><span class="material-symbols-outlined">upload_file</span> Envoyer l'ordonnance</a>`;
    } else {
        // Bouton Réserver avec toutes les data-* nécessaires
        buttonHtml = `<button class="reserve-btn w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2" data-id="${item.id}" data-name="${escapeHtml(item.libelle)}" data-price="${finalUnitPrice}" data-base-price="${basePrice}" data-cip="${item.cip || ''}" data-promo-libelle="${escapeHtml(promoLabel)}" data-lot-size="${lotSize || ''}" data-lot-total="${lotTotal || ''}"><span class="material-symbols-outlined">shopping_cart</span> Réserver</button>`;
    }

    // Rendu HTML final de la carte
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

/**
 * Affiche les produits et attache les événements pour "Réserver"
 */
function renderGrid(items) {
    const grid = document.getElementById('productsGrid');
    const resultsCountEl = document.getElementById('resultsCount');
    if (!grid || !resultsCountEl) {
         console.error("Élément #productsGrid ou #resultsCount introuvable pour renderGrid.");
         return;
    }

    // Assure que 'items' est un tableau avant de mapper
    grid.innerHTML = Array.isArray(items) ? items.map(item => renderProduct(item)).join('') : '';

    // Attacher les événements APRES la génération du HTML
    grid.querySelectorAll('.reserve-btn').forEach(btn => {
        // Nettoyer anciens listeners avant d'ajouter le nouveau
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);

        newBtn.addEventListener('click', async function() { // Utiliser function() pour 'this'
            // console.log('🛒 Clic sur Réserver (Catalogue)');

            // Récupère toutes les données promo depuis data-*
            const product = {
                id: this.dataset.id,
                name: this.dataset.name,
                price: parseFloat(this.dataset.price),
                basePrice: parseFloat(this.dataset.basePrice),
                cip: this.dataset.cip,
                promoLibelle: this.dataset.promoLibelle,
                lotSize: this.dataset.lotSize ? parseInt(this.dataset.lotSize) : null,
                lotTotal: this.dataset.lotTotal ? parseFloat(this.dataset.lotTotal) : null,
                requiresPrescription: false // Logique gérée avant
            };

            // console.log('Produit à ajouter (Catalogue):', product);

            if (!window.cartManager) {
                console.error('❌ cartManager non trouvé ! Le panier n\'est pas initialisé.');
                alert('Erreur : Le panier n\'est pas initialisé. Rechargez la page.');
                return;
            }

            try {
                window.cartManager.addItem(product); // Envoie l'objet complet au panier
                // console.log('✅ Produit ajouté au panier (Catalogue)');

                // Feedback visuel
                const originalHTML = this.innerHTML;
                this.innerHTML = '<span class="material-symbols-outlined">check</span> Réservé !';
                this.classList.add('bg-green-600', 'hover:bg-green-700');
                this.classList.remove('bg-teal-600', 'hover:bg-teal-700');
                this.disabled = true;

                setTimeout(() => {
                    // Vérifier si le bouton existe toujours avant de restaurer
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

    // Mettre à jour le compteur de résultats
    resultsCountEl.textContent = Array.isArray(items) ? items.length : 0;
    // console.log(`✅ ${Array.isArray(items) ? items.length : 0} produits affichés. Événements attachés.`);
}


// --- Ordre d'affichage ---
function getInitialProducts() {
    if (!Array.isArray(ALL_PRODUCTS)) return [];

    const items = [];
    const used = new Set();
    const productKey = p => p.id || p.cip;

    // Priorité 1: Featured
    ALL_PRODUCTS.filter(p => p && p.featured).forEach(p => {
        const key = productKey(p);
        if (key && !used.has(key)) { items.push(p); used.add(key); }
    });

    // Priorité 2: Petits Prix
    ALL_PRODUCTS.filter(p => p && norm(p.promo_libelle || '') === 'petits prix').forEach(p => {
        const key = productKey(p);
        if (key && !used.has(key)) { items.push(p); used.add(key); }
    });

    // Priorité 3: Autres Promos
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

    // Priorité 4: Aléatoires (max 150)
    const remaining = ALL_PRODUCTS.filter(p => p && !used.has(productKey(p)));
    const random = shuffle(remaining).slice(0, 150);
    random.forEach(p => {
        const key = productKey(p);
        if (key) { items.push(p); }
    });

    return items;
}

// --- Filtres (Sans Catégories) ---
function applyFilters() {
    if (!Array.isArray(ALL_PRODUCTS)) {
        console.error("applyFilters: ALL_PRODUCTS n'est pas prêt.");
        return;
    }

    let items = [];
    const hasActiveFilters = (state.query && state.query.length >= 2) || state.brand || state.showStock; // state.category retiré

    if (state.displayMode === 'tous') {
        items = hasActiveFilters ? [...ALL_PRODUCTS] : getInitialProducts();
    } else {
        items = [...ALL_PRODUCTS]; // Commencer avec tous pour modes spéciaux
        if (state.displayMode === 'misEnAvant') items = items.filter(p => p && p.featured);
        else if (state.displayMode === 'promotions') items = items.filter(p => p && ( (typeof p.prix_promo === 'number' && Number.isFinite(p.prix_promo)) || (typeof p.lot_size === 'number' && p.lot_size > 1) || !!(p.promo_libelle || '').trim() ));
        else if (state.displayMode === 'petitsPrix') items = items.filter(p => p && norm(p.promo_libelle || '') === 'petits prix');
    }

    // Appliquer filtres restants
    if (state.query && state.query.length >= 2) {
        const q = norm(state.query);
        items = items.filter(it => it && norm(`${it.libelle} ${it.marque} ${it.cip}`).includes(q));
    }
    // Filtre catégorie retiré
    if (state.brand) items = items.filter(it => it && norm(it.marque || '') === norm(state.brand));
    if (state.showStock) items = items.filter(it => it && (it.availability_code === 'stock' || norm(it.disponibilite || '').includes('oui')));

    renderGrid(items); // Mettre à jour la grille
}

function resetFilters() {
    state.query = ''; state.brand = ''; // state.category retiré
    state.showStock = false; state.displayMode = 'tous';

    // Réinitialiser UI
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    const labFilter = document.getElementById('labFilter');
    if (labFilter) labFilter.value = '';
    // Reset categoryFilter retiré
    const stockFilter = document.getElementById('stockFilter');
    if (stockFilter) stockFilter.checked = false;
    const tousRadio = document.querySelector('input[name="displayMode"][value="tous"]');
    if (tousRadio) tousRadio.checked = true;

    renderGrid(getInitialProducts());
    console.log('🔄 Filtres réinitialisés.');
}


// --- Init (Sans Catégories) ---
async function init() {
    console.log('🚀 Initialisation catalogue (sans catégories)');

    const grid = document.getElementById('productsGrid');
    const loading = document.getElementById('loadingIndicator');
    const updateTimeEl = document.getElementById('updateTime');

    if (!grid || !loading || !updateTimeEl) {
        console.error('ERREUR CRITIQUE: Éléments init introuvables !');
        return;
    }

    // Afficher Skeleton
    loading.classList.remove('hidden');
    grid.innerHTML = Array(9).fill('').map(() =>
        `<div class="bg-white dark:bg-gray-800 rounded-xl shadow-md p-5 animate-pulse">
            <div class="h-4 rounded bg-gray-200 dark:bg-gray-700 w-3/4 mb-3"></div>
            <div class="h-3 rounded bg-gray-200 dark:bg-gray-700 w-full mb-2"></div>
            <div class="h-3 rounded bg-gray-200 dark:bg-gray-700 w-2/3"></div>
        </div>`
    ).join(''); // Amélioration skeleton avec animate-pulse

    try {
        if (!window.productCache) throw new Error('productCache non disponible!');
        ALL_PRODUCTS = await window.productCache.load();
        if (!Array.isArray(ALL_PRODUCTS)) ALL_PRODUCTS = [];
        console.log(`✅ ${ALL_PRODUCTS.length} produits chargés.`);

        // Charger Marques
        BRANDS = await fetchBrands();
        if (!Array.isArray(BRANDS)) BRANDS = []; // Sécurité
        console.log(`✅ ${BRANDS.length} marques chargées.`);

        // Extraction Catégories supprimée

        // Remplir Dropdown Laboratoires
        const labFilter = document.getElementById('labFilter');
        if (labFilter) {
            labFilter.innerHTML = '<option value="">Tous les laboratoires</option>';
            BRANDS.sort((a, b) => a.label.localeCompare(b.label))
                  .forEach(b => {
                      const opt = document.createElement('option');
                      opt.value = b.label; // Utilise label comme valeur
                      opt.textContent = `${b.label} (${b.count})`;
                      labFilter.appendChild(opt);
                  });
        }

        // Remplissage dropdown Catégories supprimé

        // Afficher Produits Initiaux
        const initialProducts = getInitialProducts();
        renderGrid(initialProducts);

        // Afficher Date Mise à Jour
        const metadata = window.productCache.getMetadata();
        updateTimeEl.textContent = (metadata && metadata.updatedAt) ? `Mise à jour : ${formatDate(metadata.updatedAt)}` : 'Date indisponible';

        console.log('✅ Catalogue prêt !');

    } catch (error) {
        console.error('❌ Erreur initialisation catalogue:', error);
        grid.innerHTML = // Message d'erreur HTML
        `<div class="col-span-full text-center py-12">
            <p class="text-red-500 text-xl font-bold mb-2">❌ Erreur de chargement du catalogue</p>
            <p class="text-gray-600 dark:text-gray-400">${error.message || 'Une erreur inconnue est survenue.'}</p>
            <button onclick="location.reload()" class="mt-4 bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700">Réessayer</button>
        </div>`;
    } finally {
        loading.classList.add('hidden');
    }
}

// --- Events ---
document.addEventListener('DOMContentLoaded', () => {
    console.log('Catalogue.js: DOMContentLoaded');

    // Vérifier dépendances
    if (typeof CONFIG === 'undefined' || !window.productCache || !window.cartManager) {
         console.error("ERREUR: Dépendances manquantes (CONFIG, productCache, ou cartManager). L'initialisation est annulée.");
         const grid = document.getElementById('productsGrid');
         if(grid) grid.innerHTML = '<p class="col-span-full text-center text-red-500 font-bold py-10">Erreur critique lors du chargement. Veuillez recharger la page.</p>';
         return;
    }

    init(); // Lancer l'initialisation

    // --- Attacher les listeners ---
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

    // Listener categoryFilterEl supprimé

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

    // --- Gestion du drawer panier ---
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

console.log('✅ Catalogue chargé (vSansCategories)');