// ==========================================
// Script d'initialisation du cache
// Exécuté au démarrage par Clever Cloud
// ==========================================

const fileCache = require('./cache/file-cache');
require('dotenv').config();

// Configuration
const REQUEST_TIMEOUT = 60000; // 60 secondes
const GOOGLE_APPS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_URL;

/**
 * Récupérer TOUS les produits depuis Google Apps Script
 */
async function fetchFromGoogleAppsScript() {
    if (!GOOGLE_APPS_SCRIPT_URL) {
        throw new Error('❌ Variable GOOGLE_APPS_SCRIPT_URL manquante');
    }

    // Construire l'URL pour récupérer TOUS les produits
    const url = new URL(GOOGLE_APPS_SCRIPT_URL);
    url.searchParams.append('backend', '1');    // Paramètre spécial backend
    url.searchParams.append('limit', '50000');  // Limite très élevée
    url.searchParams.append('offset', '0');

    console.log('📡 Récupération des produits depuis Google Apps Script...');

    // Créer un AbortController pour le timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
        const startTime = Date.now();
        
        const response = await fetch(url.toString(), {
            method: 'GET',
            redirect: 'follow',
            headers: {
                'User-Agent': 'Pharmacie-Nord-Init-Cache/1.0'
            },
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const loadTime = ((Date.now() - startTime) / 1000).toFixed(2);
        
        console.log(`✅ Réception terminée en ${loadTime}s`);
        console.log(`📦 ${data.items?.length || 0} produits récupérés`);

        return data;

    } catch (error) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
            throw new Error(`⏰ Timeout après ${REQUEST_TIMEOUT / 1000}s`);
        }
        
        throw error;
    }
}

/**
 * Initialiser le cache au démarrage
 */
async function initCache() {
    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log('🚀 INITIALISATION DU CACHE AU DÉMARRAGE');
    console.log('═══════════════════════════════════════════════════');
    console.log('');

    const startTime = Date.now();

    try {
        // 1. Vérifier si un cache valide existe déjà
        const existingCache = await fileCache.get();
        
        if (existingCache) {
            const cacheInfo = await fileCache.getInfo();
            console.log('✅ Cache existant trouvé et valide');
            console.log(`   📦 ${existingCache.items?.length || 0} produits`);
            console.log(`   ⏰ Âge: ${cacheInfo.ageMinutes} minutes`);
            console.log('   ℹ️  Initialisation rapide - aucun rechargement nécessaire');
            console.log('');
            console.log('═══════════════════════════════════════════════════');
            return true;
        }

        // 2. Cache vide ou expiré - Récupérer les données
        console.log('⚠️  Aucun cache valide trouvé');
        console.log('🔄 Chargement initial des produits...');
        console.log('');

        const data = await fetchFromGoogleAppsScript();

        // 3. Valider les données
        if (!data || !data.items || !Array.isArray(data.items)) {
            throw new Error('❌ Format de données invalide reçu de l\'API');
        }

        // 4. Sauvegarder dans le cache
        console.log('💾 Sauvegarde dans le cache fichier...');
        const success = await fileCache.set(data);

        if (!success) {
            throw new Error('❌ Échec de la sauvegarde du cache');
        }

        // 5. Résumé
        const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
        
        console.log('');
        console.log('✅ INITIALISATION DU CACHE RÉUSSIE !');
        console.log(`   📦 Produits: ${data.items.length}`);
        console.log(`   ⚡ Temps total: ${totalTime}s`);
        console.log(`   💾 Cache valide pour: 2 heures`);
        console.log('');
        console.log('═══════════════════════════════════════════════════');
        
        return true;

    } catch (error) {
        const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
        
        console.error('');
        console.error('═══════════════════════════════════════════════════');
        console.error('❌ ÉCHEC DE L\'INITIALISATION DU CACHE');
        console.error('═══════════════════════════════════════════════════');
        console.error(`   Erreur: ${error.message}`);
        console.error(`   Temps écoulé: ${totalTime}s`);
        console.error('');
        console.error('⚠️  ATTENTION :');
        console.error('   - Le serveur démarrera quand même');
        console.error('   - Le cache se remplira à la première requête utilisateur');
        console.error('   - La première visite sera plus lente (~10-30s)');
        console.error('');
        console.error('═══════════════════════════════════════════════════');
        
        // Ne pas bloquer le démarrage du serveur
        // L'erreur est loggée mais on retourne true
        return false;
    }
}

// ============================================
// EXÉCUTION
// ============================================

// Exécuter l'initialisation
initCache()
    .then((success) => {
        console.log('');
        if (success) {
            console.log('🎉 Script init-cache.js terminé avec succès');
        } else {
            console.log('⚠️  Script init-cache.js terminé avec avertissements');
        }
        console.log('📌 Le serveur peut maintenant démarrer...');
        console.log('');
        process.exit(0); // Quitter avec succès
    })
    .catch((error) => {
        console.error('');
        console.error('💥 ERREUR FATALE dans init-cache.js:', error);
        console.error('');
        // Quitter avec code 0 pour ne pas bloquer le déploiement
        process.exit(0);
    });