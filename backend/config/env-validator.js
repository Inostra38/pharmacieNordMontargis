// ==========================================
// VALIDATEUR DE VARIABLES D'ENVIRONNEMENT
// Validation simple "maison" sans dépendances
// ==========================================

/**
 * Liste des variables d'environnement REQUISES
 * Le serveur refusera de démarrer si l'une d'elles manque
 */
const REQUIRED_ENV_VARS = [
  'MAILGUN_API_KEY',
  'MAILGUN_DOMAIN',
  'MAILGUN_API_HOST',
  'RECIPIENT_EMAIL',
  'FROM_EMAIL',
  'NODE_ENV',
  'PORT'
];

/**
 * Valide que toutes les variables d'environnement requises sont présentes
 * @returns {Object} Configuration validée
 * @throws {Error} Si une variable manque
 */
function validateEnv() {
  console.log('🔍 Vérification des variables d\'environnement...');
  
  const missingVars = [];
  const emptyVars = [];
  
  // Vérifier chaque variable requise
  REQUIRED_ENV_VARS.forEach(varName => {
    const value = process.env[varName];
    
    // Variable inexistante
    if (value === undefined) {
      missingVars.push(varName);
    }
    // Variable vide
    else if (value.trim() === '') {
      emptyVars.push(varName);
    }
  });
  
  // Si des variables manquent ou sont vides
  if (missingVars.length > 0 || emptyVars.length > 0) {
    console.error('\n═══════════════════════════════════════════════════');
    console.error('❌ ERREUR CRITIQUE - Configuration invalide');
    console.error('═══════════════════════════════════════════════════\n');
    
    if (missingVars.length > 0) {
      console.error('Variables MANQUANTES :');
      missingVars.forEach(varName => {
        console.error(`  ❌ ${varName}`);
      });
      console.error('');
    }
    
    if (emptyVars.length > 0) {
      console.error('Variables VIDES :');
      emptyVars.forEach(varName => {
        console.error(`  ⚠️  ${varName}`);
      });
      console.error('');
    }
    
    console.error('📝 SOLUTION :');
    console.error('  1. Vérifiez que le fichier .env existe dans /backend');
    console.error('  2. Copiez .env.example si nécessaire : cp .env.example .env');
    console.error('  3. Remplissez toutes les valeurs requises');
    console.error('  4. Redémarrez le serveur\n');
    console.error('═══════════════════════════════════════════════════\n');
    
    // ⚠️ ARRÊT DU SERVEUR
    process.exit(1);
  }
  
  // Tout est OK
  console.log('✅ Configuration valide - Toutes les variables sont présentes\n');
  
  // Afficher un résumé (sans révéler les valeurs sensibles)
  console.log('📋 Résumé de la configuration :');
  console.log(`   - Environment : ${process.env.NODE_ENV}`);
  console.log(`   - Port : ${process.env.PORT}`);
  console.log(`   - Mailgun Domain : ${process.env.MAILGUN_DOMAIN}`);
  console.log(`   - Mailgun API : ${process.env.MAILGUN_API_KEY ? '✅ Configurée' : '❌ Manquante'}`);
  console.log(`   - Recipient Email : ${process.env.RECIPIENT_EMAIL}`);
  console.log('');
  
  // Retourner la configuration pour utilisation
  return {
    nodeEnv: process.env.NODE_ENV,
    port: parseInt(process.env.PORT, 10),
    mailgun: {
      apiKey: process.env.MAILGUN_API_KEY,
      domain: process.env.MAILGUN_DOMAIN,
      apiHost: process.env.MAILGUN_API_HOST
    },
    emails: {
      recipient: process.env.RECIPIENT_EMAIL,
      from: process.env.FROM_EMAIL
    }
  };
}

/**
 * Vérification optionnelle : Afficher un avertissement pour les valeurs par défaut
 */
function checkDefaultValues() {
  const warnings = [];
  
  // Vérifier les valeurs "example" qui n'ont pas été changées
  if (process.env.MAILGUN_API_KEY && process.env.MAILGUN_API_KEY.includes('your-')) {
    warnings.push('MAILGUN_API_KEY contient encore une valeur d\'exemple');
  }
  
  if (process.env.MAILGUN_DOMAIN && process.env.MAILGUN_DOMAIN.includes('votredomaine')) {
    warnings.push('MAILGUN_DOMAIN contient encore une valeur d\'exemple');
  }
  
  if (warnings.length > 0) {
    console.warn('\n⚠️  AVERTISSEMENTS :');
    warnings.forEach(warning => {
      console.warn(`   - ${warning}`);
    });
    console.warn('   Assurez-vous d\'avoir mis vos vraies valeurs !\n');
  }
}

// Export de la fonction de validation
module.exports = {
  validateEnv,
  checkDefaultValues
};