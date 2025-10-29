// ==========================================
// MIDDLEWARE CSRF - PROTECTION ULTRA-SÉCURISÉE
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
 * Middleware de vérification d'origine
 * Vérifie que la requête vient bien d'un domaine autorisé
 */
function verifyOrigin(req, res, next) {
  const origin = req.get('origin') || req.get('referer');
  
  // Liste blanche des domaines autorisés
  const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://pharmacienordmontargis.fr',
    'https://www.pharmacienordmontargis.fr'
  ];
  
  // Vérifier l'origine
  if (origin) {
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
 * Middleware combiné : Origin + CSRF
 * À utiliser sur toutes les routes sensibles (sauf /api/csrf-token)
 */
function protectRoute(req, res, next) {
  // Étape 1 : Vérifier l'origine
  verifyOrigin(req, res, (err) => {
    if (err) return next(err);
    
    // Étape 2 : Vérifier le token CSRF
    csrfProtection(req, res, next);
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
  csrfProtection,      // Protection CSRF seule
  verifyOrigin,        // Vérification origine seule
  protectRoute,        // Protection combinée (recommandé pour routes sensibles)
  handleCsrfError,     // Gestionnaire d'erreurs
  getCsrfToken         // Handler pour route /api/csrf-token
};