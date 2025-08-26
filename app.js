// Agricultural Management System JavaScript
class AgricultureApp {
    constructor() {
        this.currentSection = 'dashboard';
        this.currentUser = null;        // NEW
        this.users = [];                // NEW
        this.data = {
            farmers: [],
            inventory: [],
            distributions: [],
            logistics: [],
            payments: []
        };
        
        this.init();
    }

    init() {
        this.loadUsers(); // NEW
        const storedCurrent = localStorage.getItem('agricultureAppCurrentUser');
        if (storedCurrent) {
            try {
                this.currentUser = JSON.parse(storedCurrent);
            } catch (e) {
                this.currentUser = null;
            }
        }

        if (!this.currentUser) {
            // show signup/login modal and halt rendering until user logs in
            this.showAuthModal();
            this.bindEvents(); // still bind events (for auth UI)
            return;
        }

        this.loadData();
        this.bindEvents();
        this.renderDashboard();
        this.renderAllSections();
    }

    // --- Users (auth) ---
    loadUsers() {
        const raw = localStorage.getItem('agricultureAppUsers');
        if (raw) {
            try {
                this.users = JSON.parse(raw);
            } catch (e) {
                this.users = [];
            }
        } else {
            this.users = [];
        }
    }

    saveUsers() {
        localStorage.setItem('agricultureAppUsers', JSON.stringify(this.users));
    }

    getDataKey() {
        if (!this.currentUser || !this.currentUser.username) return 'agricultureAppData';
        return `agricultureAppData_${this.currentUser.username}`;
    }

    loadData() {
        const key = this.getDataKey();
        const storedData = localStorage.getItem(key);
        if (storedData) {
            try {
                const parsed = JSON.parse(storedData);
                this.data.farmers = parsed.farmers || [];
                this.data.inventory = parsed.inventory || [];
                this.data.distributions = parsed.distributions || [];
                this.data.logistics = parsed.logistics || [];
                this.data.payments = parsed.payments || [];
            } catch (e) {
                console.error('Failed to parse stored data:', e);
                this.data = {
                    farmers: [],
                    inventory: [],
                    distributions: [],
                    logistics: [],
                    payments: []
                };
            }
        } else {
            this.data = {
                farmers: [],
                inventory: [],
                distributions: [],
                logistics: [],
                payments: []
            };
            // do NOT auto-save here; save when user adds data
        }
    }

    saveData() {
        const key = this.getDataKey();
        localStorage.setItem(key, JSON.stringify(this.data));
    }

    // --- Authentication UI ---
    showAuthModal() {
        const isExisting = this.users.length > 0;
        const content = `
            <div class="auth-switch">
                <button id="showLoginBtn" class="btn ${isExisting ? '' : 'hidden'}">Login</button>
                <button id="showSignupBtn" class="btn">Sign Up</button>
            </div>
            <div id="authContainer"></div>
        `;
        this.showModal(isExisting ? 'Login or Sign Up' : 'Create First Account', content);

        // attach handlers after modal renders
        setTimeout(() => {
            const showLoginBtn = document.getElementById('showLoginBtn');
            const showSignupBtn = document.getElementById('showSignupBtn');
            if (showLoginBtn) showLoginBtn.addEventListener('click', () => this.showLoginForm());
            if (showSignupBtn) showSignupBtn.addEventListener('click', () => this.showSignupForm());
            // default view
            if (isExisting) this.showLoginForm(); else this.showSignupForm();
        }, 50);
    }

