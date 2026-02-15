// Google Apps Script Web App URL
const GOOGLE_SCRIPT_URL = 'YOUR_GOOGLE_SCRIPT_URL_HERE'; // Replace with your actual URL

// Agricultural Export Data
let exportData = {
    "inquiries": [],
    "storeInfo": {
        "name": "Zero Defect Export & Manufacturing",
        "tagline": "Premium Agricultural Export Solutions from India",
        "email": "export@zerodefect.com",
        "phone": "+91 XXX XXX XXXX",
        "whatsapp": "+91 XXX XXX XXXX",
        "location": "India",
        "hours": {
            "weekdays": "Monday - Friday: 9:00 AM - 6:00 PM IST",
            "saturday": "Saturday: 10:00 AM - 4:00 PM IST",
            "sunday": "Sunday: Closed"
        },
        "social": {
            "linkedin": "#",
            "twitter": "#",
            "instagram": "#",
            "facebook": "#"
        }
    }
};

let cart = [];
let wishlist = [];

// Product State for Pagination & Filtering
let productState = {
    products: [],
    filtered: [],
    category: 'all',
    sortBy: 'default',
    currentPage: 1,
    itemsPerPage: 9
};

// Initialize app when DOM loads
document.addEventListener('DOMContentLoaded', initializeApp);

function initializeApp() {
    // Inject Supabase Client for Landing Page
    const sbScript = document.createElement('script');
    sbScript.src = 'shared/supabase.js';
    sbScript.onload = () => {
        // Setup real-time subscriptions after Supabase is loaded
        setTimeout(() => {
            subscribeToSettingsChanges();
            subscribeToProductChanges();
            subscribeToReviewChanges();
        }, 1000);
    };
    document.head.appendChild(sbScript);

    // Load data from localStorage
    loadData();
    updateFooterFromSettings();
    initializeProducts();
    initializeReviews();
    fetchReviewsFromSupabase();
    setupEventListeners();
    setupAnimations();
    setupScrollEffects();

    // Fix Mobile Nav Visibility
    const mobileNavStyle = document.createElement('style');
    mobileNavStyle.textContent = `
        .nav.active {
            background: rgba(255, 255, 255, 0.75) !important;
            backdrop-filter: blur(20px) !important;
            -webkit-backdrop-filter: blur(20px) !important;
            box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.15);
            border-bottom: 1px solid rgba(255, 255, 255, 0.3);
        }
        
        @media (max-width: 768px) {
            .products-grid {
                grid-template-columns: repeat(3, 1fr) !important;
                gap: 8px !important;
            }
            .product-card {
                padding: 8px !important;
                display: flex !important;
                flex-direction: column !important;
                justify-content: space-between !important;
            }
            .product-image {
                height: 100px !important;
            }
            .product-card h3 {
                font-size: 0.8rem !important;
            }
            .product-subtitle {
                font-size: 0.65rem !important;
                margin-bottom: 5px !important;
            }
            .product-card .btn {
                padding: 5px 0 !important;
                font-size: 0.65rem !important;
                width: 100% !important;
                margin-top: auto !important;
            }
            .product-badge {
                font-size: 0.6rem !important;
                padding: 3px 8px !important;
                border-radius: 12px !important;
            }
            .quick-view-content {
                margin: 10% auto !important;
                width: 90% !important;
                max-height: 80vh !important;
                padding: 15px !important;
                border-radius: 15px !important;
                overflow-y: auto !important;
            }
            .product-image-large img {
                height: 180px !important;
            }
            .product-info-large h2 {
                font-size: 1.2rem !important;
                margin-top: 5px !important;
            }
            .product-description {
                display: block !important;
                color: #333 !important;
                font-size: 0.85rem !important;
                margin: 10px 0 !important;
                line-height: 1.4 !important;
            }
            .qv-actions {
                flex-wrap: wrap !important;
            }
            #qv-add-to-cart {
                width: 100% !important;
                margin-top: 10px !important;
            }
            .wishlist-fab {
                width: 40px !important;
                height: 40px !important;
                font-size: 1rem !important;
                bottom: 70px !important;
                right: 15px !important;
            }
            .wishlist-fab span {
                width: 16px !important;
                height: 16px !important;
                font-size: 0.6rem !important;
                top: -3px !important;
                right: -3px !important;
            }
            .back-to-top-btn {
                width: 35px !important;
                height: 35px !important;
                font-size: 0.9rem !important;
                bottom: 20px !important;
                right: 15px !important;
            }
        }
    `;
    document.head.appendChild(mobileNavStyle);

    // Replace Price Filter UI with Sort Dropdown
    const priceValueEl = document.getElementById('price-value');
    if (priceValueEl && priceValueEl.parentElement) {
        const container = priceValueEl.parentElement;
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.gap = '10px';
        container.innerHTML = `
            <label style="font-weight: 600; color: #2E7D32; white-space: nowrap;">Sort by:</label>
            <div style="position: relative; min-width: 180px;">
                <select id="sort-dropdown" onchange="sortProducts(this.value)" style="
                    appearance: none;
                    -webkit-appearance: none;
                    width: 100%;
                    padding: 8px 35px 8px 15px;
                    border-radius: 20px;
                    border: 1px solid #2E7D32;
                    background: transparent;
                    color: #2E7D32;
                    font-size: 0.95rem;
                    outline: none;
                    cursor: pointer;
                ">
                    <option value="default" style="color: #333; background: #fff;">Default</option>
                    <option value="newest" style="color: #333; background: #fff;">New Arrivals</option>
                    <option value="bestselling" style="color: #333; background: #fff;">Best Selling</option>
                </select>
                <i class="fas fa-chevron-down" style="
                    position: absolute;
                    right: 15px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: #2E7D32;
                    pointer-events: none;
                    font-size: 0.8rem;
                "></i>
            </div>
        `;
    }
}

function loadData() {
    const storedData = localStorage.getItem('zeroDefectExportData');
    if (storedData) {
        try {
            exportData = JSON.parse(storedData);
        } catch (e) {
            console.error('Failed to parse export data', e);
        }
    }
    const storedCart = localStorage.getItem('zeroDefectCart');
    if (storedCart) {
        try {
            cart = JSON.parse(storedCart);
            updateCart();
        } catch (e) {
            console.error('Failed to parse cart data', e);
        }
    }
    const storedWishlist = localStorage.getItem('zeroDefectWishlist');
    if (storedWishlist) {
        try {
            wishlist = JSON.parse(storedWishlist);
            updateWishlistCount();
        } catch (e) {
            console.error('Failed to parse wishlist data', e);
        }
    }
}

function saveData() {
    localStorage.setItem('zeroDefectExportData', JSON.stringify(exportData));
    localStorage.setItem('zeroDefectCart', JSON.stringify(cart));
    localStorage.setItem('zeroDefectWishlist', JSON.stringify(wishlist));
}

