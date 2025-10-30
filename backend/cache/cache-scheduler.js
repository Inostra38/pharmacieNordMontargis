// ==========================================
// Cache Scheduler - Rafraîchissement automatique
// Fréquence : Toutes les 4h (00:00, 04:00, 08:00, 12:00, 16:00, 20:00)
// ==========================================

const cron = require('node-cron');
const fileCache = require('./file-cache');
require('dotenv').config();

class CacheScheduler {
    constructor() {
        this.job = null;
        this.isRunning = false;
        
        // Configuration
        this.SCHEDULE = '0 0,4,8,12,16,20 * * *'; // Toutes les 4h à partir de minuit
        this.REQUEST_TIMEOUT = 60000; // 60 secondes
        this.MAX_CONSECUTIVE_ERRORS = 3;
        
        // Statistiques
        this.stats = {
            lastRefresh: null,
            lastSuccess: null,
            lastError: null,
            lastErrorMessage: null,
            totalRefreshes: 0,
            successCount: 0,
            errorCount: 0,
            consecutiveErrors: 0,
            averageRefreshTime: 0,
            totalProductsLastRefresh: 0
        };
        
        console.log('✅ CacheScheduler initialisé');
    }

    /**
     * Démarrer le cron job (sans rafraîchir immédiatement)
     */
    start() {
        if (this.isRunning) {
            console.warn('⚠️ Le scheduler est déjà en cours d\'exécution');
            return;
        }

        console.log('═══════════════════════════════════════════════════');
        console.log('🚀 DÉMARRAGE DU CACHE SCHEDULER');
        console.log('═══════════════════════════════════════════════════');
        console.log('⏰ Fréquence : Toutes les 4h (00:00, 04:00, 08:00, 12:00, 16:00, 20:00)');
        console.log('📅 Pattern cron :', this.SCHEDULE);
        console.log('🔄 Premier rafraîchissement :', this.getNextRefresh());
        console.log('═══════════════════════════════════════════════════');

        this.job = cron.schedule(this.SCHEDULE, async () => {
            await this.refreshCache();
        });

        this.isRunning = true;
    }

    /**
     * Arrêter le cron job
     */
    stop() {
        if (!this.isRunning || !this.job) {
            console.warn('⚠️ Le scheduler n\'est pas en cours d\'exécution');
            return;
        }

        this.job.stop();
        this.isRunning = false;
        console.log('🛑 Cache scheduler arrêté');
    }

