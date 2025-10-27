const express = require('express');
const router = express.Router();
const multer = require('multer');
const FormData = require('form-data');
const Mailgun = require('mailgun.js');
const { validatePrescription, validateFileUpload } = require('../middleware/validation.middleware');

// ============================================
// 📧 CONFIGURATION MAILGUN
// ============================================
const mailgun = new Mailgun(FormData);
const mg = mailgun.client({
  username: 'api',
  key: process.env.MAILGUN_API_KEY
});

// ============================================
// 📤 CONFIGURATION MULTER (Upload de fichiers)
// ============================================
const storage = multer.memoryStorage(); // Stockage en mémoire (pas sur disque)

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // Max 5MB
    files: 1 // Max 1 fichier
  },
  fileFilter: (req, file, cb) => {
    // Filtrage initial (sera vérifié à nouveau par le middleware)
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non autorisé'), false);
    }
  }
});

// ============================================
// 📍 ROUTE : POST /api/prescription
// ============================================
router.post('/', 
  upload.single('prescription'), // Upload du fichier
  validateFileUpload,           // Validation du fichier
  validatePrescription,         // Validation des champs texte
  async (req, res) => {
    try {
      const { name, email, phone, message } = req.body;
      const file = req.file;

      // Vérification finale de la présence du fichier
      if (!file) {
        return res.status(400).json({
          error: 'Fichier manquant',
          message: 'L\'ordonnance est obligatoire.'
        });
      }

      // ============================================
      // 📧 CONSTRUCTION DE L'EMAIL
      // ============================================
      
      // Préparer l'attachment pour Mailgun
      const attachment = {
        filename: file.originalname,
        data: file.buffer,
        contentType: file.mimetype
      };

      // Construire le corps de l'email
      const emailBody = `
═══════════════════════════════════════════════════
📋 NOUVELLE ORDONNANCE REÇUE
═══════════════════════════════════════════════════

👤 Informations du patient :
   • Nom : ${name}
   • Email : ${email}
   • Téléphone : ${phone || 'Non renseigné'}

💬 Message :
${message || 'Aucun message'}

📎 Fichier joint : ${file.originalname}
📊 Taille : ${(file.size / 1024).toFixed(2)} KB
📄 Type : ${file.mimetype}

⏰ Date de réception : ${new Date().toLocaleString('fr-FR', { 
        dateStyle: 'full', 
        timeStyle: 'medium' 
      })}

═══════════════════════════════════════════════════

⚠️ IMPORTANT : Ce message contient des données de santé.
Traiter avec confidentialité.
      `.trim();

      // ============================================
      // 📤 ENVOI DE L'EMAIL VIA MAILGUN
      // ============================================
      
      const emailData = {
        from: `Pharmacie Nord Montargis <noreply@${process.env.MAILGUN_DOMAIN}>`,
        to: process.env.RECIPIENT_EMAIL,
        subject: `🏥 Nouvelle ordonnance de ${name}`,
        text: emailBody,
        attachment: attachment
      };

      // Envoi de l'email
      await mg.messages.create(process.env.MAILGUN_DOMAIN, emailData);

      // ============================================
      // ✅ RÉPONSE SUCCÈS
      // ============================================
      
      console.log('✅ Ordonnance envoyée avec succès:', {
        patient: name,
        email: email,
        file: file.originalname,
        timestamp: new Date().toISOString()
      });

      res.status(200).json({
        success: true,
        message: 'Votre ordonnance a été envoyée avec succès !',
        details: {
          name: name,
          email: email,
          filename: file.originalname,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      // ============================================
      // ❌ GESTION DES ERREURS
      // ============================================
      
      console.error('❌ Erreur lors de l\'envoi de l\'ordonnance:', {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });

      // Erreur Mailgun spécifique
      if (error.status) {
        return res.status(error.status).json({
          error: 'Erreur d\'envoi',
          message: 'Impossible d\'envoyer l\'email. Veuillez réessayer plus tard.',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }

      // Erreur générique
      res.status(500).json({
        error: 'Erreur serveur',
        message: 'Une erreur est survenue lors du traitement de votre demande.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// ============================================
// 📍 ROUTE DE TEST (Optionnelle - à supprimer en production)
// ============================================
router.get('/test', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Route prescription fonctionnelle',
    validation: 'active',
    rateLimit: 'active (10 req/heure)',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;