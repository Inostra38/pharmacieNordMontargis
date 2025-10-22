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

const cartRoutes = require('./routes/cart');
app.use('/api/cart', cartRoutes);


// --- 2. Serveur de Fichiers Frontend ---
const frontendDir = path.join(__dirname, '../frontend');
app.use(express.static(frontendDir));

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`✅ Serveur COMPLET (Frontend + Backend) démarré.`);
  console.log(`👉 Ouvrez votre site ici : http://localhost:${PORT}`);
  console.log(`ℹ️ Le frontend est servi depuis: ${frontendDir}`);
});