function updateFooterFromSettings() {
    // Wait for SupabaseDB to be available, then load settings
    const waitForSupabaseDB = setInterval(() => {
        if (window.SupabaseDB) {
            clearInterval(waitForSupabaseDB);
            
            window.SupabaseDB.waitForReady().then(() => {
                window.SupabaseDB.fetchWhere('settings', 'id', 'default').then(({ data, error }) => {
                    if (!error && data && data.length > 0) {
                        const settings = data[0];
                        console.log('✅ Loaded settings from Supabase for footer:', settings);
                        applySettingsToFooter(settings);
                    } else {
                        console.warn('Could not load settings from Supabase:', error);
                    }
                });
            });
        }
    }, 100);
    
    // Timeout after 5 seconds
    setTimeout(() => clearInterval(waitForSupabaseDB), 5000);
}

function applySettingsToFooter(settings) {
    // Update footer with Supabase values
    if (settings.store_location) document.getElementById('contactLocation').textContent = settings.store_location;
    if (settings.store_email) document.getElementById('contactEmail').textContent = settings.store_email;
    if (settings.store_phone) document.getElementById('contactPhone').textContent = settings.store_phone;
    if (settings.store_whatsapp) document.getElementById('contactWhatsapp').textContent = settings.store_whatsapp;
    
    if (settings.business_hours_weekdays) document.getElementById('hoursWeekdays').textContent = settings.business_hours_weekdays;
    if (settings.business_hours_saturday) document.getElementById('hoursSaturday').textContent = settings.business_hours_saturday;
    if (settings.business_hours_sunday) document.getElementById('hoursSunday').textContent = settings.business_hours_sunday;
    
    if (settings.social_linkedin) document.getElementById('linkLinkedin').href = settings.social_linkedin;
    if (settings.social_twitter) document.getElementById('linkTwitter').href = settings.social_twitter;
    if (settings.social_instagram) document.getElementById('linkInstagram').href = settings.social_instagram;
    if (settings.social_facebook) document.getElementById('linkFacebook').href = settings.social_facebook;
}

function subscribeToSettingsChanges() {
    // Subscribe to real-time settings changes using Realtime API
    if (window.supabaseClient) {
        console.log('Setting up real-time subscription for settings...');
        try {
            // Create a channel for settings changes
            const channel = window.supabaseClient.channel('settings-changes')
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'settings',
                    filter: 'id=eq.default'
                }, (payload) => {
                    console.log('Settings changed in real-time:', payload);
                    if (payload.new) {
                        applySettingsToFooter(payload.new);
                    }
                })
                .subscribe((status) => {
                    console.log('Settings subscription status:', status);
                    if (status === 'SUBSCRIBED') {
                        console.log('✅ Settings subscription active');
                    }
                });
        } catch (error) {
            console.error('Error setting up settings subscription:', error);
            // Fallback: Load settings once if subscription fails
            updateFooterFromSettings();
        }
    } else {
        console.warn('Supabase client not available for settings subscription');
    }
}

function updateSocialLink(id, url) {
    const el = document.getElementById(id);
    if (el) {
        if (url && url !== '#') {
            el.href = url;
            el.style.display = 'inline-flex';
        } else if (!url) {
            el.style.display = 'none';
        }
    }
}

// Product Management
function initializeProducts() {
    const defaultProducts = [
        { id: 1, name: 'Basmati Rice', subtitle: 'Premium Long Grain', price: 150, category: 'rice', image: 'https://placehold.co/400x300?text=Basmati+Rice', images: ['https://placehold.co/400x300?text=Basmati+Rice', 'https://placehold.co/400x300?text=Basmati+Detail+1', 'https://placehold.co/400x300?text=Basmati+Detail+2'], isBestSeller: true, stock: 1000 },
        { id: 2, name: 'Sona Masoori Rice', subtitle: 'Medium Grain', price: 100, category: 'rice', image: 'https://placehold.co/400x300?text=Sona+Masoori', images: ['https://placehold.co/400x300?text=Sona+Masoori', 'https://placehold.co/400x300?text=Sona+Detail'], isBestSeller: false, stock: 800 },
        { id: 3, name: 'Toor Dal', subtitle: 'Split Pigeon Peas', price: 120, category: 'pulses', image: 'https://placehold.co/400x300?text=Toor+Dal', images: ['https://placehold.co/400x300?text=Toor+Dal', 'https://placehold.co/400x300?text=Toor+Detail'], isBestSeller: true, stock: 500 },
        { id: 4, name: 'Moong Dal', subtitle: 'Split Mung Beans', price: 110, category: 'pulses', image: 'https://placehold.co/400x300?text=Moong+Dal', images: ['https://placehold.co/400x300?text=Moong+Dal'], isBestSeller: false, stock: 600 },
        { id: 5, name: 'Wheat', subtitle: 'High-Quality Milling Wheat', price: 80, category: 'grains', image: 'https://placehold.co/400x300?text=Wheat', images: ['https://placehold.co/400x300?text=Wheat'], isBestSeller: false, stock: 2000 },
        { id: 6, name: 'Maize', subtitle: 'Yellow Corn', price: 90, category: 'grains', image: 'https://placehold.co/400x300?text=Maize', images: ['https://placehold.co/400x300?text=Maize'], isBestSeller: false, stock: 1500 },
        { id: 7, name: 'Brown Rice', subtitle: 'Whole Grain Goodness', price: 130, category: 'rice', image: 'https://placehold.co/400x300?text=Brown+Rice', images: ['https://placehold.co/400x300?text=Brown+Rice'], isBestSeller: false, stock: 400 },
        { id: 8, name: 'Masoor Dal', subtitle: 'Red Lentils', price: 105, category: 'pulses', image: 'https://placehold.co/400x300?text=Masoor+Dal', images: ['https://placehold.co/400x300?text=Masoor+Dal'], isBestSeller: false, stock: 700 },
        { id: 9, name: 'Barley', subtitle: 'Nutritious Grain', price: 70, category: 'grains', image: 'https://placehold.co/400x300?text=Barley', images: ['https://placehold.co/400x300?text=Barley'], isBestSeller: false, stock: 900 },
        { id: 10, name: 'Black Pepper', subtitle: 'King of Spices', price: 450, category: 'spices', image: 'https://placehold.co/400x300?text=Black+Pepper', images: ['https://placehold.co/400x300?text=Black+Pepper'], isBestSeller: true, stock: 200 },
        { id: 11, name: 'Cardamom', subtitle: 'Queen of Spices', price: 1200, category: 'spices', image: 'https://placehold.co/400x300?text=Cardamom', images: ['https://placehold.co/400x300?text=Cardamom'], isBestSeller: false, stock: 100 },
        { id: 12, name: 'Desiccated Coconut', subtitle: 'High Fat Powder', price: 180, category: 'coconut', image: 'https://placehold.co/400x300?text=Desiccated+Coconut', images: ['https://placehold.co/400x300?text=Desiccated+Coconut'], isBestSeller: false, stock: 500 },
        { id: 13, name: 'Coconut Oil', subtitle: 'Cold Pressed Virgin', price: 350, category: 'coconut', subCategory: 'oil', image: 'https://placehold.co/400x300?text=Coconut+Oil', images: ['https://placehold.co/400x300?text=Coconut+Oil'], isBestSeller: true, stock: 300, isNew: true },
        { id: 14, name: '1121 Basmati Rice', subtitle: 'Extra Long Grain', price: 180, category: 'rice', image: 'https://placehold.co/400x300?text=1121+Basmati', images: ['https://placehold.co/400x300?text=1121+Basmati'], isBestSeller: true, stock: 500, isNew: true },
        { id: 15, name: 'Urad Dal', subtitle: 'Black Gram Split', price: 130, category: 'pulses', image: 'https://placehold.co/400x300?text=Urad+Dal', images: ['https://placehold.co/400x300?text=Urad+Dal'], isBestSeller: false, stock: 400, isNew: false },
        { id: 16, name: 'Sorghum', subtitle: 'Jowar / Milo', price: 55, category: 'grains', image: 'https://placehold.co/400x300?text=Sorghum', images: ['https://placehold.co/400x300?text=Sorghum'], isBestSeller: false, stock: 1000, isNew: true },
        { id: 17, name: 'Turmeric Powder', subtitle: 'High Curcumin', price: 220, category: 'spices', subCategory: 'powder', image: 'https://placehold.co/400x300?text=Turmeric', images: ['https://placehold.co/400x300?text=Turmeric'], isBestSeller: true, stock: 300, isNew: false },
        { id: 18, name: 'Dry Copra', subtitle: 'Sun Dried', price: 160, category: 'coconut', subCategory: 'whole', image: 'https://placehold.co/400x300?text=Copra', images: ['https://placehold.co/400x300?text=Copra'], isBestSeller: false, stock: 600, isNew: true },
        { id: 19, name: 'Jasmine Rice', subtitle: 'Aromatic Fragrance', price: 200, category: 'rice', image: 'https://placehold.co/400x300?text=Jasmine+Rice', images: ['https://placehold.co/400x300?text=Jasmine+Rice'], isBestSeller: false, stock: 300, isNew: true },
        { id: 20, name: 'Chana Dal', subtitle: 'Split Chickpeas', price: 90, category: 'pulses', image: 'https://placehold.co/400x300?text=Chana+Dal', images: ['https://placehold.co/400x300?text=Chana+Dal'], isBestSeller: true, stock: 800, isNew: false },
        { id: 21, name: 'Pearl Millet', subtitle: 'Bajra', price: 45, category: 'grains', image: 'https://placehold.co/400x300?text=Pearl+Millet', images: ['https://placehold.co/400x300?text=Pearl+Millet'], isBestSeller: false, stock: 1200, isNew: true },
        { id: 22, name: 'Cumin Seeds', subtitle: 'Jeera', price: 350, category: 'spices', subCategory: 'whole', image: 'https://placehold.co/400x300?text=Cumin+Seeds', images: ['https://placehold.co/400x300?text=Cumin+Seeds'], isBestSeller: true, stock: 250, isNew: false },
        { id: 23, name: 'Coconut Milk Powder', subtitle: 'Instant Mix', price: 400, category: 'coconut', subCategory: 'desiccated', image: 'https://placehold.co/400x300?text=Coconut+Milk+Powder', images: ['https://placehold.co/400x300?text=Coconut+Milk+Powder'], isBestSeller: false, stock: 150, isNew: true },
        { id: 24, name: 'Cloves', subtitle: 'Aromatic Flower Buds', price: 900, category: 'spices', subCategory: 'whole', image: 'https://placehold.co/400x300?text=Cloves', images: ['https://placehold.co/400x300?text=Cloves'], isBestSeller: false, stock: 80, isNew: true }
    ];

    let products = localStorage.getItem('zeroDefectProducts');
    if (!products) {
        products = JSON.stringify(defaultProducts);
        localStorage.setItem('zeroDefectProducts', products);
    }
    
    productState.products = JSON.parse(products);
    applyFilters();

    // Try fetching from Supabase (Progressive Enhancement)
    fetchProductsFromSupabase();
}

