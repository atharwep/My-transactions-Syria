// Premium Core Store with Real Firebase SMS Integration
const Store = {
    user: JSON.parse(localStorage.getItem('wusul_user')) || null,

    getUsers: () => JSON.parse(localStorage.getItem('wusul_users_db')) || [],
    setUsers: (users) => localStorage.setItem('wusul_users_db', JSON.stringify(users)),

    getData: (key) => JSON.parse(localStorage.getItem(`wusul_db_${key}`)) || [],
    setData: (key, data) => localStorage.setItem(`wusul_db_${key}`, JSON.stringify(data)),

    init: () => {
        const DB_VERSION = "wusul_db_v3_final";
        const currentVersion = localStorage.getItem('wusul_db_init');

        if (currentVersion !== DB_VERSION) {
            localStorage.clear();

            const keys = ['doctors', 'taxi_drivers', 'taxi_orders', 'hospitals', 'pharmacies', 'transactions', 'notifications', 'bookings'];
            keys.forEach(k => Store.setData(k, []));

            Store.setUsers([
                {
                    id: 1,
                    name: "مدير النظام",
                    phone: "0936020439",
                    password: "admin",
                    role: "ADMIN",
                    balanceUSD: 0,
                    balanceSYP: 0,
                    avatar: "assets/nuser.png"
                }
            ]);

            localStorage.setItem('wusul_db_init', DB_VERSION);
            console.log("Database reset to clean state (v3).");
        }
    },

    searchUsers: (query) => {
        const q = query.toLowerCase();
        return Store.getUsers().filter(u =>
            (u.name && u.name.toLowerCase().includes(q)) ||
            (u.phone && u.phone.includes(q))
        );
    },

    updateUserBalance: async (phone, amount, currency, title, performedByRole = 'USER') => {
        const users = Store.getUsers();
        const idx = users.findIndex(u => u.phone === phone);
        if (idx === -1) return { success: false, message: "المستخدم غير موجود" };

        if (amount > 0 && performedByRole !== 'ADMIN' && performedByRole !== 'AGENT') {
            return { success: false, message: "غير مسموح لك بشحن الرصيد." };
        }

        if (currency === 'USD') {
            users[idx].balanceUSD = (users[idx].balanceUSD || 0) + amount;
        } else {
            users[idx].balanceSYP = (users[idx].balanceSYP || 0) + amount;
        }

        Store.setUsers(users);

        // 🔥 SYNC TO FIREBASE IMMEDIATELY
        if (typeof FirebaseDB !== 'undefined') {
            await FirebaseDB.users.update(phone, {
                balanceUSD: users[idx].balanceUSD,
                balanceSYP: users[idx].balanceSYP
            });
            console.log('✅ Balance synced to Firebase in real-time');
        }

        const txs = Store.getData('transactions');
        const newTx = {
            id: Date.now(),
            userPhone: phone,
            amount: amount,
            currency: currency,
            title: title,
            date: new Date().toLocaleString('ar-SY')
        };
        txs.unshift(newTx);
        Store.setData('transactions', txs);

        // 🔥 SYNC TRANSACTION TO FIREBASE
        if (typeof FirebaseDB !== 'undefined') {
            await FirebaseDB.transactions.create(newTx);
        }

        if (Store.user && Store.user.phone === phone) {
            Store.user.balanceUSD = users[idx].balanceUSD;
            Store.user.balanceSYP = users[idx].balanceSYP;
            localStorage.setItem('wusul_user', JSON.stringify(Store.user));
        }

        return { success: true, newBalance: currency === 'USD' ? users[idx].balanceUSD : users[idx].balanceSYP };
    },

    approveDoctor: async (phone) => {
        let doctors = Store.getData('doctors');
        const idx = doctors.findIndex(d => d.phone === phone);
        if (idx !== -1) {
            doctors[idx].isVerified = true;
            Store.setData('doctors', doctors);

            // 🔥 SYNC TO FIREBASE IMMEDIATELY
            if (typeof FirebaseDB !== 'undefined') {
                await FirebaseDB.doctors.update(doctors[idx].id, { isVerified: true });
                console.log('✅ Doctor approval synced to Firebase in real-time');
            }

            const users = Store.getUsers();
            const uIdx = users.findIndex(u => u.phone === phone);
            if (uIdx !== -1) {
                users[uIdx].role = 'DOCTOR';
                users[uIdx].isVerified = true;
                Store.setUsers(users);
            }
            return { success: true, message: "تم اعتماد الطبيب بنجاح" };
        }
        return { success: false, message: "لم يتم العثور على الطبيب" };
    },

    deleteDoctor: async (phone) => {
        let doctors = Store.getData('doctors');
        doctors = doctors.filter(d => d.phone !== phone);
        Store.setData('doctors', doctors);
        return { success: true, message: "تم حذف الطبيب" };
    },

    activateAgent: (phone) => Auth.activateAgent(phone),
    makeAdmin: (phone) => Auth.makeAdmin(phone),
    resetToUser: (phone) => Auth.resetToUser(phone),

    addDoctor: async (name, phone, password, specialty, price, city) => {
        let doctors = Store.getData('doctors');
        if (doctors.find(d => d.phone === phone)) return { success: false, message: "الطبيب مسجل مسبقاً" };

        const newDoc = {
            id: Date.now(),
            name, phone, password, specialty,
            displayPrice: price,
            city,
            isVerified: true,
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
            registeredAt: new Date().toISOString()
        };
        doctors.push(newDoc);
        Store.setData('doctors', doctors);

        // 🔥 SYNC TO FIREBASE IMMEDIATELY
        if (typeof FirebaseDB !== 'undefined') {
            await FirebaseDB.doctors.create(newDoc);
            console.log('✅ New doctor synced to Firebase in real-time');
        }

        await Auth.register(name, phone, password, 'DOCTOR', { avatar: newDoc.avatar });
        const users = Store.getUsers();
        const uIdx = users.findIndex(u => u.phone === phone);
        if (uIdx !== -1) {
            users[uIdx].isVerified = true;
            Store.setUsers(users);
        }
        return { success: true, message: "تمت إضافة الطبيب بنجاح" };
    },

    editDoctor: (phone, specialty, price) => {
        let doctors = Store.getData('doctors');
        const idx = doctors.findIndex(d => d.phone === phone);
        if (idx !== -1) {
            if (specialty) doctors[idx].specialty = specialty;
            if (price) doctors[idx].displayPrice = price;
            Store.setData('doctors', doctors);
            return { success: true, message: "تم تحديث بيانات الطبيب" };
        }
        return { success: false, message: "الطبيب غير موجود" };
    },

    // --- Complex Booking & Financial Logic ---
    getCommissionRate: () => {
        const settings = JSON.parse(localStorage.getItem('wusul_admin_settings')) || { commission: 10 }; // Default 10%
        return settings.commission;
    },

    processBookingSettlement: (booking) => {
        const commissionRate = Store.getCommissionRate();
        const totalAmount = booking.price;
        const commissionAmount = (totalAmount * commissionRate) / 100;
        const doctorAmount = totalAmount - commissionAmount;

        // 1. Deduct from Patient
        const patientRes = Store.updateUserBalance(
            booking.patientPhone,
            -totalAmount,
            booking.currency,
            `سداد حجز: ${booking.serviceName} - د. ${booking.doctorName}`,
            'SYSTEM'
        );

        if (!patientRes.success) return patientRes;

        // 2. Add to Doctor
        Store.updateUserBalance(
            booking.doctorPhone || booking.doctorPhoneFallback,
            doctorAmount,
            booking.currency,
            `دخل حجز (بعد الخصم): ${booking.patientName}`,
            'SYSTEM'
        );

        // 3. Add to Admin Wallet (Commission)
        const adminUser = Store.getUsers().find(u => u.role === 'ADMIN');
        if (adminUser) {
            Store.updateUserBalance(
                adminUser.phone,
                commissionAmount,
                booking.currency,
                `عمولة حجز: ${booking.id} (${booking.patientName} -> ${booking.doctorName})`,
                'SYSTEM'
            );
        }

        return { success: true };
    },

    // --- EMR (Electronic Medical Record) ---
    getPatientFile: (phone) => {
        const emr = Store.getData('emr');
        return emr.find(e => e.patientPhone === phone) || {
            patientPhone: phone,
            history: "",
            medications: "",
            allergies: "",
            notes: [],
            updatedAt: null
        };
    },

    updatePatientFile: (phone, data) => {
        let emr = Store.getData('emr');
        const idx = emr.findIndex(e => e.patientPhone === phone);
        const record = {
            ...data,
            patientPhone: phone,
            updatedAt: new Date().toISOString()
        };

        if (idx !== -1) emr[idx] = record;
        else emr.push(record);

        Store.setData('emr', emr);
        return { success: true };
    }
};

