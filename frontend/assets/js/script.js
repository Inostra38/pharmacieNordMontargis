// ==========================================
// SCRIPT PRINCIPAL - Pharmacie Nord Montargis
// ==========================================

// ==========================================
// 1. DARK MODE (Bouton Lumière)
// ==========================================

const darkToggle = document.getElementById('darkToggle');
const darkIcon = document.getElementById('darkIcon');
const htmlElement = document.documentElement;

// Vérifier la préférence sauvegardée au chargement
const currentTheme = localStorage.getItem('theme');
if (currentTheme === 'light') {
    htmlElement.classList.remove('dark');
    if (darkIcon) darkIcon.textContent = '☀️'; // Icône soleil pour mode clair
} else {
    htmlElement.classList.add('dark');
    if (darkIcon) darkIcon.textContent = '🌙'; // Icône lune pour mode sombre (par défaut)
}

// Toggle du dark mode au clic
if (darkToggle) {
    darkToggle.addEventListener('click', () => {
        htmlElement.classList.toggle('dark');
        const isDark = htmlElement.classList.contains('dark');
        if (isDark) {
            localStorage.setItem('theme', 'dark');
            if (darkIcon) darkIcon.textContent = '🌙'; // Passer à lune
        } else {
            localStorage.setItem('theme', 'light');
            if (darkIcon) darkIcon.textContent = '☀️'; // Passer à soleil
        }
    });
}

// ==========================================
// 2. COPIER L'EMAIL (Version Sécurisée)
// ==========================================

function copyEmail() {
    // L'adresse e-mail est stockée directement ici, pas dans le HTML.
    const emailToCopy = 'contact@pharmacienordmontargis.fr';

    // Utiliser l'API Clipboard moderne si disponible
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(emailToCopy)
            .then(() => {
                showNotification('✅ Email copié !', 'success');
            })
            .catch(err => {
                console.error('Erreur lors de la copie (API Clipboard):', err);
                fallbackCopyEmail(emailToCopy); // Essayer la méthode alternative
            });
    } else {
        fallbackCopyEmail(emailToCopy); // Utiliser la méthode alternative
    }
}

// Méthode alternative (legacy) pour copier
function fallbackCopyEmail(email) {
    const textArea = document.createElement('textarea');
    textArea.value = email;
    textArea.style.position = 'fixed';
    textArea.style.top = '-9999px';
    textArea.style.left = '-9999px';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
        const successful = document.execCommand('copy');
        if (successful) {
            showNotification('✅ Email copié !', 'success');
        } else {
            console.error('Erreur lors de la copie (execCommand)');
            showNotification('❌ Erreur lors de la copie', 'error');
        }
    } catch (err) {
        console.error('Erreur fallback execCommand:', err);
        showNotification('❌ Impossible de copier', 'error');
    }

    document.body.removeChild(textArea);
}

// ==========================================
// 3. SYSTÈME DE NOTIFICATION
// ==========================================

function showNotification(message, type = 'info') {
    const existingNotif = document.getElementById('notification');
    if (existingNotif) {
        existingNotif.remove();
    }

    const notification = document.createElement('div');
    notification.id = 'notification';
    // Positionnement et style initial (hors écran)
    notification.className = `fixed top-24 right-4 z-[100] px-6 py-3 rounded-lg shadow-lg font-semibold text-sm transition-all duration-300 transform translate-x-[110%] opacity-0 ${
        type === 'success' ? 'bg-green-500 text-white' :
        type === 'error' ? 'bg-red-500 text-white' :
        'bg-blue-500 text-white'
    }`;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Animation d'entrée
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
        notification.style.opacity = '1';
    }, 10);

    // Supprimer après 3 secondes avec animation de sortie
    setTimeout(() => {
        notification.style.transform = 'translateX(110%)';
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300); // Attendre la fin de la transition pour supprimer
    }, 3000);
}


// ==========================================
// 4. GESTION DU BANDEAU D'INFORMATION
// ==========================================
// (Le code existant pour le bandeau reste ici)
const closeBandeau = document.getElementById('closeBandeau');
const infoBandeau = document.getElementById('infoBandeau');

if (localStorage.getItem('bandeauClosed') === 'true') {
    if (infoBandeau) infoBandeau.style.display = 'none';
}

if (closeBandeau) {
    closeBandeau.addEventListener('click', () => {
        if (infoBandeau) {
            infoBandeau.style.display = 'none';
            localStorage.setItem('bandeauClosed', 'true');
        }
    });
}


