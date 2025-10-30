// ==========================================
// MIDDLEWARE CSRF - PROTECTION ULTRA-SÉCURISÉE
// Avec liste blanche pour routes non-sensibles
// ==========================================

const csrf = require('csurf');

/**
 * Configuration CSRF ultra-sécurisée
 */
const csrfProtection = csrf({
  cookie: {
    key: '_csrf',
    httpOnly: true,           // ✅ Impossible d'accéder via JavaScript
    secure: process.env.NODE_ENV === 'production', // ✅ HTTPS uniquement en prod
    sameSite: 'strict',       // ✅ Protection contre CSRF via navigation
    maxAge: 15 * 60 * 1000    // ✅ Expire après 15 minutes
  },
  value: (req) => {
    // Chercher le token dans les headers (priorité)
    return req.headers['csrf-token'] || 
           req.headers['x-csrf-token'] || 
           req.body._csrf;
  }
});

/**
 * ✅ NOUVEAU : Liste blanche des routes qui ne nécessitent pas de protection CSRF
 * Ces routes sont en lecture seule et non-sensibles
 * 
 * IMPORTANT : Les chemins sont RELATIFS au router monté
 * Exemple : Si monté sur /api/products, alors /cache-info = /api/products/cache-info
 */
const CSRF_WHITELIST = [
  '/cache-info',       // Route: /api/products/cache-info (lecture seule)
  '/api/csrf-token'    // Route: /api/csrf-token (génération token)
];

/**
 * Vérifier si une route est dans la liste blanche
 */
function isWhitelisted(path) {
  console.log('🔍 DEBUG isWhitelisted - path reçu:', path);
  console.log('🔍 DEBUG isWhitelisted - CSRF_WHITELIST:', CSRF_WHITELIST);
  
  const result = CSRF_WHITELIST.some(whitelisted => {
    const match = path === whitelisted || path.startsWith(whitelisted);
    console.log(`🔍 Comparaison: "${path}" vs "${whitelisted}" = ${match}`);
    return match;
  });
  
  console.log('🔍 DEBUG isWhitelisted - résultat final:', result);
  return result;
}

/**
 * Middleware de vérification d'origine
 * Vérifie que la requête vient bien d'un domaine autorisé
 */
function verifyOrigin(req, res, next) {
  // ✅ IMPORTANT : Vérifier la whitelist EN PREMIER (avant origin)
  if (isWhitelisted(req.path)) {
    console.log('✅ Route whitelistée, accès autorisé sans origin:', req.path);
    return next();
  }
  
  const origin = req.get('origin') || req.get('referer');
  
  // Liste blanche des domaines autorisés
  const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://pharmacienordmontargis.fr',
    'https://www.pharmacienordmontargis.fr'
  ];
  
  // Bloquer si pas d'origine (sauf pour /api/csrf-token)
  if (!origin) {
    // Autoriser seulement pour la route de génération du token CSRF
    if (req.path === '/api/csrf-token') {
      return next();
    }
    
    console.error('🚨 CSRF - Requête sans origine bloquée:', {
      ip: req.ip,
      path: req.path,
      userAgent: req.get('user-agent'),
      timestamp: new Date().toISOString()
    });
    
    return res.status(403).json({
      error: 'Accès refusé',
      message: 'En-tête Origin ou Referer requis'
    });
  }
  
  // Vérifier l'origine
  const isAllowed = allowedOrigins.some(allowed => 
    origin.startsWith(allowed)
  );
  
  if (!isAllowed) {
    console.error('🚨 CSRF - Origine non autorisée:', {
      origin,
      ip: req.ip,
      path: req.path,
      timestamp: new Date().toISOString()
    });
    
    return res.status(403).json({
      error: 'Accès refusé',
      message: 'Origine non autorisée'
    });
  }
  
  next();
}

/**
 * Middleware de gestion des erreurs CSRF
 * Fournit des messages d'erreur détaillés et log les tentatives
 */
function handleCsrfError(err, req, res, next) {
  if (err.code !== 'EBADCSRFTOKEN') {
    return next(err);
  }
  
  // Logger la tentative CSRF
  console.error('🚨 TENTATIVE CSRF DÉTECTÉE:', {
    ip: req.ip,
    path: req.path,
    method: req.method,
    origin: req.get('origin'),
    referer: req.get('referer'),
    userAgent: req.get('user-agent'),
    timestamp: new Date().toISOString(),
    hasToken: !!req.headers['csrf-token'],
    hasCookie: !!req.cookies._csrf
  });
  
  // Réponse au client
  res.status(403).json({
    error: 'Token CSRF invalide',
    message: 'Votre session a expiré ou le token est invalide. Veuillez rafraîchir la page.',
    code: 'CSRF_TOKEN_INVALID',
    action: 'refresh'
  });
}

/**
 * ✅ NOUVEAU : Middleware CSRF conditionnel
 * Applique la protection CSRF sauf pour les routes whitelistées
 */
function conditionalCsrfProtection(req, res, next) {
  if (isWhitelisted(req.path)) {
    console.log('✅ Route whitelistée, pas de protection CSRF:', req.path);
    return next();
  }
  
  // Appliquer la protection CSRF normale
  csrfProtection(req, res, next);
}

/**
 * Middleware combiné : Origin + CSRF conditionnel
 * À utiliser sur toutes les routes sensibles (sauf /api/csrf-token)
 */
function protectRoute(req, res, next) {
  // Étape 1 : Vérifier l'origine (avec whitelist)
  verifyOrigin(req, res, (err) => {
    if (err) return next(err);
    
    // Étape 2 : Vérifier le token CSRF (avec whitelist)
    conditionalCsrfProtection(req, res, next);
  });
}

/**
 * Route pour obtenir un nouveau token CSRF
 * Cette fonction doit être utilisée AVEC csrfProtection appliqué avant
 */
function getCsrfToken(req, res) {
  try {
    res.json({
      csrfToken: req.csrfToken(),
      expiresIn: 15 * 60 * 1000, // 15 minutes en millisecondes
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('❌ Erreur lors de la génération du token CSRF:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Impossible de générer le token CSRF'
    });
  }
}

// ==========================================
// EXPORTS
// ==========================================

module.exports = {
  csrfProtection,           // Protection CSRF seule
  verifyOrigin,             // Vérification origine seule
  protectRoute,             // Protection combinée avec whitelist (recommandé)
  conditionalCsrfProtection, // Protection CSRF avec whitelist
  handleCsrfError,          // Gestionnaire d'erreurs
  getCsrfToken,             // Handler pour route /api/csrf-token
  isWhitelisted             // Utilitaire pour vérifier whitelist
};