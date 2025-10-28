// ==========================================
// CookieConsent - Configuration ULTRA-SIMPLE
// Pharmacie Nord Montargis
// Tout visible - Pas d'accordéon
// ==========================================

// Fonction pour charger Google Analytics
function loadGA() {
    if (window.gtag) return;
    
    console.log('✅ GA4 activé');
    const GA_ID = 'G-W6L5QZFKFL';
    
    const script = document.createElement('script');
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    script.async = true;
    document.head.appendChild(script);
    
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', GA_ID);
}

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    
    if (!window.CookieConsent) {
        console.error('❌ CookieConsent non chargé');
        return;
    }
    
    CookieConsent.run({
        
        // Mode strict RGPD
        mode: 'opt-in',
        
        // Désactiver l'accordéon - tout ouvert
        guiOptions: {
            consentModal: {
                layout: 'box',
                position: 'bottom center',
                equalWeightButtons: true,
                flipButtons: false
            },
            preferencesModal: {
                layout: 'box',
                position: 'right',
                equalWeightButtons: true,
                flipButtons: false
            }
        },
        
        // Cacher la bannière quand le modal s'ouvre
        disablePageInteraction: true,
        
        // Catégories
        categories: {
            necessary: {
                enabled: true,
                readOnly: true
            },
            analytics: {
                enabled: false,
                autoClear: {
                    cookies: [
                        {
                            name: /^(_ga|_gid)/
                        }
                    ]
                }
            }
        },
        
        // Langue française
        language: {
            default: 'fr',
            translations: {
                fr: {
                    consentModal: {
                        title: 'Cookies',
                        description: 'Ce site utilise des cookies pour améliorer votre expérience. Les cookies essentiels sont nécessaires au fonctionnement du site.',
                        acceptAllBtn: 'Tout accepter',
                        acceptNecessaryBtn: 'Tout refuser',
                        showPreferencesBtn: 'Gérer mes préférences',
                        footer: '<a href="/mentions-legales.html">Mentions légales</a>'
                    },
                    preferencesModal: {
                        title: 'Préférences des cookies',
                        acceptAllBtn: 'Tout accepter',
                        acceptNecessaryBtn: 'Tout refuser',
                        savePreferencesBtn: 'Enregistrer',
                        closeIconLabel: 'Fermer',
                        sections: [
                            {
                                title: 'Cookies essentiels',
                                description: 'Ces cookies sont nécessaires au bon fonctionnement du site. Ils ne peuvent pas être désactivés.',
                                linkedCategory: 'necessary'
                            },
                            {
                                title: 'Cookies statistiques',
                                description: 'Ces cookies nous aident à améliorer le site en collectant des statistiques anonymes via Google Analytics.',
                                linkedCategory: 'analytics'
                            }
                        ]
                    }
                }
            }
        },
        
        // Callbacks
        onFirstConsent: function() {
            console.log('🍪 Premier consentement enregistré');
            if (CookieConsent.acceptedCategory('analytics')) {
                loadGA();
            }
        },
        
        onConsent: function() {
            console.log('🍪 Consentement mis à jour');
            if (CookieConsent.acceptedCategory('analytics')) {
                loadGA();
            }
        },
        
        onChange: function({changedCategories}) {
            console.log('🔄 Catégories modifiées:', changedCategories);
            if (changedCategories && changedCategories.includes('analytics')) {
                if (CookieConsent.acceptedCategory('analytics')) {
                    loadGA();
                } else {
                    console.log('🔄 Rechargement pour supprimer GA');
                    location.reload();
                }
            }
        },
        
        onModalShow: function({modalName}) {
            console.log('📋 Modal ouvert:', modalName);
            // Cacher la bannière quand le modal de préférences s'ouvre
            if (modalName === 'preferencesModal') {
                const banner = document.querySelector('#cc-main .cm');
                if (banner) {
                    banner.style.display = 'none';
                }
            }
        },
        
        onModalHide: function({modalName}) {
            console.log('✖️ Modal fermé:', modalName);
            // Réafficher la bannière si aucun consentement n'a été donné
            if (modalName === 'preferencesModal') {
                const banner = document.querySelector('#cc-main .cm');
                if (banner && !CookieConsent.validConsent()) {
                    banner.style.display = 'block';
                }
            }
        }
    });
    
    console.log('✅ CookieConsent initialisé');
});