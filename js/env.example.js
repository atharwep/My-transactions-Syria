// ===================================
// Environment Configuration
// ===================================

// ⚠️ IMPORTANT: Do NOT commit this file with real credentials to GitHub!
// Create a .gitignore file and add: js/env.js

const ENV = {
    // Environment Mode
    MODE: 'development', // 'development' or 'production'

    // Firebase Configuration
    FIREBASE: {
        apiKey: "YOUR_FIREBASE_API_KEY",
        authDomain: "YOUR_PROJECT.firebaseapp.com",
        projectId: "YOUR_PROJECT_ID",
        storageBucket: "YOUR_PROJECT.appspot.com",
        messagingSenderId: "YOUR_SENDER_ID",
        appId: "YOUR_APP_ID",
        databaseURL: "https://YOUR_PROJECT.firebaseio.com"
    },

    // Twilio Configuration
    TWILIO: {
        accountSid: "YOUR_TWILIO_ACCOUNT_SID",
        authToken: "YOUR_TWILIO_AUTH_TOKEN",
        phoneNumber: "+1234567890"
    },

    // Security Configuration
    SECURITY: {
        jwtSecret: "CHANGE_THIS_TO_A_RANDOM_SECRET_KEY",
        tokenExpiry: 7 * 24 * 60 * 60 * 1000, // 7 days
        maxLoginAttempts: 5,
        lockoutDuration: 15 * 60 * 1000 // 15 minutes
    },

    // Google Maps API
    GOOGLE_MAPS: {
        apiKey: "YOUR_GOOGLE_MAPS_API_KEY"
    },

    // Application Settings
    APP: {
        name: "معاملاتي",
        version: "2.0.0",
        supportEmail: "support@muamalati.sy",
        supportPhone: "+963936020439"
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ENV;
}
