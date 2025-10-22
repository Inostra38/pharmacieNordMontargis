// ==========================================
// Catalogue - Version 3 avec Cache et Filtrage Live
// ==========================================

const API_URL = CONFIG.API.BASE_URL;

// État
const state = {
    query: '',
    brand: '',
    category: '',
    showStock: false,
    displayMode: 'tous'
};

// Cache
let ALL_PRODUCTS = [];
let BRANDS = [];
let CATEGORIES = new Set();

// Utils
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const shuffle = (arr) => {
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
    const d = new Date(iso);
    return new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(d);
};

const availabilityBadge = (code, dispo) => {
    const c = (code || '').toLowerCase();
    const v = norm(dispo || '');

    if (c === 'stock' || v.includes('oui')) {
        return '<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">✅ Disponible</span>';
    }
    if (c === '24h' || v.includes('24')) {
        return '<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300">🕐 24h</span>';
    }
    if (c === '4j' || v.includes('4 jour')) {
        return '<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">📦 4j</span>';
    }
    return '<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300">❌ Indisponible</span>';
};

// ==========================================
// Dark Mode
// ==========================================

function initDarkMode() {
    const darkToggle = document.getElementById('darkToggle');
    const darkIcon = document.getElementById('darkIcon');
    const html = document.documentElement;

    const theme = localStorage.getItem('theme') || 'dark';
    if (theme === 'light') {
        html.classList.remove('dark');
        darkIcon.textContent = '🌙';
    } else {
        html.classList.add('dark');
        darkIcon.textContent = '☀️';
    }

    darkToggle.addEventListener('click', () => {
        html.classList.toggle('dark');
        const isDark = html.classList.contains('dark');
        darkIcon.textContent = isDark ? '☀️' : '🌙';
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    });
}

// ==========================================
// API
// ==========================================

async function fetchBrands() {
    const url = new URL(API_URL);
    url.searchParams.set('brands', '1');
    url.searchParams.set('t', Date.now());

    const res = await fetch(url);
    const data = await res.json();

    return (data.brands || []).map(b => ({
        label: b.label,
        norm: norm(b.label),
        count: b.count || 0
    }));
}

// ==========================================
// Rendu
// ==========================================

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function renderProduct(item) {
    const av = availabilityBadge(item.availability_code, item.disponibilite);

    // Badges
    let badges = '';
    if (item.ordonnance) { //
        badges += '<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 dark:bg-rose-900 dark:text-rose-300">📋 Ordonnance</span>';
    }

    const promoLabel = (item.promo_libelle || '').trim();
    if (promoLabel) {
        badges += `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">🔥 ${escapeHtml(promoLabel)}</span>`;
    }

    // Prix
    let priceHTML = '';
    const promoNorm = norm(promoLabel);

    let lotHTML = '';
    if (typeof item.lot_size === 'number' && item.lot_size > 1 && typeof item.lot_total === 'number') {
        const isPrixPar = promoNorm.includes('prix par');
        const lotPrice = `<span class="price-promo">${formatPrice(item.lot_total)}</span>`;
        const lotText = isPrixPar ? `le lot de ${item.lot_size}` : `les ${item.lot_size}`;
        lotHTML = `<span class="lot-inline">${isPrixPar ? lotPrice + ' ' + lotText : 'soit ' + lotPrice + ' ' + lotText}</span>`;
    }

    if (promoNorm === 'petits prix') {
        const val = typeof item.prix_promo === 'number' ? item.prix_promo : item.prix;
        priceHTML = `<div class="flex items-baseline gap-2"><span class="price-promo">${formatPrice(val)}</span>${lotHTML}</div>`;
    } else if (typeof item.prix_promo === 'number' && Number.isFinite(item.prix_promo)) {
        priceHTML = `<div class="flex items-baseline gap-2"><span class="price-old">${formatPrice(item.prix)}</span><span class="price-promo">${formatPrice(item.prix_promo)}</span>${lotHTML}</div>`;
    } else {
        priceHTML = `<div class="flex items-baseline gap-2"><span class="text-xl font-bold text-gray-800 dark:text-white">${formatPrice(item.prix)}</span>${lotHTML}</div>`;
    }

    // --- NOUVELLE LOGIQUE POUR LE BOUTON ---
    let buttonHtml = '';
    if (item.ordonnance) {
        // Si ordonnance requise, afficher un LIEN vers la page d'upload
        buttonHtml = `
            <a
                href="secure.ordonnance.html"
                class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2"
                title="Ce produit nécessite une ordonnance. Cliquez pour envoyer la vôtre."
            >
                <span class="material-symbols-outlined">upload_file</span>
                Envoyer l'ordonnance
            </a>
        `;
    } else {
        // Sinon, afficher le bouton "Réserver" normal
        buttonHtml = `
            <button
                class="reserve-btn w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2"
                data-id="${item.id}"
                data-name="${escapeHtml(item.libelle)}"
                data-price="${item.prix_promo || item.prix}"
                data-cip="${item.cip}"
            >
                <span class="material-symbols-outlined">shopping_cart</span>
                Réserver
            </button>
        `;
    }
    // --- FIN DE LA NOUVELLE LOGIQUE ---

    return `
        <div class="product-card bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden">
            <div class="p-5">
                <div class="flex flex-wrap gap-2 mb-3">
                    ${av}
                    ${badges}
                </div>

                <h3 class="font-semibold text-lg text-gray-800 dark:text-white mb-2 line-clamp-2">
                    ${item.libelle || 'Produit'}
                </h3>

                <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    ${item.marque ? item.marque + ' • ' : ''}CIP ${item.cip || '?'}
                </p>

                <div class="mb-3">
                    ${priceHTML}
                </div>

                <p class="text-xs text-gray-500 dark:text-gray-500 mb-4">
                    Stock : ${typeof item.stock === 'number' ? item.stock : '—'}
                </p>

                ${buttonHtml}
            </div>
        </div>
    `;
}   