// ==========================================
// 5. BADGE STATUT OUVERT/FERMÉ (Avec Cercles Colorés)
// ==========================================

function updateOpenStatus() {
    const statusBadge = document.getElementById('statusBadge');
    if (!statusBadge) return;

    const now = new Date();
    const day = now.getDay();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentTime = hours * 60 + minutes;

    let statusText = '';
    let statusBgClass = '';
    let statusEmoji = '';

    const morningOpen = 540;   // 9h00
    const morningClose = 780;  // 13h00
    const afternoonOpen = 840; // 14h00
    const afternoonClose = 1140; // 19h00
    const saturdayOpen = 600;  // 10h00
    const saturdayClose = 1020; // 17h00
    const warningWindow = 30; // 30 minutes

    if (day === 0) { // Dimanche
        statusEmoji = '🔴';
        statusText = 'Fermé • Ouvre demain à 9h';
        statusBgClass = 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200';
    } else if (day >= 1 && day <= 5) { // Lun-Ven
        const opensSoonMorning = currentTime >= (morningOpen - warningWindow) && currentTime < morningOpen;
        const closesSoonMorning = currentTime >= (morningClose - warningWindow) && currentTime < morningClose;
        const opensSoonAfternoon = currentTime >= (afternoonOpen - warningWindow) && currentTime < afternoonOpen;
        const closesSoonAfternoon = currentTime >= (afternoonClose - warningWindow) && currentTime < afternoonClose;
        const isOpenMorning = currentTime >= morningOpen && currentTime < morningClose;
        const isOpenAfternoon = currentTime >= afternoonOpen && currentTime < afternoonClose;

        if (opensSoonMorning) {
            statusEmoji = '🔴'; statusText = 'Ouvre bientôt (9h)';
            statusBgClass = 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200';
        } else if (closesSoonMorning) {
            statusEmoji = '🟢'; statusText = 'Ferme bientôt (13h)';
            statusBgClass = 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
        } else if (opensSoonAfternoon) {
            statusEmoji = '🔴'; statusText = 'Ouvre bientôt (14h)';
            statusBgClass = 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200';
        } else if (closesSoonAfternoon) {
            statusEmoji = '🟢'; statusText = 'Ferme bientôt (19h)';
            statusBgClass = 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
        } else if (isOpenMorning || isOpenAfternoon) {
            statusEmoji = '🟢'; statusText = 'Ouvert';
            statusBgClass = 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
        } else if (currentTime < morningOpen) {
            statusEmoji = '🔴'; statusText = 'Fermé • Ouvre à 9h';
            statusBgClass = 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200';
        } else if (currentTime >= morningClose && currentTime < afternoonOpen) {
            statusEmoji = '🟠'; statusText = 'Pause déjeuner • Ouvre à 14h';
            statusBgClass = 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200';
        } else {
            statusEmoji = '🔴';
            const nextDayText = (day === 5) ? 'samedi à 10h' : 'demain à 9h';
            statusText = `Fermé • Ouvre ${nextDayText}`;
            statusBgClass = 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200';
        }
    } else { // Samedi (day === 6)
        const opensSoon = currentTime >= (saturdayOpen - warningWindow) && currentTime < saturdayOpen;
        const closesSoon = currentTime >= (saturdayClose - warningWindow) && currentTime < saturdayClose;
        const isOpen = currentTime >= saturdayOpen && currentTime < saturdayClose;

        if (opensSoon) {
            statusEmoji = '🔴'; statusText = 'Ouvre bientôt (10h)';
            statusBgClass = 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200';
        } else if (closesSoon) {
            statusEmoji = '🟢'; statusText = 'Ferme bientôt (17h)';
            statusBgClass = 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
        } else if (isOpen) {
            statusEmoji = '🟢'; statusText = 'Ouvert';
            statusBgClass = 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
        } else if (currentTime < saturdayOpen) {
            statusEmoji = '🔴'; statusText = 'Fermé • Ouvre à 10h';
            statusBgClass = 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200';
        } else {
            statusEmoji = '🔴'; statusText = 'Fermé • Ouvre lundi à 9h';
            statusBgClass = 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200';
        }
    }

    statusBadge.innerHTML = `${statusEmoji} ${statusText}`;
    statusBadge.className = `inline-flex items-center text-sm font-semibold px-3 py-1 rounded-full ${statusBgClass}`;
}


// ==========================================
// 6. ANIMATION AU SCROLL (EFFET HOVER-LIFT)
// ==========================================
// (Le code existant pour l'observer reste ici)
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('animate-fade-in');
            // Optionnel: Dé-observer après la première animation pour performance
            // observer.unobserve(entry.target);
        }
    });
}, observerOptions);


