const express = require('express');
const router = express.Router();
const multer = require('multer');
const FormData = require('form-data');
const Mailgun = require('mailgun.js');
const { validatePrescription, validateFileUpload } = require('../middleware/validation.middleware');

// ============================================
// 🔍 VALIDATION DES VARIABLES D'ENVIRONNEMENT
// ============================================

const requiredEnvVars = [
    'MAILGUN_API_KEY',
    'MAILGUN_DOMAIN',
    'RECIPIENT_EMAIL' // Email qui reçoit les ordonnances
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
    console.error('❌ ERREUR CRITIQUE [prescription.js] - Variables d\'environnement manquantes:');
    missingVars.forEach(varName => {
        console.error(`   - ${varName}`);
    });
    console.error('\n⚠️  Le module prescription.js ne pourra pas envoyer d\'emails !');
}

// Log de configuration
console.log('📧 Configuration Prescription:');
console.log('   - API Key:', process.env.MAILGUN_API_KEY ? '✅ Configurée' : '❌ MANQUANTE');
console.log('   - Domain:', process.env.MAILGUN_DOMAIN || '❌ MANQUANT');
console.log('   - Recipient:', process.env.RECIPIENT_EMAIL || '❌ MANQUANT');

// ============================================
// 📧 CONFIGURATION MAILGUN
// ============================================