function renderGrid(items) {
    const grid = document.getElementById('productsGrid');
    grid.innerHTML = items.map(item => renderProduct(item)).join('');

    // Attacher événements pour tous les boutons "Réserver"
    grid.querySelectorAll('.reserve-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            console.log('🛒 Clic sur Réserver');

            const product = {
                id: this.dataset.id,
                name: this.dataset.name,
                price: parseFloat(this.dataset.price),
                cip: this.dataset.cip
            };

            console.log('Produit à ajouter:', product);

            if (!window.cartManager) {
                console.warn('⚠️ cartManager pas encore prêt, attente...');

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

            try {
                window.cartManager.addItem(product);
                console.log('✅ Produit ajouté au panier');

                const originalHTML = this.innerHTML;
                this.innerHTML = '<span class="material-symbols-outlined">check</span> Réservé !';
                this.classList.add('bg-green-600', 'hover:bg-green-700');
                this.classList.remove('bg-teal-600', 'hover:bg-teal-700');

                setTimeout(() => {
                    this.innerHTML = originalHTML;
                    this.classList.remove('bg-green-600', 'hover:bg-green-700');
                    this.classList.add('bg-teal-600', 'hover:bg-teal-700');
                }, 1500);

            } catch (error) {
                console.error('❌ Erreur ajout panier:', error);
                alert('Erreur lors de l\'ajout au panier : ' + error.message);
            }
        });
    });

    document.getElementById('resultsCount').textContent = items.length;
    console.log(`✅ ${items.length} produits affichés avec événements attachés`);
}

// ==========================================
// Ordre d'affichage
// ==========================================

function getInitialProducts() {
    const items = [];
    const used = new Set();

    console.log('🎯 Construction de l\'affichage initial...');
    console.log(`Total produits disponibles : ${ALL_PRODUCTS.length}`);

    // 1. FEATURED
    const featured = ALL_PRODUCTS.filter(p => p.featured);
    console.log(`⭐ Featured trouvés : ${featured.length}`);
    featured.forEach(p => {
        const key = p.id || p.cip;
        if (key && !used.has(key)) {
            items.push(p);
            used.add(key);
        }
    });

    // 2. PETITS PRIX
    const petitsPrix = ALL_PRODUCTS.filter(p => {
        const key = p.id || p.cip;
        if (!key || used.has(key)) return false;
        return norm(p.promo_libelle || '') === 'petits prix';
    });
    console.log(`💰 Petits prix trouvés : ${petitsPrix.length}`);
    petitsPrix.forEach(p => {
        const key = p.id || p.cip;
        if (key && !used.has(key)) {
            items.push(p);
            used.add(key);
        }
    });

    // 3. PROMOTIONS
    const promos = ALL_PRODUCTS.filter(p => {
        const key = p.id || p.cip;
        if (!key || used.has(key)) return false;
        if (p.featured) return false;
        if (norm(p.promo_libelle || '') === 'petits prix') return false;

        const hasPromo = typeof p.prix_promo === 'number' && Number.isFinite(p.prix_promo);
        const hasLot = typeof p.lot_size === 'number' && p.lot_size > 1;
        const hasLabel = !!(p.promo_libelle || '').trim();
        return hasPromo || hasLot || hasLabel;
    });
    console.log(`🔥 Promos trouvées : ${promos.length}`);
    promos.forEach(p => {
        const key = p.id || p.cip;
        if (key && !used.has(key)) {
            items.push(p);
            used.add(key);
        }
    });

    // 4. 150 ALÉATOIRES
    const remaining = ALL_PRODUCTS.filter(p => {
        const key = p.id || p.cip;
        return key && !used.has(key);
    });
    console.log(`📦 Produits restants : ${remaining.length}`);
    const random = shuffle(remaining).slice(0, 150);
    console.log(`🎲 Aléatoires sélectionnés : ${random.length}`);
    random.forEach(p => {
        const key = p.id || p.cip;
        if (key) {
            items.push(p);
            used.add(key);
        }
    });

    console.log(`✅ Total produits à afficher : ${items.length}`);
    return items;
}