// ==========================================
// 7. SMOOTH SCROLL POUR LES ANCRES
// ==========================================
// (Le code existant pour le smooth scroll reste ici)
function setupSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            // Vérifier si c'est une ancre valide et pas juste '#'
            if (href && href.length > 1 && href.startsWith('#')) {
                try {
                    const target = document.querySelector(href);
                    if (target) {
                        e.preventDefault();
                        const offset = 80; // Hauteur approx de la navbar sticky
                        const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - offset;

                        window.scrollTo({
                            top: targetPosition,
                            behavior: 'smooth'
                        });
                    }
                } catch (error) {
                    console.warn(`Smooth scroll: Sélecteur invalide ou élément non trouvé pour href="${href}"`, error);
                }
            }
        });
    });
}

// ==========================================
// NOUVEAU: Générer et Télécharger vCard (.vcf)
// ==========================================

function downloadVCard() {
    // --- Informations de la Pharmacie ---
    const contact = {
        name: 'Pharmacie Nord Montargis',
        organization: 'Pharmacie Nord Montargis',
        title: 'Pharmacie',
        phone: '+33238852281',
        email: 'contact@pharmacienordmontargis.fr',
        street: '17 Avenue du Général Leclerc',
        city: 'Châlette-sur-Loing',
        postalCode: '45120',
        country: 'France',
        url: window.location.origin // Utilise l'URL actuelle du site
    };

    // --- Construction de la chaîne vCard (Format v3.0) ---
    const vCardString = `BEGIN:VCARD\r\n` +
                      `VERSION:3.0\r\n` +
                      `N:;${contact.name};;;\r\n` + // Nom
                      `FN:${contact.name}\r\n` +    // Nom Formaté
                      `ORG:${contact.organization}\r\n` + // Organisation
                      `TITLE:${contact.title}\r\n` +       // Titre
                      `TEL;TYPE=WORK,VOICE:${contact.phone}\r\n` + // Téléphone
                      `EMAIL;TYPE=PREF,INTERNET:${contact.email}\r\n` + // Email
                      `ADR;TYPE=WORK:;;${contact.street};${contact.city};;${contact.postalCode};${contact.country}\r\n` + // Adresse
                      `URL:${contact.url}\r\n` + // Site Web
                      `REV:${new Date().toISOString()}\r\n` + // Date Révision
                      `END:VCARD`;

    // --- Création et Téléchargement du Fichier ---
    try {
        const blob = new Blob([vCardString], { type: 'text/vcard;charset=utf-8' });
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = 'PharmacieNordMontargis.vcf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(link.href);
        console.log('vCard générée et téléchargement lancé.');
        // showNotification('Fichier contact (.vcf) généré !', 'success'); // Optionnel
    } catch (error) {
        console.error('Erreur lors de la génération de la vCard:', error);
        showNotification('Impossible de générer le fichier contact.', 'error');
    }
}


// ==========================================
// 9. EXÉCUTION AU CHARGEMENT DU DOM
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
   
    // Mettre à jour le statut ouvert/fermé
    updateOpenStatus();
    setInterval(updateOpenStatus, 60000); // Répéter chaque minute

    // Activer l'animation au scroll
    const elementsToAnimate = document.querySelectorAll('.hover-lift');
    elementsToAnimate.forEach(el => observer.observe(el));

    // Activer le smooth scroll
    setupSmoothScroll();

    // Attacher l'événement au bouton "Ajouter aux contacts"
    const addToContactsButton = document.getElementById('addToContactsBtn');
    if (addToContactsButton) {
        addToContactsButton.addEventListener('click', downloadVCard);
        console.log('✅ Écouteur ajouté pour le bouton "Ajouter aux contacts".');
    } else {
        // C'est normal si on n'est pas sur index.html
        // console.warn('⚠️ Bouton #addToContactsBtn non trouvé sur cette page.');
    }
//Fonction copier du bouton copier e-mail
const copyBtn = document.getElementById('copyEmailBtn');
if (copyBtn) {
    copyBtn.addEventListener('click', copyEmail);
    console.log('✅ Écouteur ajouté pour le bouton "Copier Email".');
}

    // Log final
    console.log('✅ Script principal chargé et initialisé');
    console.log('🌙 Dark mode:', htmlElement.classList.contains('dark') ? 'Activé' : 'Désactivé');

}); // Fin de DOMContentLoaded