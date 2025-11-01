const { body, validationResult } = require('express-validator');

// ============================================
// 🛡️ MIDDLEWARE DE VALIDATION DES INPUTS
// ============================================

/**
 * Middleware pour gérer les erreurs de validation
 * À utiliser après les règles de validation
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    // Formater les erreurs de manière lisible
    const formattedErrors = errors.array().map(err => ({
      field: err.path || err.param,
      message: err.msg,
      value: err.value
    }));
    
    return res.status(400).json({
      error: 'Erreur de validation',
      message: 'Les données soumises sont invalides.',
      details: formattedErrors
    });
  }
  
  next();
};

// ============================================
// 🔍 RÈGLES DE VALIDATION - FORMULAIRE ORDONNANCE
// ============================================

const validatePrescription = [
  // Validation du nom
  body('name')
    .trim() // Supprimer les espaces avant/après
    .notEmpty().withMessage('Le nom est obligatoire')
    .isLength({ min: 2, max: 100 }).withMessage('Le nom doit contenir entre 2 et 100 caractères')
    .matches(/^[a-zA-ZÀ-ÿ\s\-']+$/).withMessage('Le nom ne peut contenir que des lettres, espaces, tirets et apostrophes')
    .escape(), // Échappe les caractères HTML dangereux
  
  // Validation de l'email
  body('email')
    .trim()
    .notEmpty().withMessage('L\'email est obligatoire')
    .isEmail().withMessage('L\'email n\'est pas valide')
    .normalizeEmail() // Normalise l'email (lowercase, trim, etc.)
    .isLength({ max: 255 }).withMessage('L\'email est trop long'),
  
  // Validation du téléphone (optionnel mais doit être valide si fourni)
  body('phone')
    .optional({ checkFalsy: true }) // Accepte vide ou absent
    .trim()
    .matches(/^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/)
    .withMessage('Le numéro de téléphone français n\'est pas valide (ex: 06 12 34 56 78)')
    .customSanitizer(value => {
      // Normaliser le format du téléphone
      return value ? value.replace(/[\s.-]/g, '') : value;
    }),
  
  // Validation du message (optionnel)
  body('message')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 1000 }).withMessage('Le message ne peut pas dépasser 1000 caractères')
    .escape(),
  
  // Middleware de gestion des erreurs
  handleValidationErrors
];

// ============================================
// 🔍 RÈGLES DE VALIDATION - PANIER
// ============================================

const validateCart = [
  // Validation du nom
  body('name')
    .trim()
    .notEmpty().withMessage('Le nom est obligatoire')
    .isLength({ min: 2, max: 100 }).withMessage('Le nom doit contenir entre 2 et 100 caractères')
    .matches(/^[a-zA-ZÀ-ÿ\s\-']+$/).withMessage('Le nom ne peut contenir que des lettres')
    .escape(),
  
  // Validation de l'email
  body('email')
    .trim()
    .notEmpty().withMessage('L\'email est obligatoire')
    .isEmail().withMessage('L\'email n\'est pas valide')
    .normalizeEmail()
    .isLength({ max: 255 }).withMessage('L\'email est trop long'),
  
  // Validation du téléphone
  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/)
    .withMessage('Le numéro de téléphone français n\'est pas valide')
    .customSanitizer(value => {
      return value ? value.replace(/[\s.-]/g, '') : value;
    }),
  
  // Validation du panier (doit être un tableau non vide)
  body('cart')
    .isArray({ min: 1 }).withMessage('Le panier doit contenir au moins un article'),
  
  // Validation de chaque item du panier
  body('cart.*.name')
    .trim()
    .notEmpty().withMessage('Le nom du produit est obligatoire')
    .isLength({ max: 200 }).withMessage('Le nom du produit est trop long')
    .escape(),
  
  body('cart.*.quantity')
    .isInt({ min: 1, max: 999 }).withMessage('La quantité doit être un nombre entre 1 et 999'),
  
  body('cart.*.price')
    .optional()
    .isFloat({ min: 0 }).withMessage('Le prix doit être un nombre positif'),
  
  // Validation du message optionnel
  body('message')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 1000 }).withMessage('Le message ne peut pas dépasser 1000 caractères')
    .escape(),
  
  handleValidationErrors
];

// ============================================
// 🔍 VALIDATION GÉNÉRIQUE - FICHIERS
// ============================================

/**
 * Middleware de validation pour les fichiers uploadés
 * À utiliser après Multer
 */
const validateFileUpload = (req, res, next) => {
  // Vérifier si un fichier est présent
  if (!req.file && !req.files) {
    return res.status(400).json({
      error: 'Fichier manquant',
      message: 'Aucun fichier n\'a été téléchargé.'
    });
  }
  
  const file = req.file || (req.files && req.files[0]);
  
  // Types MIME autorisés pour les ordonnances
  const allowedMimeTypes = [
     'application/pdf'
  ];
  
  // Vérifier le type MIME
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return res.status(400).json({
      error: 'Type de fichier non autorisé',
      message: 'Seuls les fichiers PDF sont acceptés.',
      received: file.mimetype
    });
  }
  
  // Vérifier la taille (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB en bytes
  if (file.size > maxSize) {
    return res.status(400).json({
      error: 'Fichier trop volumineux',
      message: 'La taille du fichier ne doit pas dépasser 5 MB.',
      received: `${(file.size / 1024 / 1024).toFixed(2)} MB`
    });
  }
  
  next();
};

// ============================================
// 📤 EXPORTS
// ============================================

module.exports = {
  validatePrescription,
  validateCart,
  validateFileUpload,
  handleValidationErrors
};