// Helper function to convert snake_case from database to camelCase
function denormalizeProducts(products) {
    return products.map(p => ({
        id: p.id,
        name: p.name,
        subtitle: p.subtitle,
        category: p.category,
        price: p.price,
        stock: p.stock,
        image: p.image,
        isBestSeller: p.is_best_seller || false,
        subCategory: p.sub_category || null,
        isNew: p.is_new || false,
        images: [p.image] // Add images array for UI
    }));
}

async function fetchProductsFromSupabase() {
    // Wait for Supabase client to be ready
    if (!window.supabaseClient) {
        await new Promise(resolve => {
            const onReady = () => {
                window.removeEventListener('supabaseReady', onReady);
                resolve();
            };
            if (window.supabaseClient) resolve();
            else window.addEventListener('supabaseReady', onReady);
            // Fallback timeout to avoid hanging
            setTimeout(resolve, 3000);
        });
    }

    if (window.supabaseClient) {
        try {
            const { data, error } = await window.supabaseClient.from('products').select('*');
            if (error) {
                console.warn('Supabase fetch error:', error.message);
                return;
            }
            if (data && data.length > 0) {
                // Convert snake_case from database to camelCase
                const denormalizedData = denormalizeProducts(data);
                productState.products = denormalizedData;
                localStorage.setItem('zeroDefectProducts', JSON.stringify(denormalizedData)); // Sync local
                applyFilters(); // Re-render
                console.log('Products loaded from Supabase:', data.length);
            }
        } catch (e) { 
            console.warn('Supabase fetch exception, using local data:', e.message); 
        }
    }
}

function applyFilters(keepPage = false) {
    let filtered = productState.products.filter(p => {
        const matchCategory = productState.category === 'all' || p.category === productState.category;
        return matchCategory;
    });

    // Apply Sorting
    if (productState.sortBy === 'newest') {
        filtered.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0) || b.id - a.id);
    } else if (productState.sortBy === 'bestselling') {
        filtered.sort((a, b) => (b.isBestSeller ? 1 : 0) - (a.isBestSeller ? 1 : 0) || b.id - a.id);
    }
    
    productState.filtered = filtered;

    if (!keepPage) {
        productState.currentPage = 1;
    }
    renderPagedProducts();
}

