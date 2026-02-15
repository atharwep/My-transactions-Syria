const SYRIA_DATA = {
    "دمشق": ["المركز", "المزة", "كفرسوسة", "المهاجرين", "دمشق القديمة", "الميدان", "ساروجة", "ركن الدين", "اليرموك"],
    "ريف دمشق": ["جرمانا", "صحنايا", "قدسيا", "الكسوة", "دوما", "التل", "يبرود", "النبك", "الزبداني", "قطنا", "داريا", "عربين"],
    "حلب": ["المركز", "السفيرة", "الباب", "منبج", "عفرين", "جرابلس", "أعزاز", "عين العرب"],
    "حمص": ["المركز", "تدمر", "المخرّم", "القصير", "الرستن", "تلكلخ"],
    "حماة": ["المركز", "السقيلبية", "سلمية", "محردة", "مصياف"],
    "اللاذقية": ["المركز", "جبلة", "الحفة", "القرداحة"],
    "طرطوس": ["المركز", "بانياس", "صافيتا", "الدريكيش", "الشيخ بدر", "قدموس"],
    "إدلب": ["المركز", "أريحا", "حارم", "جسر الشغور", "معرة النعمان"],
    "دير الزور": ["المركز", "البوكمال", "الميادين"],
    "الحسكة": ["المركز", "القامشلي", "المالكية", "رأس العين"],
    "الرقة": ["المركز", "الثورة", "تل أبيض"],
    "السويداء": ["المركز", "شهبا", "صلخد"],
    "درعا": ["المركز", "الصنمين", "إزرع"],
    "القنيطرة": ["المركز", "فيق"]
};

const LocationHelper = {
    initGovernorates: (selectId) => {
        const select = document.getElementById(selectId);
        if (!select) return;

        select.innerHTML = '<option value="">اختر المحافظة...</option>';
        Object.keys(SYRIA_DATA).forEach(gov => {
            const opt = document.createElement('option');
            opt.value = gov;
            opt.innerText = gov;
            select.appendChild(opt);
        });
    },

    updateCities: (govValue, citySelectId) => {
        const select = document.getElementById(citySelectId);
        if (!select) return;

        select.innerHTML = '<option value="">اختر المدينة/المنطقة...</option>';
        if (govValue && SYRIA_DATA[govValue]) {
            SYRIA_DATA[govValue].forEach(city => {
                const opt = document.createElement('option');
                opt.value = city;
                opt.innerText = city;
                select.appendChild(opt);
            });
        }
    }
};
