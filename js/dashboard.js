// Dashboard Specific Logic
const Dashboard = {
    init: () => {
        if (Store.user.role === 'ADMIN') {
            document.getElementById('admin-section').style.display = 'block';
            Dashboard.renderPendingDoctors();
        }

        Dashboard.renderActivities();
        Dashboard.renderUserInfo();
    },

    renderUserInfo: () => {
        document.getElementById('user-name').innerText = Store.user.name;
        document.getElementById('user-balance-syp').innerText = (Store.user.balanceSYP || 0).toLocaleString() + " ل.س";
        document.getElementById('user-balance-usd').innerText = "$" + (Store.user.balanceUSD || 0).toLocaleString();
        document.getElementById('user-avatar').src = Store.user.avatar;
        document.getElementById('role-badge').innerText = Store.user.role;

        // Statistics
        const bookings = JSON.parse(localStorage.getItem('wusul_bookings') || '[]');
        const userBookings = bookings.filter(b => b.patientPhone === Store.user.phone && b.status !== 'REJECTED').length;
        const bookingCountEl = document.getElementById('active-bookings-count');
        if (bookingCountEl) bookingCountEl.innerText = userBookings;

        const extra = document.getElementById('extra-links');
        if (extra) {
            extra.innerHTML = '';
            if (Store.user.role === 'ADMIN' || Store.user.role === 'AGENT') {
                extra.innerHTML += `<a href="agents-activity.html" class="side-link">🛡️ تفعيل الرتب</a>`;
            }
            if (Store.user.role === 'DOCTOR') {
                extra.innerHTML += `<a href="doctor-requests.html" class="side-link">🏥 طلبات المرضى</a>`;
            }
        }
    },

    renderActivities: () => {
        const txs = Store.getData('transactions') || [];
        if (txs.length > 0) {
            const list = document.getElementById('activities-list');
            list.innerHTML = '';
            txs.slice(0, 5).forEach(tx => {
                list.innerHTML += `<div style="display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid #f8fafc; font-size:0.8rem; font-weight:800;">
                    <span>${tx.title}</span>
                    <span style="color:${tx.amount < 0 ? 'red' : 'green'}">${tx.amount < 0 ? '-' : '+'}${Math.abs(tx.amount)}</span>
                </div>`;
            });
        }
    },

    renderPendingDoctors: () => {
        const doctors = Store.getData('doctors') || [];
        const pending = doctors.filter(d => !d.isVerified);
        const container = document.getElementById('pending-doctors-section');
        const list = document.getElementById('pending-doctors-list');

        if (pending.length === 0) {
            if (container) container.style.display = 'none';
            return;
        }

        if (container) container.style.display = 'block';

        list.innerHTML = pending.map(d => {
            return `
            <div style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); padding: 20px; border-radius: 25px; margin-bottom: 20px;">
                <div style="display: flex; gap: 20px; align-items: flex-start; margin-bottom: 15px;">
                    <img src="${d.avatar}" style="width: 60px; height: 60px; border-radius: 18px; border: 2px solid var(--gold);">
                    <div style="flex: 1;">
                        <h4 style="color: white; font-size: 1.1rem; margin: 0 0 5px 0; font-weight: 900;">${d.name}</h4>
                        <p style="color: #94a3b8; font-size: 0.8rem; margin: 0; font-weight: 700;">${d.specialty} | ${d.city || 'دمشق'}</p>
                        
                        <div style="display: flex; gap: 10px; margin-top: 12px;">
                            ${d.certificate ? `<a href="${d.certificate}" target="_blank" style="font-size: 10px; background: rgba(197, 160, 33, 0.1); color: var(--gold); padding: 5px 10px; border-radius: 8px; text-decoration: none; border: 1px solid var(--border-rgba); font-weight: 800;"><i class="fas fa-file-medical"></i> عرض الشهادة</a>` : ''}
                            ${d.identityId ? `<a href="${d.identityId}" target="_blank" style="font-size: 10px; background: rgba(255, 255, 255, 0.05); color: #FFF; padding: 5px 10px; border-radius: 8px; text-decoration: none; border: 1px solid rgba(255,255,255,0.1); font-weight: 800;"><i class="fas fa-id-card"></i> عرض الهوية</a>` : ''}
                        </div>
                    </div>
                </div>
                
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    <div style="display: flex; gap: 10px;">
                        <button onclick="handleDoctorApproval('${d.phone || d.id}', true)" class="btn" style="flex: 1.5; background: #16a34a; color: white; padding: 12px; font-size: 0.85rem; font-weight: 900; border-radius: 15px;">قبول واعتماد ✅</button>
                        <button onclick="handleDoctorApproval('${d.phone || d.id}', false)" class="btn" style="flex: 1; background: #dc2626; color: white; padding: 12px; font-size: 0.85rem; font-weight: 900; border-radius: 15px;">رفض الطلب ❌</button>
                    </div>
                    <button onclick="showDoctorDetails('${d.phone || d.id}')" class="btn" style="width: 100%; background: rgba(255,255,255,0.05); color: #94a3b8; padding: 10px; font-size: 0.8rem; font-weight: 700; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);"><i class="fas fa-info-circle"></i> مراجعة معلومات الطبيب الكاملة</button>
                </div>
            </div>
            `;
        }).join('');
    }
};