function renderPagedProducts() {
    const grid = document.querySelector('.products-grid');
    const paginationControls = document.getElementById('product-pagination');
    if (!grid) return;
    
    const start = (productState.currentPage - 1) * productState.itemsPerPage;
    const end = start + productState.itemsPerPage;
    const pageItems = productState.filtered.slice(start, end);

    if (pageItems.length === 0) {
        grid.innerHTML = '<p style="text-align:center; width:100%; color:#666; padding: 20px;">No products found matching your criteria.</p>';
    } else {
        grid.innerHTML = pageItems.map(p => {
        const isWishlisted = wishlist.includes(p.id);
        let badges = '';
        let badgeTop = 10;
        if (p.isBestSeller) {
            badges += `<div class="product-badge" style="position: absolute; top: ${badgeTop}px; right: 10px; background: #FF9800; color: white; padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: bold; z-index: 10; box-shadow: 0 2px 5px rgba(0,0,0,0.2);"><i class="fas fa-star" style="margin-right: 3px;"></i>Best Seller</div>`;
            badgeTop += 30;
        }
        if (p.isNew) {
            badges += `<div class="product-badge" style="position: absolute; top: ${badgeTop}px; right: 10px; background: #4CAF50; color: white; padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: bold; z-index: 10; box-shadow: 0 2px 5px rgba(0,0,0,0.2);"><i class="fas fa-sparkles" style="margin-right: 3px;"></i>New</div>`;
        }
        return `
        <div class="product-card glass animate-card" data-category="${p.category}" data-price="${p.price}" style="position: relative;">
            ${badges}
            <button class="btn-icon" onclick="toggleWishlist(${p.id})" style="position: absolute; top: 10px; left: 10px; z-index: 10; width: 35px; height: 35px; border: none; background: rgba(255,255,255,0.9); color: ${isWishlisted ? '#e74c3c' : '#ccc'};">
                <i class="${isWishlisted ? 'fas' : 'far'} fa-heart"></i>
            </button>
            <div class="product-image" style="height: 220px; width: 100%; overflow: hidden; border-radius: 10px; margin-bottom: 15px; position: relative;">
                <img src="${p.image || 'https://placehold.co/400x300?text=No+Image'}" alt="${p.name}" style="width: 100%; height: 100%; object-fit: cover;">
                <button class="quick-view-btn" onclick="quickViewProduct(${p.id})">
                    <i class="fas fa-eye"></i> Quick View
                </button>
            </div>
            <h3>${p.name}</h3>
            <p class="product-subtitle">${p.subtitle}</p>
            <!-- Price and Stock hidden temporarily
            <p class="product-price">₹${p.price}/kg</p>
            <p class="product-stock" style="font-size: 0.85rem; color: ${p.stock > 0 ? '#2E7D32' : '#e74c3c'}; margin-bottom: 10px;">
                ${p.stock > 0 ? `<i class="fas fa-check-circle"></i> In Stock: ${p.stock} kg` : '<i class="fas fa-times-circle"></i> Out of Stock'}
            </p>
            -->
            <button class="btn btn--secondary" onclick="addToCart('${p.name}', ${p.price})">Add to Cart</button>
        </div>
    `}).join('');
    }

    // Update Pagination UI
    if (paginationControls) {
        const totalPages = Math.ceil(productState.filtered.length / productState.itemsPerPage);
        
        if (totalPages > 1) {
            paginationControls.style.display = 'flex';
            document.getElementById('productPageInfo').textContent = `Page ${productState.currentPage} of ${totalPages}`;
            document.getElementById('prevProductPage').disabled = productState.currentPage === 1;
            document.getElementById('nextProductPage').disabled = productState.currentPage === totalPages;
        } else {
            paginationControls.style.display = 'none';
        }
    }
}

function changeProductPage(delta) {
    const totalPages = Math.ceil(productState.filtered.length / productState.itemsPerPage);
    const newPage = productState.currentPage + delta;
    if (newPage >= 1 && newPage <= totalPages) {
        productState.currentPage = newPage;
        renderPagedProducts();
        document.getElementById('products').scrollIntoView({ behavior: 'smooth' });
    }
}

function quickViewProduct(id) {
    const products = JSON.parse(localStorage.getItem('zeroDefectProducts') || '[]');
    const product = products.find(p => p.id === id);
    if (product) {
        const qvImage = document.getElementById('qv-image');
        qvImage.src = product.image || 'https://placehold.co/400x300?text=No+Image';
        document.getElementById('qv-name').textContent = product.name;
        document.getElementById('qv-subtitle').textContent = product.subtitle;
        document.getElementById('qv-category').textContent = product.category;
        
        // document.getElementById('qv-price').textContent = `₹${product.price}/kg`;
        document.getElementById('qv-price').style.display = 'none'; // Hide Price
        
        // Gallery Logic
        const galleryContainer = document.getElementById('qv-gallery');
        const images = product.images && product.images.length > 0 ? product.images : [product.image || 'https://placehold.co/400x300?text=No+Image'];
        
        galleryContainer.innerHTML = images.map((img, index) => `
            <img src="${img}" class="${index === 0 ? 'active' : ''}" onclick="changeQvImage(this, '${img}')">
        `).join('');

        // Wishlist Button Logic
        const wishlistBtn = document.getElementById('qv-wishlist-btn');
        const isWishlisted = wishlist.includes(product.id);
        wishlistBtn.innerHTML = `<i class="${isWishlisted ? 'fas' : 'far'} fa-heart"></i>`;
        wishlistBtn.style.color = isWishlisted ? '#e74c3c' : '#555';
        
        wishlistBtn.onclick = () => {
            toggleWishlist(product.id);
            const newStatus = wishlist.includes(product.id);
            wishlistBtn.innerHTML = `<i class="${newStatus ? 'fas' : 'far'} fa-heart"></i>`;
            wishlistBtn.style.color = newStatus ? '#e74c3c' : '#555';
        };

        const stockEl = document.getElementById('qv-stock');
        
        // Hide Stock & Cart Logic temporarily
        stockEl.style.display = 'none';
        stockEl.textContent = `In Stock: ${product.stock} kg`;
        stockEl.style.color = '#2E7D32';
        document.getElementById('qv-add-to-cart').disabled = false;
        
        document.getElementById('qv-quantity').value = 1;
        
        // Hide quantity selector (keep Add to Cart)
        if (document.getElementById('qv-quantity')) {
            document.getElementById('qv-quantity').parentElement.style.display = 'none';
        }

        // Setup Add to Cart button
        const addToCartBtn = document.getElementById('qv-add-to-cart');
        addToCartBtn.onclick = () => {
            const qty = parseInt(document.getElementById('qv-quantity').value);
            addToCart(product.name, product.price, qty);
        };

        // Setup Share Button
        const shareBtn = document.getElementById('qv-share-btn');
        if (shareBtn) {
            shareBtn.onclick = () => {
                const shareData = {
                    title: product.name,
                    text: `Check out ${product.name} - ${product.subtitle}`,
                    url: window.location.href
                };
                
                if (navigator.share) {
                    navigator.share(shareData).catch(console.error);
                } else {
                    navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
                    showSuccessMessage('Product link copied to clipboard!');
                }
            };
        }

        // Setup Zoom Effect (Follow Mouse)
        const qvImageContainer = document.querySelector('.product-image-large');
        qvImageContainer.onmousemove = function(e) {
            const { left, top, width, height } = qvImageContainer.getBoundingClientRect();
            const x = (e.clientX - left) / width * 100;
            const y = (e.clientY - top) / height * 100;
            qvImage.style.transformOrigin = `${x}% ${y}%`;
        };
        
        // Related Products Logic
        const relatedContainer = document.getElementById('qv-related-products');
        const relatedSection = document.querySelector('.related-products-section');
        
        if (relatedContainer && relatedSection) {
            const relatedProducts = products
                .filter(p => p.category === product.category && p.id !== product.id)
                .slice(0, 4); // Limit to 4 related products

            if (relatedProducts.length > 0) {
                relatedSection.style.display = 'block';
                relatedContainer.innerHTML = relatedProducts.map(rp => `
                    <div class="related-product-card" onclick="quickViewProduct(${rp.id})">
                        <img src="${rp.image || 'https://placehold.co/150x150?text=No+Image'}" alt="${rp.name}">
                        <h4>${rp.name}</h4>
                        <!-- <p>₹${rp.price}/kg</p> -->
                    </div>
                `).join('');
            } else {
                relatedSection.style.display = 'none';
            }
        }
        
        document.getElementById('quick-view-modal').style.display = 'block';
    }
}

