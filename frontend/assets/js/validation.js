document.addEventListener('DOMContentLoaded', () => {

    const listContainer = document.getElementById('cart-summary-list');
    const totalElement = document.getElementById('cart-summary-total');
    const checkoutForm = document.getElementById('checkout-form');
    const submitButton = document.getElementById('submit-btn');
    const statusMessage = document.getElementById('status-message');
    const validationContainer = document.getElementById('validation-container');
    const successContainer = document.getElementById('success-container');
    const emailInput = document.getElementById('email');
    const confirmationCheckbox = document.getElementById('sendConfirmation');

    const API_ENDPOINT = 'http://localhost:3000/api/cart/send-reservation';

    let cartItems = [];
    let cartTotal = 0;

    function initValidationPage() {
        // console.log('🛒 Validation.js : cartManager est prêt, initialisation...');

        if (!window.cartManager) {
            showError('Erreur critique : le panier est inaccessible.');
            return;
        }

        cartItems = window.cartManager.items;
        cartTotal = window.cartManager.getTotal(); // Appelle getTotal() qui calcule avec promos

        if (cartItems.length === 0) {
            listContainer.innerHTML = '<p class="text-center py-4 text-gray-500 dark:text-gray-400">Votre panier est vide. <a href="catalogue.html" class="text-teal-500 hover:underline">Retour au catalogue</a>.</p>';
            totalElement.textContent = '0,00 €';
            if(checkoutForm) checkoutForm.style.display = 'none';
            if(submitButton) {
                 submitButton.disabled = true;
                 submitButton.classList.add('opacity-50', 'cursor-not-allowed');
            }
            return;
        }

        renderCartSummary(); // Affiche le panier et le total correct

        if (checkoutForm) {
            checkoutForm.addEventListener('submit', handleFormSubmit);
        }
        if (confirmationCheckbox) {
            confirmationCheckbox.addEventListener('change', toggleEmailRequirement);
        }
    }

    if (window.cartManager) {
        initValidationPage();
    } else {
        // console.log('🛒 Validation.js : en attente de "cartManagerReady"...');
        document.addEventListener('cartManagerReady', initValidationPage);
    }

    function renderCartSummary() {
        if (!listContainer || !totalElement) {
             console.error("Éléments #cart-summary-list ou #cart-summary-total non trouvés !");
             return;
        }
        const formatPrice = (price) => {
             if (typeof price !== 'number' || !Number.isFinite(price)) { return 'N/A'; }
             return price.toFixed(2).replace('.', ',') + ' €';
        };

        // console.log('DEBUG validation.js - Items à afficher dans le résumé:', cartItems);

        listContainer.innerHTML = cartItems.map(item => {
            const quantity = item.quantity;
            const unitPrice = (typeof item.price === 'number') ? item.price : 0;
            const basePrice = (typeof item.basePrice === 'number') ? item.basePrice : unitPrice;
            const promoText = (item.promoLibelle || '').toLowerCase();
            const lotSize = item.lotSize;
            const lotTotal = item.lotTotal;

            const lineBaseTotal = quantity * basePrice;

            let linePromoTotal = 0;
             if (typeof lotSize === 'number' && lotSize > 1 && typeof lotTotal === 'number' && quantity >= lotSize) {
                 const numLots = Math.floor(quantity / lotSize);
                 const remainingQty = quantity % lotSize;
                 linePromoTotal = (numLots * lotTotal) + (remainingQty * unitPrice);
            } else if ((promoText.includes('sur le 2') || promoText.includes('sur le deux')) && basePrice > 0) {
                const discountMatch = promoText.match(/(\d+)[\s%]*%/);
                const discountPercent = discountMatch ? parseInt(discountMatch[1]) / 100 : 0;
                 if (discountPercent > 0) {
                    const numPairs = Math.floor(quantity / 2);
                    const remainingQty = quantity % 2;
                    const discountedPrice = basePrice * (1 - discountPercent);
                    linePromoTotal = (numPairs * (basePrice + discountedPrice)) + (remainingQty * basePrice);
                 } else { linePromoTotal = quantity * unitPrice; }
            } else {
                linePromoTotal = quantity * unitPrice;
            }

            const showLineBaseTotalCrossed = lineBaseTotal.toFixed(2) !== linePromoTotal.toFixed(2);

            let unitPriceHtml = '';
            const showUnitPriceCrossed = typeof item.basePrice === 'number' && item.basePrice.toFixed(2) !== item.price.toFixed(2);
            if (showUnitPriceCrossed) {
                unitPriceHtml = `
                    <span class="line-through text-gray-500 dark:text-gray-400">${formatPrice(item.basePrice)}</span>
                    <span class="font-bold text-red-600 dark:text-red-400 ml-1">${formatPrice(item.price)}</span>
                `;
            } else {
                unitPriceHtml = `<span>${formatPrice(item.price)}</span>`;
            }

            let lineTotalHtml = '';
            if (showLineBaseTotalCrossed) {
                 lineTotalHtml = `
                    <span class="line-through text-gray-500 dark:text-gray-400 text-sm">${formatPrice(lineBaseTotal)}</span>
                    <span class="font-bold text-red-600 dark:text-red-400 ml-1">${formatPrice(linePromoTotal)}</span>
                 `;
            } else {
                 lineTotalHtml = `<span class="font-semibold text-gray-800 dark:text-white">${formatPrice(linePromoTotal)}</span>`;
            }

            return `
            <div class="flex items-start justify-between py-3 border-b border-gray-100 dark:border-gray-700">
                <div class="flex-1 pr-4">
                    <p class="font-semibold text-gray-800 dark:text-white">
                        ${item.name}
                    </p>
                    <p class="text-sm text-gray-600 dark:text-gray-400">
                        Qté : ${item.quantity} &times; ${unitPriceHtml} / unité
                    </p>
                    ${item.promoLibelle ? `<p class="text-xs text-red-600 dark:text-red-400 mt-1">${item.promoLibelle}</p>` : ''}
                </div>
                <div class="text-right flex-shrink-0">
                   ${lineTotalHtml}
                </div>
            </div>
            `;
        }).join('');

        // console.log(`DEBUG validation.js - Variable cartTotal (promo incluse) avant affichage: ${cartTotal}`);
        totalElement.textContent = formatPrice(cartTotal);
        // console.log('DEBUG validation.js - Affichage du total final mis à jour.');
    }

    function toggleEmailRequirement() {
        if (!emailInput || !confirmationCheckbox) return;
        emailInput.required = confirmationCheckbox.checked;
        emailInput.placeholder = confirmationCheckbox.checked ? "E-mail (obligatoire pour la confirmation)" : "Pour recevoir la confirmation";
    }

    async function handleFormSubmit(event) {
        event.preventDefault();
        if(!submitButton || !checkoutForm) return;

        submitButton.disabled = true;
        submitButton.innerHTML = `<div class="inline-block animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div> Envoi en cours...`;
        showError('');

        try {
            const formData = new FormData(checkoutForm);
            const dataToSend = {
                name: formData.get('name'),
                email: formData.get('email'),
                message: formData.get('message'),
                sendConfirmation: formData.get('sendConfirmation') === 'on',
                items: cartItems,
                total: cartTotal
            };

            if (!dataToSend.name) throw new Error("Le nom complet est requis.");
            if (dataToSend.sendConfirmation && !dataToSend.email) throw new Error("L'adresse e-mail est requise pour recevoir une confirmation.");

            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataToSend),
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Une erreur inconnue est survenue lors de l\'envoi.');

            showSuccess();

        } catch (error) {
            console.error('Erreur lors de la réservation:', error);
            showError(`❌ Erreur : ${error.message}`);
            submitButton.disabled = false; // Réactiver seulement en cas d'erreur
            submitButton.innerHTML = `<span class="material-symbols-outlined" aria-hidden="true">lock</span> <span>Confirmer ma réservation</span>`;
        }
    }

    function showSuccess() {
        if (window.cartManager) window.cartManager.clear();
        if(validationContainer) validationContainer.classList.add('hidden');
        if(successContainer) successContainer.classList.remove('hidden');
        window.scrollTo(0, 0);
    }

    function showError(message) {
        if (!statusMessage) return;
        if (!message) {
            statusMessage.innerHTML = '';
            return;
        }
        statusMessage.innerHTML = `<div class="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 p-4 rounded-lg text-sm font-medium text-center mt-4">${message}</div>`;
    }

}); // Fin de DOMContentLoaded