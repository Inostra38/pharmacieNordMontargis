const express = require('express');
const FormData = require('form-data'); 
const Mailgun = require('mailgun.js');
const router = express.Router();
const { validateCart } = require('../middleware/validation.middleware');

// ============================================
// 🔍 VALIDATION DES VARIABLES D'ENVIRONNEMENT
// ============================================

// ✅ MODIFICATION ICI :
// J'utilise RECIPIENT_EMAIL (comme prescription.js) au lieu de PHARMACIST_EMAIL.
const requiredEnvVars = [
    'MAILGUN_API_KEY',
    'MAILGUN_DOMAIN',
    'MAILGUN_API_HOST',
    'RECIPIENT_EMAIL', // <-- CHANGÉ ICI
    'FROM_EMAIL'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
    console.error('❌ ERREUR CRITIQUE [cart.js] - Variables d\'environnement manquantes:');
    missingVars.forEach(varName => {
        console.error(`   - ${varName}`);
    });
    console.error('\n⚠️  Le module cart.js ne pourra pas envoyer d\'emails !');
}

// Log de configuration
console.log('🛒 Configuration Panier (Cart):');
console.log('   - API Key:', process.env.MAILGUN_API_KEY ? '✅ Configurée' : '❌ MANQUANTE');
console.log('   - Domain:', process.env.MAILGUN_DOMAIN || '❌ MANQUANT');
console.log('   - Host:', process.env.MAILGUN_API_HOST || '❌ MANQUANT (utilisera https://api.eu.mailgun.net)');
console.log('   - Recipient Email:', process.env.RECIPIENT_EMAIL || '❌ MANQUANT'); // <-- CHANGÉ ICI
console.log('   - From Email:', process.env.FROM_EMAIL || '❌ MANQUANT');

// --- Configuration Mailgun ---
const mailgun = new Mailgun(FormData);
const mg = mailgun.client({
  username: 'api',
  key: process.env.MAILGUN_API_KEY || 'MISSING_KEY',
  url: process.env.MAILGUN_API_HOST || 'https://api.eu.mailgun.net'
});

// --- Helpers (pour formater l'e-mail) ---
const formatPrice = (price) => {
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice)) {
        return 'N/A';
    }
    return parsedPrice.toFixed(2).replace('.', ',') + ' €';
};

/**
 * Crée le corps HTML de l'e-mail pour le PHARMACIEN
 */
const createPharmacistEmail = (details) => {
    const { name, phone, email, message, cart, total } = details;

    return `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h1>🔔 Nouvelle Réservation de Panier</h1>
        <p>Un client a réservé des produits sur le site web.</p>
        
        <div style="background-color: #f0fdfa; padding: 15px; border-left: 4px solid #0d9488; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #0d9488;">Coordonnées du client</h3>
            <p style="margin: 5px 0;"><strong>Nom :</strong> ${name}</p>
            <p style="margin: 5px 0;"><strong>Téléphone :</strong> ${phone}</p>
            <p style="margin: 5px 0;"><strong>E-mail :</strong> ${email}</p>
        </div>

        <h3>Produits réservés :</h3>
        <ul>
          ${cart.map(item => `
            <li>
              <strong>${item.name}</strong> (x${item.quantity}) 
              ${item.cip ? `<br>CIP : ${item.cip}` : ''}
              ${item.requiresPrescription ? '<span style="color: red;"> ⚠️ Ordonnance requise</span>' : ''}
            </li>
          `).join('')}
        </ul>
        
        <p style="font-size: 1.2em; font-weight: bold; color: #0d9488;">
          Montant total : ${formatPrice(total)}
        </p>

        ${message ? `
        <div style="background-color: #fffbeb; padding: 15px; border-left: 4px solid #f59e0b; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #f59e0b;">Message du client</h3>
            <p style="margin: 0;">${message}</p>
        </div>
        ` : ''}

        <hr>
        <p style="color: #666;">
          Cet e-mail provient du système de réservation en ligne de la Pharmacie Nord Montargis.<br>
          Le paiement s'effectuera sur place.
        </p>
      </div>
    `;
};

/**
 * Crée le corps HTML de l'e-mail pour le CLIENT (Simplifié)
 */