function changeQvImage(thumb, src) {
    document.getElementById('qv-image').src = src;
    document.querySelectorAll('.qv-gallery img').forEach(img => img.classList.remove('active'));
    thumb.classList.add('active');
}

function closeQuickView() {
    document.getElementById('quick-view-modal').style.display = 'none';
}

function adjustQvQuantity(delta) {
    const input = document.getElementById('qv-quantity');
    let val = parseInt(input.value) + delta;
    if (val < 1) val = 1;
    input.value = val;
}

// Wishlist Functions
function toggleWishlist(id) {
    const index = wishlist.indexOf(id);
    if (index === -1) {
        wishlist.push(id);
        showSuccessMessage('Added to wishlist');
    } else {
        wishlist.splice(index, 1);
        showSuccessMessage('Removed from wishlist');
    }
    saveData();
    updateWishlistCount();
    
    // Refresh products grid to update heart icons
    // We just re-render the current view to update icons
    renderPagedProducts();
    
    // If wishlist modal is open, refresh it
    if (document.getElementById('wishlist-modal').style.display === 'block') {
        renderWishlist();
    }
}

function updateWishlistCount() {
    const el = document.getElementById('wishlist-count');
    if (el) el.textContent = wishlist.length;
}

function openWishlist() {
    renderWishlist();
    document.getElementById('wishlist-modal').style.display = 'block';
}

function closeWishlist() {
    document.getElementById('wishlist-modal').style.display = 'none';
}

function renderWishlist() {
    const container = document.getElementById('wishlist-items');
    const products = JSON.parse(localStorage.getItem('zeroDefectProducts') || '[]');
    const wishlistProducts = products.filter(p => wishlist.includes(p.id));
    
    if (wishlistProducts.length === 0) {
        container.innerHTML = '<p style="text-align:center; width:100%; color:#666;">Your wishlist is empty.</p>';
        return;
    }
    
    // Reuse renderProducts logic but for specific container and items
    // Since renderProducts targets .products-grid, we'll manually generate HTML here reusing the card style
    // Or better, temporarily change the target of renderProducts? No, let's duplicate the card HTML generation for simplicity in this context
    // Actually, let's just use a simplified card for wishlist
    
    // For simplicity, I will use the same card structure but injected into the modal
    container.innerHTML = wishlistProducts.map(p => `
        <div class="product-card glass" style="position: relative;">
            <button class="btn-icon" onclick="toggleWishlist(${p.id})" style="position: absolute; top: 10px; left: 10px; z-index: 10; width: 35px; height: 35px; border: none; background: rgba(255,255,255,0.9); color: #e74c3c;">
                <i class="fas fa-heart"></i>
            </button>
            <div class="product-image" style="height: 180px; width: 100%; overflow: hidden; border-radius: 10px; margin-bottom: 15px;">
                <img src="${p.image || 'https://placehold.co/400x300?text=No+Image'}" alt="${p.name}" style="width: 100%; height: 100%; object-fit: cover;">
            </div>
            <h3>${p.name}</h3>
            <p class="product-price">₹${p.price}/kg</p>
            <button class="btn btn--secondary" onclick="addToCart('${p.name}', ${p.price})">Add to Cart</button>
        </div>
    `).join('');
}

// Review Management
function initializeReviews() {
    // No default reviews - only show user-submitted reviews
    const defaultReviews = [];

    let reviews = localStorage.getItem('zeroDefectReviews');
    if (!reviews) {
        reviews = JSON.stringify(defaultReviews);
        localStorage.setItem('zeroDefectReviews', reviews);
    }
    
    // Migration: Ensure 'approved' property exists for existing reviews
    let parsedReviews = JSON.parse(reviews);
    let updated = false;
    parsedReviews = parsedReviews.map(r => {
        if (typeof r.approved === 'undefined') {
            r.approved = false; // New reviews require approval
            updated = true;
        }
        return r;
    });
    if (updated) localStorage.setItem('zeroDefectReviews', JSON.stringify(parsedReviews));
    
    renderReviews(parsedReviews);
}

function renderReviews(reviews) {
    const track = document.querySelector('.reviews-track');
    if (!track) return;
    
    const approvedReviews = reviews.filter(r => r.approved);
    
    if (approvedReviews.length === 0) {
        track.innerHTML = '<p style="text-align:center; width:100%; color:#666;">No reviews yet.</p>';
        return;
    }
    
    // Generate HTML for reviews
    const generateReviewHTML = (r) => `
        <div class="review-card glass animate-card" style="min-width: 350px; max-width: 350px; margin-right: 30px; display: flex; flex-direction: column;">
            <div class="review-author">
                <img src="${r.image || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(r.name) + '&background=random'}" alt="${r.name}">
                <div>
                    <h4>${r.name}</h4>
                    <div class="review-stars">
                        ${Array(5).fill(0).map((_, i) => 
                            i < Math.floor(r.rating) ? '<i class="fas fa-star"></i>' : 
                            (i < r.rating ? '<i class="fas fa-star-half-alt"></i>' : '<i class="far fa-star"></i>')
                        ).join('')}
                    </div>
                </div>
            </div>
            <p>"${r.message}"</p>
            ${r.reply ? `<div class="review-reply" style="margin-top: auto; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.1);"><strong style="color: #4CAF50; display: block; margin-bottom: 5px; font-size: 0.9rem;">Response from Zero Defect:</strong> <span style="font-size: 0.85rem; color: #555;">${r.reply}</span></div>` : ''}
        </div>
    `;

    // Create duplicate set for seamless scrolling
    const reviewsHTML = approvedReviews.map(generateReviewHTML).join('');
    
    // If we have reviews, duplicate them to ensure seamless loop
    if (approvedReviews.length > 0) {
        track.innerHTML = reviewsHTML + reviewsHTML;
    } else {
        track.innerHTML = reviewsHTML;
    }
}

function fetchReviewsFromSupabase() {
    // Wait for SupabaseDB to be available
    const waitForSupabaseDB = setInterval(() => {
        if (window.SupabaseDB) {
            clearInterval(waitForSupabaseDB);
            
            window.SupabaseDB.waitForReady().then(async () => {
                const { data, error } = await window.SupabaseDB.fetchAll('reviews');
                if (!error && data) {
                    // Normalize Supabase data to match local structure
                    const normalizedReviews = data.map(r => ({
                        id: r.id,
                        name: r.reviewer_name,
                        rating: r.rating,
                        message: r.review_text,
                        reply: r.admin_reply,
                        image: r.reviewer_image,
                        approved: r.is_approved,
                        date: r.created_at
                    }));
                    
                    // Update local storage and render
                    localStorage.setItem('zeroDefectReviews', JSON.stringify(normalizedReviews));
                    renderReviews(normalizedReviews);
                    console.log('✅ Reviews synced from Supabase');
                }
            });
        }
    }, 100);
    
    // Timeout after 5 seconds
    setTimeout(() => clearInterval(waitForSupabaseDB), 5000);
}