// ==========================================
// Filtres CORRIGÉS (recherche sur 9000)
// ==========================================

function applyFilters() {
    let items = [];

    console.log('🔍 Application des filtres...');
    console.log('Mode affichage:', state.displayMode);
    console.log('Recherche:', state.query);
    console.log('Marque:', state.brand);
    console.log('Catégorie:', state.category);
    console.log('Stock uniquement:', state.showStock);

    // CORRECTION : Déterminer si recherche/filtres actifs
    const hasActiveFilters =
        (state.query && state.query.length >= 2) ||
        state.brand ||
        state.category ||
        state.showStock;

    // Mode d'affichage
    if (state.displayMode === 'tous') {
        if (hasActiveFilters) {
            // RECHERCHE/FILTRES ACTIFS → Partir des 9000 produits
            console.log('🔍 Recherche active → base de 9000 produits');
            items = [...ALL_PRODUCTS];
        } else {
            // PAS DE RECHERCHE → Affichage optimisé (181)
            console.log('📊 Affichage par défaut → 181 produits optimisés');
            items = getInitialProducts();
        }
    } else {
        // Modes spéciaux → Partir de tous les produits
        items = [...ALL_PRODUCTS];

        if (state.displayMode === 'misEnAvant') {
            items = items.filter(p => p.featured);
        } else if (state.displayMode === 'promotions') {
            items = items.filter(p => {
                const hasPromo = typeof p.prix_promo === 'number' && Number.isFinite(p.prix_promo);
                const hasLot = typeof p.lot_size === 'number' && p.lot_size > 1;
                const hasLabel = !!(p.promo_libelle || '').trim();
                return hasPromo || hasLot || hasLabel;
            });
        } else if (state.displayMode === 'petitsPrix') {
            items = items.filter(p => norm(p.promo_libelle || '') === 'petits prix');
        }
    }

    // Appliquer les filtres supplémentaires
    if (state.query && state.query.length >= 2) {
        const q = norm(state.query);
        items = items.filter(it =>
            norm(`${it.libelle} ${it.marque} ${it.cip}`).includes(q)
        );
        console.log(`🔎 Après filtre recherche "${state.query}": ${items.length} produits`);
    }

    if (state.category) {
        items = items.filter(it => it.marque === state.category);
        console.log(`🏷️ Après filtre catégorie: ${items.length} produits`);
    }

    if (state.brand) {
        items = items.filter(it => norm(it.marque || '') === norm(state.brand));
        console.log(`🧪 Après filtre labo: ${items.length} produits`);
    }

    if (state.showStock) {
        items = items.filter(it =>
            it.availability_code === 'stock' || norm(it.disponibilite || '').includes('oui')
        );
        console.log(`📦 Après filtre stock: ${items.length} produits`);
    }

    console.log(`✅ RÉSULTAT FINAL : ${items.length} produits`);
    renderGrid(items);
}

function resetFilters() {
    state.query = '';
    state.brand = '';
    state.category = '';
    state.showStock = false;
    state.displayMode = 'tous';

    document.getElementById('searchInput').value = '';
    document.getElementById('labFilter').value = '';
    document.getElementById('categoryFilter').value = '';
    document.getElementById('stockFilter').checked = false;
    document.querySelector('input[name="displayMode"][value="tous"]').checked = true;

    renderGrid(getInitialProducts());
}

// ==========================================
// Init
// ==========================================

