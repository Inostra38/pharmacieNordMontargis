// ==========================================
// MIDDLEWARE CSRF - PROTECTION ULTRA-SÉCURISÉE
// Version 2.0 - Whitelist restrictive avec match exact
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
 * 🔒 CSRF WHITELIST - Routes publiques en LECTURE SEULE
 * 
 * Principe de sécurité :
 * - ✅ Routes GET lecture seule → Pas de CSRF nécessaire
 * - ❌ Routes POST/PUT/DELETE → CSRF obligatoire
 * - ❌ Routes admin → CSRF obligatoire (même GET)
 * 
 * ⚠️ MATCH EXACT UNIQUEMENT (pas de startsWith/regex)
 * 
 * Format : Chemins absolus uniquement (ex: /api/products)
 */
const CSRF_WHITELIST = [
  // ============================================
  // 🔓 ROUTE GÉNÉRATION TOKEN (OBLIGATOIRE)
  // ============================================
  '/api/csrf-token',              // GET - génération du token CSRF
  
  // ============================================
  // 📊 ROUTES MONITORING (lecture seule, publiques)
  // ============================================
  '/api/cache/status',            // GET - statut du cache (diagnostic public)
  
  // ============================================
  // 🛒 ROUTES PRODUITS (lecture seule, publiques)
  // ============================================
  '/api/products',                // GET - liste tous les produits (catalogue public)
  '/api/products/brands',         // GET - liste des marques (catalogue public)
  '/api/products/home',           // GET - produits page d'accueil (catalogue public)
  '/api/products/cache-info',     // GET - info cache produits (diagnostic)
  
  // ============================================
  // ❌ ROUTES EXCLUES (nécessitent CSRF) - Pour référence
  // ============================================
  // POST /api/products/refresh-cache  → Rafraîchissement cache (admin)
  // POST /api/prescription            → Envoi ordonnance (sensible)
  // POST /api/cart                    → Envoi panier (sensible)
  // POST /api/cart/submit             → Validation panier (sensible)
];

/**
 * Vérifier si une route est whitelistée
 * ✅ NOUVEAU : Match EXACT uniquement (sécurité maximale)
 * 
 * @param {string} path - Chemin de la requête (ex: /api/products)
 * @returns {boolean} - true si whitelistée, false sinon
 */
function isWhitelisted(path) {
  // ✅ Match exact uniquement (pas de startsWith/includes/regex)
  return CSRF_WHITELIST.includes(path);
}

/**
 * Middleware de vérification d'origine
 * Vérifie que la requête vient bien d'un domaine autorisé
 * 
 * @param {Request} req - Requête Express
 * @param {Response} res - Réponse Express
 * @param {Function} next - Callback next
 */
function verifyOrigin(req, res, next) {
  // ✅ Vérifier la whitelist EN PREMIER (avant origin check)
  if (isWhitelisted(req.path)) {
    // Route publique, pas de vérification d'origine nécessaire
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
  
  // Bloquer si pas d'origine
  if (!origin) {
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
  
  // Vérifier que l'origine est autorisée
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
 * Middleware CSRF conditionnel
 * Applique la protection CSRF sauf pour les routes whitelistées
 * 
 * @param {Request} req - Requête Express
 * @param {Response} res - Réponse Express
 * @param {Function} next - Callback next
 */
function conditionalCsrfProtection(req, res, next) {
  if (isWhitelisted(req.path)) {
    // Route whitelistée, pas de protection CSRF
    return next();
  }
  
  // Appliquer la protection CSRF normale
  csrfProtection(req, res, next);
}

/**
 * Middleware de gestion des erreurs CSRF
 * Fournit des messages d'erreur détaillés et log les tentatives
 * 
 * @param {Error} err - Erreur
 * @param {Request} req - Requête Express
 * @param {Response} res - Réponse Express
 * @param {Function} next - Callback next
 */
function handleCsrfError(err, req, res, next) {
  if (err.code !== 'EBADCSRFTOKEN') {
    return next(err);
  }
  
  // Logger la tentative CSRF suspecte
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
  
  // Réponse sécurisée au client
  res.status(403).json({
    error: 'Token CSRF invalide',
    message: 'Votre session a expiré ou le token est invalide. Veuillez rafraîchir la page.',
    code: 'CSRF_TOKEN_INVALID',
    action: 'refresh'
  });
}

/**
 * Middleware combiné : Origin + CSRF conditionnel
 * À utiliser sur toutes les routes API (sauf statiques)
 * 
 * @param {Request} req - Requête Express
 * @param {Response} res - Réponse Express
 * @param {Function} next - Callback next
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
 * Handler pour la route de génération de token CSRF
 * Cette fonction doit être utilisée AVEC csrfProtection appliqué avant
 * 
 * @param {Request} req - Requête Express
 * @param {Response} res - Réponse Express
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
  csrfProtection,           // Protection CSRF seule (pour route /api/csrf-token)
  verifyOrigin,             // Vérification origine seule (si besoin spécifique)
  protectRoute,             // ✅ RECOMMANDÉ : Protection combinée avec whitelist
  conditionalCsrfProtection, // Protection CSRF avec whitelist (si besoin spécifique)
  handleCsrfError,          // Gestionnaire d'erreurs CSRF (middleware global)
  getCsrfToken,             // Handler pour route /api/csrf-token
  isWhitelisted             // Utilitaire pour vérifier whitelist (si besoin dans tests)
};