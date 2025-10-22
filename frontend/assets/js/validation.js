document.addEventListener('DOMContentLoaded', () => {
    
    // --- Éléments du DOM ---
    const listContainer = document.getElementById('cart-summary-list');
    const totalElement = document.getElementById('cart-summary-total');
    const checkoutForm = document.getElementById('checkout-form');
    const submitButton = document.getElementById('submit-btn');
    const statusMessage = document.getElementById('status-message');
    const validationContainer = document.getElementById('validation-container');
    const successContainer = document.getElementById('success-container');
    const emailInput = document.getElementById('email');
    const confirmationCheckbox = document.getElementById('sendConfirmation');

    // --- URL du Backend ---
    // Assurez-vous que cette URL correspond à l'adresse de votre serveur backend
    const API_ENDPOINT = 'http://localhost:3000/api/cart/send-reservation';
    
    let cartItems = [];
    let cartTotal = 0;

    /**
     * Initialise la page DE VALIDATION (appelé APRES cartManagerReady)
     */
    function initValidationPage() {
        console.log('🛒 Validation.js : cartManager est prêt, initialisation...');
        
        // 1. Vérifier que le panier existe (sécurité supplémentaire)
        if (!window.cartManager) {
            showError('Erreur critique : le panier est inaccessible.');
            return;
        }

        // 2. Récupérer les données du panier
        cartItems = window.cartManager.items;
        cartTotal = window.cartManager.getTotal();

        // 3. Vérifier si le panier est vide
        if (cartItems.length === 0) {
            listContainer.innerHTML = '<p class="text-center py-4 text-gray-500 dark:text-gray-400">Votre panier est vide. <a href="catalogue.html" class="text-teal-500 hover:underline">Retour au catalogue</a>.</p>';
            totalElement.textContent = '0,00 €';
            // S'assurer que le formulaire et le bouton sont bien désactivés
            if(checkoutForm) checkoutForm.style.display = 'none'; // Cacher le formulaire
            if(submitButton) {
                 submitButton.disabled = true;
                 submitButton.classList.add('opacity-50', 'cursor-not-allowed');
            }
            return;
        }

        // 4. Afficher les éléments
        renderCartSummary();
        
        // 5. Attacher les écouteurs d'événements
        if (checkoutForm) {
            checkoutForm.addEventListener('submit', handleFormSubmit);
        }
        if (confirmationCheckbox) {
            confirmationCheckbox.addEventListener('change', toggleEmailRequirement);
        }
    }
    
    // --- Logique d'attente ---
    // Si cartManager est DÉJÀ prêt (au cas où), on lance direct
    if (window.cartManager) {
        initValidationPage();
    } else {
        // Sinon, on ATTEND l'événement personnalisé déclenché par cart-v2.js
        console.log('🛒 Validation.js : en attente de "cartManagerReady"...');
        document.addEventListener('cartManagerReady', initValidationPage);
    }
    // --- Fin Logique d'attente ---


    /**
     * Affiche le résumé du panier
     */
    function renderCartSummary() {
        if (!listContainer || !totalElement) {
             console.error("Éléments #cart-summary-list ou #cart-summary-total non trouvés !");
             return;
        }
        const formatPrice = (price) => parseFloat(price).toFixed(2).replace('.', ',') + ' €';

        listContainer.innerHTML = cartItems.map(item => `
            <div class="flex items-center justify-between py-3">
                <div>
                    <p class="font-semibold text-gray-800 dark:text-white">
                        ${item.name}
                    </p>
                    <p class="text-sm text-gray-600 dark:text-gray-400">
                        Qté : ${item.quantity} &times; ${formatPrice(item.price)}
                    </p>
                </div>
                <p class="font-semibold text-gray-800 dark:text-white">
                    ${formatPrice(item.quantity * item.price)}
                </p>
            </div>
        `).join('');
        
        totalElement.textContent = formatPrice(cartTotal);
    }

    /**
     * Rend le champ e-mail obligatoire si la case est cochée
     */
    function toggleEmailRequirement() {
        if (!emailInput || !confirmationCheckbox) return;
        
        if (confirmationCheckbox.checked) {
            emailInput.required = true;
            emailInput.placeholder = "E-mail (obligatoire pour la confirmation)";
        } else {
            emailInput.required = false;
            emailInput.placeholder = "Pour recevoir la confirmation";
        }
    }

    /**
     * Gère la soumission du formulaire
     */
    async function handleFormSubmit(event) {
        event.preventDefault();
        
        if(!submitButton) return;

        submitButton.disabled = true;
        submitButton.innerHTML = `
            <div class="inline-block animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
            Envoi en cours...
        `;
        showError(''); 

        try {
            const formData = new FormData(checkoutForm);
            const dataToSend = {
                name: formData.get('name'),
                email: formData.get('email'),
                message: formData.get('message'),
                sendConfirmation: formData.get('sendConfirmation') === 'on',
                items: cartItems, // On utilise les items déjà récupérés de cartManager
                total: cartTotal  // On utilise le total déjà récupéré de cartManager
            };

            // Validation simple côté client
            if (dataToSend.sendConfirmation && !dataToSend.email) {
                 throw new Error("L'adresse e-mail est requise pour recevoir une confirmation.");
            }

            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(dataToSend),
            });

            const result = await response.json();

            if (response.ok) {
                showSuccess();
            } else {
                throw new Error(result.message || 'Une erreur inconnue est survenue lors de l\'envoi.');
            }

        } catch (error) {
            console.error('Erreur lors de la réservation:', error);
            showError(`❌ Erreur : ${error.message}`);
            // Réactiver le bouton seulement en cas d'erreur
            submitButton.disabled = false;
            submitButton.innerHTML = `
                <span class="material-symbols-outlined" aria-hidden="true">lock</span>
                <span>Confirmer ma réservation</span>
            `;
        }
    }

    /**
     * Affiche l'écran de succès
     */
    function showSuccess() {
        if (window.cartManager) {
            window.cartManager.clear(); // Vide le localStorage et met à jour le badge
        }
        if(validationContainer) validationContainer.classList.add('hidden');
        if(successContainer) successContainer.classList.remove('hidden');
        window.scrollTo(0, 0); // Remonte en haut de page
    }

    /**
     * Affiche un message d'erreur sous le formulaire
     */
    function showError(message) {
        if (!statusMessage) return;
        
        if (!message) {
            statusMessage.innerHTML = ''; // Vide le message si vide
            return;
        }
        statusMessage.innerHTML = `
            <div class="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 p-4 rounded-lg text-sm font-medium text-center">
                ${message}
            </div>
        `;
    }

}); // Fin de DOMContentLoaded