function subscribeToReviewChanges() {
    if (window.supabaseClient) {
        try {
            window.supabaseClient.channel('reviews-changes')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, (payload) => {
                    console.log('Reviews updated in real-time');
                    fetchReviewsFromSupabase();
                })
                .subscribe();
        } catch (error) {
            console.error('Error subscribing to reviews:', error);
        }
    }
}

// Event Listeners Setup
function setupEventListeners() {
    // Export Inquiry Form
    const inquiryForm = document.getElementById('exportInquiryForm');
    if (inquiryForm) {
        inquiryForm.addEventListener('submit', handleInquirySubmission);
    }

    // Checkout Form
    const checkoutForm = document.getElementById('checkoutForm');
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', handleCheckout);
    }

    // Mobile navigation toggle
    const mobileNavToggle = document.querySelector('.mobile-nav-toggle');
    const nav = document.querySelector('.nav');
    const pageOverlay = document.getElementById('pageOverlay');

    if (mobileNavToggle) {
        mobileNavToggle.addEventListener('click', function() {
            const isExpanded = this.getAttribute('aria-expanded') === 'true';
            this.setAttribute('aria-expanded', !isExpanded);
            nav.classList.toggle('active');
            pageOverlay.classList.toggle('hidden');
            document.body.style.overflow = isExpanded ? 'auto' : 'hidden';
        });
    }

    // Close mobile menu on link click
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            nav.classList.remove('active');
            mobileNavToggle.setAttribute('aria-expanded', 'false');
            pageOverlay.classList.add('hidden');
            document.body.style.overflow = 'auto';
        });
    });

    // Page overlay click
    if (pageOverlay) {
        pageOverlay.addEventListener('click', () => {
            nav.classList.remove('active');
            mobileNavToggle.setAttribute('aria-expanded', 'false');
            pageOverlay.classList.add('hidden');
            document.body.style.overflow = 'auto';
        });
    }

    // Smooth scrolling for navigation
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Back to Top Button
    const backToTopBtn = document.getElementById('backToTopBtn');
    if (backToTopBtn) {
        backToTopBtn.addEventListener('click', scrollToTop);
    }

    // Close success message
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('success-close')) {
            hideSuccessMessage();
        }
    });
}

// Animations Setup
function setupAnimations() {
    // Intersection Observer for fade-in animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);

    // Observe all fade-in sections
    document.querySelectorAll('.fade-in').forEach(section => {
        observer.observe(section);
    });

    // Parallax effect for hero section
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const parallaxElements = document.querySelectorAll('.parallax-section');
        
        parallaxElements.forEach(element => {
            const rate = scrolled * -0.5;
            element.style.transform = `translate3d(0, ${rate}px, 0)`;
        });
    });
}

// Scroll Effects
function setupScrollEffects() {
    // Header scroll effect
    window.addEventListener('scroll', () => {
        const header = document.querySelector('.header');
        const backToTopBtn = document.getElementById('backToTopBtn');
        
        if (window.scrollY > 100) {
            header.classList.add('scrolled');
            if (backToTopBtn) backToTopBtn.classList.add('visible');
        } else {
            header.classList.remove('scrolled');
            if (backToTopBtn) backToTopBtn.classList.remove('visible');
        }
    });
}

// Form Handling
function handleInquirySubmission(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    const inquiryData = Object.fromEntries(formData.entries());
    const submitButton = form.querySelector('button[type="submit"]');
    
    // Add timestamp
    inquiryData.timestamp = new Date().toISOString();
    inquiryData.id = Date.now();
    inquiryData.status = 'pending';
    
    // Validate required fields
    const requiredFields = ['name', 'country', 'product', 'quantity', 'email'];
    let isValid = true;
    
    requiredFields.forEach(field => {
        if (!inquiryData[field] || inquiryData[field].trim() === '') {
            isValid = false;
            const input = form.querySelector(`[name="${field}"]`);
            if (input) {
                input.classList.add('error');
                showFieldError(input, 'This field is required');
            }
        }
    });
    
    // Email validation
    const emailInput = form.querySelector('[name="email"]');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailInput && !emailRegex.test(inquiryData.email)) {
        isValid = false;
        emailInput.classList.add('error');
        showFieldError(emailInput, 'Please enter a valid email address');
    }
    
    if (!isValid) {
        showSuccessMessage('Please fill in all required fields correctly.', 'error');
        return;
    }
    
    // Clear any previous errors
    form.querySelectorAll('.form-control.error').forEach(input => {
        input.classList.remove('error');
        const errorMsg = input.nextElementSibling;
        if (errorMsg && errorMsg.classList.contains('error-message')) {
            errorMsg.remove();
        }
    });

    // Show loading state
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
    
    // CRITICAL FIX: Reload latest data from storage to prevent overwriting admin deletions
    const currentStorage = localStorage.getItem('zeroDefectExportData');
    if (currentStorage) {
        const latestData = JSON.parse(currentStorage);
        exportData = latestData; // Sync local state with storage
    }

    // Create inquiry object with proper Supabase structure
    const timestampMs = Date.now();
    const inquiryForSupabase = {
        id: timestampMs,
        inquiry_number: `INQ-${timestampMs}`,
        full_name: inquiryData.name,
        email: inquiryData.email,
        phone: inquiryData.phone || '',
        company: inquiryData.company || '',
        country: inquiryData.country,
        city: inquiryData.city || '',
        product: inquiryData.product,
        quantity: inquiryData.quantity || '',
        message: inquiryData.message || '',
        status: 'pending',
        priority: 'medium',
        assigned_to: '',
        notes: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        timestamp: new Date().toISOString()
    };

    // Always save to localStorage first (primary backup)
    if (!exportData.inquiries) {
        exportData.inquiries = [];
    }
    exportData.inquiries.unshift(inquiryData);
    saveData();

    // Save to Supabase IMMEDIATELY (not dependent on Google Sheets)
    if (window.SupabaseDB) {
        window.SupabaseDB.waitForReady().then(() => {
            console.log('About to insert inquiry to Supabase:', inquiryForSupabase);
            window.SupabaseDB.insert('inquiries', inquiryForSupabase).then(({ data, error }) => {
                if (error) {
                    console.error('Failed to save inquiry to Supabase:', error);
                    console.error('Error details:', JSON.stringify(error, null, 2));
                } else {
                    console.log('Inquiry saved to Supabase successfully:', data);
                }
            });
        });
    } else {
        console.warn('SupabaseDB not available');
    }

    // Try to send to Google Sheets (non-blocking, for external logging)
    sendToGoogleSheets(inquiryData, 3)
        .then(() => {
            console.log('Successfully sent to Google Sheets');
        })
        .catch(() => {
            console.warn('Google Sheets submission failed (Supabase backup is in place)');
        });

    addNotification('inquiry', 'New Export Inquiry', `From ${inquiryData.name} (${inquiryData.country})`);
    showSuccessMessage('Thank you! Your export inquiry has been submitted successfully.');
    
    // RESET FORM IMMEDIATELY
    form.reset();
    
    // Reset form fields to empty
    form.querySelectorAll('.form-control').forEach(input => {
        input.value = '';
        input.classList.remove('error');
    });
    
    // Reset select dropdowns
    form.querySelectorAll('select').forEach(select => {
        select.value = '';
    });
    
    // Reset textarea
    form.querySelectorAll('textarea').forEach(textarea => {
        textarea.value = '';
    });
    
    submitButton.disabled = false;
    submitButton.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Inquiry';
}

