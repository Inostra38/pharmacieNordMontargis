// ==========================================
// File System Cache - Module de cache fichier
// TTL: 2 heures (produits mis à jour 1x/jour)
// ==========================================

const fs = require('fs').promises;
const path = require('path');

// Configuration
const CACHE_DIR = path.join(__dirname, '../cache');
const CACHE_FILE = path.join(CACHE_DIR, 'products-cache.json');
const CACHE_TTL = 2 * 60 * 60 * 1000; // 2 heures en millisecondes

class FileCache {
    constructor() {
        this.initCache();
    }

    /**
     * Initialiser le répertoire cache
     */
    async initCache() {
        try {
            await fs.mkdir(CACHE_DIR, { recursive: true });
            console.log('✅ Répertoire cache initialisé:', CACHE_DIR);
        } catch (error) {
            console.error('❌ Erreur création répertoire cache:', error);
        }
    }

    /**
     * Récupérer les produits depuis le cache fichier
     * @returns {Object|null} Les données cachées ou null si expiré/inexistant
     */
    async get() {
        try {
            // Vérifier si le fichier existe
            const stats = await fs.stat(CACHE_FILE);
            const now = Date.now();
            const age = now - stats.mtimeMs;
            
            // Vérifier si le cache est encore valide (< 2h)
            if (age < CACHE_TTL) {
                const data = await fs.readFile(CACHE_FILE, 'utf8');
                const parsed = JSON.parse(data);
                
                const ageMinutes = Math.round(age / 1000 / 60);
                const remainingMinutes = Math.round((CACHE_TTL - age) / 1000 / 60);
                
                console.log(`✅ Cache fichier valide`);
                console.log(`   Age: ${ageMinutes} min`);
                console.log(`   Expire dans: ${remainingMinutes} min`);
                console.log(`   Produits: ${parsed.items?.length || 0}`);
                
                return parsed;
            }
            
            // Cache expiré
            const ageMinutes = Math.round(age / 1000 / 60);
            console.log(`⏰ Cache fichier expiré (age: ${ageMinutes} min)`);
            return null;
            
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.log('📭 Aucun cache fichier trouvé (première utilisation)');
            } else {
                console.error('❌ Erreur lecture cache fichier:', error.message);
            }
            return null;
        }
    }

    /**
     * Sauvegarder les produits dans le cache fichier
     * @param {Object} data Les données à cacher
     * @returns {boolean} true si succès
     */
    async set(data) {
        try {
            // S'assurer que le répertoire existe
            await fs.mkdir(CACHE_DIR, { recursive: true });
            
            // Écrire les données
            await fs.writeFile(
                CACHE_FILE, 
                JSON.stringify(data, null, 2),
                'utf8'
            );
            
            // Calculer la taille du fichier
            const stats = await fs.stat(CACHE_FILE);
            const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
            
            console.log('💾 Cache fichier sauvegardé');
            console.log(`   Taille: ${sizeMB} MB`);
            console.log(`   Produits: ${data.items?.length || 0}`);
            console.log(`   Expire dans: 2 heures`);
            
            return true;
            
        } catch (error) {
            console.error('❌ Erreur sauvegarde cache fichier:', error);
            return false;
        }
    }

    /**
     * Vider le cache fichier
     * @returns {boolean} true si succès
     */
    async clear() {
        try {
            await fs.unlink(CACHE_FILE);
            console.log('🗑️ Cache fichier supprimé');
            return true;
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.log('ℹ️ Aucun cache à supprimer');
                return true;
            }
            console.error('❌ Erreur suppression cache fichier:', error);
            return false;
        }
    }

    /**
     * Obtenir les informations sur le cache
     * @returns {Object|null} Métadonnées du cache
     */
    async getInfo() {
        try {
            const stats = await fs.stat(CACHE_FILE);
            const now = Date.now();
            const age = now - stats.mtimeMs;
            const isValid = age < CACHE_TTL;
            
            return {
                exists: true,
                valid: isValid,
                ageMinutes: Math.round(age / 1000 / 60),
                remainingMinutes: isValid ? Math.round((CACHE_TTL - age) / 1000 / 60) : 0,
                sizeMB: (stats.size / (1024 * 1024)).toFixed(2),
                createdAt: new Date(stats.mtimeMs).toISOString()
            };
        } catch (error) {
            return {
                exists: false,
                valid: false
            };
        }
    }
}

// Exporter une instance unique (singleton)
module.exports = new FileCache();