// ================= SMS =================
const SMS = {
    currentOTP: null,
    confirmationResult: null,

    formatPhone: (phone) => {
        let p = phone.trim();
        if (p.startsWith('09')) p = '+963' + p.substring(1);
        if (p.startsWith('9')) p = '+963' + p;
        return p;
    },

    send: (phone, message) => {
        alert(message); // محاكاة DEV
    }
};

// ================= AUTH =================
const Auth = {
    login: async (phone, password) => {
        const user = Store.getUsers().find(u => u.phone === phone && u.password === password);
        if (user) {
            // التحقق من الهوية إذا كانت مفعلة من لوحة التحكم
            if (CONFIG.REQUIRE_IDENTITY_VERIFICATION && !user.isVerified && user.role !== 'ADMIN') {
                return { success: false, message: "حسابك قيد المراجعة. يرجى انتظار تأقق الهوية من قبل الإدارة." };
            }
            return { success: true, user };
        }
        return { success: false, message: "بيانات الدخول غير صحيحة" };
    },

    register: async (name, phone, password, role = 'USER', kycData = {}) => {
        const users = Store.getUsers();
        if (users.find(u => u.phone === phone))
            return { success: false, message: "رقم الهاتف مستخدم" };

        const user = {
            id: Date.now(),
            name, phone, password, role,
            balanceUSD: 0, balanceSYP: 0,
            avatar: kycData.avatar || "assets/nuser.png",
            idCardImage: kycData.idCardImage || null, // صورة الهوية
            isVerified: !CONFIG.REQUIRE_IDENTITY_VERIFICATION, // موثق تلقائياً إذا كان الخيار معطلاً
            registeredAt: new Date().toISOString()
        };
        users.push(user);
        Store.setUsers(users);
        return { success: true, user };
    },

    // 🔥 FIXED OTP — FINAL
    sendOTP: (phone, elementId) => {
        const fullPhone = SMS.formatPhone(phone);

        if (typeof firebase !== 'undefined' && firebase.auth) {

            if (!window.recaptchaVerifier) {
                window.recaptchaVerifier =
                    new firebase.auth.RecaptchaVerifier(elementId, {
                        size: 'invisible'
                    });
            }

            return firebase.auth()
                .signInWithPhoneNumber(fullPhone, window.recaptchaVerifier)
                .then(result => {
                    SMS.confirmationResult = result;
                    return { success: true };
                })
                .catch(err => {
                    try { window.recaptchaVerifier.clear(); } catch { }
                    window.recaptchaVerifier = null;

                    const otp = Math.floor(100000 + Math.random() * 900000);
                    SMS.currentOTP = otp;
                    SMS.send(phone, `رمز الأمان الخاص بك هو: ${otp}`);
                    return { success: true, simulated: true, code: otp };
                });
        }

        const otp = Math.floor(100000 + Math.random() * 900000);
        SMS.currentOTP = otp;
        SMS.send(phone, `رمز الأمان الخاص بك هو: ${otp}`);
        return Promise.resolve({ success: true, simulated: true, code: otp });
    },

    verifyOTP: (code) => {
        if (SMS.confirmationResult) {
            return SMS.confirmationResult.confirm(code)
                .then(() => ({ success: true }))
                .catch(() => ({ success: false, message: "رمز التأكيد غير صحيح" }));
        }
        return Promise.resolve(code == SMS.currentOTP
            ? { success: true }
            : { success: false, message: "رمز التأكيد غير صحيح" });
    },

    finalizeLogin: async (user, token = null) => {
        // Use SecurityManager if available to ensure session consistency
        if (typeof SecurityManager !== 'undefined') {
            const finalToken = token || SecurityManager.generateToken(user);
            SecurityManager.saveSession(finalToken, user);
        } else {
            localStorage.setItem('wusul_user', JSON.stringify(user));
            if (token) localStorage.setItem('wusul_auth_token', token);
            // Also set a default expiry if SecurityManager is missing
            const expiry = Date.now() + (7 * 24 * 60 * 60 * 1000);
            localStorage.setItem('wusul_session_expiry', expiry.toString());
        }
        Store.user = user;

        // Sync to Cloud (Google Sheets)
        if (typeof CloudDB !== 'undefined') {
            await CloudDB.call('register', user);
            await CloudDB.syncAll();
        }
    },

    logout: async () => {
        try {
            // Final sync before logout (non-blocking)
            if (typeof CloudDB !== 'undefined') CloudDB.syncAll();
        } catch (e) {
            console.warn("Logout sync failed:", e);
        }

        if (typeof SecurityManager !== 'undefined') {
            SecurityManager.clearSession();
        } else {
            localStorage.removeItem('wusul_user');
            localStorage.removeItem('wusul_auth_token');
            localStorage.removeItem('wusul_session_expiry');
        }
        Store.user = null;

        // Use a slight delay to ensure storage is cleared before redirect
        setTimeout(() => {
            location.href = 'index.html';
        }, 100);
    },

    check: () => {
        // Load user from localStorage if not already in memory
        if (!Store.user) {
            const saved = localStorage.getItem('wusul_user');
            if (saved) Store.user = JSON.parse(saved);
        }

        const fullPath = window.location.pathname;
        const page = fullPath.split('/').pop() || 'index.html';

        const guestPages = [
            'index.html', 'login.html', 'register.html', 'about.html', 'privacy.html',
            'doctors.html', 'hospitals.html', 'pharmacies.html', 'taxi.html', 'emergency.html', 'map.html', ''
        ];
        const isGuestPage = guestPages.includes(page);

        // If user is not logged in and is trying to access a protected page
        if (!Store.user && !isGuestPage) {
            console.log("Redirecting to login: Protected page access attempt", page);
            window.location.href = 'login.html';
        }

        // If user is logged in and trying to access login/register, redirect to dashboard
        if (Store.user && (page === 'login.html' || page === 'register.html')) {
            window.location.href = 'dashboard.html';
        }

        // Update Navbar on every check
        if (typeof UI !== 'undefined' && UI.updateNavbar) {
            UI.updateNavbar();
        }
    },

    findUserByPhone: async (phone) => Store.getUsers().find(u => u.phone === phone) || null,

    makeAdmin: (phone) => {
        const users = Store.getUsers();
        const idx = users.findIndex(u => u.phone === phone);
        if (idx !== -1) {
            users[idx].role = 'ADMIN';
            Store.setUsers(users);
            return { success: true, message: "تم الترقية لمدير نظام بنجاح 🔱" };
        }
        return { success: false, message: "المستهدف غير موجود" };
    },

    activateAgent: (phone) => {
        const users = Store.getUsers();
        const idx = users.findIndex(u => u.phone === phone);
        if (idx !== -1) {
            users[idx].role = 'AGENT';
            Store.setUsers(users);
            return { success: true, message: "تم تفعيل حساب الوكيل بنجاح ✅" };
        }
        return { success: false, message: "المستهدف غير موجود" };
    },

    resetToUser: (phone) => {
        const users = Store.getUsers();
        const idx = users.findIndex(u => u.phone === phone);
        if (idx !== -1) {
            users[idx].role = 'USER';
            Store.setUsers(users);
            return { success: true, message: "تمت إعادة الحساب لمستخدم عادي" };
        }
        return { success: false, message: "المستهدف غير موجود" };
    },

    approveDoctor: (phone) => Store.approveDoctor(phone),
    deleteDoctor: (phone) => Store.deleteDoctor(phone),

    // --- Enhanced Booking Flow ---
    requestBooking: async (bookingData) => {
        const user = await Auth.findUserByPhone(bookingData.patientPhone);
        const balance = bookingData.currency === 'USD' ? user.balanceUSD : user.balanceSYP;

        if (balance < bookingData.price) {
            return { success: false, message: "رصيدك غير كافٍ لإتمام حجز الموعد. يرجى الشحن أولاً." };
        }

        const bookings = Store.getData('bookings');
        const newBooking = {
            ...bookingData,
            id: Date.now(),
            status: 'PENDING',
            createdAt: new Date().toISOString()
        };
        bookings.unshift(newBooking);
        Store.setData('bookings', bookings);

        return { success: true, message: "تم إرسال طلب الحجز للطبيب بنجاح." };
    },

    settleBooking: async (bookingId) => {
        const bookings = Store.getData('bookings');
        const bIdx = bookings.findIndex(b => b.id == bookingId);
        if (bIdx === -1) return { success: false, message: "الحجز غير موجود" };

        const booking = bookings[bIdx];
        if (booking.status !== 'PENDING') return { success: false, message: "تمت معالجة الحجز مسبقاً" };

        const settlement = Store.processBookingSettlement(booking);
        if (settlement.success) {
            bookings[bIdx].status = 'ACCEPTED';
            bookings[bIdx].settledAt = new Date().toISOString();
            Store.setData('bookings', bookings);
            return { success: true, message: "تم قبول الحجز وتوزيع الأرصدة بنجاح ✅" };
        } else {
            return settlement;
        }
    },

    rejectBooking: async (bookingId) => {
        const bookings = Store.getData('bookings');
        const bIdx = bookings.findIndex(b => b.id == bookingId);
        if (bIdx !== -1) {
            bookings[bIdx].status = 'REJECTED';
            Store.setData('bookings', bookings);
            return { success: true, message: "تم رفض طلب الحجز." };
        }
        return { success: false };
    }
};

