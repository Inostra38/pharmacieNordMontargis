// ==========================================
// SCRIPT PRINCIPAL - Pharmacie Nord Montargis
// ==========================================

// ==========================================
// 1. DARK MODE (Bouton Lumière)
// ==========================================

const darkToggle = document.getElementById('darkToggle');
const darkIcon = document.getElementById('darkIcon');
const htmlElement = document.documentElement;

// Vérifier la préférence sauvegardée
const currentTheme = localStorage.getItem('theme');
if (currentTheme === 'light') {
    htmlElement.classList.remove('dark');
    if (darkIcon) darkIcon.textContent = '☀️';
} else {
    htmlElement.classList.add('dark');
    if (darkIcon) darkIcon.textContent = '🌙';
}

// Toggle du dark mode
if (darkToggle) {
    darkToggle.addEventListener('click', () => {
        htmlElement.classList.toggle('dark');
        
        if (htmlElement.classList.contains('dark')) {
            localStorage.setItem('theme', 'dark');
            if (darkIcon) darkIcon.textContent = '🌙';
        } else {
            localStorage.setItem('theme', 'light');
            if (darkIcon) darkIcon.textContent = '☀️';
        }
    });
}

// ==========================================
// 2. COPIER L'EMAIL
// ==========================================

function copyEmail() {
    const email = document.getElementById('email').textContent;
    
    // Utiliser l'API Clipboard moderne
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(email)
            .then(() => {
                showNotification('✅ Email copié !', 'success');
            })
            .catch(err => {
                console.error('Erreur lors de la copie:', err);
                fallbackCopyEmail(email);
            });
    } else {
        fallbackCopyEmail(email);
    }
}

// Méthode alternative pour copier (pour les anciens navigateurs)
function fallbackCopyEmail(email) {
    const textArea = document.createElement('textarea');
    textArea.value = email;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        const successful = document.execCommand('copy');
        if (successful) {
            showNotification('✅ Email copié !', 'success');
        } else {
            showNotification('❌ Erreur lors de la copie', 'error');
        }
    } catch (err) {
        console.error('Erreur fallback:', err);
        showNotification('❌ Impossible de copier', 'error');
    }
    
    document.body.removeChild(textArea);
}

// ==========================================
// 3. SYSTÈME DE NOTIFICATION
// ==========================================

function showNotification(message, type = 'info') {
    // Supprimer toute notification existante
    const existingNotif = document.getElementById('notification');
    if (existingNotif) {
        existingNotif.remove();
    }
    
    // Créer la notification
    const notification = document.createElement('div');
    notification.id = 'notification';
    notification.className = `fixed top-24 right-4 z-50 px-6 py-3 rounded-lg shadow-lg font-semibold text-sm transition-all duration-300 ${
        type === 'success' ? 'bg-green-500 text-white' : 
        type === 'error' ? 'bg-red-500 text-white' : 
        'bg-blue-500 text-white'
    }`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Animation d'entrée
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateX(0)';
    }, 10);
    
    // Supprimer après 3 secondes
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ==========================================
// 4. GESTION DU BANDEAU D'INFORMATION
// ==========================================

const closeBandeau = document.getElementById('closeBandeau');
const infoBandeau = document.getElementById('infoBandeau');

// Vérifier si le bandeau a été fermé
const bandeauClosed = localStorage.getItem('bandeauClosed');
if (bandeauClosed === 'true') {
    if (infoBandeau) infoBandeau.style.display = 'none';
}

// Fermer le bandeau
if (closeBandeau) {
    closeBandeau.addEventListener('click', () => {
        if (infoBandeau) {
            infoBandeau.style.display = 'none';
            localStorage.setItem('bandeauClosed', 'true');
        }
    });
}

// ==========================================
// 5. BADGE STATUT OUVERT/FERMÉ
// ==========================================

