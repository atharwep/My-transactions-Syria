/**
 * Doctor Booking System - Queue Logic & Real-time Mocks
 * Developed by Antigravity
 */

// Formatters
const formatPrice = (amount, currency) => {
    if (currency === 'USD') {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    } else {
        return new Intl.NumberFormat('ar-SY', { style: 'currency', currency: 'SYP', maximumFractionDigits: 0 }).format(amount).replace('SYP', 'ل.س');
    }
};

const formatTime = (date) => new Intl.DateTimeFormat('ar-SA', { hour: '2-digit', minute: '2-digit' }).format(date);

// --- State Management ---
const state = {
    doctor: null,
    services: [], // Loaded from Doctor Data
    user: {
        id: 0,
        name: "زائر",
        walletUSD: 0,
        walletSYP: 0
    },
    queue: {
        currentServing: 0,
        lastTicket: 0,
        myTicket: null,
        myEstTime: null
    },
    selectedService: null,
    settings: {
        notificationsEnabled: false
    }
};

// Global Elements Cache
let els = {};

// --- Initialization ---
async function init() {
    try {
        console.log("Initializing Booking Page...");

        // 0. Load Real User
        const savedUser = JSON.parse(localStorage.getItem('wusul_user'));
        if (savedUser) {
            state.user = savedUser;
        }

        // Initialize Elements
        els = {
            queueCount: document.getElementById('queue-count'),
            estTime: document.getElementById('est-time'),
            servicesGrid: document.getElementById('services-grid'),
            bookBtn: document.getElementById('book-btn'),
            modal: document.getElementById('confirm-modal'),
            modalContent: document.getElementById('modal-details'),
            confirmPayBtn: document.getElementById('confirm-pay-btn'),
            notification: document.getElementById('notification'),
            notifMessage: document.getElementById('notif-message'),
            notifIcon: document.getElementById('notif-icon'),
            docName: document.getElementById('doc-name'),
            docSpec: document.getElementById('doc-spec'),
            verifiedBadge: document.getElementById('verified-badge')
        };

        // Validate Critical Elements
        if (!els.bookBtn || !els.servicesGrid) {
            console.error("Critical elements missing");
            // Don't throw to allow partial load
        }

        // --- Attach Event Listeners ---
        if (els.bookBtn) {
            els.bookBtn.onclick = () => {
                if (state.queue.myTicket) {
                    showNotification("لديك حجز مؤكد بالفعل!", "info");
                } else {
                    showPaymentModal();
                }
            };
        }

        if (els.confirmPayBtn) {
            els.confirmPayBtn.onclick = processPayment;
        }

        if (els.modal) {
            els.modal.onclick = (e) => {
                if (e.target === els.modal) closeModal();
            };
        }

        // 1. Load Data
        await loadDoctorData();

        // 2. Render UI
        renderDoctorInfo();
        renderServices();
        updateQueueDisplay();

        // 3. Start Polling/Realtime Simulation
        startQueueSimulation();

        // 4. Request Notification Permission
        if ('Notification' in window) {
            Notification.requestPermission().then(permission => {
                state.settings.notificationsEnabled = permission === 'granted';
            });
        }
    } catch (error) {
        console.error("Initialization Error:", error);
        if (document.getElementById('doc-name')) {
            document.getElementById('doc-name').innerText = "حدث خطأ غير متوقع";
            document.getElementById('doc-spec').innerText = error.message || "يرجى إعادة تحميل الصفحة";
            document.getElementById('doc-spec').style.color = "#ef4444";
        }
    }
}

// --- Logic & Rendering ---

