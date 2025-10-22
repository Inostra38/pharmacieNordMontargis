const express = require('express');
const cors = require('cors');
require('dotenv').config();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Middlewares ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- 1. Routes API ---
const prescriptionRoutes = require('./routes/prescription');
app.use('/api/prescription', prescriptionRoutes);

// NOUVEAU : Ajouter la route pour le panier
const cartRoutes = require('./routes/cart');
app.use('/api/cart', cartRoutes);


// --- 2. Serveur de Fichiers Frontend ---
// C'est la SEULE chose dont nous avons besoin pour le frontend.
// Il sert TOUS les fichiers (index.html, catalogue.html, assets/js/config.js, etc.)
const frontendDir = path.join(__dirname, '../frontend');
app.use(express.static(frontendDir));

// NOTE: On supprime l'ancien app.get('*') qui causait les problèmes.
// express.static() est assez intelligent pour :
// 1. Servir index.html quand on demande http://localhost:3000/
// 2. Servir catalogue.html quand on demande http://localhost:3000/catalogue.html
// 3. Servir assets/js/config.js quand il est demandé par une page.
//
// S'il ne trouve pas un fichier (ex: /foo.js), il enverra un vrai 404 Not Found,
// au lieu de index.html, ce qui corrige l'erreur.


// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`✅ Serveur COMPLET (Frontend + Backend) démarré.`);
  console.log(`👉 Ouvrez votre site ici : http://localhost:${PORT}`);
  console.log(`ℹ️ Le frontend est servi depuis: ${frontendDir}`);
});