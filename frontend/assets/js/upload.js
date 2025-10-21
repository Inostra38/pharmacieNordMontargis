document.addEventListener('DOMContentLoaded', () => {
  const uploadForm = document.getElementById('upload-form');
  const submitButton = document.getElementById('submit-btn');
  const statusMessage = document.getElementById('status-message');

  // URL de l'endpoint backend
  // Pensez à changer localhost:3000 par l'URL de votre backend en production
  const API_ENDPOINT = 'http://localhost:3000/api/prescription/upload';

  if (!uploadForm) return;

  uploadForm.addEventListener('submit', async (event) => {
    event.preventDefault(); // Empêche le rechargement de la page

    // 1. Désactiver le bouton et afficher chargement
    submitButton.disabled = true;
    submitButton.innerHTML = `
      <div class="inline-block animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
      Envoi en cours...
    `;
    showMessage('loading', 'Envoi de votre ordonnance en cours...');

    try {
      // 2. Créer l'objet FormData
      const formData = new FormData(uploadForm);
      
      // 3. Envoyer les données au backend
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        body: formData,
        // Pas de 'Content-Type', 'fetch' le gère pour 'multipart/form-data'
      });

      const result = await response.json();

      if (response.ok) {
        // 4. Succès
        showMessage('success', `✅ ${result.message} Nous vous contacterons rapidement.`);
        uploadForm.reset(); // Vider le formulaire
      } else {
        // 5. Erreur serveur (4xx, 5xx)
        throw new Error(result.message || 'Une erreur inconnue est survenue.');
      }

    } catch (error) {
      // 6. Erreur réseau ou autre
      console.error('Erreur lors de l-upload:', error);
      showMessage('error', `❌ Erreur : ${error.message}`);
    } finally {
      // 7. Réactiver le bouton
      submitButton.disabled = false;
      submitButton.innerHTML = `
        <span class="material-symbols-outlined" aria-hidden="true">lock</span>
        <span>Envoyer mon ordonnance</span>
      `;
    }
  });

  /**
   * Affiche un message de statut à l'utilisateur.
   * @param {'success' | 'error' | 'loading'} type
   * @param {string} message
   */
  function showMessage(type, message) {
    statusMessage.innerHTML = ''; // Vider
    
    let bgColor, textColor;
    switch (type) {
      case 'success':
        bgColor = 'bg-green-100 dark:bg-green-900';
        textColor = 'text-green-800 dark:text-green-200';
        break;
      case 'error':
        bgColor = 'bg-red-100 dark:bg-red-900';
        textColor = 'text-red-800 dark:text-red-200';
        break;
      default: // loading
        bgColor = 'bg-blue-100 dark:bg-blue-900';
        textColor = 'text-blue-800 dark:text-blue-200';
        break;
    }
    
    statusMessage.innerHTML = `
      <div class_name="${bgColor} ${textColor} p-4 rounded-lg text-sm font-medium text-center">
        ${message}
      </div>
    `;
  }
});