async function loadDoctorData() {
    const urlParams = new URLSearchParams(window.location.search);
    const docId = urlParams.get('id');

    // Load Doctors from LocalStorage
    const storedDoctors = JSON.parse(localStorage.getItem('wusul_db_doctors')) || [];

    // Find the doctor
    // Note: stored IDs might be numbers or strings, so loose equality is safer or toString()
    let doctorData = storedDoctors.find(d => d.id == docId);

    if (!doctorData) {
        // Fallback or specific default
        if (docId === '1') {
            // Keep original mock for ID 1 if not in DB for some reason (backward comp)
            doctorData = {
                id: 1,
                name: "د. أحمد عبدالله",
                specialty: "استشاري قلب وأوعية دموية",
                isVerified: true,
                services: [
                    { id: 'consult_usd', name: 'كشف عيادة (VIP)', price: 40, currency: 'USD', duration: 20 },
                    { id: 'consult_syp', name: 'كشف عيادة (عام)', price: 300000, currency: 'SYP', duration: 20 }
                ]
            };
        } else {
            throw new Error("بيانات الطبيب غير متوفرة");
        }
    }

    state.doctor = { ...doctorData };

    // Ensure Services exist
    state.services = doctorData.services || [];

    // If no services found (e.g. new doctor), add default generic service
    if (state.services.length === 0) {
        state.services.push({
            id: 'gen_check',
            name: 'كشف واستشارة عامة',
            price: 50000,
            currency: 'SYP',
            duration: 15
        });
    }

    state.queue.lastTicket = Math.floor(Math.random() * 10) + 5;
    state.queue.currentServing = Math.floor(state.queue.lastTicket / 2);

    return new Promise(resolve => setTimeout(resolve, 300));
}

function renderDoctorInfo() {
    if (els.docName) els.docName.textContent = state.doctor.name;
    if (els.docSpec) els.docSpec.textContent = state.doctor.specialty;

    if (state.doctor.isVerified && els.verifiedBadge) {
        els.verifiedBadge.classList.remove('hidden');
    } else if (els.verifiedBadge) {
        els.verifiedBadge.classList.add('hidden');
    }
}

function renderServices() {
    if (!state.services || state.services.length === 0) return;

    if (els.servicesGrid) {
        els.servicesGrid.innerHTML = state.services.map((svc, index) => `
            <div class="service-card ${index === 0 ? 'active' : ''}" onclick="selectService('${svc.id}')" id="svc-${svc.id}">
                <div class="service-details">
                    <h4>${svc.name}</h4>
                    <div class="service-meta">
                        <span>⏱ ${svc.duration} دقيقة</span>
                    </div>
                </div>
                <div class="service-price">
                    ${formatPrice(svc.price, svc.currency)}
                </div>
            </div>
        `).join('');
    }
    selectService(state.services[0].id);
}

window.selectService = (id) => {
    state.selectedService = state.services.find(s => s.id === id);
    document.querySelectorAll('.service-card').forEach(el => el.classList.remove('active'));
    const target = document.getElementById(`svc-${id}`);
    if (target) target.classList.add('active');
    calculateEstTime();
};

function updateQueueDisplay() {
    let peopleAhead = state.queue.lastTicket - state.queue.currentServing;
    if (state.queue.myTicket) {
        peopleAhead = state.queue.myTicket - state.queue.currentServing - 1;
    }
    peopleAhead = Math.max(0, peopleAhead);

    const waitTitle = document.getElementById('queue-title');
    if (state.queue.myTicket) {
        if (waitTitle) waitTitle.textContent = "دورك في الانتظار";
        if (els.queueCount) {
            els.queueCount.textContent = `#${state.queue.myTicket}`;
            els.queueCount.style.color = 'var(--primary-color)';
        }
    } else {
        if (waitTitle) waitTitle.textContent = "المرضى في الانتظار";
        if (els.queueCount) els.queueCount.textContent = peopleAhead + 3;
    }
    calculateEstTime();
}

function calculateEstTime() {
    const now = new Date();
    let peopleAhead = state.queue.lastTicket - state.queue.currentServing;
    if (state.queue.myTicket) {
        peopleAhead = state.queue.myTicket - state.queue.currentServing - 1;
    }

    // Use saved duration per service, or fallback to an avg
    const serviceDuration = state.selectedService ? state.selectedService.duration : 15;
    // We assume the queue moves at avg 20 mins pace regardless of current service selection, 
    // or refine logic to sum up actual queue types. Simple: avg 20.
    const avgDocPace = 20;

    const totalWaitMinutes = peopleAhead * avgDocPace;
    const estTime = new Date(now.getTime() + totalWaitMinutes * 60000);

    if (els.estTime) els.estTime.textContent = formatTime(estTime);
    state.queue.myEstTime = estTime;
}

