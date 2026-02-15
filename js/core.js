/**
 * GATEWAY CORE - Store & Auth Logic
 * This file handles data management, simulated SMS, and Auth methods.
 */

const Store = {
    user: JSON.parse(localStorage.getItem('wusul_user')) || null,

    getUsers: () => JSON.parse(localStorage.getItem('wusul_users_db')) || [],
    setUsers: (users) => localStorage.setItem('wusul_users_db', JSON.stringify(users)),

    getData: (key) => JSON.parse(localStorage.getItem(`wusul_db_${key}`)) || [],
    setData: (key, data) => localStorage.setItem(`wusul_db_${key}`, JSON.stringify(data)),

    init: () => {
        if (!localStorage.getItem('wusul_db_init')) {
            const seedUsers = [
                { id: 1, name: "إدارة النظام", phone: "0936020439", password: "202025", role: "ADMIN", balance: 10000, avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=admin" },
                { id: 2, name: "وكيل معتمد", phone: "0900000000", password: "agent", role: "AGENT", balance: 5000, avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=agent1" }
            ];
            Store.setUsers(seedUsers);
            localStorage.setItem('wusul_db_init', 'true');
        }
    },

    updateUserBalance: (phone, amount, title, performedByRole = 'USER') => {
        const users = Store.getUsers();
        const userIndex = users.findIndex(u => u.phone === phone);
        if (userIndex === -1) return { success: false, message: "المستخدم غير موجود" };

        if (amount > 0 && performedByRole !== 'ADMIN' && performedByRole !== 'AGENT') {
            return { success: false, message: "غير مسموح لك بشحن الرصيد. يرجى مراجعة وكيل معتمد." };
        }

        users[userIndex].balance += amount;
        Store.setUsers(users);

        const txs = Store.getData('transactions');
        txs.unshift({
            id: Date.now(),
            userPhone: phone,
            amount: amount,
            title: title,
            date: new Date().toLocaleString('ar-SY')
        });
        Store.setData('transactions', txs);

        if (Store.user && Store.user.phone === phone) {
            Store.user.balance = users[userIndex].balance;
            localStorage.setItem('wusul_user', JSON.stringify(Store.user));
        }

        SMS.send(phone, `إشعار محفظة: ${title}. الكمية: ${amount} نقطة. رصيدك الحالي: ${users[userIndex].balance} نقطة.`);

        return { success: true, newBalance: users[userIndex].balance };
    }
};

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
        const toast = document.createElement('div');
        toast.className = "sms-toast";
        toast.style.cssText = `
            position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
            background: #1e293b; color: white; padding: 20px; border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.3); z-index: 9999; width: 320px;
            font-size: 13px; font-weight: 700; border: 1px solid rgba(255,255,255,0.1);
            animation: slideDown 0.5s ease;
        `;
        toast.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:10px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:5px;">
                <span style="color:var(--gold);">📩 رسالة نصية (Syria)</span>
                <span style="opacity:0.5; font-size:10px;">الآن</span>
            </div>
            <p style="line-height:1.5;">${message}</p>
        `;
        document.body.appendChild(toast);
        setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 500); }, 8000);
    }
};

const Auth = {
    login: async (phone, password) => {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, password })
            });
            const data = await response.json();
            if (response.ok) return { success: true, user: data.user, token: data.token };
            return { success: false, message: data.message || "بيانات الدخول غير صحيحة" };
        } catch (error) {
            const user = Store.getUsers().find(u => u.phone === phone && u.password === password);
            if (user) return { success: true, user };
            return { success: false, message: "بيانات الدخول غير صحيحة، يرجى التأكد والمحاولة مجدداً" };
        }
    },

    register: async (name, phone, password, role = 'USER') => {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, phone, password, role })
            });
            const data = await response.json();
            if (response.ok) {
                const users = Store.getUsers();
                if (!users.find(u => u.phone === phone)) {
                    users.push({ ...data.user, password });
                    Store.setUsers(users);
                }
                return { success: true, user: data.user, token: data.token };
            }
            return { success: false, message: data.message || "فشل إنشاء الحساب" };
        } catch (error) {
            const users = Store.getUsers();
            if (users.find(u => u.phone === phone)) return { success: false, message: "المسخدم موجود مسبقاً محلياً" };
            const newUser = { id: Date.now(), name, phone, password, role, balance: 0, avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}` };
            users.push(newUser);
            Store.setUsers(users);
            return { success: true, user: newUser };
        }
    },

    sendOTP: (phone, elementId) => {
        const fullPhone = SMS.formatPhone(phone);
        if (typeof firebase !== 'undefined' && firebase.auth) {
            const appVerifier = new firebase.auth.RecaptchaVerifier(elementId, { 'size': 'invisible' });
            return firebase.auth().signInWithPhoneNumber(fullPhone, appVerifier)
                .then((result) => { SMS.confirmationResult = result; return { success: true }; })
                .catch((error) => {
                    const opt = Math.floor(100000 + Math.random() * 900000);
                    SMS.currentOTP = opt;
                    SMS.send(phone, `رمز الأمان الخاص بك هو: ${opt}`);
                    return { success: true, simulated: true, code: opt };
                });
        }
        const opt = Math.floor(100000 + Math.random() * 900000);
        SMS.currentOTP = opt;
        SMS.send(phone, `[محاكاة] رمز الأمان الخاص بك هو: ${opt}`);
        return Promise.resolve({ success: true, simulated: true, code: opt });
    },

    verifyOTP: (code) => {
        if (SMS.confirmationResult) {
            return SMS.confirmationResult.confirm(code).then(() => ({ success: true })).catch(() => ({ success: false, message: "رمز التأكيد غير صحيح" }));
        }
        if (code == SMS.currentOTP) return Promise.resolve({ success: true });
        return Promise.resolve({ success: false, message: "رمز التأكيد غير صحيح" });
    },

    finalizeLogin: (user, token = null) => {
        localStorage.setItem('wusul_user', JSON.stringify(user));
        if (token) localStorage.setItem('wusul_token', token);
        Store.user = user;
    },

    logout: () => {
        localStorage.removeItem('wusul_user');
        Store.user = null;
        window.location.href = 'index.html';
    },

    check: () => {
        const currentPage = window.location.pathname.split("/").pop();
        const guestPages = ['index.html', 'login.html', 'register.html', ''];
        if (!Store.user && !guestPages.includes(currentPage)) {
            window.location.href = 'login.html';
        }
    }
};

// Auto Init
Store.init();
