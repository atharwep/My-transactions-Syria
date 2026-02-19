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

        // One-time interaction listener to enable sound
        document.addEventListener('click', () => {
            if (Notify.audio && Notify.audio.paused) {
                Notify.audio.play().then(() => Notify.audio.pause()).catch(() => { });
            }
        }, { once: true });

        // Request System Notification Permission
        if ("Notification" in window) {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    console.log('✅ System Notifications Enabled');
                }
            });
        }

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
            const promise = Notify.audio.play();
            if (promise !== undefined) {
                promise.catch(error => {
                    console.log("Audio play blocked - user interaction needed");
                });
            }
        }
    },

    show: (title, message, iconClass = 'fas fa-bell') => {
        // 1. Show In-App Notification
        const container = document.getElementById('royal-notif-container');
        if (container) {
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

            container.innerHTML = html; // Note: this replaces previous notification. To stack, use append/prepend.
            // But let's stick to replacement for now to avoid clutter, or maybe prepend?
            // The original code used innerHTML = html which replaces. Let's keep behavior but fix the variable ref.

            const el = document.getElementById(id);
            if (el) {
                setTimeout(() => el.classList.add('show'), 100);
                setTimeout(() => Notify.close(id), 8000);
            }
        }

        Notify.playAlert();

        // 2. Show System Notification (Background)
        if ("Notification" in window && Notification.permission === "granted") {
            // Check if page is hidden
            if (document.hidden) {
                const n = new Notification(title, {
                    body: message,
                    icon: 'https://cdn-icons-png.flaticon.com/512/9187/9187555.png', // App Logo
                    requireInteraction: true // Keep it valid until clicked
                });
                n.onclick = () => window.focus();
            }
        }

        // 3. Save to History
        Notify.saveToHistory({ title, message, icon: iconClass, timestamp: Date.now() });
    },

    saveToHistory: (notif) => {
        const hist = JSON.parse(localStorage.getItem('notif_history') || '[]');
        hist.unshift(notif);
        if (hist.length > 20) hist.pop(); // Keep last 20
        localStorage.setItem('notif_history', JSON.stringify(hist));

        // Update Badge in UI if exists
        const badge = document.getElementById('nav-badge');
        if (badge) {
            const current = parseInt(badge.innerText || '0');
            badge.innerText = current + 1;
            badge.style.display = 'block';
        }
        // Also check wallet badge
        const wBadge = document.getElementById('wallet-badge');
        if (wBadge) wBadge.style.display = 'block';
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

    // 🔥 NEW: Send Real-Time Notification via Firebase
    send: (targetPhone, title, message, icon = 'fas fa-bell') => {
        if (typeof firebaseDB === 'undefined') {
            // Fallback for local dev without firebase
            if (Store.user && Store.user.phone === targetPhone) {
                Notify.show(title, message, icon);
            }
            return;
        }

        const notifData = {
            id: Date.now(),
            title: title,
            message: message,
            icon: icon,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            read: false
        };

        // Push to Firebase
        firebaseDB.ref(`notifications/${targetPhone}`).push(notifData)
            .then(() => console.log(`📢 Notification sent to ${targetPhone}`))
            .catch(err => console.error("Notification Error:", err));
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
// Global hooks removed - moved to Auth.js directly to avoid dependency issues

document.addEventListener('DOMContentLoaded', Notify.init);
