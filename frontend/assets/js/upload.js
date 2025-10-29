// ==========================================
// UPLOAD.JS - AVEC PROTECTION CSRF ✅
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  const uploadForm = document.getElementById('upload-form');
  const submitButton = document.getElementById('submit-btn');
  const statusMessage = document.getElementById('status-message');

  // ✅ URL relative (pas de localhost en dur)
  const API_ENDPOINT = '/api/prescription/upload';

  if (!uploadForm) return;

  // ============================================
  // ATTENDRE QUE LE CSRF MANAGER SOIT PRÊT
  // ============================================
  function waitForCsrfManager() {
    if (window.csrfManager) {
      console.log('✅ CSRF Manager prêt pour upload.js');
      initForm();
    } else {
      console.log('⏳ Attente du CSRF Manager...');
      setTimeout(waitForCsrfManager, 100);
    }
  }

  waitForCsrfManager();

  // ============================================
  // INITIALISATION DU FORMULAIRE
  // ============================================
  function initForm() {
    uploadForm.addEventListener('submit', handleSubmit);
  }

  // ============================================
  // GESTION DE LA SOUMISSION AVEC CSRF
  // ============================================
  async function handleSubmit(event) {
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
      
      // ✅ 3. OBTENIR LE TOKEN CSRF
      const csrfToken = await window.csrfManager.getToken();
      
      console.log('📤 Envoi ordonnance avec protection CSRF');

      // ✅ 4. ENVOYER AVEC PROTECTION CSRF
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'CSRF-Token': csrfToken  // ✅ Ajouter le token CSRF
          // ⚠️ PAS de Content-Type pour FormData (laissez le navigateur le gérer)
        },
        body: formData,
        credentials: 'include'  // ✅ Important pour les cookies CSRF
      });

      // 5. Traiter la réponse
      const result = await response.json();

      // ✅ GESTION SPÉCIALE CSRF : Si erreur 403, réessayer avec nouveau token
      if (response.status === 403 && result.code === 'CSRF_TOKEN_INVALID') {
        console.warn('⚠️ Token CSRF invalide, rafraîchissement et nouvelle tentative...');
        
        // Rafraîchir le token
        await window.csrfManager.refreshToken();
        const newToken = await window.csrfManager.getToken();
        
        // Réessayer avec le nouveau token
        const retryResponse = await fetch(API_ENDPOINT, {
          method: 'POST',
          headers: {
            'CSRF-Token': newToken
          },
          body: formData,
          credentials: 'include'
        });
        
        const retryResult = await retryResponse.json();
        
        if (retryResponse.ok) {
          // Succès après retry
          showMessage('success', `✅ ${retryResult.message} Nous vous contacterons rapidement.`);
          uploadForm.reset();
        } else {
          throw new Error(retryResult.message || 'Une erreur est survenue.');
        }
        
        return; // Sortir de la fonction
      }

      if (response.ok) {
        // 6. Succès
        showMessage('success', `✅ ${result.message} Nous vous contacterons rapidement.`);
        uploadForm.reset(); // Vider le formulaire
        
        // Optionnel : Redirection après 3 secondes
        setTimeout(() => {
          // window.location.href = '/';
        }, 3000);
        
      } else {
        // 7. Erreur serveur (4xx, 5xx)
        throw new Error(result.message || 'Une erreur inconnue est survenue.');
      }

    } catch (error) {
      // 8. Erreur réseau ou autre
      console.error('❌ Erreur lors de l\'upload:', error);
      showMessage('error', `❌ Erreur : ${error.message}`);
    } finally {
      // 9. Réactiver le bouton
      submitButton.disabled = false;
      submitButton.innerHTML = `
        <span class="material-symbols-outlined" aria-hidden="true">lock</span>
        <span>Envoyer mon ordonnance</span>
      `;
    }
  }

  // ============================================
  // AFFICHAGE DES MESSAGES
  // ============================================
  /**
   * Affiche un message de statut à l'utilisateur.
   * @param {'success' | 'error' | 'loading'} type
   * @param {string} message
   */
  function showMessage(type, message) {
    statusMessage.innerHTML = ''; // Vider
    
    let bgColor, textColor, icon;
    switch (type) {
      case 'success':
        bgColor = 'bg-green-100 dark:bg-green-900';
        textColor = 'text-green-800 dark:text-green-200';
        icon = '✅';
        break;
      case 'error':
        bgColor = 'bg-red-100 dark:bg-red-900';
        textColor = 'text-red-800 dark:text-red-200';
        icon = '❌';
        break;
      default: // loading
        bgColor = 'bg-blue-100 dark:bg-blue-900';
        textColor = 'text-blue-800 dark:text-blue-200';
        icon = '⏳';
        break;
    }
    
    statusMessage.innerHTML = `
      <div class="${bgColor} ${textColor} p-4 rounded-lg text-sm font-medium text-center border-l-4 ${
        type === 'success' ? 'border-green-500' : 
        type === 'error' ? 'border-red-500' : 'border-blue-500'
      }">
        <span class="text-xl mr-2">${icon}</span>
        ${message}
      </div>
    `;
    
    // Auto-masquer après 10 secondes (sauf loading)
    if (type !== 'loading') {
      setTimeout(() => {
        statusMessage.innerHTML = '';
      }, 10000);
    }
  }
});

console.log('✅ upload.js chargé (avec protection CSRF)');