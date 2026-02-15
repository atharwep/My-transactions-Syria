// ===================================
// Firebase Configuration & Setup
// ===================================

const firebaseConfig = (typeof CONFIG !== 'undefined' && CONFIG.FIREBASE_CONFIG) ? CONFIG.FIREBASE_CONFIG : {
    apiKey: "YOUR_FIREBASE_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID",
    databaseURL: "https://YOUR_PROJECT.firebaseio.com"
};

// Initialize Firebase
let firebaseApp, firebaseAuth, firebaseDB;

try {
    firebaseApp = firebase.initializeApp(firebaseConfig);
    firebaseAuth = firebase.auth();
    firebaseDB = firebase.database();
    console.log("✅ Firebase initialized successfully");
} catch (error) {
    console.error("❌ Firebase initialization failed:", error);
}

// ===================================
// Firebase Database Helper Functions
// ===================================

const FirebaseDB = {
    // Users Collection
    users: {
        create: async (userData) => {
            try {
                const userRef = firebaseDB.ref(`users/${userData.phone}`);
                await userRef.set({
                    ...userData,
                    createdAt: firebase.database.ServerValue.TIMESTAMP,
                    updatedAt: firebase.database.ServerValue.TIMESTAMP
                });
                return { success: true, data: userData };
            } catch (error) {
                console.error("Firebase Create User Error:", error);
                return { success: false, error: error.message };
            }
        },

        get: async (phone) => {
            try {
                const snapshot = await firebaseDB.ref(`users/${phone}`).once('value');
                return snapshot.exists() ? { success: true, data: snapshot.val() } : { success: false };
            } catch (error) {
                console.error("Firebase Get User Error:", error);
                return { success: false, error: error.message };
            }
        },

        update: async (phone, updates) => {
            try {
                await firebaseDB.ref(`users/${phone}`).update({
                    ...updates,
                    updatedAt: firebase.database.ServerValue.TIMESTAMP
                });
                return { success: true };
            } catch (error) {
                console.error("Firebase Update User Error:", error);
                return { success: false, error: error.message };
            }
        },

        getAll: async () => {
            try {
                const snapshot = await firebaseDB.ref('users').once('value');
                const users = [];
                snapshot.forEach((child) => {
                    users.push(child.val());
                });
                return { success: true, data: users };
            } catch (error) {
                console.error("Firebase Get All Users Error:", error);
                return { success: false, error: error.message };
            }
        }
    },

    // Doctors Collection
    doctors: {
        create: async (doctorData) => {
            try {
                const docRef = firebaseDB.ref(`doctors/${doctorData.id}`);
                await docRef.set({
                    ...doctorData,
                    createdAt: firebase.database.ServerValue.TIMESTAMP
                });
                return { success: true };
            } catch (error) {
                return { success: false, error: error.message };
            }
        },

        getAll: async () => {
            try {
                const snapshot = await firebaseDB.ref('doctors').once('value');
                const doctors = [];
                snapshot.forEach((child) => {
                    doctors.push(child.val());
                });
                return { success: true, data: doctors };
            } catch (error) {
                return { success: false, error: error.message };
            }
        },

        update: async (id, updates) => {
            try {
                await firebaseDB.ref(`doctors/${id}`).update(updates);
                return { success: true };
            } catch (error) {
                return { success: false, error: error.message };
            }
        }
    },

    // Transactions Collection
    transactions: {
        create: async (txData) => {
            try {
                const txRef = firebaseDB.ref('transactions').push();
                await txRef.set({
                    ...txData,
                    id: txRef.key,
                    timestamp: firebase.database.ServerValue.TIMESTAMP
                });
                return { success: true, id: txRef.key };
            } catch (error) {
                return { success: false, error: error.message };
            }
        },

        getByUser: async (phone) => {
            try {
                const snapshot = await firebaseDB.ref('transactions')
                    .orderByChild('userPhone')
                    .equalTo(phone)
                    .once('value');
                const transactions = [];
                snapshot.forEach((child) => {
                    transactions.push(child.val());
                });
                return { success: true, data: transactions };
            } catch (error) {
                return { success: false, error: error.message };
            }
        }
    },

    // Bookings Collection
    bookings: {
        create: async (bookingData) => {
            try {
                const bookingRef = firebaseDB.ref('bookings').push();
                await bookingRef.set({
                    ...bookingData,
                    id: bookingRef.key,
                    createdAt: firebase.database.ServerValue.TIMESTAMP
                });
                return { success: true, id: bookingRef.key };
            } catch (error) {
                return { success: false, error: error.message };
            }
        },

        getByUser: async (phone) => {
            try {
                const snapshot = await firebaseDB.ref('bookings')
                    .orderByChild('patientPhone')
                    .equalTo(phone)
                    .once('value');
                const bookings = [];
                snapshot.forEach((child) => {
                    bookings.push(child.val());
                });
                return { success: true, data: bookings };
            } catch (error) {
                return { success: false, error: error.message };
            }
        }
    }
};

// ===================================
// Hybrid Mode: Firebase + LocalStorage Fallback
// ===================================

const HybridStore = {
    // Sync local data to Firebase on first load
    syncToFirebase: async () => {
        try {
            const localUsers = JSON.parse(localStorage.getItem('wusul_users_db')) || [];

            for (const user of localUsers) {
                const existsInFirebase = await FirebaseDB.users.get(user.phone);
                if (!existsInFirebase.success) {
                    // Upload to Firebase if not exists
                    await FirebaseDB.users.create(user);
                }
            }

            console.log("✅ Local data synced to Firebase");
            return { success: true };
        } catch (error) {
            console.error("Sync Error:", error);
            return { success: false };
        }
    },

    // Get user with Firebase priority, localStorage fallback
    getUser: async (phone) => {
        // Try Firebase first
        const firebaseResult = await FirebaseDB.users.get(phone);
        if (firebaseResult.success) {
            return firebaseResult.data;
        }

        // Fallback to localStorage
        const localUsers = JSON.parse(localStorage.getItem('wusul_users_db')) || [];
        return localUsers.find(u => u.phone === phone) || null;
    },

    // Save user to both Firebase and localStorage
    saveUser: async (userData) => {
        // Save to Firebase
        await FirebaseDB.users.create(userData);

        // Also save to localStorage for offline support
        const localUsers = JSON.parse(localStorage.getItem('wusul_users_db')) || [];
        const existingIndex = localUsers.findIndex(u => u.phone === userData.phone);

        if (existingIndex !== -1) {
            localUsers[existingIndex] = userData;
        } else {
            localUsers.push(userData);
        }

        localStorage.setItem('wusul_users_db', JSON.stringify(localUsers));
        return { success: true };
    }
};

// Auto-sync on page load
if (typeof firebase !== 'undefined' && firebaseDB) {
    window.addEventListener('load', () => {
        HybridStore.syncToFirebase();
    });
}
