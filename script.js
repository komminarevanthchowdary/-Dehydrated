/* ============================================
   RENEPLANE — JAVASCRIPT
   Authentication (Google Sign-In + Universal Phone OTP)
   Backend API + User Profile + Cart + Checkout
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

    // ========================================
    // TOKEN & API HELPER
    // ========================================
    const TOKEN_KEY = 'reneplane_token';
    let currentUser = null;

    function getToken() {
        return localStorage.getItem(TOKEN_KEY) || '';
    }

    function setToken(token) {
        if (token) {
            localStorage.setItem(TOKEN_KEY, token);
        } else {
            localStorage.removeItem(TOKEN_KEY);
        }
    }

    async function apiFetch(url, options = {}) {
        const defaults = {
            headers: { 'Content-Type': 'application/json' }
        };

        const token = getToken();
        if (token) {
            defaults.headers['Authorization'] = `Bearer ${token}`;
        }

        const config = { ...defaults, ...options };
        if (options.headers) config.headers = { ...defaults.headers, ...options.headers };

        try {
            const res = await fetch(url, config);
            const contentType = res.headers.get('content-type') || '';
            let data;
            if (contentType.includes('application/json')) {
                data = await res.json();
            } else {
                const text = await res.text();
                console.warn('apiFetch received non‑JSON response', { url, status: res.status, text });
                // Return raw text in a wrapper; callers that expect JSON will see undefined fields.
                data = { raw: text };
            }
            if (!res.ok) throw new Error((data && data.message) || 'Request failed');
            return data;
        } catch (err) {
            // Preserve original error stack and also log for debugging
            console.error('apiFetch error:', err);
            throw err;
        }
    }

    // ========================================
    // USER STATE & SESSION MANAGEMENT
    // ========================================
    function loginUser(userData, token) {
        currentUser = userData;
        if (token) setToken(token);
        updateUserUI();
    }

    async function logoutUser() {
        try {
            await apiFetch('/api/auth/logout', { method: 'POST' });
        } catch (e) {
            // Ignore logout network error
        }
        currentUser = null;
        setToken(null);
        updateUserUI();
    }

    function updateUserUI() {
        const nameDisplay = document.getElementById('userNameDisplay');
        const userBtn = document.getElementById('navUserBtn');
        const loginBtn = document.getElementById('navLoginBtn');
        const ordersBtn = document.getElementById('navOrdersBtn');

        if (currentUser) {
            const displayName = (currentUser.name || 'User').split(' ')[0];
            if (nameDisplay) nameDisplay.textContent = displayName;
            if (userBtn) {
                userBtn.classList.add('logged-in');
                userBtn.style.display = 'inline-flex';
            }
            if (loginBtn) loginBtn.style.display = 'none';
            if (ordersBtn) ordersBtn.style.display = 'inline-flex';
        } else {
            if (nameDisplay) nameDisplay.textContent = '';
            if (userBtn) {
                userBtn.classList.remove('logged-in');
                userBtn.style.display = 'none';
            }
            if (loginBtn) loginBtn.style.display = 'inline-flex';
            if (ordersBtn) ordersBtn.style.display = 'none';
        }
    }

    // Auto-restore session on page load
    async function checkCurrentSession() {
        const token = getToken();
        if (!token) {
            updateUserUI();
            return;
        }

        try {
            const data = await apiFetch('/api/auth/me');
            if (data.success && data.user) {
                loginUser(data.user);
            } else {
                logoutUser();
            }
        } catch (err) {
            logoutUser();
        }
    }
    checkCurrentSession();


    // ========================================
    // AUTH MODAL & FLOWS
    // ========================================
    const authOverlay = document.getElementById('authOverlay');
    const authModalClose = document.getElementById('authModalClose');
    const navLoginBtn = document.getElementById('navLoginBtn');
    const navUserBtn = document.getElementById('navUserBtn');
    const navOrdersBtn = document.getElementById('navOrdersBtn');
    const profileOverlay = document.getElementById('profileOverlay');
    const profileModalClose = document.getElementById('profileModalClose');

    let currentAuthPhone = '';
    let currentAuthName = '';
    let otpCountdownInterval = null;

    function openAuthModal() {
        if (currentUser) {
            openProfileModal('details');
            return;
        }
        showAuthStep(1);
        authOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeAuthModal() {
        if (authOverlay) authOverlay.classList.remove('active');
        document.body.style.overflow = '';
        if (otpCountdownInterval) clearInterval(otpCountdownInterval);
    }

    function showAuthStep(step) {
        const step1 = document.getElementById('authStep1');
        const step2 = document.getElementById('authStep2');
        const step3 = document.getElementById('authStep3');
        if (step1) step1.style.display = step === 1 ? 'block' : 'none';
        if (step2) step2.style.display = step === 2 ? 'block' : 'none';
        if (step3) step3.style.display = step === 3 ? 'block' : 'none';
    }

    if (navLoginBtn) navLoginBtn.addEventListener('click', openAuthModal);
    if (authModalClose) authModalClose.addEventListener('click', closeAuthModal);
    if (authOverlay) {
        authOverlay.addEventListener('click', (e) => {
            if (e.target === authOverlay) closeAuthModal();
        });
    }

    // Google Sign-In Setup
    function handleGoogleCredentialResponse(response) {
        if (!response || !response.credential) return;

        apiFetch('/api/auth/google', {
            method: 'POST',
            body: JSON.stringify({ credential: response.credential })
        }).then(data => {
            if (data.success && data.user) {
                loginUser(data.user, data.token);
                showToast(`Welcome, ${data.user.name || 'Friend'}! 🎉`);
                const verifiedNameEl = document.getElementById('verifiedName');
                if (verifiedNameEl) verifiedNameEl.textContent = data.user.name || 'User';
                showAuthStep(3);
            }
        }).catch(err => {
            showToast(err.message || 'Google sign-in failed. Please try mobile login.', 'info');
        });
    }

    // Initialize Google Identity Services if available
    window.onload = function () {
        if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
            try {
                google.accounts.id.initialize({
                    client_id: "849114166015-4e93uniqijfkqmoh661amtadobgh8asc.apps.googleusercontent.com",
                    callback: handleGoogleCredentialResponse,
                    auto_select: false,
                    cancel_on_tap_outside: true
                });
            } catch (e) {
                // Ignore GSI init warnings
            }
        }
    };

    const googleSignInBtn = document.getElementById('googleSignInBtn');
    if (googleSignInBtn) {
        googleSignInBtn.addEventListener('click', () => {
            // If GSI is available, render a proper Google button inside a temporary container
            if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
                try {
                    // Create a temporary hidden container for the Google rendered button
                    let gDiv = document.getElementById('g_id_signin_tmp');
                    if (!gDiv) {
                        gDiv = document.createElement('div');
                        gDiv.id = 'g_id_signin_tmp';
                        gDiv.style.position = 'fixed';
                        gDiv.style.top = '50%';
                        gDiv.style.left = '50%';
                        gDiv.style.transform = 'translate(-50%, -50%)';
                        gDiv.style.zIndex = '100000';
                        gDiv.style.background = '#fff';
                        gDiv.style.padding = '24px';
                        gDiv.style.borderRadius = '16px';
                        gDiv.style.boxShadow = '0 8px 32px rgba(0,0,0,0.25)';
                        document.body.appendChild(gDiv);
                    }
                    gDiv.innerHTML = '<p style="margin:0 0 12px;font-weight:600;color:#333;text-align:center;">Sign in with Google</p><div id="g_btn_render"></div><button id="g_close_tmp" style="margin-top:12px;width:100%;padding:8px;border:1px solid #ddd;border-radius:8px;background:#f5f5f5;cursor:pointer;">Cancel</button>';
                    
                    google.accounts.id.renderButton(
                        document.getElementById('g_btn_render'),
                        { theme: 'outline', size: 'large', width: 280, text: 'signin_with' }
                    );

                    document.getElementById('g_close_tmp').addEventListener('click', () => {
                        gDiv.remove();
                    });

                    return;
                } catch (e) {
                    console.warn('GSI renderButton failed:', e);
                    showToast('Google Sign-In is not available. Please try mobile login.', 'info');
                }
            } else {
                showToast('Google Sign-In is loading. Please wait a moment and try again.', 'info');
            }
        });
    }

    function promptQuickGoogleLogin() {
        const userEmail = prompt("Enter your Google Account email:", "user@gmail.com");
        if (!userEmail) return;

        const userName = userEmail.split('@')[0].replace(/[._]/g, ' ');
        const formattedName = userName.charAt(0).toUpperCase() + userName.slice(1);

        apiFetch('/api/auth/google', {
            method: 'POST',
            body: JSON.stringify({
                email: userEmail,
                name: formattedName,
                googleId: 'g_' + Math.floor(Math.random() * 100000000)
            })
        }).then(data => {
            if (data.success && data.user) {
                loginUser(data.user, data.token);
                showToast(`Signed in as ${data.user.name}!`);
                const verifiedNameEl = document.getElementById('verifiedName');
                if (verifiedNameEl) verifiedNameEl.textContent = data.user.name;
                showAuthStep(3);
            }
        }).catch(err => {
            showToast(err.message || 'Google sign in failed', 'info');
        });
    }

    // Phone OTP Flow — Step 1: Send OTP
    const phoneAuthForm = document.getElementById('phoneAuthForm');
    const phoneSubmitBtn = document.getElementById('phoneSubmitBtn');

    if (phoneAuthForm) {
        phoneAuthForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const countryCode = document.getElementById('authCountryCode')?.value || '+91';
            const rawPhone = document.getElementById('authPhoneInput')?.value.trim();
            const name = document.getElementById('authNameInput')?.value.trim();

            if (!rawPhone) {
                showToast('Please enter your mobile number', 'info');
                return;
            }

            const fullPhone = rawPhone.startsWith('+') ? rawPhone : `${countryCode}${rawPhone}`;
            currentAuthPhone = fullPhone;
            currentAuthName = name;

            if (phoneSubmitBtn) {
                phoneSubmitBtn.disabled = true;
                phoneSubmitBtn.innerHTML = '<span>Sending OTP...</span>';
            }

            try {
                const data = await apiFetch('/api/auth/send-otp', {
                    method: 'POST',
                    body: JSON.stringify({ phone: fullPhone, name: name || undefined })
                });

                showToast(data.message || 'OTP sent successfully!');

                // Show instant preview in toast if available for zero-friction testing
                if (data.otpPreview) {
                    setTimeout(() => {
                        showToast(`🔑 Your OTP is: ${data.otpPreview}`, 'info');
                        const otpInput = document.getElementById('otpCodeInput');
                        if (otpInput) otpInput.value = data.otpPreview;
                    }, 500);
                }

                const displayPhoneEl = document.getElementById('displayTargetPhone');
                if (displayPhoneEl) displayPhoneEl.textContent = fullPhone;

                showAuthStep(2);
                startOtpCountdown();

                const otpCodeInput = document.getElementById('otpCodeInput');
                if (otpCodeInput) {
                    otpCodeInput.focus();
                }
            } catch (err) {
                showToast(err.message || 'Failed to send OTP. Please try again.', 'info');
            } finally {
                if (phoneSubmitBtn) {
                    phoneSubmitBtn.disabled = false;
                    phoneSubmitBtn.innerHTML = '<span>Send OTP</span>';
                }
            }
        });
    }

    function startOtpCountdown() {
        if (otpCountdownInterval) clearInterval(otpCountdownInterval);
        let seconds = 30;
        const countdownEl = document.getElementById('otpCountdown');
        const resendBtn = document.getElementById('resendOtpBtn');

        if (resendBtn) resendBtn.disabled = true;
        if (countdownEl) countdownEl.textContent = seconds;

        otpCountdownInterval = setInterval(() => {
            seconds--;
            if (countdownEl) countdownEl.textContent = seconds;
            if (seconds <= 0) {
                clearInterval(otpCountdownInterval);
                if (resendBtn) {
                    resendBtn.disabled = false;
                    resendBtn.textContent = 'Resend OTP';
                }
            }
        }, 1000);
    }

    const resendOtpBtn = document.getElementById('resendOtpBtn');
    if (resendOtpBtn) {
        resendOtpBtn.addEventListener('click', async () => {
            if (!currentAuthPhone) return;
            try {
                resendOtpBtn.disabled = true;
                resendOtpBtn.textContent = 'Sending...';
                const data = await apiFetch('/api/auth/send-otp', {
                    method: 'POST',
                    body: JSON.stringify({ phone: currentAuthPhone, name: currentAuthName })
                });
                showToast('New OTP sent!');
                if (data.otpPreview) {
                    setTimeout(() => {
                        showToast(`🔑 Your OTP is: ${data.otpPreview}`, 'info');
                        const otpInput = document.getElementById('otpCodeInput');
                        if (otpInput) otpInput.value = data.otpPreview;
                    }, 400);
                }
                startOtpCountdown();
            } catch (err) {
                showToast(err.message || 'Failed to resend OTP', 'info');
                resendOtpBtn.disabled = false;
                resendOtpBtn.textContent = 'Resend OTP';
            }
        });
    }

    // Phone OTP Flow — Step 2: Verify OTP
    const otpAuthForm = document.getElementById('otpAuthForm');
    const otpSubmitBtn = document.getElementById('otpSubmitBtn');

    if (otpAuthForm) {
        otpAuthForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const otpCode = document.getElementById('otpCodeInput')?.value.trim();

            if (!otpCode || otpCode.length < 6) {
                showToast('Please enter the 6-digit OTP', 'info');
                return;
            }

            if (otpSubmitBtn) {
                otpSubmitBtn.disabled = true;
                otpSubmitBtn.innerHTML = '<span>Verifying...</span>';
            }

            try {
                const data = await apiFetch('/api/auth/verify-otp', {
                    method: 'POST',
                    body: JSON.stringify({
                        phone: currentAuthPhone,
                        otp: otpCode,
                        name: currentAuthName || undefined
                    })
                });

                if (data.success && data.user) {
                    loginUser(data.user, data.token);
                    showToast('Phone verified successfully! 🎉');
                    const verifiedNameEl = document.getElementById('verifiedName');
                    if (verifiedNameEl) verifiedNameEl.textContent = data.user.name || 'Friend';
                    showAuthStep(3);
                }
            } catch (err) {
                showToast(err.message || 'Invalid or expired OTP. Please try again.', 'info');
            } finally {
                if (otpSubmitBtn) {
                    otpSubmitBtn.disabled = false;
                    otpSubmitBtn.innerHTML = '<span>Verify & Login</span>';
                }
            }
        });
    }

    const otpBackBtn = document.getElementById('otpBackBtn');
    if (otpBackBtn) {
        otpBackBtn.addEventListener('click', () => {
            showAuthStep(1);
        });
    }

    const startShoppingBtn = document.getElementById('startShoppingBtn');
    if (startShoppingBtn) {
        startShoppingBtn.addEventListener('click', () => {
            closeAuthModal();
            const productsEl = document.getElementById('products');
            if (productsEl) productsEl.scrollIntoView({ behavior: 'smooth' });
        });
    }


    // ========================================
    // PROFILE MODAL (Details, Addresses, Orders)
    // ========================================
    function openProfileModal(defaultTab = 'details') {
        if (!currentUser) {
            openAuthModal();
            return;
        }

        document.getElementById('profileName').textContent = currentUser.name || '-';
        document.getElementById('profileEmail').textContent = currentUser.email || '-';
        document.getElementById('profileMobile').textContent = currentUser.phone || '-';

        renderAddresses();
        renderOrders();
        switchProfileTab(defaultTab);

        profileOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeProfileModal() {
        if (profileOverlay) profileOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    if (navUserBtn) navUserBtn.addEventListener('click', () => openProfileModal('details'));
    if (navOrdersBtn) navOrdersBtn.addEventListener('click', () => openProfileModal('orders'));
    if (profileModalClose) profileModalClose.addEventListener('click', closeProfileModal);
    if (profileOverlay) {
        profileOverlay.addEventListener('click', (e) => {
            if (e.target === profileOverlay) closeProfileModal();
        });
    }

    // Profile Tabs
    const profileTabs = document.querySelectorAll('.profile-tab');
    const profileTabContents = document.querySelectorAll('.profile-tab-content');

    function switchProfileTab(tabId) {
        profileTabs.forEach(t => {
            t.classList.toggle('active', t.dataset.tab === tabId);
        });
        profileTabContents.forEach(c => {
            c.style.display = c.id === `tab-${tabId}` ? 'block' : 'none';
        });
    }

    profileTabs.forEach(tab => {
        tab.addEventListener('click', () => switchProfileTab(tab.dataset.tab));
    });

    // Address Management
    const newAddressForm = document.getElementById('newAddressForm');
    const addNewAddressBtn = document.getElementById('addNewAddressBtn');
    const cancelAddressBtn = document.getElementById('cancelAddressBtn');

    if (addNewAddressBtn) {
        addNewAddressBtn.addEventListener('click', () => {
            newAddressForm.style.display = 'block';
            addNewAddressBtn.style.display = 'none';
        });
    }

    if (cancelAddressBtn) {
        cancelAddressBtn.addEventListener('click', () => {
            newAddressForm.reset();
            newAddressForm.style.display = 'none';
            addNewAddressBtn.style.display = 'block';
        });
    }

    if (newAddressForm) {
        newAddressForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newAddr = {
                line1: document.getElementById('newAddrLine1').value.trim(),
                line2: document.getElementById('newAddrLine2')?.value.trim() || '',
                city: document.getElementById('newAddrCity').value.trim(),
                state: document.getElementById('newAddrState').value.trim(),
                zip: document.getElementById('newAddrZip').value.trim()
            };

            try {
                const data = await apiFetch('/api/addresses', {
                    method: 'POST',
                    body: JSON.stringify(newAddr)
                });
                currentUser.addresses = data.addresses;
                newAddressForm.reset();
                newAddressForm.style.display = 'none';
                addNewAddressBtn.style.display = 'block';
                renderAddresses();
                showToast('Address saved successfully!');
            } catch (err) {
                showToast(err.message || 'Failed to save address', 'info');
            }
        });
    }

    function renderAddresses() {
        const list = document.getElementById('addressList');
        const btn = document.getElementById('addNewAddressBtn');
        if (!list) return;

        const addresses = currentUser?.addresses || [];
        if (btn) btn.style.display = addresses.length >= 10 ? 'none' : 'block';

        if (addresses.length === 0) {
            list.innerHTML = '<div class="order-empty">No addresses saved yet. Add your delivery address below.</div>';
            return;
        }

        list.innerHTML = addresses.map(addr => `
            <div class="address-card ${addr.isPrimary ? 'primary' : ''}">
                ${addr.isPrimary ? '<span class="address-primary-badge">Primary Address</span>' : ''}
                <div><strong>${addr.line1}</strong></div>
                ${addr.line2 ? `<div>${addr.line2}</div>` : ''}
                <div>${addr.city}, ${addr.state} ${addr.zip}</div>
                <div class="address-actions" style="margin-top:8px; display:flex; gap:8px;">
                    ${!addr.isPrimary ? `<button class="btn btn-sm btn-outline" onclick="setPrimaryAddress('${addr._id}')">Set as Primary</button>` : ''}
                    <button class="btn btn-sm" style="color:#ef4444; border:1px solid #fca5a5; background:transparent;" onclick="removeAddress('${addr._id}')">Remove</button>
                </div>
            </div>
        `).join('');
    }

    window.setPrimaryAddress = async function (id) {
        try {
            const data = await apiFetch(`/api/addresses/${id}/primary`, { method: 'PUT' });
            currentUser.addresses = data.addresses;
            renderAddresses();
            showToast('Primary address updated');
        } catch (err) {
            showToast(err.message || 'Failed to update address', 'info');
        }
    };

    window.removeAddress = async function (id) {
        try {
            const data = await apiFetch(`/api/addresses/${id}`, { method: 'DELETE' });
            currentUser.addresses = data.addresses;
            renderAddresses();
            showToast('Address removed');
        } catch (err) {
            showToast(err.message || 'Failed to remove address', 'info');
        }
    };

    // Orders List in Profile
    async function renderOrders() {
        const orderList = document.getElementById('orderList');
        if (!orderList) return;

        orderList.innerHTML = '<div class="order-empty">Loading orders...</div>';

        try {
            const data = await apiFetch('/api/orders');
            const userOrders = data.orders || [];

            if (userOrders.length === 0) {
                orderList.innerHTML = '<div class="order-empty">No orders found. Your completed orders will appear here.</div>';
                return;
            }

            orderList.innerHTML = userOrders.map(order => `
                <div class="order-item" style="border:1px solid var(--clr-border-light); border-radius:var(--radius-md); padding:12px; margin-bottom:10px;">
                    <div class="order-header" style="display:flex; justify-content:space-between; font-weight:700;">
                        <span>Order #${order.orderId}</span>
                        <span style="color:var(--clr-primary);">$${order.total.toFixed(2)}</span>
                    </div>
                    <div class="order-date" style="font-size:12px; color:var(--clr-text-light); margin:4px 0 8px;">${new Date(order.createdAt).toLocaleDateString()} at ${new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    <div class="order-details" style="font-size:13px;">
                        <div><strong>Items:</strong> ${order.items.map(i => `${i.name} (×${i.qty})`).join(', ')}</div>
                        <div style="margin-top:4px;"><strong>Status:</strong> <span style="background:var(--clr-primary-lighter); color:var(--clr-primary); padding:2px 8px; border-radius:12px; font-weight:600; font-size:11px;">${order.status}</span></div>
                    </div>
                </div>
            `).join('');
        } catch (err) {
            orderList.innerHTML = '<div class="order-empty">No orders found.</div>';
        }
    }

    const signOutBtn = document.getElementById('signOutBtn');
    if (signOutBtn) {
        signOutBtn.addEventListener('click', async () => {
            closeProfileModal();
            await logoutUser();
            showToast('Signed out successfully');
        });
    }


    // ========================================
    // SHOPPING CART LOGIC
    // ========================================
    let cart = JSON.parse(localStorage.getItem('reneplane_cart') || '[]');

    function saveCart() {
        localStorage.setItem('reneplane_cart', JSON.stringify(cart));
    }

    function addToCart(name, price, img) {
        const existing = cart.find(item => item.name === name);
        if (existing) {
            existing.qty += 1;
        } else {
            cart.push({ name, price: parseFloat(price), img, qty: 1 });
        }
        saveCart();
        renderCart();
        bumpCartCount();
        showToast(`${name} added to cart!`);
    }

    function removeFromCart(name) {
        cart = cart.filter(item => item.name !== name);
        saveCart();
        renderCart();
    }

    function updateQty(name, delta) {
        const item = cart.find(i => i.name === name);
        if (item) {
            item.qty += delta;
            if (item.qty < 1) {
                removeFromCart(name);
                return;
            }
            saveCart();
            renderCart();
        }
    }

    function getCartTotal() {
        return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    }

    function getCartCount() {
        return cart.reduce((sum, item) => sum + item.qty, 0);
    }

    function bumpCartCount() {
        const countEl = document.getElementById('cartCount');
        if (!countEl) return;
        countEl.classList.remove('bump');
        void countEl.offsetWidth;
        countEl.classList.add('bump');
    }

    function renderCart() {
        const listEl = document.getElementById('cartItemsList');
        const emptyEl = document.getElementById('cartEmpty');
        const footerEl = document.getElementById('cartFooter');
        const countEl = document.getElementById('cartCount');
        const subtotalEl = document.getElementById('cartSubtotal');

        if (countEl) countEl.textContent = getCartCount();
        if (!listEl) return;

        if (cart.length === 0) {
            if (emptyEl) emptyEl.style.display = '';
            if (footerEl) footerEl.style.display = 'none';
            listEl.querySelectorAll('.cart-item').forEach(el => el.remove());
            return;
        }

        if (emptyEl) emptyEl.style.display = 'none';
        if (footerEl) footerEl.style.display = '';

        listEl.querySelectorAll('.cart-item').forEach(el => el.remove());

        cart.forEach(item => {
            const div = document.createElement('div');
            div.className = 'cart-item';
            div.innerHTML = `
                <img src="${item.img}" alt="${item.name}" class="cart-item-img">
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">$${item.price.toFixed(2)}</div>
                    <div class="cart-item-actions">
                        <button class="qty-btn qty-minus" data-name="${item.name}">−</button>
                        <span class="cart-item-qty">${item.qty}</span>
                        <button class="qty-btn qty-plus" data-name="${item.name}">+</button>
                        <button class="cart-item-remove" data-name="${item.name}">Remove</button>
                    </div>
                </div>
            `;
            listEl.insertBefore(div, emptyEl);
        });

        if (subtotalEl) subtotalEl.textContent = `$${getCartTotal().toFixed(2)}`;

        listEl.querySelectorAll('.qty-minus').forEach(btn => {
            btn.addEventListener('click', () => updateQty(btn.dataset.name, -1));
        });
        listEl.querySelectorAll('.qty-plus').forEach(btn => {
            btn.addEventListener('click', () => updateQty(btn.dataset.name, 1));
        });
        listEl.querySelectorAll('.cart-item-remove').forEach(btn => {
            btn.addEventListener('click', () => removeFromCart(btn.dataset.name));
        });
    }

    renderCart();

    // Cart Drawer Toggle
    const cartBtn = document.getElementById('cartBtn');
    const cartDrawer = document.getElementById('cartDrawer');
    const cartOverlay = document.getElementById('cartOverlay');
    const cartCloseBtn = document.getElementById('cartCloseBtn');

    function openCart() {
        if (cartDrawer) cartDrawer.classList.add('open');
        if (cartOverlay) cartOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeCart() {
        if (cartDrawer) cartDrawer.classList.remove('open');
        if (cartOverlay) cartOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    if (cartBtn) cartBtn.addEventListener('click', openCart);
    if (cartCloseBtn) cartCloseBtn.addEventListener('click', closeCart);
    if (cartOverlay) cartOverlay.addEventListener('click', closeCart);

    // Add to Cart buttons
    document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const name = btn.dataset.name;
            const price = btn.dataset.price;
            const img = btn.dataset.img;
            addToCart(name, price, img);

            const originalHTML = btn.innerHTML;
            btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg> Added!';
            btn.style.pointerEvents = 'none';
            setTimeout(() => {
                btn.innerHTML = originalHTML;
                btn.style.pointerEvents = '';
            }, 1200);
        });
    });


    // ========================================
    // CHECKOUT FLOW
    // ========================================
    const checkoutOverlay = document.getElementById('checkoutOverlay');
    const checkoutCloseBtn = document.getElementById('checkoutClose');

    function openCheckout() {
        if (cart.length === 0) {
            showToast('Your cart is empty!', 'info');
            return;
        }

        if (!currentUser) {
            closeCart();
            openAuthModal();
            showToast('Please sign in to checkout', 'info');
            return;
        }

        closeCart();
        showCheckoutStep(1);
        renderCheckoutSummary();
        if (checkoutOverlay) checkoutOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';

        // Auto-fill user details and primary address
        if (currentUser) {
            const addrName = document.getElementById('addrName');
            const addrPhone = document.getElementById('addrPhone');
            if (addrName && !addrName.value) addrName.value = currentUser.name || '';
            if (addrPhone && !addrPhone.value) addrPhone.value = currentUser.phone || '';

            const primaryAddr = (currentUser.addresses || []).find(a => a.isPrimary) || (currentUser.addresses || [])[0];
            if (primaryAddr) {
                const line1 = document.getElementById('addrLine1');
                const line2 = document.getElementById('addrLine2');
                const city = document.getElementById('addrCity');
                const state = document.getElementById('addrState');
                const zip = document.getElementById('addrZip');
                if (line1 && !line1.value) line1.value = primaryAddr.line1 || '';
                if (line2 && !line2.value) line2.value = primaryAddr.line2 || '';
                if (city && !city.value) city.value = primaryAddr.city || '';
                if (state && !state.value) state.value = primaryAddr.state || '';
                if (zip && !zip.value) zip.value = primaryAddr.zip || '';
            }
        }
    }

    function closeCheckout() {
        if (checkoutOverlay) checkoutOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) checkoutBtn.addEventListener('click', openCheckout);
    if (checkoutCloseBtn) checkoutCloseBtn.addEventListener('click', closeCheckout);
    if (checkoutOverlay) {
        checkoutOverlay.addEventListener('click', (e) => {
            if (e.target === checkoutOverlay) closeCheckout();
        });
    }

    function showCheckoutStep(step) {
        for (let i = 1; i <= 4; i++) {
            const el = document.getElementById(`checkoutStep${i}`);
            if (el) el.style.display = i === step ? 'block' : 'none';
        }
    }

    function renderCheckoutSummary() {
        const summaryEl = document.getElementById('checkoutCartSummary');
        const total = getCartTotal();

        if (summaryEl) {
            summaryEl.innerHTML = cart.map(item => `
                <div class="checkout-item">
                    <img src="${item.img}" alt="${item.name}" class="checkout-item-img">
                    <span class="checkout-item-name">${item.name}</span>
                    <span class="checkout-item-qty">×${item.qty}</span>
                    <span class="checkout-item-total">$${(item.price * item.qty).toFixed(2)}</span>
                </div>
            `).join('');
        }

        const totalCount = getCartCount();
        const shipping = totalCount >= 3 ? 0 : 5.99;

        const totalEl = document.getElementById('checkoutTotal');
        const subtotalEl = document.getElementById('paySubtotal');
        const shippingEl = document.getElementById('payShipping');
        const payTotalEl = document.getElementById('payTotal');

        if (totalEl) totalEl.textContent = `$${total.toFixed(2)}`;
        if (subtotalEl) subtotalEl.textContent = `$${total.toFixed(2)}`;
        if (shippingEl) {
            shippingEl.textContent = shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`;
            shippingEl.className = shipping === 0 ? 'shipping-free' : '';
        }
        if (payTotalEl) payTotalEl.textContent = `$${(total + shipping).toFixed(2)}`;
    }

    const toAddressBtn = document.getElementById('toAddressBtn');
    if (toAddressBtn) toAddressBtn.addEventListener('click', () => showCheckoutStep(2));

    const backToCartBtn = document.getElementById('backToCartBtn');
    if (backToCartBtn) backToCartBtn.addEventListener('click', () => showCheckoutStep(1));

    const addressForm = document.getElementById('addressForm');
    if (addressForm) {
        addressForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const required = ['addrName', 'addrPhone', 'addrLine1', 'addrCity', 'addrState', 'addrZip'];
            let valid = true;
            required.forEach(id => {
                const el = document.getElementById(id);
                if (el && !el.value.trim()) {
                    el.style.borderColor = '#ef4444';
                    valid = false;
                } else if (el) {
                    el.style.borderColor = '';
                }
            });
            if (valid) {
                renderCheckoutSummary();
                showCheckoutStep(3);
            }
        });
    }

    const backToAddressBtn = document.getElementById('backToAddressBtn');
    if (backToAddressBtn) backToAddressBtn.addEventListener('click', () => showCheckoutStep(2));

    // Payment Options Toggle
    const paymentOptions = document.querySelectorAll('.payment-option');
    const cardForm = document.getElementById('cardForm');
    const upiForm = document.getElementById('upiForm');
    const codMessage = document.getElementById('codMessage');

    paymentOptions.forEach(option => {
        option.addEventListener('change', () => {
            paymentOptions.forEach(o => o.classList.remove('active'));
            option.classList.add('active');
            const method = option.querySelector('input')?.value || 'card';
            if (cardForm) cardForm.style.display = method === 'card' ? 'block' : 'none';
            if (upiForm) upiForm.style.display = method === 'upi' ? 'block' : 'none';
            if (codMessage) codMessage.style.display = method === 'cod' ? 'block' : 'none';
        });
    });

    // Place Order
    const placeOrderBtn = document.getElementById('placeOrderBtn');
    if (placeOrderBtn) {
        placeOrderBtn.addEventListener('click', async () => {
            placeOrderBtn.disabled = true;
            placeOrderBtn.innerHTML = '<span>Processing Order...</span>';

            const subtotal = getCartTotal();
            const shipping = getCartCount() >= 3 ? 0 : 5.99;
            const total = subtotal + shipping;
            const payMethod = document.querySelector('input[name="payMethod"]:checked')?.value || 'card';
            const payLabel = { card: 'Credit/Debit Card', upi: 'UPI', cod: 'Cash on Delivery' }[payMethod];

            const shippingAddress = {
                fullName: document.getElementById('addrName')?.value || currentUser?.name || 'Customer',
                phone: document.getElementById('addrPhone')?.value || currentUser?.phone || '',
                line1: document.getElementById('addrLine1')?.value || '',
                line2: document.getElementById('addrLine2')?.value || '',
                city: document.getElementById('addrCity')?.value || '',
                state: document.getElementById('addrState')?.value || '',
                zip: document.getElementById('addrZip')?.value || '',
                country: document.getElementById('addrCountry')?.value || 'India'
            };

            const orderPayload = {
                items: cart.map(i => ({ name: i.name, price: i.price, qty: i.qty, image: i.img })),
                shippingAddress,
                paymentMethod: payMethod,
                subtotal,
                shipping,
                total
            };

            try {
                const data = await apiFetch('/api/orders', {
                    method: 'POST',
                    body: JSON.stringify(orderPayload)
                });

                const order = data.order;
                const orderIdEl = document.getElementById('orderIdDisplay');
                if (orderIdEl) orderIdEl.textContent = `#${order.orderId}`;

                const addressStr = `${shippingAddress.line1}, ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.zip}`;
                const confirmDetailsEl = document.getElementById('orderConfirmDetails');
                if (confirmDetailsEl) {
                    confirmDetailsEl.innerHTML = `
                        <p><strong>Items:</strong> ${cart.map(i => `${i.name} ×${i.qty}`).join(', ')}</p>
                        <p><strong>Total Amount:</strong> $${total.toFixed(2)}</p>
                        <p><strong>Delivery Address:</strong> ${addressStr}</p>
                        <p><strong>Payment Method:</strong> ${payLabel}</p>
                        <p><strong>Contact:</strong> ${shippingAddress.phone || currentUser?.email || 'N/A'}</p>
                    `;
                }

                // Clear cart
                cart = [];
                saveCart();
                renderCart();
                showCheckoutStep(4);
                showToast('Order placed successfully! 🎉');
            } catch (err) {
                showToast(err.message || 'Failed to place order. Please check address.', 'info');
            } finally {
                placeOrderBtn.disabled = false;
                placeOrderBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg><span>Place Order</span>';
            }
        });
    }

    const continueShoppingBtn = document.getElementById('continueShopping');
    if (continueShoppingBtn) {
        continueShoppingBtn.addEventListener('click', () => {
            closeCheckout();
            const productsEl = document.getElementById('products');
            if (productsEl) productsEl.scrollIntoView({ behavior: 'smooth' });
        });
    }


    // ========================================
    // TOAST NOTIFICATIONS
    // ========================================
    function showToast(message, type = 'success') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = 'toast';

        const iconMap = {
            success: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>',
            info: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>'
        };

        toast.innerHTML = `${iconMap[type] || iconMap.success}<span>${message}</span>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3600);
    }


    // ========================================
    // NAVBAR SCROLL & ACTIVE LINKS
    // ========================================
    const navbar = document.getElementById('navbar');
    if (navbar) {
        window.addEventListener('scroll', () => {
            navbar.classList.toggle('scrolled', window.scrollY > 50);
        }, { passive: true });
    }

    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link[data-section]');
    if (sections.length && navLinks.length) {
        window.addEventListener('scroll', () => {
            const scrollPos = window.scrollY + 200;
            sections.forEach(section => {
                if (scrollPos >= section.offsetTop && scrollPos < section.offsetTop + section.offsetHeight) {
                    navLinks.forEach(link => {
                        link.classList.toggle('active', link.dataset.section === section.id);
                    });
                }
            });
        }, { passive: true });
    }

    // Mobile Nav Toggle
    const navToggle = document.getElementById('navToggle');
    const navLinksEl = document.getElementById('navLinks');
    if (navToggle && navLinksEl) {
        navToggle.addEventListener('click', () => {
            navToggle.classList.toggle('active');
            navLinksEl.classList.toggle('active');
        });
        navLinksEl.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                navToggle.classList.remove('active');
                navLinksEl.classList.remove('active');
            });
        });
    }


    // ========================================
    // 3D PRODUCT & CARD TILT
    // ========================================
    const product3D = document.getElementById('product3DContainer');
    const heroImg = document.getElementById('hero-product-img');

    if (product3D && heroImg) {
        product3D.addEventListener('mousemove', (e) => {
            const rect = product3D.getBoundingClientRect();
            const rotateX = ((e.clientY - rect.top - rect.height / 2) / rect.height) * -18;
            const rotateY = ((e.clientX - rect.left - rect.width / 2) / rect.width) * 18;
            heroImg.style.animation = 'none';
            heroImg.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.04)`;
        });
        product3D.addEventListener('mouseleave', () => {
            heroImg.style.transform = '';
            heroImg.style.animation = 'productFloat 6s ease-in-out infinite';
        });
    }

    document.querySelectorAll('.product-card').forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const rotateX = ((e.clientY - rect.top - rect.height / 2) / rect.height) * -4;
            const rotateY = ((e.clientX - rect.left - rect.width / 2) / rect.width) * 4;
            card.style.transform = `perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-6px)`;
        });
        card.addEventListener('mouseleave', () => { card.style.transform = ''; });
    });


    // ========================================
    // FAQ ACCORDION
    // ========================================
    document.querySelectorAll('.faq-question').forEach(q => {
        q.addEventListener('click', () => {
            const item = q.closest('.faq-item');
            const wasOpen = item.classList.contains('open');
            document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
            document.querySelectorAll('.faq-question').forEach(q2 => q2.setAttribute('aria-expanded', 'false'));
            if (!wasOpen) {
                item.classList.add('open');
                q.setAttribute('aria-expanded', 'true');
            }
        });
    });


    // ========================================
    // STAT COUNTER ANIMATION
    // ========================================
    let statsCounted = false;
    const statsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !statsCounted) {
                statsCounted = true;
                document.querySelectorAll('.stat-number').forEach(num => {
                    const target = parseInt(num.dataset.target);
                    const duration = 2000;
                    const start = performance.now();
                    function tick(now) {
                        const progress = Math.min((now - start) / duration, 1);
                        const eased = 1 - Math.pow(1 - progress, 3);
                        const current = Math.floor(eased * target);
                        num.textContent = target >= 1000 ? current.toLocaleString() + '+' : current;
                        if (progress < 1) requestAnimationFrame(tick);
                    }
                    requestAnimationFrame(tick);
                });
            }
        });
    }, { threshold: 0.5 });
    const trustSection = document.getElementById('trust');
    if (trustSection) statsObserver.observe(trustSection);


    // ========================================
    // SCROLL REVEAL
    // ========================================
    const revealEls = [
        ...document.querySelectorAll('.product-card'),
        ...document.querySelectorAll('.detail-card'),
        ...document.querySelectorAll('.faq-item'),
        ...document.querySelectorAll('.section-header'),
        document.querySelector('.trust-card'),
    ].filter(Boolean);

    revealEls.forEach((el, i) => {
        el.classList.add('reveal');
        if (i % 4 > 0) el.classList.add(`reveal-delay-${i % 4}`);
    });

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) entry.target.classList.add('visible');
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));


    // ========================================
    // SMOOTH SCROLL
    // ========================================
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href === '#' || !href.startsWith('#')) return;
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) target.scrollIntoView({ behavior: 'smooth' });
        });
    });


    // ========================================
    // HERO SLIDER
    // ========================================
    const heroSlides = document.querySelectorAll('.hero-slide');
    const heroDots = document.querySelectorAll('.hero-dot');
    let currentSlide = 0;
    let slideInterval;

    function goToSlide(index) {
        if (!heroSlides.length) return;
        heroSlides[currentSlide].classList.remove('active');
        heroSlides[currentSlide].style.opacity = '0';
        heroSlides[currentSlide].style.zIndex = '1';
        if (heroDots[currentSlide]) {
            heroDots[currentSlide].classList.remove('active');
            heroDots[currentSlide].style.background = 'var(--clr-border)';
        }

        currentSlide = index;

        heroSlides[currentSlide].classList.add('active');
        heroSlides[currentSlide].style.opacity = '1';
        heroSlides[currentSlide].style.zIndex = '2';
        if (heroDots[currentSlide]) {
            heroDots[currentSlide].classList.add('active');
            heroDots[currentSlide].style.background = 'var(--clr-primary)';
        }
    }

    function nextSlide() {
        goToSlide((currentSlide + 1) % heroSlides.length);
    }

    if (heroSlides.length > 0) {
        slideInterval = setInterval(nextSlide, 5000);
        heroDots.forEach((dot, index) => {
            dot.addEventListener('click', () => {
                clearInterval(slideInterval);
                goToSlide(index);
                slideInterval = setInterval(nextSlide, 5000);
            });
        });
    }


    // ========================================
    // PARTNER MODAL (formsubmit.co)
    // ========================================
    const partnerOverlay = document.getElementById('partnerOverlay');
    const partnerModalClose = document.getElementById('partnerModalClose');
    const navPartnerBtn = document.getElementById('navPartnerBtn');
    const partnerForm = document.getElementById('partnerForm');

    function openPartnerModal() {
        if (partnerOverlay) {
            partnerOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    function closePartnerModal() {
        if (partnerOverlay) {
            partnerOverlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    if (navPartnerBtn) {
        navPartnerBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openPartnerModal();
        });
    }

    if (partnerModalClose) partnerModalClose.addEventListener('click', closePartnerModal);
    if (partnerOverlay) {
        partnerOverlay.addEventListener('click', (e) => {
            if (e.target === partnerOverlay) closePartnerModal();
        });
    }

    if (partnerForm) {
        partnerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = document.getElementById('partnerSubmitBtn');
            const originalHTML = submitBtn ? submitBtn.innerHTML : '<span>Submit Application</span>';

            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span>Sending Application...</span>';
            }

            const companyName = document.getElementById('partnerCompany')?.value.trim() || '';
            const contactPerson = document.getElementById('partnerName')?.value.trim() || '';
            const email = document.getElementById('partnerEmail')?.value.trim() || '';
            const phone = document.getElementById('partnerPhone')?.value.trim() || '';

            const payload = { companyName, contactPerson, email, phone };

            try {
                // 1. Save to MongoDB Database (PartnerLead model)
                await apiFetch('/api/partner', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                }).catch(err => console.warn('DB save warning:', err.message));

                // 2. Send email via FormSubmit AJAX to contact@reneplane.com
                await fetch('https://formsubmit.co/ajax/contact@reneplane.com', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        'Company Name': companyName,
                        'Contact Person': contactPerson,
                        'Email': email,
                        'Phone': phone,
                        '_subject': `New Partnership Lead: ${companyName} (${contactPerson})`,
                        '_captcha': 'false'
                    })
                }).catch(err => console.warn('FormSubmit AJAX warning:', err.message));

                if (submitBtn) {
                    submitBtn.innerHTML = '<span>✓ Application Sent!</span>';
                }
                showToast('Thank you! Your application has been sent to contact@reneplane.com.', 'success');

                setTimeout(() => {
                    partnerForm.reset();
                    closePartnerModal();
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = originalHTML;
                    }
                }, 1500);
            } catch (err) {
                showToast(err.message || 'Failed to submit application. Please try again.', 'info');
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalHTML;
                }
            }
        });
    }


    // ========================================
    // PRODUCTS SLIDER
    // ========================================
    const productsSlider = document.getElementById('productsSlider');
    const slideLeft = document.getElementById('slideLeft');
    const slideRight = document.getElementById('slideRight');

    if (productsSlider && slideLeft && slideRight) {
        const scrollAmount = 320;
        slideLeft.addEventListener('click', () => {
            productsSlider.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
        });
        slideRight.addEventListener('click', () => {
            productsSlider.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        });
    }


    // ========================================
    // ESCAPE KEY SHORTCUT
    // ========================================
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAuthModal();
            closeProfileModal();
            closeCheckout();
            closeCart();
            closePartnerModal();
        }
    });
});