function updateOpenStatus() {
    const statusBadge = document.getElementById('statusBadge');
    if (!statusBadge) return;
    
    const now = new Date();
    const day = now.getDay(); // 0 = Dimanche, 1 = Lundi, etc.
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentTime = hours * 60 + minutes; // Temps en minutes depuis minuit
    
    let isOpen = false;
    let statusText = '';
    let statusClass = '';
    
    // Dimanche (0) = Fermé
    if (day === 0) {
        statusText = '🔴 Fermé';
        statusClass = 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200';
    }
    // Lundi au Vendredi (1-5)
    else if (day >= 1 && day <= 5) {
        const morning = currentTime >= 540 && currentTime < 780;   // 9h00 - 13h00
        const afternoon = currentTime >= 840 && currentTime < 1140; // 14h00 - 19h00
        
        isOpen = morning || afternoon;
        
        if (isOpen) {
            statusText = '🟢 Ouvert';
            statusClass = 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
        } else if (currentTime < 540) {
            statusText = '🔴 Fermé • Ouvre à 9h';
            statusClass = 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200';
        } else if (currentTime >= 780 && currentTime < 840) {
            statusText = '🟠 Pause déjeuner • Ouvre à 14h';
            statusClass = 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200';
        } else {
            statusText = '🔴 Fermé • Ouvre demain à 9h';
            statusClass = 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200';
        }
    }
    // Samedi (6)
    else if (day === 6) {
        isOpen = currentTime >= 600 && currentTime < 1020; // 10h00 - 17h00
        
        if (isOpen) {
            statusText = '🟢 Ouvert';
            statusClass = 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
        } else if (currentTime < 600) {
            statusText = '🔴 Fermé • Ouvre à 10h';
            statusClass = 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200';
        } else {
            statusText = '🔴 Fermé • Ouvre lundi à 9h';
            statusClass = 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200';
        }
    }
    
    statusBadge.textContent = statusText;
    statusBadge.className = `text-sm font-semibold px-3 py-1 rounded-full ${statusClass}`;
}

// Mettre à jour le statut immédiatement et toutes les minutes
updateOpenStatus();
setInterval(updateOpenStatus, 60000);

// ==========================================
// 6. ANIMATION AU SCROLL (EFFET HOVER-LIFT)
// ==========================================

// Ajouter une classe d'animation au scroll pour les éléments
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('animate-fade-in');
        }
    });
}, observerOptions);

// Observer tous les éléments avec la classe hover-lift
document.addEventListener('DOMContentLoaded', () => {
    const elements = document.querySelectorAll('.hover-lift');
    elements.forEach(el => observer.observe(el));
});

// ==========================================
// 7. SMOOTH SCROLL POUR LES ANCRES
// ==========================================

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href !== '#' && href !== '') {
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                const offset = 80; // Hauteur de la navbar
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - offset;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        }
    });
});

// ==========================================
// 8. AJOUT DES STYLES CSS PERSONNALISÉS
// ==========================================

// Ajouter les styles pour les transitions et animations
const style = document.createElement('style');
style.textContent = `
    /* Transitions douces pour le dark mode */
    .transition-colors-slow {
        transition: background-color 0.3s ease, color 0.3s ease;
    }
    
    /* Animation d'apparition au scroll */
    @keyframes fadeIn {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    .animate-fade-in {
        animation: fadeIn 0.6s ease-out forwards;
    }
    
    /* Animation pour le badge pulsant */
    @keyframes pulse-badge {
        0%, 100% {
            opacity: 1;
        }
        50% {
            opacity: 0.7;
        }
    }
    
    .animate-pulse-badge {
        animation: pulse-badge 2s ease-in-out infinite;
    }
    
    /* Effet hover lift */
    .hover-lift {
        transition: transform 0.3s ease, box-shadow 0.3s ease;
    }
    
    .hover-lift:hover {
        transform: translateY(-4px);
    }
    
    /* Style pour les notifications */
    #notification {
        opacity: 0;
        transform: translateX(100%);
    }
    
    /* Scroll offset pour les ancres */
    .scroll-offset {
        scroll-margin-top: 100px;
    }
    
    /* Limitation de lignes */
    .line-clamp-1 {
        display: -webkit-box;
        -webkit-line-clamp: 1;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }
    
    .line-clamp-2 {
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }
`;
document.head.appendChild(style);

// ==========================================
// 9. LOG DE DÉMARRAGE
// ==========================================

console.log('✅ Script principal chargé avec succès');
console.log('🌙 Dark mode:', htmlElement.classList.contains('dark') ? 'Activé' : 'Désactivé');
console.log('🔧 Fonction copyEmail() prête');
console.log('🕐 Statut d\'ouverture mis à jour');
