// ==========================================
// Routes Cache - Diagnostic et monitoring
// ==========================================

const express = require('express');
const router = express.Router();
const fileCache = require('../cache/file-cache');
const cacheScheduler = require('../cache/cache-scheduler');

// ============================================
// 📍 ROUTE : GET /api/cache/status
// Informations complètes sur l'état du cache et du scheduler
// (NE fait AUCUN appel à Google Apps Script)
// ============================================

router.get('/status', async (req, res) => {
    console.log('[INFO] 📊 Requête de statut du cache...');

    try {
        // 1. Récupérer les informations du cache fichier
        const cacheInfo = await fileCache.getInfo();
        
        // 2. Récupérer les statistiques du scheduler
        const schedulerStats = cacheScheduler.getStats();
        
        // 3. Lire le cache pour obtenir le nombre de produits (si disponible)
        let productsCount = null;
        const cachedData = await fileCache.get();
        if (cachedData && cachedData.items) {
            productsCount = cachedData.items.length;
        }

        // 4. Construire la réponse complète
        const response = {
            success: true,
            timestamp: new Date().toISOString(),
            scheduler: {
                isRunning: schedulerStats.isRunning,
                schedule: schedulerStats.schedule,
                scheduleDescription: 'Toutes les 4h (00:00, 04:00, 08:00, 12:00, 16:00, 20:00)',
                nextRefresh: schedulerStats.nextRefresh
            },
            cache: {
                exists: cacheInfo.exists,
                valid: cacheInfo.valid,
                ageMinutes: cacheInfo.ageMinutes || null,
                remainingMinutes: cacheInfo.remainingMinutes || null,
                sizeMB: cacheInfo.sizeMB || null,
                productsCount: productsCount,
                lastUpdate: cacheInfo.createdAt || null,
                ttl: '2 heures'
            },
            statistics: {
                totalRefreshes: schedulerStats.totalRefreshes,
                successCount: schedulerStats.successCount,
                errorCount: schedulerStats.errorCount,
                successRate: schedulerStats.totalRefreshes > 0 
                    ? `${((schedulerStats.successCount / schedulerStats.totalRefreshes) * 100).toFixed(1)}%`
                    : 'N/A',
                consecutiveErrors: schedulerStats.consecutiveErrors,
                lastRefresh: schedulerStats.lastRefresh,
                lastSuccess: schedulerStats.lastSuccess,
                lastError: schedulerStats.lastError,
                lastErrorMessage: schedulerStats.lastErrorMessage,
                averageRefreshTimeSec: schedulerStats.averageRefreshTimeSec
            }
        };

        // 5. Log et retour
        console.log('✅ Statut du cache récupéré avec succès');
        res.json(response);

    } catch (error) {
        console.error('[ERREUR] ❌ Erreur lors de la récupération du statut:', error);
        
        res.status(500).json({
            success: false,
            error: 'Erreur serveur',
            message: 'Impossible de récupérer le statut du cache.',
            details: error.message
        });
    }
});

// ============================================
// 📍 ROUTE : POST /api/cache/force-refresh
// Force un rafraîchissement manuel du cache (admin)
// ============================================

router.post('/force-refresh', async (req, res) => {
    console.log('[INFO] 🔧 Demande de rafraîchissement manuel...');

    try {
        // Déclencher un rafraîchissement manuel
        await cacheScheduler.forceRefresh();

        res.json({
            success: true,
            message: 'Rafraîchissement manuel déclenché avec succès',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('[ERREUR] ❌ Erreur lors du rafraîchissement manuel:', error);
        
        res.status(500).json({
            success: false,
            error: 'Erreur serveur',
            message: 'Impossible de forcer le rafraîchissement.',
            details: error.message
        });
    }
});

// ============================================
// EXPORTS
// ============================================

module.exports = router;