// Expose functions globally for HTML onclick events
window.activateAgent = () => {
    const phone = document.getElementById('admin-phone').value;
    if (!phone) return;
    const res = Store.activateAgent(phone);
    showResult(res.message, res.success);
};

window.handleDoctorApproval = async (idOrPhone, isApproved) => {
    if (!isApproved && !confirm("هل أنت متأكد من رفض هذا الطلب؟ سيتم حذف بيانات الطبيب المعلقة.")) return;

    let res;
    if (isApproved) {
        res = await Store.approveDoctor(idOrPhone);
    } else {
        res = await Store.deleteDoctor(idOrPhone);
    }

    if (typeof showResult === 'function') {
        showResult(res.message, res.success);
    } else {
        alert(res.message);
    }

    if (res.success) {
        Dashboard.renderPendingDoctors();
        // Refresh navbar if balance/role changed for current user
        if (Store.user && (Store.user.phone == idOrPhone || Store.user.id == idOrPhone)) {
            UI.updateNavbar();
        }
    }
};

window.showDoctorDetails = (idOrPhone) => {
    const doctors = Store.getData('doctors') || [];
    const doc = doctors.find(d => d.id == idOrPhone || d.phone == idOrPhone);
    if (!doc) return alert("لم يتم العثور على بيانات الطبيب");

    const modal = document.getElementById('doctorDetailsModal');
    const content = document.getElementById('doctorDetailsContent');

    content.innerHTML = `
        <div style="text-align: center; margin-bottom: 25px;">
            <img src="${doc.avatar}" style="width: 100px; height: 100px; border-radius: 30px; border: 4px solid var(--gold); margin-bottom: 15px;">
            <h2 style="color: white; font-weight: 900;">${doc.name}</h2>
            <span style="background: var(--gold); color: black; padding: 4px 12px; border-radius: 50px; font-size: 10px; font-weight: 900;">طلب انضمام طبيب</span>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px;">
            <div style="background: rgba(255,255,255,0.03); padding: 12px; border-radius: 15px; border: 1px solid rgba(255,255,255,0.05);">
                <p style="color: #64748B; font-size: 9px; font-weight: 800; margin: 0 0 4px 0;">رقم الهاتف</p>
                <p style="color: white; font-size: 0.9rem; font-weight: 700; margin: 0;">${doc.phone || 'غير متوفر'}</p>
            </div>
            <div style="background: rgba(255,255,255,0.03); padding: 12px; border-radius: 15px; border: 1px solid rgba(255,255,255,0.05);">
                <p style="color: #64748B; font-size: 9px; font-weight: 800; margin: 0 0 4px 0;">المدينة</p>
                <p style="color: white; font-size: 0.9rem; font-weight: 700; margin: 0;">${doc.city || 'غير محدد'}</p>
            </div>
            <div style="background: rgba(255,255,255,0.03); padding: 12px; border-radius: 15px; border: 1px solid rgba(255,255,255,0.05);">
                <p style="color: #64748B; font-size: 9px; font-weight: 800; margin: 0 0 4px 0;">التخصص</p>
                <p style="color: white; font-size: 0.9rem; font-weight: 700; margin: 0;">${doc.specialty || 'عام'}</p>
            </div>
            <div style="background: rgba(255,255,255,0.03); padding: 12px; border-radius: 15px; border: 1px solid rgba(255,255,255,0.05);">
                <p style="color: #64748B; font-size: 9px; font-weight: 800; margin: 0 0 4px 0;">سعر الكشفية</p>
                <p style="color: var(--gold); font-size: 0.9rem; font-weight: 900; margin: 0;">${doc.displayPrice || '0'}</p>
            </div>
        </div>

        <div style="background: rgba(255,255,255,0.03); padding: 12px; border-radius: 15px; border: 1px solid rgba(255,255,255,0.05); margin-bottom: 25px;">
            <p style="color: #64748B; font-size: 9px; font-weight: 800; margin: 0 0 4px 0;">اسم العيادة / المركز</p>
            <p style="color: white; font-size: 0.9rem; font-weight: 700; margin: 0;">${doc.clinic || 'لا يوجد'}</p>
        </div>

        <div style="display: flex; gap: 10px; margin-bottom: 25px;">
            <a href="${doc.certificate}" target="_blank" style="flex: 1; background: #FFF; color: #000; padding: 12px; border-radius: 12px; text-align: center; font-weight: 900; text-decoration: none; font-size: 0.8rem;">
                <i class="fas fa-file-medical"></i> الشهادة
            </a>
            <a href="${doc.identityId}" target="_blank" style="flex: 1; background: rgba(255,255,255,0.05); color: #FFF; padding: 12px; border-radius: 12px; text-align: center; font-weight: 900; text-decoration: none; border: 1px solid rgba(255,255,255,0.05); font-size: 0.8rem;">
                <i class="fas fa-id-card"></i> الهوية
            </a>
        </div>
        
        <div style="display: flex; gap: 10px;">
             <button onclick="closeDoctorDetails(); handleDoctorApproval('${doc.phone || doc.id}', true);" class="btn" style="flex: 1; background: #16a34a; color: white; padding: 15px; font-weight: 900; border-radius: 15px;">اعتماد ✅</button>
             <button onclick="closeDoctorDetails(); handleDoctorApproval('${doc.phone || doc.id}', false);" class="btn" style="flex: 0.5; background: #dc2626; color: white; padding: 15px; font-weight: 900; border-radius: 15px;">رفض ❌</button>
        </div>
    `;

    modal.style.display = 'flex';
};

