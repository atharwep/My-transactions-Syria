/**
 * PWA Helper - Handle "Add to Home Screen" Prompt
 * Developed by Antigravity
 */

let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the default browser prompt
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;

    // Show a custom UI prompt to the user
    showInstallPromotion();
});

function showInstallPromotion() {
    // Check if the user has already dismissed the prompt in this session
    if (sessionStorage.getItem('pwa_prompt_dismissed')) return;

    const banner = document.createElement('div');
    banner.id = 'pwa-install-banner';
    banner.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 20px;
        right: 20px;
        background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
        border: 1px solid var(--gold);
        border-radius: 20px;
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 15px;
        z-index: 9999;
        box-shadow: 0 20px 40px rgba(0,0,0,0.4);
        animation: slideUpPWA 0.5s ease-out;
    `;

    banner.innerHTML = `
        <div style="display: flex; align-items: center; gap: 15px;">
            <div style="width: 50px; height: 50px; background: var(--gold); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; color: black;">
                <i class="fas fa-mobile-screen"></i>
            </div>
            <div style="flex: 1;">
                <h4 style="color: white; font-weight: 900; margin: 0; font-size: 1rem;">ثبت موقع "معاملاتي" كـ تطبيق</h4>
                <p style="color: #94a3b8; font-size: 0.8rem; margin: 0; font-weight: 700;">تمتع بتجربة أسرع ووصول فوري من شاشتك الرئيسية</p>
            </div>
            <button onclick="dismissPWAPrompt()" style="background: none; border: none; color: gray; cursor: pointer; font-size: 1.2rem;">&times;</button>
        </div>
        <button id="pwa-install-btn" style="
            background: var(--gold);
            color: black;
            border: none;
            padding: 12px;
            border-radius: 12px;
            font-weight: 950;
            cursor: pointer;
            transition: 0.3s;
        ">تثبيت الآن ✅</button>
    `;

    document.body.appendChild(banner);

    // Add animation style
    const style = document.createElement('style');
    style.innerHTML = `
        @keyframes slideUpPWA {
            from { transform: translateY(100px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);

    document.getElementById('pwa-install-btn').addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`User response to install prompt: ${outcome}`);
            deferredPrompt = null;
            banner.remove();
        }
    });
}

function dismissPWAPrompt() {
    const banner = document.getElementById('pwa-install-banner');
    if (banner) banner.remove();
    sessionStorage.setItem('pwa_prompt_dismissed', 'true');
}

window.addEventListener('appinstalled', (evt) => {
    console.log('معاملاتي PWA was installed');
    const banner = document.getElementById('pwa-install-banner');
    if (banner) banner.remove();
});
