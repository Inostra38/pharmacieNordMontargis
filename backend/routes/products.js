const express = require('express');
const router = express.Router();
const fileCache = require('../cache/file-cache');

// ============================================
// 🔍 VALIDATION DES VARIABLES D'ENVIRONNEMENT
// ============================================

if (!process.env.GOOGLE_APPS_SCRIPT_URL) {
    console.error('❌ ERREUR CRITIQUE [products.js] - Variable GOOGLE_APPS_SCRIPT_URL manquante dans .env');
    console.error('⚠️  Le module products.js ne pourra pas récupérer les produits !');
}

// ============================================
// 🔄 FONCTION DE RÉCUPÉRATION DEPUIS GOOGLE APPS SCRIPT
// ============================================

async function fetchFromGoogleAppsScript(params = {}) {
    const baseUrl = process.env.GOOGLE_APPS_SCRIPT_URL;
    
    if (!baseUrl) {
        throw new Error('URL Google Apps Script non configurée');
    }

    // Construire l'URL avec les paramètres
    const url = new URL(baseUrl);
    Object.keys(params).forEach(key => {
        url.searchParams.append(key, params[key]);
    });

    console.log('📡 Requête vers Google Apps Script...');
    const startTime = Date.now();

    const response = await fetch(url.toString(), {
        method: 'GET',
        redirect: 'follow',
        headers: {
            'User-Agent': 'Pharmacie-Nord-Backend/1.0'
        }
    });

    if (!response.ok) {
        throw new Error(`Erreur Google Apps Script: ${response.status}`);
    }

    const data = await response.json();
    const loadTime = Date.now() - startTime;

    console.log(`✅ Données reçues en ${loadTime}ms`);
    console.log(`📦 ${data.items?.length || 0} produits`);

    return data;
}

// ============================================
// 📍 ROUTE : GET /api/products
// Récupère tous les produits (avec cache fichier 2h + pagination)
// ============================================

router.get('/', async (req, res) => {
    console.log('[INFO] 📦 Requête de récupération des produits...');

    try {
        // Récupérer les paramètres de pagination
        const limit = parseInt(req.query.limit) || 500;
        const offset = parseInt(req.query.offset) || 0;
        
        console.log(`📊 Pagination demandée: limit=${limit}, offset=${offset}`);
        
        // 1. Vérifier le cache fichier d'abord
        const cachedData = await fileCache.get();
        
        if (cachedData) {
            console.log('✅ Cache valide trouvé');
            const cacheInfo = await fileCache.getInfo();
            
            // ✅ IMPORTANT : Appliquer limit et offset sur les données du cache
            const allItems = cachedData.items || [];
            const paginatedItems = allItems.slice(offset, offset + limit);
            
            console.log(`📦 Cache: ${allItems.length} produits total, retour de ${paginatedItems.length} produits (offset: ${offset})`);
            
            return res.json({
                success: true,
                data: {
                    items: paginatedItems,
                    total: allItems.length,
                    updatedAt: cachedData.updatedAt,
                    stockUpdatedAt: cachedData.stockUpdatedAt,
                    cached: true
                },
                cached: true,
                cacheAge: cacheInfo.ageMinutes,
                expiresIn: cacheInfo.remainingMinutes
            });
        }

        // 2. Si pas de cache, récupérer depuis Google Apps Script
        console.log('🔄 Pas de cache valide, récupération depuis Apps Script...');
        
        // ⚠️ Charger TOUS les produits pour remplir le cache
        const params = {
            limit: 50000,  // Charger tout pour le cache
            offset: 0
        };

        if (req.query.q) params.q = req.query.q;
        if (req.query.featured) params.featured = req.query.featured;

        const data = await fetchFromGoogleAppsScript(params);

        // 3. Mettre en cache fichier (2h)
        await fileCache.set(data);
        
        // 4. Appliquer la pagination sur les données fraîches
        const allItems = data.items || [];
        const paginatedItems = allItems.slice(offset, offset + limit);
        
        console.log(`📦 Apps Script: ${allItems.length} produits total, retour de ${paginatedItems.length} produits (offset: ${offset})`);

        res.json({
            success: true,
            data: {
                items: paginatedItems,
                total: allItems.length,
                updatedAt: data.updatedAt,
                stockUpdatedAt: data.stockUpdatedAt,
                cached: false
            },
            cached: false
        });

    } catch (error) {
        console.error('[ERREUR] ❌ Erreur lors de la récupération des produits:', error);
        
        res.status(500).json({
            success: false,
            error: 'Erreur serveur',
            message: 'Impossible de récupérer les produits. Veuillez réessayer plus tard.'
        });
    }
});

// ============================================
// 📍 ROUTE : GET /api/products/home
// Produits optimisés pour la page d'accueil DEPUIS LE CACHE LOCAL
// ============================================

