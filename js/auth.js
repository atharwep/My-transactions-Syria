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
        let users = Store.getUsers();
        let idx = users.findIndex(u => u.phone === phone);
        let userToUpdate = null;

        // 1. Check Local
        if (idx !== -1) {
            userToUpdate = users[idx];
        }
        // 2. Check Cloud (Firebase) if not found locally
        else if (typeof FirebaseDB !== 'undefined') {
            const cloudRes = await FirebaseDB.users.get(phone);
            if (cloudRes.success) {
                userToUpdate = cloudRes.data;
                // Ideally we cache this user locally now to keep sync
                users.push(userToUpdate);
                idx = users.length - 1;
            }
        }

        if (!userToUpdate) return { success: false, message: "المستخدم غير موجود" };

        if (amount > 0 && performedByRole !== 'ADMIN' && performedByRole !== 'AGENT') {
            return { success: false, message: "غير مسموح لك بشحن الرصيد." };
        }

        // Calculate New Balance
        if (currency === 'USD') {
            userToUpdate.balanceUSD = (userToUpdate.balanceUSD || 0) + amount;
        } else {
            userToUpdate.balanceSYP = (userToUpdate.balanceSYP || 0) + amount;
        }

        // Save Local (Now we are valid index)
        if (idx !== -1) {
            users[idx] = userToUpdate;
            Store.setUsers(users);
        }

        // 🔥 SYNC TO FIREBASE IMMEDIATELY
        if (typeof FirebaseDB !== 'undefined') {
            await FirebaseDB.users.update(phone, {
                balanceUSD: userToUpdate.balanceUSD,
                balanceSYP: userToUpdate.balanceSYP
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
            date: new Date().toISOString()
        };
        txs.unshift(newTx);
        Store.setData('transactions', txs);

        // 🔥 SYNC TRANSACTION TO FIREBASE
        if (typeof FirebaseDB !== 'undefined') {
            await FirebaseDB.transactions.create(newTx);
        }

        // 🔥 REALTIME NOTIFICATION
        if (typeof Notify !== 'undefined' && Notify.send) {
            Notify.send(phone, "تحديث الرصيد 💰", `تم ${amount > 0 ? 'إيداع' : 'سحب'} ${Math.abs(amount)} ${currency} ${amount > 0 ? 'في' : 'من'} رصيدك.`, "fas fa-wallet");
        }

        if (Store.user && Store.user.phone === phone) {
            Store.user.balanceUSD = userToUpdate.balanceUSD;
            Store.user.balanceSYP = userToUpdate.balanceSYP;
            localStorage.setItem('wusul_user', JSON.stringify(Store.user));
        }

        return { success: true, newBalance: currency === 'USD' ? userToUpdate.balanceUSD : userToUpdate.balanceSYP };
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

            // 🔥 NOTIFY DOCTOR
            if (typeof Notify !== 'undefined' && Notify.send) {
                Notify.send(phone, "مبروك! تم اعتماد حسابك 🎉", "تم تفعيل حساب الطبيب الخاص بك والقائمة الآن تظهر للمرضى.", "fas fa-user-md");
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
        // 1. Try Local Storage first
        let user = Store.getUsers().find(u => u.phone === phone);

        // 2. If not found locally, try Firebase (Cloud Fallback)
        if (!user && typeof FirebaseDB !== 'undefined') {
            console.log('🔍 User not found locally, checking Firebase...');
            const cloudRes = await FirebaseDB.users.get(phone);
            if (cloudRes.success) {
                user = cloudRes.data;
                // Save to local for next time
                const users = Store.getUsers();
                users.push(user);
                Store.setUsers(users);
                console.log('✅ User retrieved from Cloud and cached locally.');
            }
        }

        if (user && user.password === password) {
            // Check verification status
            if (CONFIG.REQUIRE_IDENTITY_VERIFICATION && !user.isVerified && user.role !== 'ADMIN') {
                return { success: false, message: "حسابك قيد المراجعة. يرجى انتظار تأكيد الهوية من قبل الإدارة." };
            }
            return { success: true, user };
        }

        return { success: false, message: "بيانات الدخول غير صحيحة أو الحساب غير موجود" };
    },

    register: async (name, phone, password, role = 'USER', kycData = {}) => {
        // 1. Check Local Existence
        const users = Store.getUsers();
        if (users.find(u => u.phone === phone))
            return { success: false, message: "رقم الهاتف مستخدم مسبقاً (محلي)" };

        // 2. Check Cloud Existence
        if (typeof FirebaseDB !== 'undefined') {
            const cloudCheck = await FirebaseDB.users.get(phone);
            if (cloudCheck.success) {
                return { success: false, message: "رقم الهاتف مستخدم مسبقاً (سحابي)" };
            }
        }

        const user = {
            id: Date.now(),
            name, phone, password, role,
            balanceUSD: 0, balanceSYP: 0,
            avatar: kycData.avatar || "assets/nuser.png",
            idCardImage: kycData.idCardImage || null, // ID Image
            isVerified: !CONFIG.REQUIRE_IDENTITY_VERIFICATION, // Auto-verify if option disabled
            registeredAt: new Date().toISOString()
        };

        // 3. Save to Local Storage
        users.push(user);
        Store.setUsers(users);

        // 4. Save to Firebase Cloud
        if (typeof FirebaseDB !== 'undefined') {
            await FirebaseDB.users.create(user);
            console.log('✅ New user registered and synced to Cloud.');
        }

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

        // 🔥 Trigger Realtime Sync
        window.dispatchEvent(new CustomEvent('userLoggedIn', { detail: { user } }));

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

        // 🔥 Stop Realtime Sync
        window.dispatchEvent(new CustomEvent('userLoggedOut'));

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

    findUserByPhone: async (phone) => {
        // 1. Try Local Search
        let user = Store.getUsers().find(u => u.phone === phone);
        if (user) return user;

        // 2. Try Cloud Search (Firebase)
        if (typeof FirebaseDB !== 'undefined') {
            console.log(`🔍 User ${phone} not found locally, searching Cloud...`);
            const res = await FirebaseDB.users.get(phone);
            if (res.success) {
                // Return cloud user without saving to local list to avoid huge array
                // Ideally, we should sync, but for search purpose, returning is enough
                return res.data;
            }
        }
        return null;
    },

    makeAdmin: async (phone) => {
        const users = Store.getUsers();
        const idx = users.findIndex(u => u.phone === phone);

        // Local Update if found
        if (idx !== -1) {
            users[idx].role = 'ADMIN';
            Store.setUsers(users);
        }

        // Cloud Update
        if (typeof FirebaseDB !== 'undefined') {
            await FirebaseDB.users.update(phone, { role: 'ADMIN' });
            return { success: true, message: "تم الترقية لمدير نظام بنجاح (Cloud Sync) 🔱" };
        }

        return idx !== -1
            ? { success: true, message: "تم الترقية لمدير نظام بنجاح (Local) 🔱" }
            : { success: false, message: "المستهدف غير موجود محلياً" };
    },

    activateAgent: async (phone) => {
        const users = Store.getUsers();
        const idx = users.findIndex(u => u.phone === phone);

        if (idx !== -1) {
            users[idx].role = 'AGENT';
            Store.setUsers(users);
        }

        // Cloud Update
        if (typeof FirebaseDB !== 'undefined') {
            await FirebaseDB.users.update(phone, { role: 'AGENT' });
            // 🔥 NOTIFY AGENT
            if (typeof Notify !== 'undefined' && Notify.send) {
                Notify.send(phone, "ترقية الحساب 💼", "تم تفعيل حسابك كوكيل معتمد بنجاح.", "fas fa-briefcase");
            }
            return { success: true, message: "تم تفعيل حساب الوكيل بنجاح (Cloud Sync) ✅" };
        }

        return idx !== -1
            ? { success: true, message: "تم تفعيل حساب الوكيل بنجاح (Local) ✅" }
            : { success: false, message: "المستهدف غير موجود محلياً" };
    },

    resetToUser: async (phone) => {
        const users = Store.getUsers();
        const idx = users.findIndex(u => u.phone === phone);

        if (idx !== -1) {
            users[idx].role = 'USER';
            Store.setUsers(users);
        }

        // Cloud Update
        if (typeof FirebaseDB !== 'undefined') {
            await FirebaseDB.users.update(phone, { role: 'USER' });
            return { success: true, message: "تم إعادة الحساب لمستخدم عادي (Cloud Sync)" };
        }

        return idx !== -1
            ? { success: true, message: "تمت إعادة الحساب لمستخدم عادي (Local)" }
            : { success: false, message: "المستهدف غير موجود محلياً" };
    },

    // Generic Role Updater
    updateUserRole: async (phone, role) => {
        const users = Store.getUsers();
        const idx = users.findIndex(u => u.phone === phone);

        if (idx !== -1) {
            users[idx].role = role;
            Store.setUsers(users);
        }

        if (typeof FirebaseDB !== 'undefined') {
            await FirebaseDB.users.update(phone, { role: role });
            // 🔥 NOTIFY USER
            if (typeof Notify !== 'undefined' && Notify.send) {
                const roleNames = { 'ADMIN': 'مدير النظام', 'AGENT': 'وكيل', 'DOCTOR': 'طبيب', 'USER': 'مستخدم' };
                Notify.send(phone, "تغيير الرتبة 🛡️", `تم تحديث رتبة حسابك إلى: ${roleNames[role] || role}`, "fas fa-id-badge");
            }
            return { success: true, message: `تم تحديث دور المستخدم إلى ${role} بنجاح (Cloud Sync)` };
        }

        return idx !== -1
            ? { success: true, message: `تم تحديث دور المستخدم إلى ${role} بنجاح (Local)` }
            : { success: false, message: "لم يتم العثور على المستخدم" };
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

        // 🔥 NOTIFY DOCTOR
        if (typeof Notify !== 'undefined' && Notify.send) {
            const docPhone = bookingData.doctorPhone;
            Notify.send(docPhone, "حجز جديد 📅", `لديك طلب حجز جديد من ${bookingData.patientName}`, "fas fa-calendar-check");
        }

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

            // 🔥 NOTIFY PATIENT
            if (typeof Notify !== 'undefined' && Notify.send) {
                const booking = bookings[bIdx];
                Notify.send(booking.patientPhone, "تحديث الحجز ❌", `نعتذر، تم رفض طلب الحجز مع د. ${booking.doctorName || 'الطبيب'}`, "fas fa-calendar-times");
            }

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
            const user = Store.user;
            navRight.innerHTML = `
                <div class="user-dropdown-container" style="position: relative; display: inline-block;">
                    <div onclick="document.getElementById('user-dropdown').classList.toggle('show')" 
                         style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                        <img src="${user.avatar || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'}" 
                             style="width: 35px; height: 35px; border-radius: 50%; border: 2px solid var(--gold); object-fit: cover;">
                        <div style="color: white; font-weight: 800; font-size: 0.85rem;">
                            ${user.name.split(' ')[0]} <i class="fas fa-chevron-down" style="font-size: 0.7rem; margin-right: 3px;"></i>
                        </div>
                    </div>
                    
                    <div id="user-dropdown" class="dropdown-content" style="display: none; position: absolute; left: 0; top: 45px; background: #1e293b; min-width: 160px; border-radius: 12px; box-shadow: 0 8px 16px rgba(0,0,0,0.2); z-index: 1000; overflow: hidden; border: 1px solid rgba(255,255,255,0.1);">
                        <a href="profile.html" style="color: white; padding: 12px 16px; text-decoration: none; display: block; font-size: 0.9rem; border-bottom: 1px solid rgba(255,255,255,0.05);">
                            <i class="fas fa-user-circle" style="margin-left: 8px; color: var(--gold);"></i> الملف الشخصي
                        </a>
                        ${user.role === 'ADMIN' ? `
                        <a href="admin-panel.html" style="color: white; padding: 12px 16px; text-decoration: none; display: block; font-size: 0.9rem; border-bottom: 1px solid rgba(255,255,255,0.05);">
                            <i class="fas fa-shield-alt" style="margin-left: 8px; color: #4A90E2;"></i> الإدارة
                        </a>` : ''}
                        <a href="#" onclick="Auth.logout()" style="color: #ef4444; padding: 12px 16px; text-decoration: none; display: block; font-size: 0.9rem;">
                            <i class="fas fa-sign-out-alt" style="margin-left: 8px;"></i> خروج
                        </a>
                    </div>
                </div>
                
                <style>
                    .dropdown-content a:hover {background-color: rgba(255,255,255,0.05);}
                    .show {display: block !important; animation: fadeIn 0.2s;}
                    @keyframes fadeIn {from {opacity:0; transform:translateY(-10px);} to {opacity:1; transform:translateY(0);}}
                </style>
                
                <script>
                    // Close dropdown when clicking outside
                    window.onclick = function(event) {
                        if (!event.target.matches('.user-dropdown-container') && !event.target.closest('.user-dropdown-container')) {
                            var dropdowns = document.getElementsByClassName("dropdown-content");
                            for (var i = 0; i < dropdowns.length; i++) {
                                var openDropdown = dropdowns[i];
                                if (openDropdown.classList.contains('show')) {
                                    openDropdown.classList.remove('show');
                                }
                            }
                        }
                    }
                </script>
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
