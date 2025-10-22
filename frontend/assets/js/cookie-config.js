// ==========================================
// Configuration CookieConsent & Google Analytics
// VERSION CORRIGÉE - Utilise CookieConsent.acceptedCategory
// ==========================================

// --- Fonction pour charger et lancer Google Analytics ---
function runGoogleAnalytics() {
    if (typeof gtag === 'function') {
        // console.log('GA4 déjà chargé.');
        return;
    }
    console.log('✅ Consentement Analytiques accordé -> Chargement de Google Analytics (GA4)...');

    // ▼▼▼ REMPLACEZ PAR VOTRE ID DE MESURE GA4 ▼▼▼
    const gaMeasurementId = 'G-W6L5QZFKFL';
    // ▲▲▲ REMPLACEZ PAR VOTRE ID DE MESURE GA4 ▲▲▲

    if (!gaMeasurementId || gaMeasurementId === 'G-XXXXXXXXXX') {
        console.warn('⚠️ ID de mesure Google Analytics (gaMeasurementId) non configuré dans cookie-config.js !');
        return;
    }

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', gaMeasurementId);

    console.log(`✅ Google Analytics (GA4 - ${gaMeasurementId}) chargé et configuré.`);
}

// --- Initialisation de CookieConsent ---
document.addEventListener('DOMContentLoaded', () => {
    if (typeof CookieConsent === 'undefined') {
        console.error('ERREUR: La bibliothèque CookieConsent n\'a pas pu être chargée.');
        return;
    }

    CookieConsent.run({
        categories: {
            necessary: {
                enabled: true,
                readOnly: true
            },
            analytics: {
                enabled: false,
                autoClear: {
                     cookies: [
                         { name: /^_ga/, domain: window.location.hostname },
                         { name: /^_gid/, domain: window.location.hostname }
                     ]
                }
            }
        },

        language: {
            default: 'fr',
            translations: {
                fr: {
                    consentModal: {
                        title: 'Votre vie privée est importante pour nous',
                        description: 'Nous utilisons des cookies pour analyser notre trafic de manière anonyme et améliorer votre expérience sur le site. Vous pouvez accepter tous les cookies, refuser les cookies non essentiels, ou ajuster vos préférences.',
                        acceptAllBtn: 'Tout accepter',
                        acceptNecessaryBtn: 'Tout refuser',
                        showPreferencesBtn: 'Personnaliser',
                    },
                    preferencesModal: {
                        title: 'Préférences des Cookies',
                        acceptAllBtn: 'Tout accepter',
                        acceptNecessaryBtn: 'Tout refuser',
                        savePreferencesBtn: 'Enregistrer mes choix',
                        closeIconLabel: 'Fermer',
                        sections: [
                            {
                                title: 'Gestion de vos préférences',
                                description: 'Vous pouvez activer ou désactiver les catégories de cookies ci-dessous. Les cookies nécessaires ne peuvent pas être désactivés.'
                            }, {
                                title: 'Cookies Strictement Nécessaires 🔒',
                                description: 'Ces cookies sont indispensables au bon fonctionnement du site (ex: conservation du panier, préférence de thème sombre/clair). Ils ne collectent aucune information personnelle.',
                                linkedCategory: 'necessary'
                            }, {
                                title: 'Cookies Analytiques (Google Analytics) 📊',
                                description: 'Ces cookies nous aident à comprendre comment les visiteurs interagissent avec le site en collectant des informations de manière anonyme (pages visitées, durée de visite, etc.). Cela nous permet d\'améliorer le site.',
                                linkedCategory: 'analytics'
                            }, {
                                title: 'Plus d\'informations',
                                description: 'Pour plus de détails sur l\'utilisation des cookies, consultez notre <a href="#contact" class="cc__link">politique de confidentialité</a> ou <a href="#contact" class="cc__link">contactez-nous</a>.'
                            }
                        ]
                    }
                }
            }
        },

        // --- Callbacks CORRIGÉS ---

        onFirstConsent: (consent) => { // 'consent' object might contain more info
            console.log('🍪 Première action de consentement:', consent);
            // On vérifie déjà si analytics a été accepté lors de la première action
            if (CookieConsent.acceptedCategory('analytics')) {
                 runGoogleAnalytics();
            }
        },

        onConsent: () => { // Plus besoin de l'argument ici
            console.log('🍪 Consentement chargé/vérifié au chargement de la page.');
            // Utiliser la méthode officielle pour vérifier
            if (CookieConsent.acceptedCategory('analytics')) {
                runGoogleAnalytics();
            }
            // else { console.log('Analytics non accepté au chargement.'); } // Debug optionnel
        },

         onChange: ({changedCategories}) => {
             // 'changedCategories' est un tableau des noms des catégories modifiées
            console.log('🍪 Consentement modifié via le panneau de préférences.');
            console.log('Catégories modifiées:', changedCategories);

            if (changedCategories && changedCategories.includes('analytics')) {
                 // Utiliser la méthode officielle pour vérifier le nouvel état
                if (CookieConsent.acceptedCategory('analytics')) {
                    console.log('Analytics activé via préférences.');
                    runGoogleAnalytics();
                } else {
                    console.log('Analytics désactivé via préférences. Rechargement de la page...');
                    // Recharger est le plus simple pour arrêter GA et nettoyer via autoClear
                    window.location.reload();
                }
            }
        }
    });
});
