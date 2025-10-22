const express = require('express');
const multer = require('multer');
// On utilise require, mais on respecte la casse 'FormData' que 'mailgun.js' v11 attend
const FormData = require('form-data'); 
const Mailgun = require('mailgun.js');
const router = express.Router();

// --- Configuration ---

// 1. Configurer Mailgun avec la NOUVELLE SYNTAXE (v11)
const mailgun = new Mailgun(FormData);
const mg = mailgun.client({
  username: 'api',
  // Assurez-vous que MAILGUN_API_KEY est bien dans votre .env
  key: process.env.MAILGUN_API_KEY, 
  // On lit l'URL/région depuis .env (que j'avais nommé MAILGUN_API_HOST)
  // Mettez "https://api.eu.mailgun.net" dans votre .env si vous êtes en EU
  url: process.env.MAILGUN_API_HOST || 'https://api.eu.mailgun.net' 
});

// 2. Configurer Multer pour stocker en MÉMOIRE (RAM)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Limite à 10MB
});

// --- Définition de la Route ---

/**
 * @route POST /api/prescription/upload
 * Gère l'envoi d'ordonnance (zéro stockage)
 */
router.post(
  '/upload',
  upload.single('prescriptionFile'), // 'prescriptionFile' est le 'name' de l'input
  async (req, res) => {
    
    console.log('[INFO] Requête d\'upload reçue...');

    try {
      // 1. Validation de la requête
      if (!req.file) {
        console.warn('[WARN] Tentative d\'upload sans fichier.');
        return res.status(400).json({ message: 'Aucun fichier reçu.' });
      }

      // 2. Validation du type de fichier (PDF uniquement)
const allowedMimeTypes = ['application/pdf'];
if (!allowedMimeTypes.includes(req.file.mimetype)) {
  console.warn(`[WARN] Type de fichier non autorisé : ${req.file.mimetype}`);
  return res.status(400).json({ 
    message: 'Format de fichier non autorisé. Veuillez envoyer un fichier PDF uniquement.' 
  });
}

// 3. Validation de l'extension du fichier (sécurité supplémentaire)
const fileExtension = req.file.originalname.split('.').pop().toLowerCase();
if (fileExtension !== 'pdf') {
  console.warn(`[WARN] Extension de fichier non autorisée : ${fileExtension}`);
  return res.status(400).json({ 
    message: 'Extension de fichier non autorisée. Veuillez envoyer un fichier PDF (.pdf).' 
  });
}

console.log('[INFO] Validation du fichier PDF réussie.');

      // 4. Préparation des données de l'e-mail
      // On utilise les variables de .env et les données du formulaire
      const emailData = {
        from: process.env.FROM_EMAIL,
        to: [process.env.PHARMACIST_EMAIL],
        subject: `Nouvelle ordonnance de ${name} (Site Web)`,
        html: `
          <h1>Nouvelle ordonnance en ligne</h1>
          <p>Vous avez reçu une nouvelle ordonnance via le site web.</p>
          <hr>
          <h2>Informations Patient</h2>
          <ul>
            <li><strong>Nom :</strong> ${name || 'Non fourni'}</li>
            <li><strong>Email :</strong> ${email || 'Non fourni'}</li>
            <li><strong>Téléphone :</strong> ${phone || 'Non fourni'}</li>
          </ul>
          <hr>
          <p>Le fichier de l'ordonnance ("${req.file.originalname}") est joint à cet e-mail.</p>
        `,
        // La pièce jointe est passée ici
        attachment: [attachment], 
      };

      // 5. Envoi de l'e-mail via Mailgun (nouvelle syntaxe)
      // On utilise le DOMAINE de votre fichier .env
      console.log(`[INFO] Envoi via Mailgun vers ${process.env.PHARMACIST_EMAIL}...`);
      
      const data = await mg.messages.create(
        process.env.MAILGUN_DOMAIN, 
        emailData
      );

      console.log('[SUCCESS] Réponse de Mailgun:', data);
      
      // 6. Réponse au client
      res.status(200).json({
        message: 'Ordonnance envoyée avec succès !',
      });

    } catch (error) {
      // 7. Gestion des erreurs
      console.error("[ERREUR] Échec de l'envoi Mailgun :");
      if (error.response) {
        // Erreur spécifique de l'API Mailgun
        console.error('Status:', error.response.status);
        console.error('Body:', error.response.body);
      } else {
        // Erreur générale
        console.error(error.message);
      }
      
      res.status(500).json({
        message: "Une erreur est survenue lors de l'envoi. Veuillez réessayer.",
        error: error.message || 'Erreur inconnue'
      });
    }
  },
);

// On exporte le routeur en CommonJS
module.exports = router;