const mailgun = new Mailgun(FormData);
const mg = mailgun.client({
  username: 'api',
  key: process.env.MAILGUN_API_KEY || 'MISSING_KEY',
  url: process.env.MAILGUN_API_HOST || 'https://api.eu.mailgun.net'
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
// 📍 ROUTE : POST /api/prescription/upload
// ============================================

router.post('/upload',
  upload.single('prescriptionFile'), // ✅ Nom du champ qui correspond au HTML
  validateFileUpload,           // Validation du fichier
  validatePrescription,         // Validation des champs texte
  async (req, res) => {
    
    console.log('[INFO] 📬 Requête d\'ordonnance reçue...');
    
    try {
      // ============================================
      // 🔍 VÉRIFICATION DES VARIABLES D'ENVIRONNEMENT
      // ============================================
      
      if (missingVars.length > 0) {
        console.error('[ERREUR] ❌ Impossible d\'envoyer l\'email : variables manquantes');
        return res.status(500).json({ 
          error: 'Configuration serveur incomplète',
          message: 'Contactez l\'administrateur du site.',
          missingVars: missingVars
        });
      }
      
      const { name, email, phone, message } = req.body;
      const file = req.file;

      // Vérification finale de la présence du fichier
      if (!file) {
        return res.status(400).json({
          error: 'Fichier manquant',
          message: 'L\'ordonnance est obligatoire.'
        });
      }

      console.log('[INFO] 📄 Fichier reçu:', {
        name: file.originalname,
        size: `${(file.size / 1024).toFixed(2)} KB`,
        type: file.mimetype
      });

      // ============================================
      // 📧 CONSTRUCTION DE L'EMAIL
      // ============================================
      
      // Préparer l'attachment pour Mailgun
      const attachment = {
        filename: file.originalname,
        data: file.buffer,
        contentType: file.mimetype
      };

      // Construire le corps de l'email HTML
      const htmlBody = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
          <!-- Header -->
          <div style="background-color: #0d9488; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">📋 Nouvelle Ordonnance Reçue</h1>
          </div>
          
          <div style="background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
            <!-- Informations du patient -->
            <div style="background-color: #f0fdfa; padding: 20px; border-left: 4px solid #0d9488; margin-bottom: 25px; border-radius: 5px;">
              <h3 style="margin-top: 0; color: #0d9488;">👤 Informations du patient</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; width: 120px;">Nom :</td>
                  <td style="padding: 8px 0;">${name}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Email :</td>
                  <td style="padding: 8px 0;"><a href="mailto:${email}" style="color: #0d9488; text-decoration: none;">${email}</a></td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Téléphone :</td>
                  <td style="padding: 8px 0;">${phone ? `<a href="tel:${phone}" style="color: #0d9488; text-decoration: none;">${phone}</a>` : 'Non renseigné'}</td>
                </tr>
              </table>
            </div>

            <!-- Message du patient -->
            ${message ? `
            <div style="background-color: #fffbeb; padding: 20px; border-left: 4px solid #f59e0b; margin-bottom: 25px; border-radius: 5px;">
              <h3 style="margin-top: 0; color: #f59e0b;">💬 Message du patient</h3>
              <p style="margin: 0; white-space: pre-wrap;">${message}</p>
            </div>
            ` : ''}

            <!-- Informations du fichier -->
            <div style="background-color: #fff; padding: 20px; border: 2px solid #e5e7eb; border-radius: 8px; margin-bottom: 25px;">
              <h3 style="margin-top: 0; color: #374151;">📎 Fichier joint</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; width: 120px;">Nom :</td>
                  <td style="padding: 8px 0;">${file.originalname}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Taille :</td>
                  <td style="padding: 8px 0;">${(file.size / 1024).toFixed(2)} KB</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Type :</td>
                  <td style="padding: 8px 0;">${file.mimetype}</td>
                </tr>
              </table>
            </div>

            <!-- Date de réception -->
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 6px; text-align: center;">
              <p style="margin: 0; font-size: 13px; color: #666;">
                📅 Reçu le ${new Date().toLocaleString('fr-FR', { 
                  dateStyle: 'full', 
                  timeStyle: 'medium' 
                })}
              </p>
            </div>

            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 25px 0;">
            
            <!-- Avertissement confidentialité -->
            <div style="background-color: #fef2f2; padding: 15px; border-left: 4px solid #dc2626; border-radius: 5px;">
              <p style="margin: 0; color: #991b1b; font-weight: bold; font-size: 13px;">
                ⚠️ IMPORTANT : Ce message contient des données de santé.<br>
                Traiter avec confidentialité conformément au RGPD.
              </p>
            </div>
          </div>
        </div>
      `;

      // Corps texte alternatif (pour clients email ne supportant pas HTML)
      const textBody = `
═══════════════════════════════════════════════════
📋 NOUVELLE ORDONNANCE REÇUE
═══════════════════════════════════════════════════

👤 Informations du patient :
   • Nom : ${name}
   • Email : ${email}
   • Téléphone : ${phone || 'Non renseigné'}

${message ? `💬 Message :\n${message}\n` : ''}
📎 Fichier joint : ${file.originalname}
📊 Taille : ${(file.size / 1024).toFixed(2)} KB
📄 Type : ${file.mimetype}

⏰ Date de réception : ${new Date().toLocaleString('fr-FR', { 
        dateStyle: 'full', 
        timeStyle: 'medium' 
      })}

═══════════════════════════════════════════════════

⚠️ IMPORTANT : Ce message contient des données de santé.
Traiter avec confidentialité conformément au RGPD.
      `.trim();

      // ============================================
      // 📤 ENVOI DE L'EMAIL VIA MAILGUN
      // ============================================
      
      const emailData = {
        from: `Pharmacie Nord Montargis <noreply@${process.env.MAILGUN_DOMAIN}>`,
        to: process.env.RECIPIENT_EMAIL,
        subject: `🏥 Nouvelle ordonnance de ${name}`,
        html: htmlBody,
        text: textBody,
        attachment: attachment
      };

      console.log(`[INFO] 📧 Envoi de l'ordonnance à ${process.env.RECIPIENT_EMAIL}...`);

      // Envoi de l'email
      const response = await mg.messages.create(process.env.MAILGUN_DOMAIN, emailData);

      console.log('[SUCCESS] ✅ Ordonnance envoyée avec succès:', response.id);

      // ============================================
      // ✅ RÉPONSE SUCCÈS
      // ============================================
      
      res.status(200).json({
        success: true,
        message: 'Votre ordonnance a été envoyée avec succès !',
        details: {
          name: name,
          email: email,
          filename: file.originalname,
          messageId: response.id,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      // ============================================
      // ❌ GESTION DES ERREURS
      // ============================================
      
      console.error('❌ Erreur lors de l\'envoi de l\'ordonnance:');
      console.error('Message:', error.message);
      if (error.details) {
        console.error('Détails Mailgun:', error.details);
      }

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
    endpoint: '/api/prescription/upload',
    validation: 'active',
    rateLimit: 'active (10 req/heure)',
    envCheck: {
      MAILGUN_API_KEY: process.env.MAILGUN_API_KEY ? '✅' : '❌',
      MAILGUN_DOMAIN: process.env.MAILGUN_DOMAIN ? '✅' : '❌',
      RECIPIENT_EMAIL: process.env.RECIPIENT_EMAIL ? '✅' : '❌'
    },
    timestamp: new Date().toISOString()
  });
});

// ============================================
// 📤 EXPORT
// ============================================

module.exports = router;