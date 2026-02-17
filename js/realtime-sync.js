/**
 * REALTIME SYNC MODULE
 * Provides real-time synchronization between Firebase and LocalStorage
 * Ensures all users see updates instantly
 */

const RealtimeSync = {
    listeners: {},
    isInitialized: false,

    /**
     * Initialize real-time synchronization
     */
    init: async function () {
        if (this.isInitialized) {
            console.log('⚠️ RealtimeSync already initialized');
            return;
        }

        if (typeof firebase === 'undefined' || !firebaseDB) {
            console.warn('⚠️ Firebase not available, real-time sync disabled');
            return;
        }

        console.log('🔄 Initializing Real-time Sync...');

        // Listen to all critical data changes
        this.listenToUsers();
        this.listenToDoctors();
        this.listenToTransactions();
        this.listenToBookings();

        this.isInitialized = true;
        console.log('✅ Real-time Sync initialized successfully');
    },

    /**
     * Listen to user balance changes in real-time
     */
    listenToUsers: function () {
        if (!Store.user) return;

        const userRef = firebaseDB.ref(`users/${Store.user.phone}`);

        this.listeners.currentUser = userRef.on('value', (snapshot) => {
            if (snapshot.exists()) {
                const updatedUser = snapshot.val();

                // Update local storage
                const localUsers = Store.getUsers();
                const idx = localUsers.findIndex(u => u.phone === updatedUser.phone);

                if (idx !== -1) {
                    localUsers[idx] = { ...localUsers[idx], ...updatedUser };
                    Store.setUsers(localUsers);
                }

                // Update current user if it's the logged-in user
                if (Store.user && Store.user.phone === updatedUser.phone) {
                    Store.user = { ...Store.user, ...updatedUser };
                    localStorage.setItem('wusul_user', JSON.stringify(Store.user));

                    // Trigger UI update event
                    this.triggerBalanceUpdate(updatedUser);
                }

                console.log('💰 User balance updated in real-time');
            }
        });
    },

    /**
     * Listen to doctors list changes in real-time
     */
    listenToDoctors: function () {
        const doctorsRef = firebaseDB.ref('doctors');

        this.listeners.doctors = doctorsRef.on('value', (snapshot) => {
            if (snapshot.exists()) {
                const doctors = [];
                snapshot.forEach((child) => {
                    doctors.push(child.val());
                });

                // Update local storage
                Store.setData('doctors', doctors);

                // Trigger UI update event
                this.triggerDoctorsUpdate(doctors);

                console.log('👨‍⚕️ Doctors list updated in real-time:', doctors.length);
            }
        });
    },

    /**
     * Listen to transactions in real-time
     */
    listenToTransactions: function () {
        if (!Store.user) return;

        const txRef = firebaseDB.ref('transactions')
            .orderByChild('userPhone')
            .equalTo(Store.user.phone);

        this.listeners.transactions = txRef.on('value', (snapshot) => {
            if (snapshot.exists()) {
                const transactions = [];
                snapshot.forEach((child) => {
                    transactions.push(child.val());
                });

                // Update local storage
                Store.setData('transactions', transactions);

                console.log('💳 Transactions updated in real-time');
            }
        });
    },

    /**
     * Listen to bookings in real-time
     */
    listenToBookings: function () {
        const bookingsRef = firebaseDB.ref('bookings');

        this.listeners.bookings = bookingsRef.on('value', (snapshot) => {
            if (snapshot.exists()) {
                const bookings = [];
                snapshot.forEach((child) => {
                    bookings.push(child.val());
                });

                // Update local storage
                Store.setData('bookings', bookings);

                console.log('📅 Bookings updated in real-time');
            }
        });
    },

    /**
     * Trigger balance update event for UI
     */
    triggerBalanceUpdate: function (userData) {
        const event = new CustomEvent('balanceUpdated', {
            detail: {
                balanceUSD: userData.balanceUSD || 0,
                balanceSYP: userData.balanceSYP || 0,
                user: userData
            }
        });
        window.dispatchEvent(event);
    },

    /**
     * Trigger doctors list update event for UI
     */
    triggerDoctorsUpdate: function (doctors) {
        const event = new CustomEvent('doctorsUpdated', {
            detail: { doctors }
        });
        window.dispatchEvent(event);
    },

    /**
     * Sync local data to Firebase
     */
    syncToFirebase: async function (dataType, data) {
        if (!firebaseDB) {
            console.warn('⚠️ Firebase not available, cannot sync');
            return { success: false };
        }

        try {
            switch (dataType) {
                case 'user':
                    await FirebaseDB.users.update(data.phone, data);
                    break;
                case 'doctor':
                    await FirebaseDB.doctors.update(data.id, data);
                    break;
                case 'transaction':
                    await FirebaseDB.transactions.create(data);
                    break;
                case 'booking':
                    await FirebaseDB.bookings.create(data);
                    break;
            }

            console.log(`✅ ${dataType} synced to Firebase`);
            return { success: true };
        } catch (error) {
            console.error(`❌ Failed to sync ${dataType}:`, error);
            return { success: false, error };
        }
    },

    /**
     * Stop all listeners
     */
    stopListeners: function () {
        if (!firebaseDB) return;

        Object.keys(this.listeners).forEach(key => {
            if (this.listeners[key]) {
                // Firebase off() to remove listener
                try {
                    firebaseDB.ref().off('value', this.listeners[key]);
                } catch (e) {
                    console.warn('Error removing listener:', e);
                }
            }
        });

        this.listeners = {};
        this.isInitialized = false;
        console.log('🛑 Real-time listeners stopped');
    }
};

// Auto-initialize when user is logged in
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Wait for Firebase to initialize
        setTimeout(() => {
            if (Store.user) {
                RealtimeSync.init();
            }
        }, 1000);
    });
} else {
    setTimeout(() => {
        if (Store.user) {
            RealtimeSync.init();
        }
    }, 1000);
}

// Re-initialize on login
window.addEventListener('userLoggedIn', () => {
    RealtimeSync.init();
});

// Stop listeners on logout
window.addEventListener('userLoggedOut', () => {
    RealtimeSync.stopListeners();
});