async function sendToGoogleSheets(data, retries) {
    if (GOOGLE_SCRIPT_URL === 'YOUR_GOOGLE_SCRIPT_URL_HERE') {
        console.warn('Google Script URL is not set. Skipping submission.');
        return Promise.reject();
    }

    const formData = new FormData();
    for (const key in data) {
        formData.append(key, data[key]);
    }

    for (let i = 0; i < retries; i++) {
        try {
            await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                body: formData
            });
            return Promise.resolve();
        } catch (error) {
            console.error(`Attempt ${i + 1} failed:`, error);
            if (i === retries - 1) {
                return Promise.reject();
            }
        }
    }
}

function showFieldError(input, message) {
    // Remove existing error message
    const existingError = input.nextElementSibling;
    if (existingError && existingError.classList.contains('error-message')) {
        existingError.remove();
    }
    
    // Create and append error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    errorDiv.style.color = '#e74c3c';
    errorDiv.style.fontSize = '0.85rem';
    errorDiv.style.marginTop = '5px';
    
    input.parentNode.appendChild(errorDiv);
}

// Success Message Functions
function showSuccessMessage(message, type = 'success') {
    const successMessage = document.getElementById('successMessage');
    const successText = successMessage.querySelector('.success-text p');
    const successIcon = successMessage.querySelector('.success-icon');
    
    // Set message
    successText.textContent = message;
    
    // Set icon based on type
    if (type === 'error') {
        successIcon.className = 'fas fa-exclamation-circle success-icon';
        successIcon.style.color = '#e74c3c';
    } else {
        successIcon.className = 'fas fa-check-circle success-icon';
        successIcon.style.color = '#4CAF50';
    }
    
    // Show message
    successMessage.classList.remove('hidden');
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        if (!successMessage.classList.contains('hidden')) {
            hideSuccessMessage();
        }
    }, 5000);
}

function hideSuccessMessage() {
    const successMessage = document.getElementById('successMessage');
    successMessage.classList.add('hidden');
}

// Utility Functions
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// Handle escape key to close modals
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        hideSuccessMessage();
        closeCart();
        closeQuickView();
        closeWishlist();
        
        // Close mobile menu
        const nav = document.querySelector('.nav');
        const mobileNavToggle = document.querySelector('.mobile-nav-toggle');
        const pageOverlay = document.getElementById('pageOverlay');
        
        if (nav && nav.classList.contains('active')) {
            nav.classList.remove('active');
            mobileNavToggle.setAttribute('aria-expanded', 'false');
            pageOverlay.classList.add('hidden');
            document.body.style.overflow = 'auto';
        }
    }
});

function subscribeToProductChanges() {
    // Subscribe to real-time product changes using Realtime API
    if (window.supabaseClient) {
        console.log('Setting up real-time subscription for products...');
        try {
            // Create a channel for product changes
            const channel = window.supabaseClient.channel('products-changes')
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'products'
                }, (payload) => {
                    console.log('Products changed in real-time:', payload);
                    // Refresh products from Supabase
                    fetchProductsFromSupabase();
                })
                .subscribe((status) => {
                    console.log('Products subscription status:', status);
                    if (status === 'SUBSCRIBED') {
                        console.log('✅ Products subscription active');
                    }
                });
        } catch (error) {
            console.error('Error setting up products subscription:', error);
        }
    }
}

// E-commerce functionality