    /**
     * Effectuer le rafraîchissement du cache
     */
    async refreshCache() {
        const startTime = Date.now();
        
        console.log('');
        console.log('═══════════════════════════════════════════════════');
        console.log('🔄 RAFRAÎCHISSEMENT AUTOMATIQUE DU CACHE');
        console.log('═══════════════════════════════════════════════════');
        console.log('🕐 Heure :', new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }));

        this.stats.lastRefresh = new Date().toISOString();
        this.stats.totalRefreshes++;

        try {
            // Vérifier que l'URL Google Apps Script est configurée
            if (!process.env.GOOGLE_APPS_SCRIPT_URL) {
                throw new Error('URL Google Apps Script non configurée');
            }

            // Récupérer les données depuis Google Apps Script
            console.log('📡 Récupération depuis Google Apps Script...');
            const data = await this.fetchFromGoogleAppsScript();

            // Valider les données
            if (!data || !data.items || !Array.isArray(data.items)) {
                throw new Error('Format de données invalide reçu de Google Apps Script');
            }

            // Mettre à jour le cache fichier
            console.log('💾 Mise à jour du cache fichier...');
            const success = await fileCache.set(data);

            if (!success) {
                throw new Error('Échec de la sauvegarde du cache fichier');
            }

            // Calculer le temps d'exécution
            const refreshTime = Date.now() - startTime;
            const refreshTimeSec = (refreshTime / 1000).toFixed(2);

            // Mise à jour des statistiques de succès
            this.stats.lastSuccess = new Date().toISOString();
            this.stats.successCount++;
            this.stats.consecutiveErrors = 0; // Reset des erreurs consécutives
            this.stats.totalProductsLastRefresh = data.items.length;
            
            // Calcul de la moyenne du temps de rafraîchissement
            if (this.stats.averageRefreshTime === 0) {
                this.stats.averageRefreshTime = refreshTime;
            } else {
                this.stats.averageRefreshTime = (this.stats.averageRefreshTime + refreshTime) / 2;
            }

            console.log('✅ RAFRAÎCHISSEMENT RÉUSSI');
            console.log(`   📦 Produits : ${data.items.length}`);
            console.log(`   ⏱️  Temps : ${refreshTimeSec}s`);
            console.log(`   📊 Succès : ${this.stats.successCount}/${this.stats.totalRefreshes}`);
            console.log('   ⏰ Prochain :', this.getNextRefresh());
            console.log('═══════════════════════════════════════════════════');

        } catch (error) {
            // Gestion d'erreur
            const refreshTime = Date.now() - startTime;
            const refreshTimeSec = (refreshTime / 1000).toFixed(2);

            this.stats.lastError = new Date().toISOString();
            this.stats.lastErrorMessage = error.message;
            this.stats.errorCount++;
            this.stats.consecutiveErrors++;

            console.error('❌ ÉCHEC DU RAFRAÎCHISSEMENT');
            console.error('   Message :', error.message);
            console.error(`   ⏱️  Temps écoulé : ${refreshTimeSec}s`);
            console.error(`   📊 Échecs : ${this.stats.errorCount}/${this.stats.totalRefreshes}`);
            console.error(`   🔴 Erreurs consécutives : ${this.stats.consecutiveErrors}`);

            // Alerte si trop d'erreurs consécutives
            if (this.stats.consecutiveErrors >= this.MAX_CONSECUTIVE_ERRORS) {
                console.error('');
                console.error('🚨 ALERTE CRITIQUE 🚨');
                console.error(`   ${this.MAX_CONSECUTIVE_ERRORS} échecs consécutifs détectés !`);
                console.error('   Le cache n\'a pas été mis à jour depuis longtemps.');
                console.error('   Veuillez vérifier Google Apps Script et la connectivité.');
                console.error('');
            }

            console.log('   ℹ️  L\'ancien cache reste actif');
            console.log('   ⏰ Nouvelle tentative :', this.getNextRefresh());
            console.log('═══════════════════════════════════════════════════');
        }
    }

    /**
     * Récupérer TOUS les produits depuis Google Apps Script en un seul appel
     * Note : Google Apps Script peut renvoyer tous les produits d'un coup.
     *        La pagination est uniquement utilisée côté frontend pour l'UX.
     */
    async fetchFromGoogleAppsScript() {
        const baseUrl = process.env.GOOGLE_APPS_SCRIPT_URL;
        
        if (!baseUrl) {
            throw new Error('URL Google Apps Script non configurée');
        }

        // Construire l'URL pour récupérer TOUS les produits
        const url = new URL(baseUrl);
        url.searchParams.append('backend', '1');    // ✅ Paramètre spécial pour désactiver la limite
        url.searchParams.append('limit', '50000');  // Limite très élevée pour tout récupérer
        url.searchParams.append('offset', '0');

        console.log('📡 Récupération de tous les produits depuis Google Apps Script...');

        // Créer un AbortController pour le timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT);

        try {
            const startTime = Date.now();
            
            const response = await fetch(url.toString(), {
                method: 'GET',
                redirect: 'follow',
                headers: {
                    'User-Agent': 'Pharmacie-Nord-Backend-Scheduler/1.0'
                },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            const loadTime = ((Date.now() - startTime) / 1000).toFixed(2);
            
            const productsCount = data.items?.length || 0;
            console.log(`✅ Réception terminée en ${loadTime}s - ${productsCount} produits`);

            return data;

        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                throw new Error(`Timeout après ${this.REQUEST_TIMEOUT / 1000}s`);
            }
            
            throw error;
        }
    }

    /**
     * Obtenir les statistiques complètes
     */
    getStats() {
        return {
            ...this.stats,
            isRunning: this.isRunning,
            schedule: this.SCHEDULE,
            nextRefresh: this.getNextRefresh(),
            averageRefreshTimeSec: (this.stats.averageRefreshTime / 1000).toFixed(2)
        };
    }

    /**
     * Calculer le prochain rafraîchissement
     */
    getNextRefresh() {
        const now = new Date();
        const hours = [0, 4, 8, 12, 16, 20];
        
        let nextHour = hours.find(h => h > now.getHours());
        
        // Si on est après 20h, le prochain sera à 00h le lendemain
        if (!nextHour) {
            nextHour = 0;
            now.setDate(now.getDate() + 1);
        }
        
        now.setHours(nextHour, 0, 0, 0);
        
        return now.toLocaleString('fr-FR', { 
            timeZone: 'Europe/Paris',
            dateStyle: 'short',
            timeStyle: 'short'
        });
    }

    /**
     * Forcer un rafraîchissement manuel (pour tests ou admin)
     */
    async forceRefresh() {
        console.log('🔧 Rafraîchissement manuel forcé...');
        await this.refreshCache();
    }
}

// Exporter une instance unique (singleton)
module.exports = new CacheScheduler();