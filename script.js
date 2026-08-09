/* ============================================
   RENEPLANE — JAVASCRIPT (Auth0 + Cart + Checkout)
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

    // ========================================
    // AUTH0 CONFIGURATION
    // ========================================
    // TODO: Replace with your Auth0 credentials
    const AUTH0_CONFIG = {
        domain: 'YOUR_AUTH0_DOMAIN.auth0.com',     // e.g., dev-abc123.us.auth0.com
        clientId: 'YOUR_AUTH0_CLIENT_ID',           // e.g., aBc123DeFgHiJkL456
        redirectUri: window.location.origin,
        audience: '',                                // optional API audience
    };

    let auth0Client = null;
    let currentUser = null;

    // Initialize Auth0
    async function initAuth0() {
        try {
            if (typeof window.auth0 !== 'undefined' && window.auth0.Auth0Client) {
                auth0Client = new window.auth0.Auth0Client({
                    domain: AUTH0_CONFIG.domain,
                    clientId: AUTH0_CONFIG.clientId,
                    authorizationParams: {
                        redirect_uri: AUTH0_CONFIG.redirectUri,
                    }
                });

                // Handle redirect callback
                if (window.location.search.includes('code=') && window.location.search.includes('state=')) {
                    await auth0Client.handleRedirectCallback();
                    window.history.replaceState({}, document.title, window.location.pathname);
                }

                // Check if user is authenticated
                const isAuthenticated = await auth0Client.isAuthenticated();
                if (isAuthenticated) {
                    const user = await auth0Client.getUser();
                    loginUser({
                        name: user.name || user.nickname || 'User',
                        email: user.email || '',
                        phone: '',
                        authMethod: 'auth0'
                    });
                }
            }
        } catch (err) {
            console.log('Auth0 init (placeholder config):', err.message);
        }
    }
    initAuth0();


    // ========================================
    // USER STATE
    // ========================================
    function loginUser(userData) {
        currentUser = userData;
        localStorage.setItem('reneplane_user', JSON.stringify(userData));
        updateUserUI();
    }

    function logoutUser() {
        currentUser = null;
        localStorage.removeItem('reneplane_user');
        updateUserUI();
    }

    function updateUserUI() {
        const nameDisplay = document.getElementById('userNameDisplay');
        const userBtn = document.getElementById('navUserBtn');
        const loginBtn = document.getElementById('navLoginBtn');
        const ordersBtn = document.getElementById('navOrdersBtn');
        if (currentUser) {
            const firstName = currentUser.name.split(' ')[0];
            nameDisplay.textContent = firstName;
            userBtn.classList.add('logged-in');
            userBtn.style.display = '';
            if (loginBtn) loginBtn.style.display = 'none';
            if (ordersBtn) ordersBtn.style.display = 'flex';
        } else {
            nameDisplay.textContent = '';
            userBtn.classList.remove('logged-in');
            userBtn.style.display = 'none';
            if (loginBtn) loginBtn.style.display = '';
            if (ordersBtn) ordersBtn.style.display = 'none';
        }
    }

    // Restore user from localStorage
    const savedUser = localStorage.getItem('reneplane_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        updateUserUI();
    }


    // ========================================
    // AUTH & PROFILE MODALS
    // ========================================
    const authOverlay = document.getElementById('authOverlay');
    const authModalClose = document.getElementById('authModalClose');
    const navUserBtn = document.getElementById('navUserBtn');
    const navLoginBtn = document.getElementById('navLoginBtn');
    const profileOverlay = document.getElementById('profileOverlay');
    const profileModalClose = document.getElementById('profileModalClose');

    function openAuthModal() {
        if (currentUser) return;
        // Reset form
        document.getElementById('manualAuthForm').reset();
        ['authNameError', 'authEmailError', 'authMobileError'].forEach(id => {
            document.getElementById(id).textContent = '';
        });
        showAuthStep(1);
        authOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeAuthModal() {
        authOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    const navOrdersBtn = document.getElementById('navOrdersBtn');
    if (navOrdersBtn) navOrdersBtn.addEventListener('click', () => openProfileModal('orders'));

    function openProfileModal(defaultTab = 'details') {
        if (!currentUser) return;
        
        // Render Details
        document.getElementById('profileName').textContent = currentUser.name || '-';
        document.getElementById('profileEmail').textContent = currentUser.email || '-';
        document.getElementById('profileMobile').textContent = currentUser.phone || '-';
        
        renderOrders();
        renderAddresses();
        switchProfileTab(defaultTab);
        
        profileOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    // Profile Tabs Logic
    const profileTabs = document.querySelectorAll('.profile-tab');
    const profileTabContents = document.querySelectorAll('.profile-tab-content');
    
    function switchProfileTab(tabId) {
        profileTabs.forEach(t => {
            t.classList.toggle('active', t.dataset.tab === tabId);
        });
        profileTabContents.forEach(c => {
            c.style.display = c.id === `tab-${tabId}` ? '' : 'none';
        });
    }

    profileTabs.forEach(tab => {
        tab.addEventListener('click', () => switchProfileTab(tab.dataset.tab));
    });

    // Address Logic
    const newAddressForm = document.getElementById('newAddressForm');
    const addNewAddressBtn = document.getElementById('addNewAddressBtn');
    const cancelAddressBtn = document.getElementById('cancelAddressBtn');
    
    if (addNewAddressBtn) addNewAddressBtn.addEventListener('click', () => {
        newAddressForm.style.display = 'block';
        addNewAddressBtn.style.display = 'none';
    });
    
    if (cancelAddressBtn) cancelAddressBtn.addEventListener('click', () => {
        newAddressForm.reset();
        newAddressForm.style.display = 'none';
        addNewAddressBtn.style.display = 'block';
    });
    
    if (newAddressForm) newAddressForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newAddr = {
            id: Date.now().toString(),
            line1: document.getElementById('newAddrLine1').value,
            line2: document.getElementById('newAddrLine2').value,
            city: document.getElementById('newAddrCity').value,
            state: document.getElementById('newAddrState').value,
            zip: document.getElementById('newAddrZip').value,
        };
        
        if (!currentUser.addresses) currentUser.addresses = [];
        if (currentUser.addresses.length >= 5) {
            showToast('Maximum 5 addresses allowed.', 'info');
            return;
        }
        
        if (currentUser.addresses.length === 0) newAddr.isPrimary = true;
        
        currentUser.addresses.push(newAddr);
        loginUser(currentUser); // update localstorage
        
        newAddressForm.reset();
        newAddressForm.style.display = 'none';
        addNewAddressBtn.style.display = 'block';
        renderAddresses();
        showToast('Address saved successfully!');
    });

    function renderAddresses() {
        const list = document.getElementById('addressList');
        const btn = document.getElementById('addNewAddressBtn');
        if (!list) return;
        
        const addresses = currentUser.addresses || [];
        
        if (btn) btn.style.display = addresses.length >= 5 ? 'none' : 'block';
        
        if (addresses.length === 0) {
            list.innerHTML = '<div class="order-empty">No addresses saved.</div>';
            return;
        }
        
        list.innerHTML = addresses.map(addr => `
            <div class="address-card ${addr.isPrimary ? 'primary' : ''}">
                ${addr.isPrimary ? '<span class="address-primary-badge">Primary</span>' : ''}
                <div><strong>${addr.line1}</strong></div>
                ${addr.line2 ? `<div>${addr.line2}</div>` : ''}
                <div>${addr.city}, ${addr.state} ${addr.zip}</div>
                <div class="address-actions">
                    ${!addr.isPrimary ? `<button onclick="setPrimaryAddress('${addr.id}')">Set Primary</button>` : ''}
                    <button class="remove" onclick="removeAddress('${addr.id}')">Remove</button>
                </div>
            </div>
        `).join('');
    }

    window.setPrimaryAddress = function(id) {
        if (!currentUser.addresses) return;
        currentUser.addresses.forEach(a => {
            a.isPrimary = (a.id === id);
        });
        loginUser(currentUser);
        renderAddresses();
        showToast('Primary address updated');
    };

    window.removeAddress = function(id) {
        if (!currentUser.addresses) return;
        currentUser.addresses = currentUser.addresses.filter(a => a.id !== id);
        if (currentUser.addresses.length > 0 && !currentUser.addresses.find(a => a.isPrimary)) {
            currentUser.addresses[0].isPrimary = true;
        }
        loginUser(currentUser);
        renderAddresses();
        showToast('Address removed');
    };

    function closeProfileModal() {
        profileOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    function renderOrders() {
        const orderList = document.getElementById('orderList');
        if (!orderList) return;
        const orders = JSON.parse(localStorage.getItem('reneplane_orders') || '[]');
        const userOrders = orders.filter(o => o.userPhone === currentUser.phone || o.userEmail === currentUser.email);
        
        if (userOrders.length === 0) {
            orderList.innerHTML = '<div class="order-empty">No orders found.</div>';
            return;
        }

        orderList.innerHTML = userOrders.reverse().map(order => `
            <div class="order-item">
                <div class="order-header">
                    <span>${order.id}</span>
                    <span>$${order.total.toFixed(2)}</span>
                </div>
                <div class="order-date">${order.date}</div>
                <div class="order-details">
                    ${order.items.map(i => `${i.name} (x${i.qty})`).join(', ')}<br>
                    Status: <strong>${order.status}</strong>
                </div>
            </div>
        `).join('');
    }

    const signOutBtn = document.getElementById('signOutBtn');
    if (signOutBtn) {
        signOutBtn.addEventListener('click', () => {
            closeProfileModal();
            logoutUser();
            if (auth0Client) {
                try { auth0Client.logout({ logoutParams: { returnTo: window.location.origin } }); } catch(e) {}
            }
        });
    }

    // Wire up both buttons
    navUserBtn.addEventListener('click', openProfileModal);
    if (navLoginBtn) navLoginBtn.addEventListener('click', openAuthModal);
    authModalClose.addEventListener('click', closeAuthModal);
    if (profileModalClose) profileModalClose.addEventListener('click', closeProfileModal);
    
    authOverlay.addEventListener('click', (e) => { if (e.target === authOverlay) closeAuthModal(); });
    if (profileOverlay) profileOverlay.addEventListener('click', (e) => { if (e.target === profileOverlay) closeProfileModal(); });

    function showAuthStep(step) {
        document.getElementById('authStep1').style.display = step === 1 ? '' : 'none';
        document.getElementById('authStep2').style.display = step === 2 ? '' : 'none';
        document.getElementById('authStep3').style.display = step === 3 ? '' : 'none';
    }

    // Auth0 Login Button
    document.getElementById('auth0LoginBtn').addEventListener('click', async () => {
        if (auth0Client) {
            try {
                await auth0Client.loginWithRedirect();
            } catch (err) {
                showToast('Auth0 not configured. Please use manual sign-in.', 'info');
            }
        } else {
            showToast('Auth0 SDK not loaded. Please use manual sign-in.', 'info');
        }
    });

    // Manual Auth Form
    const manualAuthForm = document.getElementById('manualAuthForm');
    let pendingAuthData = {};

    manualAuthForm.addEventListener('submit', (e) => {
        e.preventDefault();
        let valid = true;

        const name = document.getElementById('authFullName').value.trim();
        const email = document.getElementById('authEmail').value.trim();
        const code = document.getElementById('authCountryCode').value;
        const mobile = document.getElementById('authMobile').value.trim();

        // Clear errors
        ['authNameError', 'authEmailError', 'authMobileError'].forEach(id => {
            document.getElementById(id).textContent = '';
        });

        if (!name || name.length < 2) {
            document.getElementById('authNameError').textContent = 'Please enter your full name';
            valid = false;
        }
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            document.getElementById('authEmailError').textContent = 'Please enter a valid email';
            valid = false;
        }
        if (!mobile || mobile.replace(/\s/g, '').length < 7) {
            document.getElementById('authMobileError').textContent = 'Please enter a valid mobile number';
            valid = false;
        }

        if (!valid) return;

        pendingAuthData = { name, email, phone: `${code} ${mobile}`, authMethod: 'manual' };
        document.getElementById('otpSentTo').textContent = `${code} ${mobile}`;
        showAuthStep(2);
        startOtpTimer();

        // Focus first OTP box
        document.querySelector('.otp-box[data-index="0"]').focus();
    });

    // OTP Input Handling
    const otpBoxes = document.querySelectorAll('.otp-box');
    otpBoxes.forEach((box, idx) => {
        box.addEventListener('input', (e) => {
            const val = e.target.value.replace(/\D/g, '');
            e.target.value = val;
            if (val && idx < otpBoxes.length - 1) {
                otpBoxes[idx + 1].focus();
            }
            box.classList.toggle('filled', !!val);
        });

        box.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value && idx > 0) {
                otpBoxes[idx - 1].focus();
                otpBoxes[idx - 1].value = '';
                otpBoxes[idx - 1].classList.remove('filled');
            }
        });

        box.addEventListener('paste', (e) => {
            e.preventDefault();
            const pasteData = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
            pasteData.split('').forEach((char, i) => {
                if (otpBoxes[i]) {
                    otpBoxes[i].value = char;
                    otpBoxes[i].classList.add('filled');
                }
            });
            if (pasteData.length > 0) {
                otpBoxes[Math.min(pasteData.length, 5)].focus();
            }
        });
    });

    // Verify OTP
    document.getElementById('verifyOtpBtn').addEventListener('click', () => {
        const otp = Array.from(otpBoxes).map(b => b.value).join('');
        const otpError = document.getElementById('otpError');

        if (otp.length !== 6) {
            otpError.textContent = 'Please enter the full 6-digit code';
            return;
        }

        otpError.textContent = '';

        // Simulate verification (accept any 6-digit code for demo)
        const verifyBtn = document.getElementById('verifyOtpBtn');
        verifyBtn.disabled = true;
        verifyBtn.innerHTML = '<span>Verifying...</span>';

        setTimeout(() => {
            verifyBtn.disabled = false;
            verifyBtn.innerHTML = '<span>Verify & Continue</span>';

            document.getElementById('verifiedName').textContent = pendingAuthData.name.split(' ')[0];
            showAuthStep(3);
            loginUser(pendingAuthData);
        }, 1500);
    });

    // OTP Resend Timer
    let otpTimerInterval;
    function startOtpTimer() {
        let seconds = 30;
        const timerEl = document.getElementById('resendTimer');
        const resendBtn = document.getElementById('resendOtpBtn');
        resendBtn.disabled = true;

        clearInterval(otpTimerInterval);
        otpTimerInterval = setInterval(() => {
            seconds--;
            timerEl.textContent = seconds;
            if (seconds <= 0) {
                clearInterval(otpTimerInterval);
                resendBtn.disabled = false;
                resendBtn.innerHTML = 'Resend Code';
            }
        }, 1000);
    }

    document.getElementById('resendOtpBtn').addEventListener('click', () => {
        showToast('Verification code resent!', 'success');
        startOtpTimer();
        // Clear OTP inputs
        otpBoxes.forEach(b => { b.value = ''; b.classList.remove('filled'); });
        otpBoxes[0].focus();
    });

    // Start Shopping after verification
    document.getElementById('startShoppingBtn').addEventListener('click', () => {
        closeAuthModal();
        document.getElementById('products').scrollIntoView({ behavior: 'smooth' });
    });


    // ========================================
    // SHOPPING CART
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
        countEl.classList.remove('bump');
        void countEl.offsetWidth; // trigger reflow
        countEl.classList.add('bump');
    }

    function renderCart() {
        const listEl = document.getElementById('cartItemsList');
        const emptyEl = document.getElementById('cartEmpty');
        const footerEl = document.getElementById('cartFooter');
        const countEl = document.getElementById('cartCount');
        const subtotalEl = document.getElementById('cartSubtotal');

        countEl.textContent = getCartCount();

        if (cart.length === 0) {
            emptyEl.style.display = '';
            footerEl.style.display = 'none';
            // Remove item elements but keep empty
            listEl.querySelectorAll('.cart-item').forEach(el => el.remove());
            return;
        }

        emptyEl.style.display = 'none';
        footerEl.style.display = '';

        // Rebuild items
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

        subtotalEl.textContent = `$${getCartTotal().toFixed(2)}`;

        // Attach handlers
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

    // Initial render
    renderCart();

    // Cart Drawer Toggle
    const cartBtn = document.getElementById('cartBtn');
    const cartDrawer = document.getElementById('cartDrawer');
    const cartOverlay = document.getElementById('cartOverlay');
    const cartCloseBtn = document.getElementById('cartCloseBtn');

    function openCart() {
        cartDrawer.classList.add('open');
        cartOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    function closeCart() {
        cartDrawer.classList.remove('open');
        cartOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    cartBtn.addEventListener('click', openCart);
    cartCloseBtn.addEventListener('click', closeCart);
    cartOverlay.addEventListener('click', closeCart);

    // Add to Cart buttons
    document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const name = btn.dataset.name;
            const price = btn.dataset.price;
            const img = btn.dataset.img;
            addToCart(name, price, img);

            // Visual feedback
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

        // Check if user is logged in
        if (!currentUser) {
            closeCart();
            openAuthModal();
            showToast('Please sign in to checkout', 'info');
            return;
        }

        closeCart();
        showCheckoutStep(1);
        renderCheckoutSummary();
        checkoutOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';

        // Pre-fill address form if user data available
        if (currentUser) {
            document.getElementById('addrName').value = currentUser.name || '';
            document.getElementById('addrPhone').value = currentUser.phone || '';
        }
    }

    function closeCheckout() {
        checkoutOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    document.getElementById('checkoutBtn').addEventListener('click', openCheckout);
    checkoutCloseBtn.addEventListener('click', closeCheckout);
    checkoutOverlay.addEventListener('click', (e) => {
        if (e.target === checkoutOverlay) closeCheckout();
    });

    function showCheckoutStep(step) {
        for (let i = 1; i <= 4; i++) {
            document.getElementById(`checkoutStep${i}`).style.display = i === step ? '' : 'none';
        }
    }

    function renderCheckoutSummary() {
        const summaryEl = document.getElementById('checkoutCartSummary');
        const total = getCartTotal();

        summaryEl.innerHTML = cart.map(item => `
            <div class="checkout-item">
                <img src="${item.img}" alt="${item.name}" class="checkout-item-img">
                <span class="checkout-item-name">${item.name}</span>
                <span class="checkout-item-qty">×${item.qty}</span>
                <span class="checkout-item-total">$${(item.price * item.qty).toFixed(2)}</span>
            </div>
        `).join('');

        document.getElementById('checkoutTotal').textContent = `$${total.toFixed(2)}`;
        document.getElementById('paySubtotal').textContent = `$${total.toFixed(2)}`;

        const totalCount = getCartCount();
        const shipping = totalCount >= 3 ? 0 : 5.99;
        document.getElementById('payShipping').textContent = shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`;
        document.getElementById('payShipping').className = shipping === 0 ? 'shipping-free' : '';
        document.getElementById('payTotal').textContent = `$${(total + shipping).toFixed(2)}`;
    }

    // Step navigation
    document.getElementById('toAddressBtn').addEventListener('click', () => {
        showCheckoutStep(2);
    });

    document.getElementById('backToCartBtn').addEventListener('click', () => {
        showCheckoutStep(1);
    });

    document.getElementById('addressForm').addEventListener('submit', (e) => {
        e.preventDefault();
        // Basic validation
        const required = ['addrName', 'addrPhone', 'addrLine1', 'addrCity', 'addrState', 'addrZip'];
        let valid = true;
        required.forEach(id => {
            const el = document.getElementById(id);
            if (!el.value.trim()) {
                el.style.borderColor = '#ef4444';
                valid = false;
            } else {
                el.style.borderColor = '';
            }
        });
        if (valid) {
            renderCheckoutSummary();
            showCheckoutStep(3);
        }
    });

    document.getElementById('backToAddressBtn').addEventListener('click', () => {
        showCheckoutStep(2);
    });

    // Payment Method Toggle
    const paymentOptions = document.querySelectorAll('.payment-option');
    const cardForm = document.getElementById('cardForm');
    const upiForm = document.getElementById('upiForm');
    const codMessage = document.getElementById('codMessage');

    paymentOptions.forEach(option => {
        option.addEventListener('change', () => {
            paymentOptions.forEach(o => o.classList.remove('active'));
            option.classList.add('active');
            const method = option.querySelector('input').value;
            cardForm.style.display = method === 'card' ? '' : 'none';
            upiForm.style.display = method === 'upi' ? '' : 'none';
            codMessage.style.display = method === 'cod' ? '' : 'none';
        });
    });

    // Card number formatting
    document.getElementById('cardNumber').addEventListener('input', (e) => {
        let val = e.target.value.replace(/\D/g, '').slice(0, 16);
        val = val.replace(/(.{4})/g, '$1  ').trim();
        e.target.value = val;
    });

    document.getElementById('cardExpiry').addEventListener('input', (e) => {
        let val = e.target.value.replace(/\D/g, '').slice(0, 4);
        if (val.length >= 2) val = val.slice(0, 2) + ' / ' + val.slice(2);
        e.target.value = val;
    });

    // Place Order
    document.getElementById('placeOrderBtn').addEventListener('click', () => {
        const placeBtn = document.getElementById('placeOrderBtn');
        placeBtn.disabled = true;
        placeBtn.innerHTML = '<span>Processing...</span>';

        setTimeout(() => {
            placeBtn.disabled = false;
            placeBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg><span>Place Order</span>';

            // Generate order ID
            const orderId = 'RP-' + Math.floor(100000 + Math.random() * 900000);
            document.getElementById('orderIdDisplay').textContent = `#${orderId}`;

            // Show confirmation details
            const address = `${document.getElementById('addrLine1').value}, ${document.getElementById('addrCity').value}, ${document.getElementById('addrState').value} ${document.getElementById('addrZip').value}`;
            const payMethod = document.querySelector('input[name="payMethod"]:checked').value;
            const payLabel = { card: 'Credit/Debit Card', upi: 'UPI', cod: 'Cash on Delivery' }[payMethod];

            document.getElementById('orderConfirmDetails').innerHTML = `
                <p><strong>Items:</strong> ${cart.map(i => `${i.name} ×${i.qty}`).join(', ')}</p>
                <p><strong>Total:</strong> $${(getCartTotal() + (getCartCount() >= 3 ? 0 : 5.99)).toFixed(2)}</p>
                <p><strong>Delivery to:</strong> ${address}</p>
                <p><strong>Payment:</strong> ${payLabel}</p>
                <p><strong>Email:</strong> ${currentUser?.email || 'N/A'}</p>
                <p><strong>Phone:</strong> ${currentUser?.phone || document.getElementById('addrPhone').value}</p>
            `;

            // Save Order to LocalStorage
            const orderObj = {
                id: orderId,
                date: new Date().toLocaleDateString(),
                items: [...cart],
                total: getCartTotal() + (getCartCount() >= 3 ? 0 : 5.99),
                userEmail: currentUser?.email || '',
                userPhone: currentUser?.phone || document.getElementById('addrPhone').value,
                status: 'Processing'
            };
            const existingOrders = JSON.parse(localStorage.getItem('reneplane_orders') || '[]');
            existingOrders.push(orderObj);
            localStorage.setItem('reneplane_orders', JSON.stringify(existingOrders));

            // Clear cart
            cart = [];
            saveCart();
            renderCart();

            showCheckoutStep(4);
        }, 2000);
    });

    // Continue Shopping
    document.getElementById('continueShopping').addEventListener('click', () => {
        closeCheckout();
        document.getElementById('products').scrollIntoView({ behavior: 'smooth' });
    });


    // ========================================
    // TOAST NOTIFICATIONS
    // ========================================
    function showToast(message, type = 'success') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = 'toast';

        const iconMap = {
            success: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>',
            info: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>',
        };

        toast.innerHTML = `${iconMap[type] || iconMap.success}<span>${message}</span>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3200);
    }


    // ========================================
    // NAVBAR SCROLL
    // ========================================
    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
        navbar.classList.toggle('scrolled', window.scrollY > 50);
    }, { passive: true });

    // Active nav link
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link[data-section]');
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

    // Mobile Nav
    const navToggle = document.getElementById('navToggle');
    const navLinksEl = document.getElementById('navLinks');
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


    // ========================================
    // 3D PRODUCT TILT
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
        product3D.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const t = e.touches[0];
            const rect = product3D.getBoundingClientRect();
            const rotateX = ((t.clientY - rect.top - rect.height / 2) / rect.height) * -12;
            const rotateY = ((t.clientX - rect.left - rect.width / 2) / rect.width) * 12;
            heroImg.style.animation = 'none';
            heroImg.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.04)`;
        }, { passive: false });
        product3D.addEventListener('touchend', () => {
            heroImg.style.transform = '';
            heroImg.style.animation = 'productFloat 6s ease-in-out infinite';
        });
    }


    // ========================================
    // PRODUCT CARD TILT
    // ========================================
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
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) target.scrollIntoView({ behavior: 'smooth' });
        });
    });

    // ========================================
    // HERO SLIDER LOGIC
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
        heroDots[currentSlide].classList.remove('active');
        heroDots[currentSlide].style.background = 'var(--clr-border)';

        currentSlide = index;

        heroSlides[currentSlide].classList.add('active');
        heroSlides[currentSlide].style.opacity = '1';
        heroSlides[currentSlide].style.zIndex = '2';
        heroDots[currentSlide].classList.add('active');
        heroDots[currentSlide].style.background = 'var(--clr-primary)';
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
    // PARTNERSHIP MODAL
    // ========================================
    const partnerOverlay = document.getElementById('partnerOverlay');
    const partnerModalClose = document.getElementById('partnerModalClose');
    const navPartnerBtn = document.getElementById('navPartnerBtn');
    const partnerForm = document.getElementById('partnerForm');

    function openPartnerModal() {
        if (!partnerOverlay) return;
        partnerOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closePartnerModal() {
        if (!partnerOverlay) return;
        partnerOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    if (navPartnerBtn) {
        navPartnerBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openPartnerModal();
        });
    }

    if (partnerModalClose) {
        partnerModalClose.addEventListener('click', closePartnerModal);
    }

    if (partnerOverlay) {
        partnerOverlay.addEventListener('click', (e) => {
            if (e.target === partnerOverlay) closePartnerModal();
        });
    }

    if (partnerForm) {
        partnerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            showToast('Thank you for your interest! We will contact you soon.', 'success');
            partnerForm.reset();
            closePartnerModal();
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
    // ESC KEY HANDLER
    // ========================================
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAuthModal();
            closeCheckout();
            closeCart();
        }
    });
});
