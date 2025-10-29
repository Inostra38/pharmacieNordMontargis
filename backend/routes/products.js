const express = require('express');
const router = express.Router();

// ============================================
// 🔍 VALIDATION DES VARIABLES D'ENVIRONNEMENT
// ============================================

if (!process.env.GOOGLE_APPS_SCRIPT_URL) {
    console.error('❌ ERREUR CRITIQUE [products.js] - Variable GOOGLE_APPS_SCRIPT_URL manquante dans .env');
    console.error('⚠️  Le module products.js ne pourra pas récupérer les produits !');
}

// ============================================
// 💾 CACHE SERVEUR (10 minutes)
// ============================================

class ProductCache {
    constructor() {
        this.cache = null;
        this.timestamp = null;
        this.TTL = 10 * 60 * 1000; // 10 minutes en millisecondes
    }

    isValid() {
        if (!this.cache || !this.timestamp) return false;
        return (Date.now() - this.timestamp) < this.TTL;
    }

    set(data) {
        this.cache = data;
        this.timestamp = Date.now();
        console.log('💾 Cache produits mis à jour');
    }

    get() {
        if (this.isValid()) {
            const age = Math.round((Date.now() - this.timestamp) / 1000);
            console.log(`✅ Cache valide (age: ${age}s)`);
            return this.cache;
        }
        console.log('⏰ Cache expiré ou vide');
        return null;
    }

    clear() {
        this.cache = null;
        this.timestamp = null;
        console.log('🗑️ Cache produits vidé');
    }
}

const productCache = new ProductCache();

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
// Récupère tous les produits (avec cache)
// ============================================

router.get('/', async (req, res) => {
    console.log('[INFO] 📦 Requête de récupération des produits...');

    try {
        // Vérifier le cache d'abord
        const cachedData = productCache.get();
        
        if (cachedData) {
            return res.json({
                success: true,
                data: cachedData,
                cached: true,
                cacheAge: Math.round((Date.now() - productCache.timestamp) / 1000)
            });
        }

        // Si pas de cache, récupérer depuis Google Apps Script
        const params = {
            limit: req.query.limit || 1000,
            offset: req.query.offset || 0
        };

        if (req.query.q) params.q = req.query.q;
        if (req.query.featured) params.featured = req.query.featured;

        const data = await fetchFromGoogleAppsScript(params);

        // Mettre en cache
        productCache.set(data);

        res.json({
            success: true,
            data: data,
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
// Produits optimisés pour la page d'accueil
// ============================================

router.get('/home', async (req, res) => {
    console.log('[INFO] 🏠 Requête de produits pour la page d\'accueil...');

    try {
        // Pas de cache pour la page d'accueil (toujours fresh)
        const data = await fetchFromGoogleAppsScript({ home: 1 });

        res.json({
            success: true,
            data: data
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
// Récupère la liste des marques
// ============================================

router.get('/brands', async (req, res) => {
    console.log('[INFO] 🏷️ Requête de récupération des marques...');

    try {
        const data = await fetchFromGoogleAppsScript({ brands: 1 });

        res.json({
            success: true,
            data: data.brands || []
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
// 📍 ROUTE : POST /api/products/refresh-cache
// Force le rafraîchissement du cache (admin uniquement)
// ============================================

router.post('/refresh-cache', async (req, res) => {
    console.log('[INFO] 🔄 Demande de rafraîchissement du cache...');

    try {
        productCache.clear();
        
        const data = await fetchFromGoogleAppsScript({});
        productCache.set(data);

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