/**
 * Royal High-Priority Notification System
 */

const Notify = {
    soundUrl: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3', // Premium alert sound
    audio: null,

    init: () => {
        // Preload sound
        Notify.audio = new Audio(Notify.soundUrl);
        Notify.audio.load();

        // Create Container in Body if not exists
        if (!document.getElementById('royal-notif-container')) {
            const div = document.createElement('div');
            div.id = 'royal-notif-container';
            document.body.appendChild(div);
        }

        // Start Admin Polling for Doctor Reviews
        if (Store.user && Store.user.role === 'ADMIN') {
            setInterval(Notify.checkAdminTasks, 15000); // Check every 15s
            Notify.checkAdminTasks(); // Initial check
        }
    },

    playAlert: () => {
        if (Notify.audio) {
            Notify.audio.currentTime = 0;
            Notify.audio.play().catch(e => console.log("Audio play blocked until user interaction"));
        }
    },

    show: (title, message, iconClass = 'fas fa-bell') => {
        const container = document.getElementById('royal-notif-container');
        const id = 'notif-' + Date.now();

        const html = `
            <div id="${id}" class="royal-notification">
                <div class="notif-icon"><i class="${iconClass}"></i></div>
                <div class="notif-content">
                    <p class="notif-title">${title}</p>
                    <p class="notif-text">${message}</p>
                </div>
                <i class="fas fa-times notif-close" onclick="Notify.close('${id}')"></i>
            </div>
        `;

        container.innerHTML = html;
        const el = document.getElementById(id);

        setTimeout(() => el.classList.add('show'), 100);
        Notify.playAlert();

        // Auto close after 8s
        setTimeout(() => Notify.close(id), 8000);
    },

    close: (id) => {
        const el = document.getElementById(id);
        if (el) {
            el.classList.remove('show');
            setTimeout(() => el.remove(), 500);
        }
    },

    // Specific High-Priority Admin Check
    checkAdminTasks: () => {
        const doctors = Store.getData('doctors') || [];
        const pendingCount = doctors.filter(d => !d.isVerified).length;
        const lastCount = parseInt(localStorage.getItem('last_pending_count') || '0');

        if (pendingCount > lastCount) {
            Notify.show(
                "تنبيه إداري عاجل",
                `هناك ${pendingCount} طلبات انضمام أطباء جديدة بانتظار المراجعة والاعتماد.`,
                "fas fa-user-md"
            );
            localStorage.setItem('last_pending_count', pendingCount);
            Notify.updateBadge(pendingCount);
        } else if (pendingCount === 0) {
            localStorage.setItem('last_pending_count', '0');
            Notify.updateBadge(0);
        }
    },

    updateBadge: (count) => {
        const walletNav = document.querySelector('a[href="wallet.html"]');
        if (walletNav && Store.user.role === 'ADMIN') {
            walletNav.style.position = 'relative';
            let badge = walletNav.querySelector('.nav-notif-dot');
            if (count > 0) {
                if (!badge) {
                    badge = document.createElement('div');
                    badge.className = 'nav-notif-dot';
                    walletNav.appendChild(badge);
                }
                badge.innerText = count;
            } else if (badge) {
                badge.remove();
            }
        }
    }
};

// Global hooks for financial actions
const originalUpdateBalance = Store.updateUserBalance;
Store.updateUserBalance = (phone, amount, currency, title, performedByRole) => {
    const res = originalUpdateBalance(phone, amount, currency, title, performedByRole);
    if (res.success && Store.user && Store.user.phone === phone) {
        if (amount < 0) {
            Notify.show(
                "عملية خصم/سحب",
                `تم خصم ${Math.abs(amount).toLocaleString()} ${currency} من محفظتك. (${title})`,
                "fas fa-minus-circle"
            );
        } else if (amount > 0) {
            Notify.show(
                "تم استلام رصيد",
                `تمت إضافة ${amount.toLocaleString()} ${currency} إلى محفظتك بنجاح.`,
                "fas fa-plus-circle"
            );
        }
    }
    return res;
};

document.addEventListener('DOMContentLoaded', Notify.init);
