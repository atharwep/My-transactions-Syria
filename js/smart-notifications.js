const SmartNotifications = {
    lastCoords: null,
    detectedCity: null,

    // Predefined Coordinates for major Syrian areas for simulation
    SYRIA_HUBS: [
        { name: "دمشق", lat: 33.5138, lng: 36.2765 },
        { name: "حلب", lat: 36.2021, lng: 37.1343 },
        { name: "حمص", lat: 34.7324, lng: 36.7137 },
        { name: "اللاذقية", lat: 35.5312, lng: 35.7921 },
        { name: "طرطوس", lat: 34.8890, lng: 35.8864 },
        { name: "حماة", lat: 35.1318, lng: 36.7578 },
        { name: "درعا", lat: 32.6189, lng: 36.1030 },
        { name: "السويداء", lat: 32.7090, lng: 36.5663 }
    ],

    init: () => {
        console.log("Smart Notifications System Active with Geolocation...");

        // Start watching position
        if ("geolocation" in navigator) {
            navigator.geolocation.watchPosition(
                SmartNotifications.handleLocationSuccess,
                SmartNotifications.handleLocationError,
                { enableHighAccuracy: true, timeout: 20000, maximumAge: 10000 }
            );
        } else {
            console.warn("Geolocation not supported. Defaulting to simulation.");
            // Simulation fallback if needed
        }

        // Periodical checks for time-based events
        setInterval(SmartNotifications.checkTimeEvents, 60000);
    },

    handleLocationSuccess: (position) => {
        const { latitude, longitude } = position.coords;

        // Only notify if location changed significantly
        if (SmartNotifications.lastCoords) {
            const dist = SmartNotifications.calculateDistance(
                latitude, longitude,
                SmartNotifications.lastCoords.lat, SmartNotifications.lastCoords.lng
            );
            if (dist < 1) return; // Ignore movements under 1km to avoid notification fatigue
        }

        SmartNotifications.lastCoords = { lat: latitude, lng: longitude };

        // Find nearest city
        let nearest = SmartNotifications.getNearestCity(latitude, longitude);
        SmartNotifications.detectedCity = nearest.name;

        // Trigger context-aware notifications
        SmartNotifications.showLocationDiscovery(latitude, longitude, nearest.name);
    },

    handleLocationError: (error) => {
        console.warn("Geolocation Error:", error.message);
    },

    getNearestCity: (lat, lon) => {
        let minDist = Infinity;
        let nearest = SmartNotifications.SYRIA_HUBS[0];

        SmartNotifications.SYRIA_HUBS.forEach(hub => {
            const d = SmartNotifications.calculateDistance(lat, lon, hub.lat, hub.lng);
            if (d < minDist) {
                minDist = d;
                nearest = hub;
            }
        });
        return nearest;
    },

    calculateDistance: (lat1, lon1, lat2, lon2) => {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    },

    showLocationDiscovery: (lat, lon, cityName) => {
        if (typeof Notify === 'undefined') return;

        Notify.show(
            `أنت الآن في نطاق ${cityName}`,
            `تم تحديث قائمة الصيدليات التكسي والطوارئ في ${cityName} وكامل المنطقة المحيطة بك 📍`,
            "fas fa-location-crosshairs"
        );

        // Simulation of available local services
        setTimeout(() => {
            Notify.show(
                "طلب تكسي في " + cityName,
                `يوجد 4 كابتن تكسي متوفرين في ${cityName} حالياً. زمن الوصول المتوقع: 5 دقائق 🚕`,
                "fas fa-taxi"
            );
        }, 5000);

        setTimeout(() => {
            Notify.show(
                "خدمة الصيدليات",
                `تم رصد صيدلية مناوبة قريبة جداً من موقعك في ${cityName}. هل تود عرض الخريطة؟ 💊`,
                "fas fa-pills"
            );
        }, 12000);
    },

    checkTimeEvents: () => {
        const city = SmartNotifications.detectedCity || "موقعك الحالي";
        const events = [
            { title: "تحديث الصيدليات", msg: `قام نظامنا بتحديث قائمة الصيدليات المناوبة في ${city} لفترة الليل.`, icon: "fas fa-pills" },
            { title: "جاهزية الطوارئ", msg: `أقرب مشفى طوارئ في ${city} هو 'المشفى التخصصي'. تم حفظ الموقع في المفضلة.`, icon: "fas fa-hospital-symbol" }
        ];

        const event = events[Math.floor(Math.random() * events.length)];
        if (typeof Notify !== 'undefined' && SmartNotifications.lastCoords) {
            Notify.show(event.title, event.msg, event.icon);
        }
    },

    triggerEmergencyBroadCast: (userName) => {
        if (typeof Notify === 'undefined') return;
        const city = SmartNotifications.detectedCity || "موقعه الحالي";

        Notify.show(
            "نداء طوارئ عاجل 🚨",
            `المشترك ${userName} أطلق نداء استغاثة في ${city}. يتم الآن توجيه الإسعاف والتكسي لنقطة GPS الخاصة به.`,
            "fas fa-exclamation-triangle"
        );
    }
};

// Start
SmartNotifications.init();
