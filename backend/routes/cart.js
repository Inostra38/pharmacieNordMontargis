const express = require('express');
const FormData = require('form-data'); 
const Mailgun = require('mailgun.js');
const router = express.Router();

// --- Configuration Mailgun ---
const mailgun = new Mailgun(FormData);
const mg = mailgun.client({
  username: 'api',
  key: process.env.MAILGUN_API_KEY, 
  url: process.env.MAILGUN_API_HOST || 'https://api.mailgun.net' 
});

// --- Helpers (pour formater l'e-mail) ---
const formatPrice = (price) => {
    return parseFloat(price).toFixed(2).replace('.', ',') + ' €';
};

/**
 * Crée le corps HTML de l'e-mail pour le PHARMACIEN (Simplifié)
 */
const createPharmacistEmail = (details) => {
    const { name, phone, email, message, items, total } = details; // MODIFICATION : Ajout de phone

    return `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h1>Nouvelle Réservation (Site Web)</h1>
        <p>Vous avez reçu une nouvelle réservation de <strong>${name}</strong>.</p>
        <hr>
        <h2>Informations Client</h2>
        <ul>
          <li><strong>Nom :</strong> ${name}</li>
          <li><strong>Téléphone :</strong> ${phone}</li>
          <li><strong>Email :</strong> ${email || 'Non fourni'}</li>
          <li><strong>Message / Heure de passage :</strong> ${message || 'Non fourni'}</li>
        </ul>
        <hr>
        <h2>Détail de la réservation</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #f4f4f4;">
              <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Produit</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">Qté</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">Prix Unitaire</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(item => `
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;">
                  ${item.name}
                  <br>
                  <small style="color: #555;">CIP: ${item.cip}</small>
                </td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${item.quantity}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${formatPrice(item.price)}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${formatPrice(item.price * item.quantity)}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr style="background-color: #f4f4f4;">
              <td colspan="3" style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold;">Total estimé</td>
              <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold;">${formatPrice(total)}</td>
            </tr>
          </tfoot>
        </table>
        <p style="margin-top: 15px; font-style: italic; color: #888;">
          Ceci est une réservation. Le paiement s'effectuera sur place.
        </p>
      </div>
    `;
};

/**
 * Crée le corps HTML de l'e-mail pour le CLIENT (Simplifié)
 */
const createClientEmail = (details) => {
    const { name, phone, email, items, total } = details; // MODIFICATION : Ajout de phone et email

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
          ${items.map(item => `
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
router.post('/send-reservation', async (req, res) => {
    
    console.log('[INFO] Requête de réservation de panier reçue...');
    
    try {
        const { name, phone, email, message, sendConfirmation, items, total } = req.body; // MODIFICATION : Ajout de phone

        // MODIFICATION : Validation incluant phone et email obligatoires
        if (!name || !phone || !email || !items || items.length === 0 || !total) {
            console.warn('[WARN] Requête de réservation invalide, données manquantes.');
            return res.status(400).json({ message: 'Données de réservation manquantes (nom, téléphone, email, items ou total).' });
        }
        
        const pharmacistEmailData = {
            from: process.env.FROM_EMAIL,
            to: [process.env.PHARMACIST_EMAIL],
            subject: `Nouvelle Réservation de ${name} (Site Web)`,
            html: createPharmacistEmail(req.body),
        };

        console.log(`[INFO] Envoi de la réservation à ${process.env.PHARMACIST_EMAIL}...`);
        const pharmacistResponse = await mg.messages.create(
            process.env.MAILGUN_DOMAIN, 
            pharmacistEmailData
        );
        console.log('[SUCCESS] Réservation envoyée au pharmacien:', pharmacistResponse.id);

        // MODIFICATION : Email de confirmation TOUJOURS envoyé (suppression de la condition if)
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
        res.status(500).json({ message: 'Une erreur est survenue lors de l\'envoi.' });
    }
});

module.exports = router;