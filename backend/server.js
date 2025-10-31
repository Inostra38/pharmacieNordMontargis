const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const path = require('path');

// Validation environnement
const { validateEnv, checkDefaultValues } = require('./config/env-validator');
const config = validateEnv();
checkDefaultValues();

// Import CSRF Protection
const { 
  csrfProtection,
  protectRoute, 
  handleCsrfError, 
  getCsrfToken 
} = require('./middleware/csrf-protection');

// ============================================
// 🔄 IMPORT CACHE SCHEDULER
// ============================================
const cacheScheduler = require('./cache/cache-scheduler');

const app = express();
const PORT = config.port;

// ============================================
// 🛡️ CONFIGURATION SÉCURITÉ
// ============================================

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        // ✅ Supprimé: "'unsafe-inline'" - plus besoin avec Tailwind local
        "'unsafe-hashes'",  // Gardé pour scripts inline légitimes (analytics)
        // ✅ Supprimé: "https://cdn.tailwindcss.com" - maintenant local
        "https://www.googletagmanager.com",
        "https://www.google-analytics.com",
        "https://cdn.jsdelivr.net"  // Pour CookieConsent
      ],
      styleSrc: [
        "'self'",
        // ✅ Supprimé: "'unsafe-inline'" - plus besoin avec Tailwind local
        "https://fonts.googleapis.com",  // Google Fonts
        // ✅ Supprimé: "https://cdn.tailwindcss.com" - maintenant local
        "https://cdn.jsdelivr.net"  // Pour CookieConsent CSS
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com",
        "https://fonts.googleapis.com"
      ],
      imgSrc: [
        "'self'", 
        "data:", 
        "https:", 
        "blob:"
      ],
      connectSrc: [
        "'self'",
        "https://www.google-analytics.com",
        "https://region1.google-analytics.com",
        "https://script.google.com",
        "https://script.googleusercontent.com"
      ],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  frameguard: { action: 'deny' },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  dnsPrefetchControl: { allow: false },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

// CORS
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'https://www.pharmacienordmontargis.fr',
      'https://pharmacienordmontargis.fr'
    ];
    
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Accès refusé par la politique CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'CSRF-Token', 'X-CSRF-Token']
};

app.use(cors(corsOptions));

// Cookie parser (requis pour CSRF)
app.use(cookieParser());

app.disable('x-powered-by');
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================
// RATE LIMITING
// ============================================

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    error: 'Trop de requêtes depuis cette adresse IP. Veuillez réessayer dans 15 minutes.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true,
  skip: (req) => {
    return req.path.match(/\.(css|js|jpg|jpeg|png|gif|svg|ico|woff|woff2|ttf|eot)$/i);
  }
});

app.use(globalLimiter);

const strictApiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: {
    error: 'Trop de soumissions depuis cette adresse IP. Veuillez réessayer dans 1 heure.',
    retryAfter: '1 heure'
  },
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Limite de requêtes atteinte',
      message: 'Vous avez dépassé le nombre maximal de soumissions autorisées. Veuillez patienter avant de réessayer.',
      retryAfter: '1 heure'
    });
  }
});

const moderateApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 200,  // ✅ Augmenté pour supporter 19 batches + marge
  message: {
    error: 'Trop de requêtes. Veuillez patienter quelques minutes.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true
});

// ============================================
// ✅ ROUTE CSRF TOKEN (csrfProtection uniquement)
// ============================================
// Cette route génère un token CSRF - elle a BESOIN de csrfProtection
app.get('/api/csrf-token', csrfProtection, getCsrfToken);

// ============================================
// 📊 ROUTES PUBLIQUES (Monitoring et diagnostic)
// ============================================

const cacheRoutes = require('./routes/cache');
app.use('/api/cache', cacheRoutes);

// ============================================
// 🔒 ROUTES API PROTÉGÉES (protectRoute = origin + csrf)
// ============================================

const prescriptionRoutes = require('./routes/prescription');
app.use('/api/prescription', strictApiLimiter, protectRoute, prescriptionRoutes);

const cartRoutes = require('./routes/cart');
app.use('/api/cart', moderateApiLimiter, protectRoute, cartRoutes);

// Test de diagnostic
app.use('/api/products', (req, res, next) => {
  console.log('🔍 TEST: Route /api/products appelée');
  console.log('🔍 Headers:', req.headers);
  next();
});

const productsRoutes = require('./routes/products');
app.use('/api/products', moderateApiLimiter, protectRoute, productsRoutes);

// ============================================
// SERVEUR FICHIERS FRONTEND
// ============================================
const frontendDir = path.join(__dirname, '../frontend');
app.use(express.static(frontendDir));

// ⚠️ IMPORTANT : Catch-all SEULEMENT pour les routes non-API
app.get('*', (req, res, next) => {
  // Si c'est une route API, ne pas intercepter
  if (req.path.startsWith('/api/')) {
    return next();
  }
  res.sendFile(path.join(frontendDir, 'index.html'));
});

// ============================================
// GESTION D'ERREURS
// ============================================

// Gestionnaire CSRF (doit être AVANT le gestionnaire général)
app.use(handleCsrfError);

// Gestionnaire général
app.use((err, req, res, next) => {
  console.error('❌ Erreur serveur:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    timestamp: new Date().toISOString(),
    ip: req.ip,
    path: req.path
  });
  
  if (err.message === 'Accès refusé par la politique CORS') {
    return res.status(403).json({
      error: 'Accès refusé',
      message: 'Votre domaine n\'est pas autorisé à accéder à cette ressource.'
    });
  }
  
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  res.status(err.status || 500).json({
    error: {
      message: isDevelopment ? err.message : 'Une erreur est survenue',
      ...(isDevelopment && { stack: err.stack })
    }
  });
});

// ============================================
// DÉMARRAGE
// ============================================
app.listen(PORT, () => {
  console.log('═══════════════════════════════════════════════════');
  console.log('✅ Serveur SÉCURISÉ démarré avec succès !');
  console.log('═══════════════════════════════════════════════════');
  console.log(`🌐 URL : http://localhost:${PORT}`);
  console.log(`📂 Frontend : ${frontendDir}`);
  console.log(`🛡️ Helmet + CORS + Rate Limiting + CSRF activés`);
  console.log(`🔒 Mode : ${process.env.NODE_ENV || 'development'}`);
  console.log('═══════════════════════════════════════════════════');
  
  // ============================================
  // 🔄 DÉMARRAGE DU CACHE SCHEDULER
  // ============================================
  cacheScheduler.start();
});