async function init() {
    console.log('🚀 Initialisation catalogue');

    initDarkMode();

    const grid = document.getElementById('productsGrid');
    const loading = document.getElementById('loadingIndicator');

    // Skeleton
    loading.classList.remove('hidden');
    for (let i = 0; i < 9; i++) {
        const sk = document.createElement('div');
        sk.className = 'bg-white dark:bg-gray-800 rounded-xl shadow-md p-5';
        sk.innerHTML = `
            <div class="h-4 rounded skeleton w-3/4 mb-3"></div>
            <div class="h-3 rounded skeleton w-full mb-2"></div>
            <div class="h-3 rounded skeleton w-2/3"></div>
        `;
        grid.appendChild(sk);
    }

    try {
        console.log('📡 Chargement depuis le cache...');

        // Charger depuis le cache
        ALL_PRODUCTS = await window.productCache.load();

        console.log(`✅ ${ALL_PRODUCTS.length} produits chargés`);

        if (ALL_PRODUCTS.length === 0) {
            throw new Error('Aucun produit reçu');
        }

        // Charger les marques
        console.log('📡 Chargement des marques...');
        BRANDS = await fetchBrands();
        console.log(`✅ ${BRANDS.length} marques chargées`);

        // Catégories
        ALL_PRODUCTS.forEach(p => {
            if (p.marque) CATEGORIES.add(p.marque);
        });
        console.log(`✅ ${CATEGORIES.size} catégories extraites`);

        // Remplir dropdowns
        const labFilter = document.getElementById('labFilter');
        BRANDS.forEach(b => {
            const opt = document.createElement('option');
            opt.value = b.label;
            opt.textContent = `${b.label} (${b.count})`;
            labFilter.appendChild(opt);
        });

        const catFilter = document.getElementById('categoryFilter');
        [...CATEGORIES].sort().forEach(c => {
            const opt = document.createElement('option');
            opt.value = c;
            opt.textContent = c;
            catFilter.appendChild(opt);
        });

        // Afficher
        const initialProducts = getInitialProducts();
        console.log(`📦 Produits initiaux préparés : ${initialProducts.length}`);

        renderGrid(initialProducts);

        const metadata = window.productCache.getMetadata();
        if (metadata && metadata.updatedAt) {
            document.getElementById('updateTime').textContent = `Mise à jour : ${formatDate(metadata.updatedAt)}`;
        }

        console.log('✅ Catalogue prêt !');

    } catch (error) {
        console.error('❌ Erreur:', error);
        grid.innerHTML = `
            <div class="col-span-3 text-center py-12">
                <p class="text-red-500 text-xl font-bold mb-2">❌ Erreur de chargement</p>
                <p class="text-gray-600 dark:text-gray-400">${error.message}</p>
                <button onclick="location.reload()" class="mt-4 bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700">
                    Réessayer
                </button>
            </div>
        `;
    } finally {
        loading.classList.add('hidden');
    }
}

// ==========================================
// Events (FILTRAGE LIVE)
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    init();

    // Recherche live (au clavier)
    const searchInput = document.getElementById('searchInput');
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            state.query = e.target.value.trim();
            applyFilters();
        }, 300); // Debounce 300ms
    });

    // Filtres
    document.getElementById('labFilter').addEventListener('change', (e) => {
        state.brand = e.target.value;
        applyFilters();
    });

    document.getElementById('categoryFilter').addEventListener('change', (e) => {
        state.category = e.target.value;
        applyFilters();
    });

    document.getElementById('stockFilter').addEventListener('change', (e) => {
        state.showStock = e.target.checked;
        applyFilters();
    });

    document.querySelectorAll('input[name="displayMode"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            state.displayMode = e.target.value;
            applyFilters();
        });
    });

    document.getElementById('resetFiltersBtn').addEventListener('click', resetFilters);

    // Panier
    const cartBtn = document.getElementById('cartButton');
    const cartDrawer = document.getElementById('cartDrawer');
    const cartOverlay = document.getElementById('cartOverlay');
    const closeCart = document.getElementById('closeCart');

    cartBtn.addEventListener('click', () => {
        cartDrawer.classList.remove('-translate-x-full');
        cartOverlay.classList.remove('hidden');

        if (window.cartManager) {
            window.cartManager.render();
        }
    });

    closeCart.addEventListener('click', () => {
        cartDrawer.classList.add('-translate-x-full');
        cartOverlay.classList.add('hidden');
    });

    cartOverlay.addEventListener('click', () => {
        cartDrawer.classList.add('-translate-x-full');
        cartOverlay.classList.add('hidden');
    });

    document.getElementById('validateCart').addEventListener('click', () => {
        if (window.cartManager && window.cartManager.items.length > 0) {
            alert('Fonctionnalité de validation en développement');
        }
    });
});

console.log('✅ Catalogue chargé');