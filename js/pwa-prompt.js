let deferredPrompt;

const PwaPrompt = {
    init: () => {
        // Prevent default install prompt
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            // Check if already dismissed recently
            if (!localStorage.getItem('pwa_dismissed')) {
                PwaPrompt.show();
            }
        });

        // Detect if installed logic (basic)
        if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
            console.log('App is running in standalone mode');
            return;
        }
    },

    show: () => {
        if (document.getElementById('pwa-install-modal')) return;

        const modal = document.createElement('div');
        modal.id = 'pwa-install-modal';
        modal.innerHTML = `
            <style>
                #pwa-install-modal {
                    position: fixed;
                    bottom: 20px;
                    left: 20px;
                    right: 20px;
                    background: rgba(15, 23, 42, 0.95);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(212, 175, 55, 0.3);
                    border-radius: 24px;
                    padding: 20px;
                    z-index: 9999;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    box-shadow: 0 20px 50px rgba(0,0,0,0.8);
                    animation: slideUpPwa 0.5s cubic-bezier(0.16, 1, 0.3, 1);
                    max-width: 600px;
                    margin: 0 auto;
                }
                @keyframes slideUpPwa {
                    from { transform: translateY(100px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .pwa-content {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                }
                .pwa-icon {
                    width: 50px;
                    height: 50px;
                    background: linear-gradient(135deg, #D4AF37, #AA8C2C);
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 24px;
                    color: white;
                    box-shadow: 0 5px 15px rgba(212, 175, 55, 0.3);
                }
                .pwa-text h4 {
                    margin: 0; color: white; font-size: 1rem; font-weight: 800;
                }
                .pwa-text p {
                    margin: 2px 0 0; color: #cbd5e1; font-size: 0.75rem;
                }
                .pwa-actions {
                    display: flex;
                    gap: 10px;
                }
                .btn-pwa-install {
                    background: #D4AF37;
                    color: black;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 12px;
                    font-weight: 800;
                    font-size: 0.8rem;
                    cursor: pointer;
                    transition: 0.2s;
                    white-space: nowrap;
                }
                .btn-pwa-install:hover {
                    transform: scale(1.05);
                    background: #F9E076;
                }
                .btn-pwa-close {
                    background: transparent;
                    color: #94a3b8;
                    border: none;
                    font-size: 1.2rem;
                    cursor: pointer;
                    padding: 5px;
                }
                @media(max-width: 480px) {
                    #pwa-install-modal {
                        flex-direction: column;
                        text-align: center;
                        gap: 15px;
                    }
                    .pwa-content {
                        flex-direction: column;
                    }
                    .pwa-actions {
                        width: 100%;
                    }
                    .btn-pwa-install {
                        width: 100%;
                    }
                }
            </style>
            <div class="pwa-content">
                <div class="pwa-icon">👑</div>
                <div class="pwa-text">
                    <h4>تثبيت التطبيق الملكي</h4>
                    <p>تجربة أسرع، وصول فوري، وإشعارات ذكية.</p>
                </div>
            </div>
            <div class="pwa-actions">
                <button class="btn-pwa-install" onclick="PwaPrompt.install()">تثبيت الآن</button>
                <button class="btn-pwa-close" onclick="PwaPrompt.close()">&times;</button>
            </div>
        `;
        document.body.appendChild(modal);
    },

    install: async () => {
        if (!deferredPrompt) {
            // If no prompt event, maybe generic message or IOS instructions
            alert('اضغط على خيارات المتصفح واختر "Add to Home Screen" أو "تثبيت التطبيق"');
            return;
        }
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            console.log('User accepted install');
        }
        deferredPrompt = null;
        PwaPrompt.close();
    },

    close: () => {
        const el = document.getElementById('pwa-install-modal');
        if (el) {
            el.style.transform = 'translateY(100px)';
            el.style.opacity = '0';
            setTimeout(() => el.remove(), 500);
        }
        // Remember dismissal for session or 1 hour? Let's just say session for now or until reload
        // Or set localstorage to hide for a day
        const now = new Date();
        localStorage.setItem('pwa_dismissed', now.getTime());
    }
};

document.addEventListener('DOMContentLoaded', PwaPrompt.init);