// --- Modals & Payments ---

function showPaymentModal() {
    const finalPrice = formatPrice(state.selectedService.price, state.selectedService.currency);
    const currentBalance = state.selectedService.currency === 'USD'
        ? (state.user.walletUSD || 0)
        : (state.user.walletSYP || 0);

    const html = `
        <div class="summary-row">
            <span>الخدمة</span>
            <span>${state.selectedService.name}</span>
        </div>
        <div class="summary-row">
            <span>الوقت المقدر</span>
            <span>${formatTime(state.queue.myEstTime)}</span>
        </div>
        <div class="summary-row">
            <span>رصيدك الحالي</span>
            <span style="direction:ltr">${formatPrice(currentBalance, state.selectedService.currency)}</span>
        </div>
        <div class="summary-row total">
            <span>المبلغ المطلوب</span>
            <span style="direction:ltr">${finalPrice}</span>
        </div>
    `;

    if (els.modalContent) els.modalContent.innerHTML = html;
    if (els.modal) els.modal.classList.add('active');
}

async function processPayment() {
    const price = state.selectedService.price;
    const currency = state.selectedService.currency;

    const btn = els.confirmPayBtn;
    if (btn) {
        btn.disabled = true;
        btn.textContent = "جاري إرسال الطلب...";
    }

    const bookingData = {
        doctorId: state.doctor.id,
        doctorName: state.doctor.name,
        doctorPhoneFallback: state.doctor.phone || "0936020439", // Fallback for simulation
        patientPhone: state.user.phone,
        patientName: state.user.name,
        serviceName: state.selectedService.name,
        price: price,
        currency: currency,
        clinicAddress: state.doctor.city || "دمشق - المزرعة",
        time: formatTime(state.queue.myEstTime)
    };

    const result = await Auth.requestBooking(bookingData);

    if (result.success) {
        // 🔥 Real-time Notification to Patient
        if (typeof Notify !== 'undefined' && Notify.send) {
            Notify.send(
                state.user.phone,
                "تم تأكيد الحجز ✅",
                `تم حجز موعدك مع د. ${state.doctor.name} المقدر الساعة ${bookingData.time}`,
                "fas fa-calendar-check"
            );

            // 🔥 Real-time Notification to Doctor
            Notify.send(
                state.doctor.phone || bookingData.doctorPhoneFallback,
                "حجز جديد 📅",
                `لديك مريض جديد: ${state.user.name} - ${state.selectedService.name}`,
                "fas fa-user-plus"
            );
        }

        showNotification(result.message, "success");
        setTimeout(() => {
            window.location.href = 'my-bookings.html';
        }, 1500);
    } else {
        showNotification(result.message, "error");
        if (btn) {
            btn.disabled = false;
            btn.textContent = "تأكيد واستمرار";
        }
        closeModal();
    }
}

window.closeModal = () => {
    if (els.modal) els.modal.classList.remove('active');
};

// --- Notifications & Simulation ---

function startQueueSimulation() {
    setInterval(() => {
        if (Math.random() > 0.7) {
            state.queue.currentServing++;
            updateQueueDisplay();

            if (state.queue.myTicket && state.queue.currentServing === state.queue.myTicket - 1) {
                showNotification("انتبه! دورك هو القادم", "warning");
            }
            if (state.queue.myTicket && state.queue.currentServing === state.queue.myTicket) {
                showNotification("حان دورك الآن! ادخل للعيادة", "success");
            }
        }
    }, 10000);
}

function showNotification(msg, type = 'info') {
    if (!els.notifMessage || !els.notification) return;

    els.notifMessage.textContent = msg;
    const icons = { 'success': '✅', 'error': '❌', 'warning': '🔔', 'info': 'ℹ️' };
    if (els.notifIcon) els.notifIcon.textContent = icons[type];

    els.notification.classList.add('show');
    setTimeout(() => {
        els.notification.classList.remove('show');
    }, 4000);
}

// Initializer
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