// ================= UI MANAGER =================
const UI = {
    updateNavbar: () => {
        const navRight = document.getElementById('nav-right');
        if (!navRight) return;

        if (Store.user) {
            navRight.innerHTML = `
                <div style="display: flex; align-items: center; gap: 15px;">
                    <a href="profile.html" style="display: flex; align-items: center; gap: 8px; text-decoration: none;">
                        <img src="${Store.user.avatar || 'assets/nuser.png'}" 
                             style="width: 35px; height: 35px; border-radius: 10px; border: 2px solid var(--gold); object-fit: cover;">
                        <span style="color: white; font-weight: 800; font-size: 0.85rem;">${Store.user.name.split(' ')[0]}</span>
                    </a>
                    <button onclick="Auth.logout()" class="btn btn-outline" 
                            style="padding: 8px 15px; font-size: 0.8rem; border-color: #ef4444; color: #ef4444; background: rgba(239, 68, 68, 0.05);">
                        خروج 🚪
                    </button>
                </div>
            `;
        } else {
            navRight.innerHTML = `
                <a href="login.html" class="btn btn-outline" style="padding: 8px 18px; font-size: 0.85rem;">دخول</a>
                <a href="register.html" class="btn btn-primary" style="padding: 8px 18px; font-size: 0.85rem;">انضمام</a>
            `;
        }
    }
};

// ================= INIT =================
document.addEventListener('DOMContentLoaded', () => {
    Store.init();
    Auth.check();
});

// ================= FIREBASE INIT =================
if (typeof firebase !== 'undefined' && CONFIG?.FIREBASE_CONFIG?.apiKey) {
    try {
        firebase.initializeApp(CONFIG.FIREBASE_CONFIG);
    } catch { }
}
