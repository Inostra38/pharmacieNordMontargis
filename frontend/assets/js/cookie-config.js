// ==========================================
// CookieConsent - Configuration ULTRA-SIMPLE et ACCESSIBLE
// Pharmacie Nord Montargis
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
        
        // Mode strict ARIA
        mode: 'opt-in',
        
        // Catégories
        categories: {
            necessary: {
                enabled: true,
                readOnly: true
            },
            analytics: {
                enabled: false
            }
        },
        
        // Langue
        language: {
            default: 'fr',
            translations: {
                fr: {
                    consentModal: {
                        title: 'Cookies',
                        description: 'Ce site utilise des cookies pour améliorer votre expérience.',
                        acceptAllBtn: 'Accepter',
                        acceptNecessaryBtn: 'Refuser',
                        showPreferencesBtn: 'Choisir'
                    },
                    preferencesModal: {
                        title: 'Vos préférences',
                        acceptAllBtn: 'Accepter tout',
                        acceptNecessaryBtn: 'Refuser',
                        savePreferencesBtn: 'Valider',
                        closeIconLabel: 'Fermer',
                        sections: [
                            {
                                title: 'Cookies essentiels',
                                description: 'Nécessaires au fonctionnement (panier, préférences).',
                                linkedCategory: 'necessary'
                            },
                            {
                                title: 'Cookies statistiques',
                                description: 'Pour améliorer le site (Google Analytics).',
                                linkedCategory: 'analytics'
                            }
                        ]
                    }
                }
            }
        },
        
        // Callbacks
        onFirstConsent: function() {
            if (CookieConsent.acceptedCategory('analytics')) {
                loadGA();
            }
        },
        
        onConsent: function() {
            if (CookieConsent.acceptedCategory('analytics')) {
                loadGA();
            }
        },
        
        onChange: function({changedCategories}) {
            if (changedCategories && changedCategories.includes('analytics')) {
                if (CookieConsent.acceptedCategory('analytics')) {
                    loadGA();
                } else {
                    location.reload();
                }
            }
        }
    });
});