router.get('/home', async (req, res) => {
    console.log('[INFO] 🏠 Requête de produits pour la page d\'accueil...');

    try {
        // ✅ NOUVEAU : Extraire les produits home depuis le cache local
        const cachedData = await fileCache.get();
        
        if (!cachedData || !cachedData.items) {
            console.warn('⚠️ Pas de cache disponible pour extraire les produits home');
            return res.json({
                success: true,
                data: {
                    items: [],
                    updatedAt: new Date().toISOString(),
                    stockUpdatedAt: new Date().toISOString()
                }
            });
        }

        // ✅ LOGIQUE HOME : Produits en stock avec promotion ou "Petits Prix"
        const MAX_HOME = 15;
        const homeItems = [];
        
        for (const product of cachedData.items) {
            if (homeItems.length >= MAX_HOME) break;
            
            // Doit être en stock
            if (!product.stock || product.stock <= 0) continue;
            
            // Vérifier si c'est "Petits Prix"
            const promoLabel = (product.promo_libelle || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            const hasPetitsPrix = promoLabel.includes('petits prix');
            
            // Vérifier si c'est une promo (prix promo, lot ou libellé promo)
            const hasPromoPrice = typeof product.prix_promo === 'number' && Number.isFinite(product.prix_promo);
            const hasLot = typeof product.lot_size === 'number' && product.lot_size > 1;
            const hasPromoLabel = product.promo_libelle && product.promo_libelle.trim() !== '';
            const hasPromo = (hasPromoPrice || hasLot || hasPromoLabel) && !hasPetitsPrix;
            
            // Garder seulement les produits avec Petits Prix OU Promo
            if (!hasPetitsPrix && !hasPromo) continue;
            
            homeItems.push(product);
        }

        console.log(`✅ ${homeItems.length} produits home extraits du cache (${cachedData.items.length} produits total)`);

        res.json({
            success: true,
            data: {
                items: homeItems,
                updatedAt: cachedData.updatedAt || new Date().toISOString(),
                stockUpdatedAt: cachedData.stockUpdatedAt || new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('[ERREUR] ❌ Erreur lors de la récupération des produits home:', error);
        
        res.status(500).json({
            success: false,
            error: 'Erreur serveur',
            message: 'Impossible de récupérer les produits. Veuillez réessayer plus tard.'
        });
    }
});

// ============================================
// 📍 ROUTE : GET /api/products/brands
// Récupère la liste des marques DEPUIS LE CACHE LOCAL
// ============================================

router.get('/brands', async (req, res) => {
    console.log('[INFO] 🏷️ Requête de récupération des marques...');

    try {
        // ✅ NOUVEAU : Extraire les marques depuis le cache local
        const cachedData = await fileCache.get();
        
        if (!cachedData || !cachedData.items) {
            console.warn('⚠️ Pas de cache disponible pour extraire les marques');
            return res.json({
                success: true,
                data: []
            });
        }

        // Construire la map des marques avec compteur
        const brandsMap = new Map();
        
        cachedData.items.forEach(product => {
            const marque = product.marque || product.fabricant || '';
            if (!marque.trim()) return;
            
            const normalized = marque.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            
            if (brandsMap.has(normalized)) {
                const existing = brandsMap.get(normalized);
                existing.count++;
                // Garder la version la plus longue du nom (avec majuscules, accents, etc.)
                if (marque.length > existing.label.length) {
                    existing.label = marque;
                }
            } else {
                brandsMap.set(normalized, {
                    label: marque,
                    norm: normalized,
                    count: 1
                });
            }
        });

        // Convertir en tableau et trier alphabétiquement
        const brands = Array.from(brandsMap.values())
            .sort((a, b) => a.label.localeCompare(b.label, 'fr'));

        console.log(`✅ ${brands.length} marques extraites du cache (${cachedData.items.length} produits)`);

        res.json({
            success: true,
            data: brands
        });

    } catch (error) {
        console.error('[ERREUR] ❌ Erreur lors de la récupération des marques:', error);
        
        res.status(500).json({
            success: false,
            error: 'Erreur serveur',
            message: 'Impossible de récupérer les marques.'
        });
    }
});

// ============================================
// 📍 ROUTE : GET /api/products/cache-info
// Informations sur l'état du cache fichier
// ============================================

router.get('/cache-info', async (req, res) => {
    console.log('[INFO] ℹ️ Requête d\'informations cache...');

    try {
        const info = await fileCache.getInfo();
        
        res.json({
            success: true,
            cache: info
        });

    } catch (error) {
        console.error('[ERREUR] ❌ Erreur récupération info cache:', error);
        
        res.status(500).json({
            success: false,
            error: 'Erreur serveur',
            message: 'Impossible de récupérer les informations du cache.'
        });
    }
});

// ============================================
// 📍 ROUTE : POST /api/products/refresh-cache
// Force le rafraîchissement du cache (admin uniquement)
// ============================================

router.post('/refresh-cache', async (req, res) => {
    console.log('[INFO] 🔄 Demande de rafraîchissement du cache...');

    try {
        // 1. Vider le cache actuel
        await fileCache.clear();
        
        // 2. Récupérer les nouvelles données (TOUS les produits)
        const data = await fetchFromGoogleAppsScript({ limit: 50000, offset: 0 });
        
        // 3. Sauvegarder dans le cache
        await fileCache.set(data);

        res.json({
            success: true,
            message: 'Cache rafraîchi avec succès',
            productsCount: data.items?.length || 0
        });

    } catch (error) {
        console.error('[ERREUR] ❌ Erreur lors du rafraîchissement du cache:', error);
        
        res.status(500).json({
            success: false,
            error: 'Erreur serveur',
            message: 'Impossible de rafraîchir le cache.'
        });
    }
});

// ============================================
// EXPORTS
// ============================================

module.exports = router;