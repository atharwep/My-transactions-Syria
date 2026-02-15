// ===================================
// Twilio SMS Integration
// Real SMS Sending Service
// ===================================

const TwilioSMS = {
    // Twilio Configuration
    config: {
        accountSid: 'YOUR_TWILIO_ACCOUNT_SID',
        authToken: 'YOUR_TWILIO_AUTH_TOKEN',
        phoneNumber: '+1234567890', // Your Twilio phone number

        // Twilio API Endpoint
        apiUrl: 'https://api.twilio.com/2010-04-01/Accounts'
    },

    // ===================================
    // Send SMS via Twilio
    // ===================================
    send: async (toPhone, message) => {
        try {
            // Format phone number to E.164 format
            const formattedPhone = TwilioSMS.formatPhoneNumber(toPhone);

            // Prepare request
            const url = `${TwilioSMS.config.apiUrl}/${TwilioSMS.config.accountSid}/Messages.json`;

            const formData = new URLSearchParams();
            formData.append('To', formattedPhone);
            formData.append('From', TwilioSMS.config.phoneNumber);
            formData.append('Body', message);

            // Create Basic Auth header
            const authHeader = 'Basic ' + btoa(
                TwilioSMS.config.accountSid + ':' + TwilioSMS.config.authToken
            );

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': authHeader,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                console.log('✅ SMS sent successfully:', data.sid);
                return {
                    success: true,
                    messageSid: data.sid,
                    status: data.status
                };
            } else {
                const error = await response.json();
                console.error('❌ Twilio SMS Error:', error);
                return {
                    success: false,
                    error: error.message || 'Failed to send SMS'
                };
            }
        } catch (error) {
            console.error('❌ SMS Send Error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },

    // ===================================
    // Send OTP via Twilio
    // ===================================
    sendOTP: async (phone, otp) => {
        const message = `رمز التحقق الخاص بك في معاملاتي هو: ${otp}\n\nلا تشارك هذا الرمز مع أي شخص.\nصالح لمدة 10 دقائق.`;

        return await TwilioSMS.send(phone, message);
    },

    // ===================================
    // Send Transaction Notification
    // ===================================
    sendTransactionNotification: async (phone, amount, currency, type) => {
        const typeText = type === 'deposit' ? 'إيداع' : 'سحب';
        const message = `تم ${typeText} ${amount} ${currency} ${type === 'deposit' ? 'إلى' : 'من'} محفظتك في معاملاتي.\n\nالرصيد الجديد متاح الآن.`;

        return await TwilioSMS.send(phone, message);
    },

    // ===================================
    // Send Booking Confirmation
    // ===================================
    sendBookingConfirmation: async (phone, doctorName, date) => {
        const message = `تم تأكيد حجزك مع ${doctorName}\nالموعد: ${date}\n\nشكراً لاستخدامك معاملاتي 🩺`;

        return await TwilioSMS.send(phone, message);
    },

    // ===================================
    // Format Phone Number to E.164
    // ===================================
    formatPhoneNumber: (phone) => {
        // Remove all non-digits
        let cleaned = phone.replace(/\D/g, '');

        // Handle Syrian numbers
        if (cleaned.startsWith('963')) {
            return '+' + cleaned;
        }
        if (cleaned.startsWith('0')) {
            return '+963' + cleaned.substring(1);
        }
        return '+963' + cleaned;
    },

    // ===================================
    // Verify Twilio Configuration
    // ===================================
    verifyConfig: async () => {
        try {
            const url = `${TwilioSMS.config.apiUrl}/${TwilioSMS.config.accountSid}.json`;
            const authHeader = 'Basic ' + btoa(
                TwilioSMS.config.accountSid + ':' + TwilioSMS.config.authToken
            );

            const response = await fetch(url, {
                headers: { 'Authorization': authHeader }
            });

            if (response.ok) {
                console.log('✅ Twilio configuration is valid');
                return { valid: true };
            } else {
                console.error('❌ Invalid Twilio credentials');
                return { valid: false, error: 'Invalid credentials' };
            }
        } catch (error) {
            console.error('❌ Twilio verification error:', error);
            return { valid: false, error: error.message };
        }
    }
};

// ===================================
// Enhanced SMS Manager with Twilio Integration
// ===================================

const EnhancedSMS = {
    currentOTP: null,
    otpExpiry: null,
    confirmationResult: null,

    // ===================================
    // Send OTP with Twilio (Production) or Simulation (Development)
    // ===================================
    sendOTP: async (phone, recaptchaElementId = null) => {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        EnhancedSMS.currentOTP = otp;
        EnhancedSMS.otpExpiry = Date.now() + (10 * 60 * 1000); // 10 minutes

        // Check if Twilio is configured
        const isTwilioConfigured =
            TwilioSMS.config.accountSid !== 'YOUR_TWILIO_ACCOUNT_SID' &&
            TwilioSMS.config.accountSid.length > 10;

        if (isTwilioConfigured) {
            // Production: Use Twilio
            console.log('📱 Sending real SMS via Twilio...');
            const result = await TwilioSMS.sendOTP(phone, otp);

            if (result.success) {
                return {
                    success: true,
                    message: 'تم إرسال رمز التحقق إلى هاتفك',
                    mode: 'twilio'
                };
            } else {
                // Fallback to simulation if Twilio fails
                console.warn('⚠️ Twilio failed, using simulation');
                return EnhancedSMS.simulateOTP(phone, otp);
            }
        } else {
            // Development: Simulate SMS
            console.log('🧪 Development mode: Simulating SMS');
            return EnhancedSMS.simulateOTP(phone, otp);
        }
    },

    // ===================================
    // Simulate OTP (for development/testing)
    // ===================================
    simulateOTP: (phone, otp) => {
        console.log(`
╔════════════════════════════════════╗
║     رمز التحقق (محاكاة)           ║
╠════════════════════════════════════╣
║  الرقم: ${phone}                   
║  الرمز: ${otp}                     
║  صالح لمدة: 10 دقائق              ║
╚════════════════════════════════════╝
        `);

        // Show notification on screen
        if (typeof Notify !== 'undefined') {
            Notify.show(
                'رمز التحقق (وضع التطوير)',
                `الرمز: ${otp}`,
                'fas fa-mobile-alt'
            );
        }

        return {
            success: true,
            simulated: true,
            code: otp,
            message: 'تم إنشاء رمز التحقق (وضع التطوير)'
        };
    },

    // ===================================
    // Verify OTP
    // ===================================
    verifyOTP: (code) => {
        if (!EnhancedSMS.currentOTP) {
            return {
                success: false,
                message: 'لم يتم إرسال رمز التحقق بعد'
            };
        }

        if (Date.now() > EnhancedSMS.otpExpiry) {
            EnhancedSMS.currentOTP = null;
            return {
                success: false,
                message: 'انتهت صلاحية رمز التحقق. يرجى طلب رمز جديد'
            };
        }

        if (code === EnhancedSMS.currentOTP) {
            EnhancedSMS.currentOTP = null; // Clear after successful verification
            return {
                success: true,
                message: 'تم التحقق بنجاح'
            };
        }

        return {
            success: false,
            message: 'رمز التحقق غير صحيح'
        };
    },

    // ===================================
    // Send Generic SMS
    // ===================================
    send: async (phone, message) => {
        const isTwilioConfigured =
            TwilioSMS.config.accountSid !== 'YOUR_TWILIO_ACCOUNT_SID';

        if (isTwilioConfigured) {
            return await TwilioSMS.send(phone, message);
        } else {
            // Simulate in development
            console.log(`📱 SMS to ${phone}: ${message}`);
            return { success: true, simulated: true };
        }
    }
};

// ===================================
// Auto-verify Twilio on load (if configured)
// ===================================
window.addEventListener('load', async () => {
    if (TwilioSMS.config.accountSid !== 'YOUR_TWILIO_ACCOUNT_SID') {
        const verification = await TwilioSMS.verifyConfig();
        if (verification.valid) {
            console.log('✅ Twilio SMS service is ready');
        } else {
            console.warn('⚠️ Twilio configuration issue:', verification.error);
        }
    }
});
