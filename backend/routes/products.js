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
// ⚙️ CONFIGURATION
// ============================================

const REQUEST_TIMEOUT = 60000; // 60 secondes

// ============================================
// 🔄 FONCTION DE RÉCUPÉRATION DEPUIS GOOGLE APPS SCRIPT (avec timeout)
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

    // ✅ NOUVEAU : Créer un AbortController pour le timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
        const response = await fetch(url.toString(), {
            method: 'GET',
            redirect: 'follow',
            headers: {
                'User-Agent': 'Pharmacie-Nord-Backend/1.0'
            },
            signal: controller.signal // ✅ Ajout du signal pour timeout
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`Erreur Google Apps Script: ${response.status}`);
        }

        const data = await response.json();
        const loadTime = Date.now() - startTime;

        console.log(`✅ Données reçues en ${loadTime}ms`);
        console.log(`📦 ${data.items?.length || 0} produits`);

        return data;

    } catch (error) {
        clearTimeout(timeoutId);
        
        // ✅ NOUVEAU : Gestion spécifique du timeout
        if (error.name === 'AbortError') {
            throw new Error(`Timeout après ${REQUEST_TIMEOUT / 1000}s`);
        }
        
        throw error;
    }
}

// ============================================
// 🛡️ FONCTION CENTRALISÉE : FALLBACK AUTOMATIQUE
// Assure que le cache est toujours chargé
// ============================================

/**
 * 🔄 FALLBACK AUTOMATIQUE : Assure que le cache serveur est chargé
 * 
 * Logique :
 * 1. Vérifie si le cache serveur est valide
 * 2. Si OUI → retourne les données du cache
 * 3. Si NON (expiré/vide) → FALLBACK :
 *    - Récupère depuis Google Apps Script
 *    - Met à jour le cache serveur
 *    - Retourne les données fraîches
 * 
 * @returns {Object} Les données des produits (depuis cache ou Apps Script)
 * @throws {Error} Si impossible de récupérer les données
 */
async function ensureCacheLoaded() {
    // 1. Vérifier le cache serveur
    let cachedData = await fileCache.get();
    
    if (cachedData) {
        console.log('✅ Cache serveur valide trouvé');
        const cacheInfo = await fileCache.getInfo();
        console.log(`📊 Cache: ${cachedData.items?.length || 0} produits (âge: ${cacheInfo.ageMinutes}min)`);
        return cachedData;
    }
    
    // 2. FALLBACK : Cache expiré ou vide
    console.log('⚠️ Cache serveur expiré ou vide - ACTIVATION FALLBACK');
    console.log('🔄 Récupération depuis Google Apps Script...');
    
    try {
        // Récupérer TOUS les produits
        // ✅ CORRECTION : Ajout du paramètre backend=1
        const data = await fetchFromGoogleAppsScript({ 
            backend: '1',    // ✅ Paramètre spécial pour récupérer TOUS les produits
            limit: 50000, 
            offset: 0 
        });
        
        // Valider les données
        if (!data || !data.items || !Array.isArray(data.items)) {
            throw new Error('Format de données invalide reçu de Google Apps Script');
        }
        
        // 3. Mettre à jour le cache serveur
        console.log('💾 Mise à jour du cache serveur...');
        await fileCache.set(data);
        console.log(`✅ Cache serveur rechargé avec succès (${data.items.length} produits)`);
        
        return data;
        
    } catch (error) {
        console.error('❌ ERREUR FALLBACK:', error.message);
        throw new Error(`Impossible de charger les produits: ${error.message}`);
    }
}

// ============================================
// 📍 ROUTE : GET /api/products
// Récupère tous les produits (avec cache fichier + pagination)
// ============================================

router.get('/', async (req, res) => {
    console.log('[INFO] 📦 Requête de récupération des produits...');

    try {
        // Récupérer les paramètres de pagination
        const limit = parseInt(req.query.limit) || 500;
        const offset = parseInt(req.query.offset) || 0;
        
        console.log(`📊 Pagination demandée: limit=${limit}, offset=${offset}`);
        
        // ✅ NOUVEAU : Utilisation du fallback automatique
        const data = await ensureCacheLoaded();
        const cacheInfo = await fileCache.getInfo();
        
        // Appliquer la pagination sur les données
        const allItems = data.items || [];
        const paginatedItems = allItems.slice(offset, offset + limit);
        
        console.log(`📦 Retour de ${paginatedItems.length} produits (offset: ${offset}, total: ${allItems.length})`);
        
        res.json({
            success: true,
            data: {
                items: paginatedItems,
                total: allItems.length,
                updatedAt: data.updatedAt,
                stockUpdatedAt: data.stockUpdatedAt,
                cached: true
            },
            cached: true,
            cacheAge: cacheInfo.ageMinutes,
            expiresIn: cacheInfo.remainingMinutes
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
// 📍 ROUTE : GET /api/products/brands
// Récupère la liste des marques DEPUIS LE CACHE LOCAL
// ============================================

router.get('/brands', async (req, res) => {
    console.log('[INFO] 🏷️ Requête de récupération des marques...');

    try {
        // ✅ NOUVEAU : Utilisation du fallback automatique
        const data = await ensureCacheLoaded();
        
        if (!data || !data.items) {
            return res.json({
                success: true,
                data: []
            });
        }

        // Construire la map des marques avec compteur
        const brandsMap = new Map();
        
        data.items.forEach(product => {
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

        console.log(`✅ ${brands.length} marques extraites (${data.items.length} produits)`);

        res.json({
            success: true,
            data: brands
        });

    } catch (error) {
        console.error('[ERREUR] ❌ Erreur lors de la récupération des marques:', error);
        
        res.status(500).json({
            success: false,
            error: 'Erreur serveur',
            message: 'Impossible de récupérer les marques. Veuillez réessayer plus tard.'
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
        // ✅ NOUVEAU : Utilisation du fallback automatique
        const data = await ensureCacheLoaded();
        
        if (!data || !data.items) {
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
        
        for (const product of data.items) {
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

        console.log(`✅ ${homeItems.length} produits home extraits (${data.items.length} produits total)`);

        res.json({
            success: true,
            data: {
                items: homeItems,
                updatedAt: data.updatedAt || new Date().toISOString(),
                stockUpdatedAt: data.stockUpdatedAt || new Date().toISOString()
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
        // ✅ CORRECTION : Ajout du paramètre backend=1
        const data = await fetchFromGoogleAppsScript({ 
            backend: '1',    // ✅ Paramètre spécial pour récupérer TOUS les produits
            limit: 50000, 
            offset: 0 
        });
        
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