// Global variables
let settingsCache = null;

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('=== SETTINGS PAGE LOADED ===');
    
    // Load settings on page load
    setTimeout(() => loadSettingsFromSupabase(), 500);
    
    // Attach event listeners
    const form = document.getElementById('storeInfoForm');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            console.log('Form submit event triggered');
            saveSettingsToSupabase();
        });
    } else {
        console.error('❌ Form with id "storeInfoForm" not found!');
    }
});

// Load settings from Supabase
function loadSettingsFromSupabase() {
    console.log('📥 Fetching settings from Supabase...');
    
    if (!window.SupabaseDB) {
        console.error('❌ SupabaseDB not available');
        return;
    }
    
    window.SupabaseDB.waitForReady().then(() => {
        window.SupabaseDB.fetchWhere('settings', 'id', 'default').then(({ data, error }) => {
            if (error) {
                console.error('❌ Error loading settings:', error.message);
                return;
            }
            
            if (!data || data.length === 0) {
                console.warn('⚠️ No settings found in Supabase');
                return;
            }
            
            settingsCache = data[0];
            console.log('✅ Settings loaded:', settingsCache);
            
            // Populate form
            document.getElementById('storeName').value = settingsCache.store_name || '';
            document.getElementById('storeEmail').value = settingsCache.store_email || '';
            document.getElementById('storePhone').value = settingsCache.store_phone || '';
            document.getElementById('storeWhatsapp').value = settingsCache.store_whatsapp || '';
            document.getElementById('storeLocation').value = settingsCache.store_location || '';
            document.getElementById('storeHoursWeekdays').value = settingsCache.business_hours_weekdays || '';
            document.getElementById('storeHoursSaturday').value = settingsCache.business_hours_saturday || '';
            document.getElementById('storeHoursSunday').value = settingsCache.business_hours_sunday || '';
            document.getElementById('socialLinkedin').value = settingsCache.social_linkedin || '';
            document.getElementById('socialTwitter').value = settingsCache.social_twitter || '';
            document.getElementById('socialInstagram').value = settingsCache.social_instagram || '';
            document.getElementById('socialFacebook').value = settingsCache.social_facebook || '';
            
            console.log('✅ Form populated with settings');
        });
    });
}

// Save settings to Supabase
function saveSettingsToSupabase() {
    console.log('💾 SAVING SETTINGS TO SUPABASE');
    
    if (!window.SupabaseDB) {
        console.error('❌ SupabaseDB not available');
        alert('Error: Supabase not available');
        return;
    }
    
    // Get form values
    const newData = {
        id: 'default',
        store_name: document.getElementById('storeName').value,
        store_email: document.getElementById('storeEmail').value,
        store_phone: document.getElementById('storePhone').value,
        store_whatsapp: document.getElementById('storeWhatsapp').value,
        store_location: document.getElementById('storeLocation').value,
        business_hours_weekdays: document.getElementById('storeHoursWeekdays').value,
        business_hours_saturday: document.getElementById('storeHoursSaturday').value,
        business_hours_sunday: document.getElementById('storeHoursSunday').value,
        social_linkedin: document.getElementById('socialLinkedin').value,
        social_twitter: document.getElementById('socialTwitter').value,
        social_instagram: document.getElementById('socialInstagram').value,
        social_facebook: document.getElementById('socialFacebook').value,
        updated_at: new Date().toISOString()
    };
    
    console.log('📝 Data to save:', newData);
    
    const btn = document.querySelector('#storeInfoForm button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    
    window.SupabaseDB.waitForReady().then(() => {
        // Merge with existing data
        const mergedData = settingsCache ? { ...settingsCache, ...newData } : newData;
        
        console.log('🔀 Merged data:', mergedData);
        
        // Try UPDATE first
        window.SupabaseDB.update('settings', 'default', mergedData).then(({ data, error }) => {
            if (error) {
                console.error('❌ UPDATE failed:', error);
                console.log('Trying INSERT instead...');
                
                // If update fails, try insert
                window.SupabaseDB.insert('settings', mergedData).then(({ data, error }) => {
                    if (error) {
                        console.error('❌ INSERT also failed:', error);
                        alert('❌ Error saving settings: ' + error.message);
                    } else {
                        console.log('✅ Settings inserted successfully');
                        settingsCache = mergedData;
                        alert('✅ Settings saved successfully!');
                    }
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
                });
            } else {
                console.log('✅ UPDATE successful');
                console.log('Response data:', data);
                settingsCache = mergedData;
                alert('✅ Settings saved successfully!');
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
            }
        });
    });
}

// Load notification settings
function loadNotificationSettings() {
    const sound = localStorage.getItem('adminNotificationSound') || 'default';
    const select = document.getElementById('notificationSound');
    if(select) select.value = sound;
}

// Save notification settings
function saveNotificationSettings() {
    const sound = document.getElementById('notificationSound').value;
    localStorage.setItem('adminNotificationSound', sound);
    alert('✅ Notification settings saved!');
}

// Test notification sound
function testNotificationSound() {
    const selectedSound = document.getElementById('notificationSound').value;
    if (window.playNotificationSound) {
        window.playNotificationSound(selectedSound);
    }
}

// Reset all data
function resetData() {
    if (confirm('Are you sure you want to reset all data? This will clear all products, orders, and inquiries.')) {
        localStorage.clear();
        alert('Data reset. You will be logged out.');
        window.logout();
    }
}

// Load notification settings on page load
loadNotificationSettings();

// Attach event listeners for other buttons
document.addEventListener('DOMContentLoaded', function() {
    const notifBtn = document.getElementById('saveNotificationSettingsBtn');
    if (notifBtn) notifBtn.addEventListener('click', saveNotificationSettings);
    
    const testBtn = document.getElementById('testSoundBtn');
    if (testBtn) testBtn.addEventListener('click', testNotificationSound);
    
    const resetBtn = document.getElementById('resetDataBtn');
    if (resetBtn) resetBtn.addEventListener('click', resetData);
});