window.closeDoctorDetails = () => {
    document.getElementById('doctorDetailsModal').style.display = 'none';
};

window.makeAdmin = () => {
    const phone = document.getElementById('admin-phone').value;
    if (!phone) return;
    if (!confirm("هل أنت متأكد من منح هذا المستخدم صلاحيات الإدارة الكاملة؟")) return;
    const res = Store.makeAdmin(phone);
    showResult(res.message, res.success);
};

window.editDoctor = () => {
    const phone = document.getElementById('manage-doc-phone').value;
    const spec = document.getElementById('edit-doc-spec').value;
    const price = document.getElementById('edit-doc-price').value;
    if (!phone) return;
    const res = Store.editDoctor(phone, spec, price);
    showResult(res.message, res.success);
};

window.deleteDoctor = () => {
    const phone = document.getElementById('manage-doc-phone').value;
    if (!phone) return;
    if (!confirm("حذف الطبيب سيقوم بإلغاء صلاحياته وإزالته من القائمة. هل أنت متأكد؟")) return;
    const res = Store.deleteDoctor(phone);
    showResult(res.message, res.success);
};

window.addNewDoctor = () => {
    const name = document.getElementById('new-doc-name').value;
    const phone = document.getElementById('new-doc-phone').value;
    const pass = document.getElementById('new-doc-pass').value;
    const spec = document.getElementById('new-doc-spec').value;
    const city = document.getElementById('new-doc-city').value;
    const price = document.getElementById('new-doc-price').value;

    if (!name || !phone || !pass || !spec) {
        showResult("يرجى تعبئة الحقول الأساسية (الاسم، الهاتف، كلمة المرور، التخصص)", false);
        return;
    }

    const res = Store.addDoctor(name, phone, pass, spec, price, city);
    showResult(res.message, res.success);

    if (res.success) {
        document.querySelectorAll('#new-doc-name, #new-doc-phone, #new-doc-pass, #new-doc-spec, #new-doc-city, #new-doc-price')
            .forEach(inp => inp.value = '');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    Dashboard.init();
});