    showLoginForm() {
        const container = document.getElementById('authContainer');
        if (!container) return;
        container.innerHTML = `
            <form id="loginForm">
                <div class="form-group">
                    <label class="form-label">Username</label>
                    <input name="username" class="form-control" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Password</label>
                    <input type="password" name="password" class="form-control" required>
                </div>
                <div class="form-group">
                    <button class="btn btn--primary" type="submit">Login</button>
                </div>
            </form>
        `;
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            this.login(fd.get('username'), fd.get('password'));
        });
    }

    showSignupForm() {
        const container = document.getElementById('authContainer');
        if (!container) return;
        container.innerHTML = `
            <form id="signupForm">
                <div class="form-group">
                    <label class="form-label">Username</label>
                    <input name="username" class="form-control" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Password</label>
                    <input type="password" name="password" class="form-control" required>
                </div>
                <div class="form-group">
                    <button class="btn btn--primary" type="submit">Create Account</button>
                </div>
            </form>
        `;
        document.getElementById('signupForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            this.signup(fd.get('username'), fd.get('password'));
        });
    }

    hashPassword(pwd) {
        try {
            return btoa(pwd); // simple encoding for local app (not secure)
        } catch (e) {
            return pwd;
        }
    }

    signup(username, password) {
        username = username.trim();
        if (!username || !password) return this.showToast('Username and password required', 'error');
        if (this.users.find(u => u.username === username)) return this.showToast('Username already exists', 'error');

        const newId = Math.max(...this.users.map(u => u.id || 0), 0) + 1;
        const user = { id: newId, username, password: this.hashPassword(password) };
        this.users.push(user);
        this.saveUsers();

        // set as current user and create empty data space
        this.currentUser = { id: user.id, username: user.username };
        localStorage.setItem('agricultureAppCurrentUser', JSON.stringify(this.currentUser));
        this.loadData(); // loads empty for new user
        this.hideModal();
        this.bindEvents(); // ensure events bound
        this.renderDashboard();
        this.renderAllSections();
        this.updateUserArea();
        this.showToast('Account created. Logged in.', 'success');
    }

    login(username, password) {
        const user = this.users.find(u => u.username === username);
        if (!user) return this.showToast('User not found', 'error');
        if (user.password !== this.hashPassword(password)) return this.showToast('Invalid credentials', 'error');

        this.currentUser = { id: user.id, username: user.username };
        localStorage.setItem('agricultureAppCurrentUser', JSON.stringify(this.currentUser));
        this.loadData();
        this.hideModal();
        this.bindEvents();
        this.renderDashboard();
        this.renderAllSections();
        this.updateUserArea();
        this.showToast('Logged in successfully', 'success');
    }

    logout() {
        localStorage.removeItem('agricultureAppCurrentUser');
        this.currentUser = null;
        // clear current UI data and prompt auth
        this.data = { farmers: [], inventory: [], distributions: [], logistics: [], payments: [] };
        this.updateUserArea();
        this.showAuthModal();
    }

    updateUserArea() {
        const display = document.getElementById('currentUserDisplay');
        const logoutBtn = document.getElementById('logoutBtn');
        if (!display || !logoutBtn) return;
        if (this.currentUser) {
            display.textContent = this.currentUser.username;
            logoutBtn.classList.remove('hidden');
        } else {
            display.textContent = '';
            logoutBtn.classList.add('hidden');
        }
    }

    // Event Binding
    bindEvents() {
        // Navigation - Fixed event binding
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.getAttribute('data-section');
                console.log('Switching to section:', section); // Debug log
                this.switchSection(section);
            });
        });

        // Mobile menu toggle
        const menuToggle = document.getElementById('menuToggle');
        if (menuToggle) {
            menuToggle.addEventListener('click', () => {
                document.getElementById('navigation').classList.toggle('open');
            });
        }

        // Global search - Fixed
        const globalSearch = document.getElementById('globalSearch');
        if (globalSearch) {
            globalSearch.addEventListener('input', (e) => {
                if (e.target.value.length > 0) {
                    this.performGlobalSearch(e.target.value);
                }
            });
        }

        // Section-specific searches - Fixed
        const farmerSearch = document.getElementById('farmerSearch');
        if (farmerSearch) {
            farmerSearch.addEventListener('input', (e) => {
                this.renderFarmers(e.target.value);
            });
        }

        const inventorySearch = document.getElementById('inventorySearch');
        if (inventorySearch) {
            inventorySearch.addEventListener('input', (e) => {
                this.renderInventory(e.target.value);
            });
        }

        const distributionSearch = document.getElementById('distributionSearch');
        if (distributionSearch) {
            distributionSearch.addEventListener('input', (e) => {
                this.renderDistribution(e.target.value);
            });
        }

        const logisticsSearch = document.getElementById('logisticsSearch');
        if (logisticsSearch) {
            logisticsSearch.addEventListener('input', (e) => {
                this.renderLogistics(e.target.value);
            });
        }

        const paymentSearch = document.getElementById('paymentSearch');
        if (paymentSearch) {
            paymentSearch.addEventListener('input', (e) => {
                this.renderPayments(e.target.value);
            });
        }

        // Filters - Fixed
        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                const searchTerm = document.getElementById('logisticsSearch').value;
                this.renderLogistics(searchTerm, e.target.value);
            });
        }

        const paymentMethodFilter = document.getElementById('paymentMethodFilter');
        if (paymentMethodFilter) {
            paymentMethodFilter.addEventListener('change', (e) => {
                const searchTerm = document.getElementById('paymentSearch').value;
                this.renderPayments(searchTerm, e.target.value);
            });
        }

        // Add buttons - Fixed
        const addFarmerBtn = document.getElementById('addFarmerBtn');
        if (addFarmerBtn) {
            addFarmerBtn.addEventListener('click', () => this.showFarmerForm());
        }

        const addInventoryBtn = document.getElementById('addInventoryBtn');
        if (addInventoryBtn) {
            addInventoryBtn.addEventListener('click', () => this.showInventoryForm());
        }

        const addDistributionBtn = document.getElementById('addDistributionBtn');
        if (addDistributionBtn) {
            addDistributionBtn.addEventListener('click', () => this.showDistributionForm());
        }

        const addLogisticsBtn = document.getElementById('addLogisticsBtn');
        if (addLogisticsBtn) {
            addLogisticsBtn.addEventListener('click', () => this.showLogisticsForm());
        }

        const addPaymentBtn = document.getElementById('addPaymentBtn');
        if (addPaymentBtn) {
            addPaymentBtn.addEventListener('click', () => this.showPaymentForm());
        }

        // Quick action buttons - Fixed
        document.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = btn.getAttribute('data-action');
                console.log('Quick action:', action); // Debug log
                this.handleQuickAction(action);
            });
        });

        // Modal events - Fixed
        const modalClose = document.getElementById('modalClose');
        if (modalClose) {
            modalClose.addEventListener('click', () => this.hideModal());
        }

        const modal = document.getElementById('modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target.id === 'modal') this.hideModal();
            });
        }

        // Logout button (auth)
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }
    }

    // Navigation - Fixed
    switchSection(section) {
        console.log('Switching to section:', section); // Debug log
        
        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        const activeLink = document.querySelector(`[data-section="${section}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }

        // Update sections
        document.querySelectorAll('.section').forEach(sec => {
            sec.classList.remove('active');
        });
        const activeSection = document.getElementById(section);
        if (activeSection) {
            activeSection.classList.add('active');
        }

        // Close mobile menu
        const navigation = document.getElementById('navigation');
        if (navigation) {
            navigation.classList.remove('open');
        }

        this.currentSection = section;
        
        if (section === 'dashboard') {
            this.renderDashboard();
        }
    }

    // Dashboard
    renderDashboard() {
        const totalFarmers = this.data.farmers.length;
        // Total bags distributed
        const totalBagsDistributed = this.data.distributions.reduce((sum, d) => sum + d.quantity, 0);
        // Total bags in inventory (sum of all inventory quantities)
        const totalBagsInventory = this.data.inventory.reduce((sum, item) => sum + item.quantity, 0);
        const pendingSettlements = this.data.payments.filter(p => p.status === 'Pending').length;
        const inventoryValue = this.data.inventory.reduce((total, item) => total + (item.quantity * item.price), 0);

        const totalFarmersEl = document.getElementById('totalFarmers');
        const totalBagsEl = document.getElementById('activeContracts'); // reuse the same id for the dashboard card
        const totalInventoryBagsEl = document.getElementById('totalInventoryBags'); // Add this element in your HTML
        const pendingSettlementsEl = document.getElementById('pendingSettlements');
        const inventoryValueEl = document.getElementById('inventoryValue');

        if (totalFarmersEl) totalFarmersEl.textContent = totalFarmers;
        if (totalBagsEl) {
            totalBagsEl.textContent = totalBagsDistributed;
            totalBagsEl.style.cursor = 'pointer';
            totalBagsEl.onclick = () => this.showBagsBreakdown();
        }
        // Show total inventory bags
        if (totalInventoryBagsEl) {
            totalInventoryBagsEl.textContent = totalBagsInventory;
            totalInventoryBagsEl.style.cursor = 'default';
        }
        if (pendingSettlementsEl) pendingSettlementsEl.textContent = pendingSettlements;
        if (inventoryValueEl) inventoryValueEl.textContent = `₹${inventoryValue.toLocaleString()}`;
        
        // Render recent activity
        this.renderRecentActivity();
    }

    renderRecentActivity() {
        const activityListEl = document.getElementById('activityList');
        if (!activityListEl) return;

        // Collect recent actions from all modules (example: last 5 actions)
        let activities = [];

        // Farmers
        this.data.farmers.slice(-2).forEach(f => {
            activities.push({
                type: 'Farmer Added',
                desc: `Added farmer <strong>${f.name}</strong>`,
                time: f.createdAt || 'recent'
            });
        });

        // Inventory
        this.data.inventory.slice(-2).forEach(i => {
            activities.push({
                type: 'Inventory Added',
                desc: `Added <strong>${i.type}</strong> (${i.quantity} bags)`,
                time: i.createdAt || 'recent'
            });
        });

        // Distribution
        this.data.distributions.slice(-2).forEach(d => {
            activities.push({
                type: 'Seed Distributed',
                desc: `Distributed <strong>${d.quantity}</strong> bags of <strong>${d.seedType}</strong> to <strong>${d.farmer}</strong>`,
                time: d.date || 'recent'
            });
        });

        // Payments
        this.data.payments.slice(-2).forEach(p => {
            activities.push({
                type: 'Payment Recorded',
                desc: `Payment of <strong>₹${p.amount}</strong> for <strong>${p.farmerName}</strong>`,
                time: p.date || 'recent'
            });
        });

        // Sort and limit to last 5
        activities = activities.slice(-5).reverse();

        activityListEl.innerHTML = activities.length
            ? activities.map(a => `<li><span class="activity-type">${a.type}:</span> ${a.desc} <span class="activity-time">${a.time}</span></li>`).join('')
            : '<li>No recent activity.</li>';
    }

    // Render Functions
    renderAllSections() {
        this.renderFarmers();
        this.renderInventory();
        this.renderDistribution();
        this.renderLogistics();
        this.renderPayments();
    }

    renderFarmers(searchTerm = '') {
        const container = document.getElementById('farmersGrid');
        if (!container) return;

        let farmers = [...this.data.farmers]; // Create a copy

        if (searchTerm) {
            farmers = farmers.filter(farmer =>
                farmer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                farmer.contact.includes(searchTerm) ||
                farmer.address.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        container.innerHTML = farmers.map(farmer => `
            <div class="data-card">
                <div class="card-header">
                    <h3 class="card-title">${farmer.name}</h3>
                    <div class="card-actions">
                        <button class="btn-icon" onclick="window.app.editFarmer(${farmer.id})" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon" onclick="window.app.deleteFarmer(${farmer.id})" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="card-content">
                    <div class="info-item">
                        <span class="info-label">Contact</span>
                        <span class="info-value">${farmer.contact}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Farm Size</span>
                        <span class="info-value">${farmer.farmSize}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Address</span>
                        <span class="info-value">${farmer.address}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Crops</span>
                        <span class="info-value">${farmer.crops}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderInventory(searchTerm = '') {
        const container = document.getElementById('inventoryGrid');
        if (!container) return;

        let inventory = [...this.data.inventory];

        if (searchTerm) {
            inventory = inventory.filter(item =>
                item.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.supplier.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        container.innerHTML = inventory.map(item => `
            <div class="data-card">
                <div class="card-header">
                    <h3 class="card-title">${item.type}</h3>
                    <div class="card-actions">
                        <button class="btn-icon" onclick="window.app.editInventory(${item.id})" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon" onclick="window.app.deleteInventory(${item.id})" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="card-content">
                    <div class="info-item">
                        <span class="info-label">Quantity</span>
                        <span class="info-value">${item.quantity} ${item.unit}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Price per ${item.unit}</span>
                        <span class="info-value">₹${item.price}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Supplier</span>
                        <span class="info-value">${item.supplier}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Expiry Date</span>
                        <span class="info-value">${item.expiry}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderDistribution(searchTerm = '') {
        const container = document.getElementById('distributionGrid');
        if (!container) return;

        let distributions = [...this.data.distributions];

        if (searchTerm) {
            distributions = distributions.filter(dist =>
                dist.farmer.toLowerCase().includes(searchTerm.toLowerCase()) ||
                dist.seedType.toLowerCase().includes(searchTerm.toLowerCase()) ||
                dist.date.includes(searchTerm)
            );
        }

        container.innerHTML = distributions.map(dist => {
            // Find inventory item by seedType
            const inventoryItem = this.data.inventory.find(item => item.type === dist.seedType);
            const pricePerBag = inventoryItem ? inventoryItem.price : 0;
            const totalCost = dist.quantity * pricePerBag;

            return `
                <div class="data-card">
                    <div class="card-header">
                        <h3 class="card-title">${dist.farmer}</h3>
                        <div class="card-actions">
                            <span class="status status--${dist.status.toLowerCase().replace(' ', '-')}">${dist.status}</span>
                            <button class="btn-icon" onclick="window.app.editDistribution(${dist.id})" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-icon" onclick="window.app.deleteDistribution(${dist.id})" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div class="card-content">
                        <div class="info-item">
                            <span class="info-label">Seed Type</span>
                            <span class="info-value">${dist.seedType}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Quantity</span>
                            <span class="info-value">${dist.quantity}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Price per Bag</span>
                            <span class="info-value">₹${pricePerBag.toLocaleString()}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Total Cost</span>
                            <span class="info-value">₹${totalCost.toLocaleString()}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Date</span>
                            <span class="info-value">${dist.date}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderLogistics(searchTerm = '', statusFilter = '') {
        const container = document.getElementById('logisticsGrid');
        if (!container) return;

        let logistics = [...this.data.logistics];

        if (searchTerm) {
            logistics = logistics.filter(log =>
                log.tractorNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.destination.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (statusFilter) {
            logistics = logistics.filter(log => log.status === statusFilter);
        }

        container.innerHTML = logistics.map(log => `
            <div class="data-card">
                <div class="card-header">
                    <h3 class="card-title">${log.tractorNumber}</h3>
                    <div class="card-actions">
                        <span class="status status--${log.status.toLowerCase().replace(' ', '-')}">${log.status}</span>
                        <button class="btn-icon" onclick="window.app.editLogistics(${log.id})" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon" onclick="window.app.deleteLogistics(${log.id})" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="card-content">
                    <div class="info-item">
                        <span class="info-label">Driver</span>
                        <span class="info-value">${log.driverName}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Bags Loaded</span>
                        <span class="info-value">${log.bagsLoaded}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Loading Team</span>
                        <span class="info-value">${log.loadingTeam}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Destination</span>
                        <span class="info-value">${log.destination}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Date</span>
                        <span class="info-value">${log.date}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderPayments(searchTerm = '', methodFilter = '') {
        const container = document.getElementById('paymentsGrid');
        if (!container) return;

        let payments = [...this.data.payments];

        if (searchTerm) {
            payments = payments.filter(payment =>
                payment.farmerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                payment.accountNumber.includes(searchTerm) ||
                payment.method.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (methodFilter) {
            payments = payments.filter(payment => payment.method === methodFilter);
        }

        container.innerHTML = payments.map(payment => `
            <div class="data-card">
                <div class="card-header">
                    <h3 class="card-title">${payment.farmerName}</h3>
                    <div class="card-actions">
                        <span class="status status--${payment.status.toLowerCase()}">${payment.status}</span>
                        <button class="btn-icon" onclick="window.app.editPayment(${payment.id})" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon" onclick="window.app.deletePayment(${payment.id})" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="card-content">
                    <div class="info-item">
                        <span class="info-label">Amount</span>
                        <span class="info-value">₹${payment.amount.toLocaleString()}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Account Number</span>
                        <span class="info-value">${payment.accountNumber}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Payment Method</span>
                        <span class="info-value">${payment.method}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Payment Date</span>
                        <span class="info-value">${payment.paymentDate}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Notes</span>
                        <span class="info-value">${payment.notes}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Form Functions
    showFarmerForm(editId = null) {
        const farmer = editId ? this.data.farmers.find(f => f.id === editId) : null;
        const title = editId ? 'Edit Farmer' : 'Add New Farmer';
        
        const form = `
            <form id="farmerForm">
                <div class="form-group">
                    <label class="form-label">Farmer Name *</label>
                    <input type="text" name="name" class="form-control" value="${farmer?.name || ''}" placeholder="Enter farmer name" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Contact Number *</label>
                    <input type="tel" name="contact" class="form-control" value="${farmer?.contact || ''}" placeholder="Enter mobile number" >
                </div>
                <div class="form-group">
                    <label class="form-label">Address *</label>
                    <textarea name="address" class="form-control" placeholder="Enter full address" required>${farmer?.address || ''}</textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">Farm Size *</label>
                    <input type="text" name="farmSize" class="form-control" value="${farmer?.farmSize || ''}" placeholder="e.g., 5 acres" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Crops Grown *</label>
                    <input type="text" name="crops" class="form-control" value="${farmer?.crops || ''}" placeholder="e.g., Rice, Wheat" required>
                </div>
                <div class="form-group">
                    <button type="submit" class="btn btn--primary">
                        <i class="fas fa-save"></i> ${editId ? 'Update' : 'Save'} Farmer
                    </button>
                    <button type="button" class="btn btn--secondary" onclick="window.app.hideModal()">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                </div>
            </form>
        `;

        this.showModal(title, form);
        
        document.getElementById('farmerForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveFarmer(new FormData(e.target), editId);
        });
    }

    showInventoryForm(editId = null) {
        const item = editId ? this.data.inventory.find(i => i.id === editId) : null;
        const title = editId ? 'Edit Inventory Item' : 'Add New Inventory Item';
        
        const form = `
            <form id="inventoryForm">
                <div class="form-group">
                    <label class="form-label">Seed Type *</label>
                    <input type="text" name="type" class="form-control" value="${item?.type || ''}" placeholder="Enter seed type" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Quantity *</label>
                    <input type="number" name="quantity" class="form-control" value="${item?.quantity || ''}" placeholder="Enter quantity" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Unit *</label>
                    <select name="unit" class="form-control" required>
                        <option value="">Select unit</option>
                        <option value="kg" ${item?.unit === 'kg' ? 'selected' : ''}>Kg</option>
                        <option value="pieces" ${item?.unit === 'pieces' ? 'selected' : ''}>Pieces</option>
                        <option value="bags" ${item?.unit === 'bags' ? 'selected' : ''}>Bags</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Price per Unit *</label>
                    <input type="number" name="price" class="form-control" value="${item?.price || ''}" placeholder="Enter price" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Supplier *</label>
                    <input type="text" name="supplier" class="form-control" value="${item?.supplier || ''}" placeholder="Enter supplier name" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Expiry Date *</label>
                    <input type="date" name="expiry" class="form-control" value="${item?.expiry || ''}" required>
                </div>
                <div class="form-group">
                    <button type="submit" class="btn btn--primary">
                        <i class="fas fa-save"></i> ${editId ? 'Update' : 'Save'} Item
                    </button>
                    <button type="button" class="btn btn--secondary" onclick="window.app.hideModal()">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                </div>
            </form>
        `;

        this.showModal(title, form);
        
        document.getElementById('inventoryForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveInventory(new FormData(e.target), editId);
        });
    }

    showDistributionForm(editId = null) {
        const dist = editId ? this.data.distributions.find(d => d.id === editId) : null;
        const title = editId ? 'Edit Distribution' : 'Create New Distribution';
        
        const farmerOptions = this.data.farmers.map(f => 
            `<option value="${f.name}" ${dist?.farmer === f.name ? 'selected' : ''}>${f.name}</option>`
        ).join('');
        
        const inventoryOptions = this.data.inventory.map(i => 
            `<option value="${i.type}" ${dist?.seedType === i.type ? 'selected' : ''}>${i.type}</option>`
        ).join('');
        
        const form = `
            <form id="distributionForm">
                <div class="form-group">
                    <label class="form-label">Farmer *</label>
                    <select name="farmer" class="form-control" required>
                        <option value="">Select farmer</option>
                        ${farmerOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Seed Type *</label>
                    <select name="seedType" class="form-control" required>
                        <option value="">Select seed type</option>
                        ${inventoryOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Number of Bags *</label>
                    <input type="number" name="quantity" class="form-control" value="${dist?.quantity || ''}" placeholder="Enter quantity" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Date *</label>
                    <input type="date" name="date" class="form-control" value="${dist?.date || new Date().toISOString().split('T')[0]}" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Status *</label>
                    <select name="status" class="form-control" required>
                        <option value="Pending" ${dist?.status === 'Pending' ? 'selected' : ''}>Pending</option>
                        <option value="Completed" ${dist?.status === 'Completed' ? 'selected' : ''}>Completed</option>
                    </select>
                </div>
                <div class="form-group">
                    <button type="submit" class="btn btn--primary">
                        <i class="fas fa-save"></i> ${editId ? 'Update' : 'Create'} Distribution
                    </button>
                    <button type="button" class="btn btn--secondary" onclick="window.app.hideModal()">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                </div>
            </form>
        `;

        this.showModal(title, form);
        
        document.getElementById('distributionForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveDistribution(new FormData(e.target), editId);
        });
    }

    showLogisticsForm(editId = null) {
        const log = editId ? this.data.logistics.find(l => l.id === editId) : null;
        const title = editId ? 'Edit Logistics Entry' : 'Add New Logistics Entry';
        
        const form = `
            <form id="logisticsForm">
                <div class="form-group">
                    <label class="form-label">Tractor Number *</label>
                    <input type="text" name="tractorNumber" class="form-control" value="${log?.tractorNumber || ''}" placeholder="e.g., UP-14-1234" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Driver Name *</label>
                    <input type="text" name="driverName" class="form-control" value="${log?.driverName || ''}" placeholder="Enter driver name" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Number of Bags Loaded *</label>
                    <input type="number" name="bagsLoaded" class="form-control" value="${log?.bagsLoaded || ''}" placeholder="Enter number of bags" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Loading Team Members *</label>
                    <textarea name="loadingTeam" class="form-control" placeholder="Enter team members separated by commas" required>${log?.loadingTeam || ''}</textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">Destination *</label>
                    <input type="text" name="destination" class="form-control" value="${log?.destination || ''}" placeholder="Enter destination" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Date *</label>
                    <input type="date" name="date" class="form-control" value="${log?.date || new Date().toISOString().split('T')[0]}" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Status *</label>
                    <select name="status" class="form-control" required>
                        <option value="Loading" ${log?.status === 'Loading' ? 'selected' : ''}>Loading</option>
                        <option value="In Transit" ${log?.status === 'In Transit' ? 'selected' : ''}>In Transit</option>
                        <option value="Delivered" ${log?.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
                    </select>
                </div>
                <div class="form-group">
                    <button type="submit" class="btn btn--primary">
                        <i class="fas fa-save"></i> ${editId ? 'Update' : 'Save'} Entry
                    </button>
                    <button type="button" class="btn btn--secondary" onclick="window.app.hideModal()">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                </div>
            </form>
        `;

        this.showModal(title, form);
        
        document.getElementById('logisticsForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveLogistics(new FormData(e.target), editId);
        });
    }

    showPaymentForm(editId = null) {
        const payment = editId ? this.data.payments.find(p => p.id === editId) : null;
        const title = editId ? 'Edit Payment' : 'Record New Payment';
        
        const farmerOptions = this.data.farmers.map(f => 
            `<option value="${f.name}" ${payment?.farmerName === f.name ? 'selected' : ''}>${f.name}</option>`
        ).join('');
        
        const form = `
            <form id="paymentForm">
                <div class="form-group">
                    <label class="form-label">Farmer Name *</label>
                    <select name="farmerName" class="form-control" required>
                        <option value="">Select farmer</option>
                        ${farmerOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Account Number *</label>
                    <input type="text" name="accountNumber" class="form-control" value="${payment?.accountNumber || ''}" placeholder="Enter account number" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Amount (₹) *</label>
                    <input type="number" name="amount" class="form-control" value="${payment?.amount || ''}" placeholder="Enter amount" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Payment Date *</label>
                    <input type="date" name="paymentDate" class="form-control" value="${payment?.paymentDate || new Date().toISOString().split('T')[0]}" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Payment Method *</label>
                    <select name="method" class="form-control" required>
                        <option value="">Select method</option>
                        <option value="Cash" ${payment?.method === 'Cash' ? 'selected' : ''}>Cash</option>
                        <option value="Bank Transfer" ${payment?.method === 'Bank Transfer' ? 'selected' : ''}>Bank Transfer</option>
                        <option value="Check" ${payment?.method === 'Check' ? 'selected' : ''}>Check</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Status *</label>
                    <select name="status" class="form-control" required>
                        <option value="Pending" ${payment?.status === 'Pending' ? 'selected' : ''}>Pending</option>
                        <option value="Completed" ${payment?.status === 'Completed' ? 'selected' : ''}>Completed</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Photo Upload</label>
                    <div class="photo-upload-container" onclick="document.getElementById('photoInput').click()">
                        <i class="fas fa-camera" style="font-size: 24px; color: var(--color-accent);"></i>
                        <p>Click to upload payment photo</p>
                        <p style="font-size: 12px; color: var(--color-text-secondary);">Max size: 500KB</p>
                        <input type="file" id="photoInput" accept="image/*" style="display: none;">
                        <div id="photoPreview"></div>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Notes</label>
                    <textarea name="notes" class="form-control" placeholder="Enter payment notes">${payment?.notes || ''}</textarea>
                </div>
                <div class="form-group">
                    <button type="submit" class="btn btn--primary">
                        <i class="fas fa-save"></i> ${editId ? 'Update' : 'Record'} Payment
                    </button>
                    <button type="button" class="btn btn--secondary" onclick="window.app.hideModal()">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                </div>
            </form>
        `;

        this.showModal(title, form);
        
        // Handle photo upload
        const photoInput = document.getElementById('photoInput');
        if (photoInput) {
            photoInput.addEventListener('change', (e) => {
                this.handlePhotoUpload(e.target.files[0]);
            });
        }
        
        document.getElementById('paymentForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.savePayment(new FormData(e.target), editId);
        });
    }

    // Save Functions
    saveFarmer(formData, editId) {
        const farmer = {
            name: formData.get('name'),
            contact: formData.get('contact'),
            address: formData.get('address'),
            farmSize: formData.get('farmSize'),
            crops: formData.get('crops')
        };

        if (editId) {
            const index = this.data.farmers.findIndex(f => f.id === editId);
            this.data.farmers[index] = { ...farmer, id: editId };
            this.showToast('Farmer updated successfully!', 'success');
        } else {
            const newId = Math.max(...this.data.farmers.map(f => f.id), 0) + 1;
            this.data.farmers.push({ ...farmer, id: newId });
            this.showToast('Farmer added successfully!', 'success');
        }

        this.saveData();
        this.renderFarmers();
        this.renderDashboard();
        this.hideModal();
    }

    saveInventory(formData, editId) {
        const item = {
            type: formData.get('type'),
            quantity: parseInt(formData.get('quantity')),
            unit: formData.get('unit'),
            price: parseFloat(formData.get('price')),
            supplier: formData.get('supplier'),
            expiry: formData.get('expiry')
        };

        if (editId) {
            const index = this.data.inventory.findIndex(i => i.id === editId);
            this.data.inventory[index] = { ...item, id: editId };
            this.showToast('Inventory updated successfully!', 'success');
        } else {
            const newId = Math.max(...this.data.inventory.map(i => i.id), 0) + 1;
            this.data.inventory.push({ ...item, id: newId });
            this.showToast('Inventory added successfully!', 'success');
        }

        this.saveData();
        this.renderInventory();
        this.renderDashboard();
        this.hideModal();
    }

    saveDistribution(formData, editId) {
        const distribution = {
            farmer: formData.get('farmer'),
            seedType: formData.get('seedType'),
            quantity: parseInt(formData.get('quantity')),
            date: formData.get('date'),
            status: formData.get('status')
        };

        if (editId) {
            const index = this.data.distributions.findIndex(d => d.id === editId);
            this.data.distributions[index] = { ...distribution, id: editId };
            this.showToast('Distribution updated successfully!', 'success');
        } else {
            const newId = Math.max(...this.data.distributions.map(d => d.id), 0) + 1;
            this.data.distributions.push({ ...distribution, id: newId });
            this.showToast('Distribution created successfully!', 'success');
        }

        this.saveData();
        this.renderDistribution();
        this.renderDashboard();
        this.hideModal();
    }

    saveLogistics(formData, editId) {
        const logistics = {
            tractorNumber: formData.get('tractorNumber'),
            driverName: formData.get('driverName'),
            bagsLoaded: parseInt(formData.get('bagsLoaded')),
            loadingTeam: formData.get('loadingTeam'),
            destination: formData.get('destination'),
            date: formData.get('date'),
            status: formData.get('status')
        };

        if (editId) {
            const index = this.data.logistics.findIndex(l => l.id === editId);
            this.data.logistics[index] = { ...logistics, id: editId };
            this.showToast('Logistics entry updated successfully!', 'success');
        } else {
            const newId = Math.max(...this.data.logistics.map(l => l.id), 0) + 1;
            this.data.logistics.push({ ...logistics, id: newId });
            this.showToast('Logistics entry added successfully!', 'success');
        }

        this.saveData();
        this.renderLogistics();
        this.hideModal();
    }

    savePayment(formData, editId) {
        const payment = {
            farmerName: formData.get('farmerName'),
            accountNumber: formData.get('accountNumber'),
            amount: parseFloat(formData.get('amount')),
            paymentDate: formData.get('paymentDate'),
            method: formData.get('method'),
            status: formData.get('status'),
            notes: formData.get('notes') || ''
        };

        if (editId) {
            const index = this.data.payments.findIndex(p => p.id === editId);
            this.data.payments[index] = { ...payment, id: editId };
            this.showToast('Payment updated successfully!', 'success');
        } else {
            const newId = Math.max(...this.data.payments.map(p => p.id), 0) + 1;
            this.data.payments.push({ ...payment, id: newId });
            this.showToast('Payment recorded successfully!', 'success');
        }

        this.saveData();
        this.renderPayments();
        this.renderDashboard();
        this.hideModal();
    }

    // Edit Functions
    editFarmer(id) { this.showFarmerForm(id); }
    editInventory(id) { this.showInventoryForm(id); }
    editDistribution(id) { this.showDistributionForm(id); }
    editLogistics(id) { this.showLogisticsForm(id); }
    editPayment(id) { this.showPaymentForm(id); }

    // Delete Functions
    deleteFarmer(id) {
        if (confirm('Are you sure you want to delete this farmer?')) {
            this.data.farmers = this.data.farmers.filter(f => f.id !== id);
            this.saveData();
            this.renderFarmers();
            this.renderDashboard();
            this.showToast('Farmer deleted successfully!', 'success');
        }
    }

    deleteInventory(id) {
        if (confirm('Are you sure you want to delete this inventory item?')) {
            this.data.inventory = this.data.inventory.filter(i => i.id !== id);
            this.saveData();
            this.renderInventory();
            this.renderDashboard();
            this.showToast('Inventory item deleted successfully!', 'success');
        }
    }

    deleteDistribution(id) {
        if (confirm('Are you sure you want to delete this distribution?')) {
            this.data.distributions = this.data.distributions.filter(d => d.id !== id);
            this.saveData();
            this.renderDistribution();
            this.renderDashboard();
            this.showToast('Distribution deleted successfully!', 'success');
        }
    }

    deleteLogistics(id) {
        if (confirm('Are you sure you want to delete this logistics entry?')) {
            this.data.logistics = this.data.logistics.filter(l => l.id !== id);
            this.saveData();
            this.renderLogistics();
            this.showToast('Logistics entry deleted successfully!', 'success');
        }
    }

    deletePayment(id) {
        if (confirm('Are you sure you want to delete this payment?')) {
            this.data.payments = this.data.payments.filter(p => p.id !== id);
            this.saveData();
            this.renderPayments();
            this.renderDashboard();
            this.showToast('Payment deleted successfully!', 'success');
        }
    }

    // Utility Functions
    handleQuickAction(action) {
        console.log('Handling quick action:', action); // Debug log
        switch (action) {
            case 'add-farmer':
                this.showFarmerForm();
                break;
            case 'add-inventory':
                this.showInventoryForm();
                break;
            case 'create-distribution':
                this.showDistributionForm();
                break;
            case 'record-payment':
                this.showPaymentForm();
                break;
        }
    }

    performGlobalSearch(searchTerm) {
        if (!searchTerm) return;

        const results = [];
        searchTerm = searchTerm.toLowerCase();

        // Search in all data
        this.data.farmers.forEach(farmer => {
            if (farmer.name.toLowerCase().includes(searchTerm) ||
                farmer.contact.includes(searchTerm) ||
                farmer.address.toLowerCase().includes(searchTerm)) {
                results.push({ type: 'farmers', data: farmer });
            }
        });

        this.data.inventory.forEach(item => {
            if (item.type.toLowerCase().includes(searchTerm) ||
                item.supplier.toLowerCase().includes(searchTerm)) {
                results.push({ type: 'inventory', data: item });
            }
        });

        this.data.logistics.forEach(log => {
            if (log.tractorNumber.toLowerCase().includes(searchTerm) ||
                log.driverName.toLowerCase().includes(searchTerm)) {
                results.push({ type: 'logistics', data: log });
            }
        });

        this.data.payments.forEach(payment => {
            if (payment.farmerName.toLowerCase().includes(searchTerm) ||
                payment.accountNumber.includes(searchTerm)) {
                results.push({ type: 'payments', data: payment });
            }
        });

        // Switch to the first relevant section with results
        if (results.length > 0) {
            const firstResult = results[0];
            this.switchSection(firstResult.type);
            
            // Set the search term in the section's search box
            const searchInput = document.getElementById(`${firstResult.type.slice(0, -1)}Search`) || 
                               document.getElementById(`${firstResult.type}Search`);
            if (searchInput) {
                searchInput.value = searchTerm;
                if (firstResult.type === 'farmers') {
                    this.renderFarmers(searchTerm);
                } else if (firstResult.type === 'inventory') {
                    this.renderInventory(searchTerm);
                } else if (firstResult.type === 'logistics') {
                    this.renderLogistics(searchTerm);
                } else if (firstResult.type === 'payments') {
                    this.renderPayments(searchTerm);
                }
            }
        }
    }

    handlePhotoUpload(file) {
        if (!file) return;

        if (file.size > 500000) { // 500KB
            this.showToast('Photo size must be less than 500KB', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.getElementById('photoPreview');
            if (preview) {
                preview.innerHTML = `<img src="${e.target.result}" class="photo-preview" alt="Payment photo">`;
            }
        };
        reader.readAsDataURL(file);
    }

    showModal(title, content) {
        const modal = document.getElementById('modal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');
        
        if (modal && modalTitle && modalBody) {
            modalTitle.textContent = title;
            modalBody.innerHTML = content;
            modal.classList.remove('hidden');
        }
    }

    hideModal() {
        const modal = document.getElementById('modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    showLoading() {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.classList.remove('hidden');
        }
    }

    hideLoading() {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.classList.add('hidden');
        }
    }

    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        const icon = document.querySelector('.toast-icon');
        const messageEl = document.querySelector('.toast-message');

        if (!toast || !icon || !messageEl) return;

        toast.className = `toast ${type}`;
        
        if (type === 'success') {
            icon.className = 'toast-icon fas fa-check-circle';
        } else if (type === 'error') {
            icon.className = 'toast-icon fas fa-exclamation-circle';
        } else if (type === 'warning') {
            icon.className = 'toast-icon fas fa-exclamation-triangle';
        }

        messageEl.textContent = message;
        toast.classList.remove('hidden');

        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    }

    showBagsBreakdown() {
        // Aggregate bags by seed type
        const breakdown = {};
        this.data.distributions.forEach(d => {
            breakdown[d.seedType] = (breakdown[d.seedType] || 0) + d.quantity;
        });

        const rows = Object.entries(breakdown).map(([type, qty]) =>
            `<tr><td>${type}</td><td>${qty}</td></tr>`
        ).join('');

        const content = `
            <table class="table">
                <thead>
                    <tr>
                        <th>Seed Type</th>
                        <th>Bags</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
            <div style="text-align:right;margin-top:1em;">
                <button class="btn btn--secondary" onclick="window.app.hideModal()">Close</button>
            </div>
        `;
        this.showModal('Seed Types & Bags Breakdown', content);
    }
}

// Initialize the application and make it globally accessible
window.app = new AgricultureApp();