function filterProducts(category) {
    productState.category = category;
    
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(button => {
        if (button.innerText.toLowerCase() === category || (category === 'all' && button.innerText.toLowerCase() === 'all')) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
    
    applyFilters();
}

function sortProducts(criteria) {
    productState.sortBy = criteria;
    applyFilters();
}

function addToCart(name, price, qty = 1) {
    // Check stock
    const products = JSON.parse(localStorage.getItem('zeroDefectProducts') || '[]');
    const product = products.find(p => p.name === name);
    const currentStock = product ? (product.stock || 0) : 0;
    const existingInCart = cart.find(item => item.name === name);
    const cartQty = existingInCart ? existingInCart.quantity : 0;

    /* Stock check removed to allow unlimited orders
    if (cartQty + qty > currentStock) {
        showSuccessMessage(`Sorry, only ${currentStock} kg available in stock.`, 'error');
        return;
    }
    */

    const existingItem = cart.find(item => item.name === name);
    if (existingItem) {
        existingItem.quantity += qty;
    } else {
        cart.push({ name, price, quantity: qty });
    }
    updateCart();
    showSuccessMessage(`${name} added to cart.`);
    closeQuickView();
}

function updateCart() {
    const cartItemsContainer = document.getElementById('cart-items');
    const cartTotal = document.getElementById('cart-total');
    const cartCount = document.getElementById('cart-count');

    if (!cartItemsContainer || !cartTotal || !cartCount) return;

    cartItemsContainer.innerHTML = '';
    let total = 0;
    let count = 0;

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p style="text-align:center; color:#666; padding: 20px;">Your cart is empty.</p>';
    }

    cart.forEach((item, index) => {
        const itemElement = document.createElement('div');
        itemElement.classList.add('cart-item');
        itemElement.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #eee;';
        
        itemElement.innerHTML = `
            <div style="flex: 1;">
                <div style="font-weight: 600;">${item.name}</div>
                <div style="font-size: 0.85rem; color: #666;">Qty: ${item.quantity} x ₹${item.price}</div>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-weight: 600; color: #2E7D32;">₹${item.price * item.quantity}</span>
                <button onclick="removeFromCart(${index})" style="background: none; border: none; color: #e74c3c; cursor: pointer; padding: 5px;" title="Remove">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        cartItemsContainer.appendChild(itemElement);
        total += item.price * item.quantity;
        count += item.quantity;
    });

    cartTotal.textContent = `₹${total}`;
    cartCount.textContent = count;
    cartCount.style.display = count > 0 ? 'flex' : 'none';
    
    // Animate badge
    cartCount.classList.remove('bump');
    void cartCount.offsetWidth; // Trigger reflow
    cartCount.classList.add('bump');
    
    saveData();
}

function clearCart() {
    if (cart.length === 0) return;
    
    if (confirm('Are you sure you want to clear your cart?')) {
        cart = [];
        updateCart();
        showSuccessMessage('Cart cleared.');
    }
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCart();
    showSuccessMessage('Item removed from cart');
}

function openCart() {
    document.getElementById('cart-modal').style.display = 'block';
}

function closeCart() {
    document.getElementById('cart-modal').style.display = 'none';
}

function checkout() {
    closeCart();
    document.getElementById('checkout').style.display = 'block';
    document.getElementById('checkout').scrollIntoView({ behavior: 'smooth' });
}

function handleCheckout(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const checkoutData = Object.fromEntries(formData.entries());

    // Simple validation
    if (!checkoutData.name || !checkoutData.email || !checkoutData.address) {
        showSuccessMessage('Please fill all checkout fields.', 'error');
        return;
    }
    
    if (cart.length === 0) {
        showSuccessMessage('Your cart is empty. Please add items before checking out.', 'error');
        return;
    }

    // Update Inventory - BOTH Supabase and localStorage
    const storedProducts = localStorage.getItem('zeroDefectProducts');
    let products = storedProducts ? JSON.parse(storedProducts) : [];
    const updatedProducts = [];

    cart.forEach(cartItem => {
        const productIndex = products.findIndex(p => p.name === cartItem.name);
        if (productIndex !== -1) {
            products[productIndex].stock -= cartItem.quantity;
            updatedProducts.push({
                id: products[productIndex].id,
                name: products[productIndex].name,
                newStock: products[productIndex].stock
            });
        }
    });

    
    localStorage.setItem('zeroDefectProducts', JSON.stringify(products));
    productState.products = products;
    applyFilters(true); // Refresh UI, keep page
    
    // Create order object with proper structure
    const orderTimestamp = Date.now();
    const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    const order = {
        id: orderTimestamp,
        order_number: `ORD-${orderTimestamp}`,
        customer_name: checkoutData.name,
        customer_email: checkoutData.email,
        customer_phone: checkoutData.phone || '',
        shipping_address: checkoutData.address,
        product_name: cart.map(c => c.name).join(', '),
        quantity: cart.reduce((sum, item) => sum + item.quantity, 0),
        unit_price: cart[0]?.price || 0,
        total_amount: totalAmount,
        payment_method: checkoutData.payment || 'not-specified',
        status: 'pending',
        notes: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        timestamp: new Date().toISOString()
    };
    
    // Save order to localStorage first
    const storedOrders = localStorage.getItem('zeroDefectOrders');
    let orders = storedOrders ? JSON.parse(storedOrders) : [];
    orders.unshift(order);
    localStorage.setItem('zeroDefectOrders', JSON.stringify(orders));
    
    // Save order to Supabase
    if (window.SupabaseDB) {
        window.SupabaseDB.waitForReady().then(() => {
            console.log('About to insert order to Supabase:', order);
            window.SupabaseDB.insert('orders', order).then(({ data, error }) => {
                if (error) {
                    console.error('Failed to save order to Supabase:', error);
                    console.error('Error details:', JSON.stringify(error, null, 2));
                } else {
                    console.log('Order saved to Supabase successfully:', data);
                }
            });
            
            // Update product stock in Supabase
            updatedProducts.forEach(prod => {
                window.SupabaseDB.update('products', prod.id, { stock: prod.newStock }).then(({ error }) => {
                    if (!error) console.log(`Product ${prod.id} stock updated to ${prod.newStock}`);
                });
            });
        });
    } else {
        console.warn('SupabaseDB not available for orders');
    }
    
    addNotification('order', 'New Order Placed', `Order #${order.order_number} by ${checkoutData.name}`);
    showSuccessMessage('Order placed successfully! Thank you for your purchase.');
    cart = [];
    updateCart();
    form.reset();
    document.getElementById('checkout').style.display = 'none';
}

// Review Form Handling
document.addEventListener('DOMContentLoaded', () => {
    const reviewForm = document.getElementById('reviewForm');
    if (reviewForm) {
        reviewForm.addEventListener('submit', handleReviewSubmission);
    }

    // Star rating
    const stars = document.querySelectorAll('.star-rating i');
    const ratingValue = document.getElementById('review-rating-value');

    stars.forEach(star => {
        star.addEventListener('click', () => {
            const value = star.getAttribute('data-value');
            ratingValue.value = value;
            stars.forEach(s => {
                s.classList.remove('fas');
                s.classList.add('far');
            });
            for (let i = 0; i < value; i++) {
                stars[i].classList.remove('far');
                stars[i].classList.add('fas');
            }
        });
    });
});

function handleReviewSubmission(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    const reviewData = Object.fromEntries(formData.entries());
    
    if (!reviewData.name || !reviewData.rating || !reviewData.message) {
        showSuccessMessage('Please fill all fields and provide a rating.', 'error');
        return;
    }

    // Create review object for localStorage
    const reviewTimestamp = Date.now();
    const reviews = JSON.parse(localStorage.getItem('zeroDefectReviews') || '[]');
    const newReview = {
        id: reviewTimestamp,
        name: reviewData.name,
        rating: parseFloat(reviewData.rating),
        message: reviewData.message,
        date: new Date().toISOString(),
        image: `https://ui-avatars.com/api/?name=${encodeURIComponent(reviewData.name)}&background=random`,
        approved: false // New reviews are pending approval
    };
    
    // Save to localStorage (backup)
    reviews.unshift(newReview);
    localStorage.setItem('zeroDefectReviews', JSON.stringify(reviews));
    renderReviews(reviews);

    // Save to Supabase
    if (window.SupabaseDB) {
        window.SupabaseDB.waitForReady().then(() => {
            const reviewForSupabase = {
                id: reviewTimestamp,
                reviewer_name: reviewData.name,
                rating: parseFloat(reviewData.rating),
                review_text: reviewData.message,
                reviewer_image: `https://ui-avatars.com/api/?name=${encodeURIComponent(reviewData.name)}&background=random`,
                product_name: 'General Review',
                is_approved: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            console.log('About to insert review to Supabase:', reviewForSupabase);
            window.SupabaseDB.insert('reviews', reviewForSupabase).then(({ data, error }) => {
                if (error) {
                    console.error('Failed to save review to Supabase:', error);
                    console.error('Error details:', JSON.stringify(error, null, 2));
                } else {
                    console.log('Review saved to Supabase successfully:', data);
                }
            });
        });
    } else {
        console.warn('SupabaseDB not available for reviews');
    }

    addNotification('review', 'New Review Submitted', `${reviewData.rating} Stars from ${reviewData.name}`);
    showSuccessMessage('Thank you for your review! It has been submitted for approval.');
    form.reset();
    
    // Reset stars
    const stars = document.querySelectorAll('.star-rating i');
    stars.forEach(s => {
        s.classList.remove('fas');
        s.classList.add('far');
    });
}

// Helper to add notifications safely (works even if shared/notifications.js is not loaded)
function addNotification(type, title, message) {
    if (window.NotificationSystem) {
        window.NotificationSystem.add(type, title, message);
    } else {
        // Fallback direct write to ensure notifications work on landing page
        const KEY = 'zeroDefectNotifications';
        const notifications = JSON.parse(localStorage.getItem(KEY) || '[]');
        const newNotif = {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2),
            type: type,
            title: title,
            message: message,
            timestamp: Date.now(),
            read: false
        };
        notifications.unshift(newNotif);
        if (notifications.length > 50) notifications.pop();
        localStorage.setItem(KEY, JSON.stringify(notifications));
    }
}
