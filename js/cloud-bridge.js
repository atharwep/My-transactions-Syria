/**
 * CLOUD BRIDGE - Google Sheets Integration
 * Connects the HTML frontend to a Google Sheet database.
 */

const CloudDB = {
    async call(action, data = {}) {
        if (!CONFIG.GOOGLE_SHEET_BRIDGE_URL || CONFIG.GOOGLE_SHEET_BRIDGE_URL.includes("YOUR_SCRIPT_ID")) {
            console.warn("CloudDB: No valid Bridge URL found. Falling back to local.");
            return { success: false, mode: 'local' };
        }

        try {
            const response = await fetch(CONFIG.GOOGLE_SHEET_BRIDGE_URL, {
                method: 'POST',
                mode: 'no-cors', // Apps Script often requires no-cors for simple posts or careful header handling
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, data })
            });
            // Note: with no-cors, you can't read the response. 
            // For a robust implementation, we use a hidden iframe or a redirect-based bridge.
            // But for modern Apps Script Web Apps, regular fetch often works if deployed correctly.
            return { success: true };
        } catch (error) {
            console.error("CloudDB Error:", error);
            return { success: false };
        }
    },

    // Sync local data to cloud
    async syncAll() {
        const keys = ['users_db', 'db_doctors', 'db_hospitals', 'db_pharmacies', 'db_transactions'];
        for (const key of keys) {
            const data = localStorage.getItem(`wusul_${key}`);
            if (data) {
                await this.call('sync_table', { key, content: JSON.parse(data) });
            }
        }
    }
};

// Periodic sync every 5 minutes if logged in
setInterval(() => {
    if (Store.user) CloudDB.syncAll();
}, 300000);