const createClientEmail = (details) => {
    const { name, phone, email, cart, total } = details;

    return `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h1>Confirmation de votre réservation</h1>
        <p>Bonjour ${name},</p>
        <p>Nous avons bien reçu votre demande de réservation à la <strong>Pharmacie Nord Montargis</strong>. Votre commande sera préparée par notre équipe.</p>
        
        <div style="background-color: #f0fdfa; padding: 15px; border-left: 4px solid #0d9488; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #0d9488;">Vos coordonnées</h3>
            <p style="margin: 5px 0;"><strong>Nom :</strong> ${name}</p>
            <p style="margin: 5px 0;"><strong>Téléphone :</strong> ${phone}</p>
            <p style="margin: 5px 0;"><strong>E-mail :</strong> ${email}</p>
        </div>

        <div style="background-color: #f4f7f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Mentions importantes</h3>
            <p style="margin: 5px 0;">- Vous réglerez vos achats <strong>sur place</strong> lors du retrait.</p>
            <p style="margin: 5px 0;">- Une facture vous sera remise à ce moment-là.</p>
            <p style="margin: 5px 0;">- Nous vous contacterons par téléphone si besoin.</p>
        </div>

        <h3>Votre récapitulatif :</h3>
        <ul>
          ${cart.map(item => `
            <li>
              <strong>${item.name}</strong> (x${item.quantity})
            </li>
          `).join('')}
        </ul>
        <p style="font-size: 1.2em; font-weight: bold;">
          Total à régler sur place : ${formatPrice(total)}
        </p>
        <hr>
        <p>Merci de votre confiance et à bientôt !</p>
        <p>L'équipe de la Pharmacie Nord Montargis</p>
      </div>
    `;
};


/**
 * @route POST /api/cart/send-reservation
 */
router.post('/send-reservation', validateCart, async (req, res) => {
    
    console.log('[INFO] Requête de réservation de panier reçue...');
    
    try {
        if (missingVars.length > 0) {
            console.error('[ERREUR] ❌ Impossible d\'envoyer l\'email : variables manquantes');
            return res.status(500).json({ 
                error: 'Configuration serveur incomplète',
                message: 'Contactez l\'administrateur du site.',
                missingVars: missingVars
            });
        }
        
        const { name, phone, email, message, cart, total } = req.body;

        // Email pour le pharmacien
        const pharmacistEmailData = {
            from: process.env.FROM_EMAIL,
            to: [process.env.RECIPIENT_EMAIL], // ✅ MODIFICATION ICI
            subject: `Nouvelle Réservation de ${name} (Site Web)`,
            html: createPharmacistEmail(req.body),
        };

        // ✅ MODIFICATION ICI
        console.log(`[INFO] Envoi de la réservation à ${process.env.RECIPIENT_EMAIL}...`);
        const pharmacistResponse = await mg.messages.create(
            process.env.MAILGUN_DOMAIN, 
            pharmacistEmailData
        );
        console.log('[SUCCESS] Réservation envoyée au pharmacien:', pharmacistResponse.id);

        // Email de confirmation au client (TOUJOURS envoyé)
        const clientEmailData = {
            from: process.env.FROM_EMAIL,
            to: [email],
            subject: `Confirmation de votre réservation (Pharmacie Nord Montargis)`,
            html: createClientEmail(req.body),
        };

        try {
            console.log(`[INFO] Envoi de la confirmation client à ${email}...`);
            const clientResponse = await mg.messages.create(
                process.env.MAILGUN_DOMAIN, 
                clientEmailData
            );
            console.log('[SUCCESS] Confirmation envoyée au client:', clientResponse.id);
        } catch (clientError) {
            console.error("[ERREUR] Échec de l'envoi de la confirmation client:", clientError);
            // On ne bloque pas la réponse même si l'email client échoue
        }

        res.status(200).json({ message: 'Réservation envoyée avec succès !' });

    } catch (error) {
        console.error("[ERREUR] Échec de l'envoi de la réservation:", error);
        
        if (error.status) {
            return res.status(error.status).json({
                error: 'Erreur d\'envoi',
                message: 'Impossible d\'envoyer l\'email. Veuillez réessayer plus tard.',
                details: process.env.NODE_ENV === 'development' ? error.details : undefined
            });
        }
        
        res.status(500).json({ 
            error: 'Erreur serveur',
            message: 'Une erreur est survenue lors de l\'envoi.',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;