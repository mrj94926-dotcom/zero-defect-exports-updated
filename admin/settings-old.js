document.addEventListener('DOMContentLoaded', function() {

    let settingsCache = null;  // Cache settings to prevent constant reloading
    let isLoadingSettings = false;  // Prevent concurrent load requests
    let isSavingSettings = false;  // Prevent concurrent save requests

    // Load Store Info ONCE on page load
    loadStoreInfo();

    // Load Notification Settings
    loadNotificationSettings();

    // Event Listeners
    document.getElementById('storeInfoForm').addEventListener('submit', saveStoreInfo);
    document.getElementById('resetDataBtn').addEventListener('click', resetData);
    document.getElementById('saveNotificationSettingsBtn').addEventListener('click', saveNotificationSettings);
    document.getElementById('testSoundBtn').addEventListener('click', testNotificationSound);

    function loadStoreInfo() {
        // If already loading, don't start another request
        if (isLoadingSettings) {
            console.log('Already loading settings, skipping...');
            return;
        }

        // If we have cached data and not saving, use cache
        if (settingsCache && !isSavingSettings) {
            console.log('Using cached settings');
            populateFormWithSettings(settingsCache);
            return;
        }

        isLoadingSettings = true;
        console.log('=== LOADING SETTINGS FROM SUPABASE ===');
        
        if (window.SupabaseDB) {
            window.SupabaseDB.waitForReady().then(() => {
                console.log('Supabase is ready');
                window.SupabaseDB.fetchWhere('settings', 'id', 'default').then(({ data, error }) => {
                    isLoadingSettings = false;
                    
                    if (error) {
                        console.error('❌ Error fetching settings:', error);
                        alert('Error loading settings from Supabase: ' + error.message);
                    } else if (!data || data.length === 0) {
                        console.warn('❌ No settings found in Supabase');
                        alert('No settings found. Create settings by filling the form and clicking Save.');
                    } else {
                        settingsCache = data[0];
                        console.log('✅ Settings loaded successfully:', settingsCache);
                        populateFormWithSettings(settingsCache);
                    }
                });
            });
        } else {
            isLoadingSettings = false;
            console.error('❌ SupabaseDB not available');
            alert('Supabase is not available. Please check your connection.');
        }
    }

    function populateFormWithSettings(settings) {
        console.log('=== POPULATING FORM WITH SETTINGS ===');
        console.log('Store Name:', settings.store_name);
        console.log('Store Email:', settings.store_email);
        
        // Populate ALL fields (don't check if empty)
        document.getElementById('storeName').value = settings.store_name || '';
        document.getElementById('storeEmail').value = settings.store_email || '';
        document.getElementById('storePhone').value = settings.store_phone || '';
        document.getElementById('storeWhatsapp').value = settings.store_whatsapp || '';
        document.getElementById('storeLocation').value = settings.store_location || '';
        document.getElementById('storeHoursWeekdays').value = settings.business_hours_weekdays || '';
        document.getElementById('storeHoursSaturday').value = settings.business_hours_saturday || '';
        document.getElementById('storeHoursSunday').value = settings.business_hours_sunday || '';
        document.getElementById('socialLinkedin').value = settings.social_linkedin || '';
        document.getElementById('socialTwitter').value = settings.social_twitter || '';
        document.getElementById('socialInstagram').value = settings.social_instagram || '';
        document.getElementById('socialFacebook').value = settings.social_facebook || '';
        
        console.log('✅ Form populated with values');
    }

    function saveStoreInfo(e) {
        e.preventDefault();
        
        // Prevent concurrent saves
        if (isSavingSettings) {
            console.log('Save already in progress');
            return;
        }

        isSavingSettings = true;
        console.log('=== SAVING SETTINGS ===');
        
        const submitButton = document.querySelector('#storeInfoForm button[type="submit"]');
        const originalText = submitButton.innerHTML;
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        
        const settingsData = {
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

        console.log('Form data to save:', settingsData);

        if (window.SupabaseDB) {
            window.SupabaseDB.waitForReady().then(() => {
                console.log('Supabase ready, checking for existing settings...');
                // First check if record exists
                window.SupabaseDB.fetchWhere('settings', 'id', 'default').then(({ data: existing, error: fetchError }) => {
                    if (fetchError) {
                        console.error('❌ Failed to fetch existing settings:', fetchError);
                        alert('Error: Could not fetch existing settings');
                        submitButton.disabled = false;
                        submitButton.innerHTML = originalText;
                        isSavingSettings = false;
                        return;
                    }

                    console.log('Existing record found:', existing?.length > 0 ? 'YES' : 'NO');

                    if (!existing || existing.length === 0) {
                        // Insert new record
                        console.log('Inserting NEW settings record...');
                        window.SupabaseDB.insert('settings', settingsData).then(({ data, error }) => {
                            if (error) {
                                console.error('❌ Failed to insert:', error);
                                alert('❌ Error saving settings: ' + error.message);
                            } else {
                                console.log('✅ Settings inserted successfully');
                                settingsCache = settingsData;
                                alert('✅ Settings saved successfully!');
                            }
                            submitButton.disabled = false;
                            submitButton.innerHTML = originalText;
                            isSavingSettings = false;
                        });
                    } else {
                        // Update existing record
                        console.log('Updating EXISTING settings record...');
                        
                        const mergedData = {
                            ...existing[0],
                            ...settingsData
                        };
                        
                        console.log('Merged data:', mergedData);
                        
                        window.SupabaseDB.update('settings', 'default', mergedData).then(({ data, error }) => {
                            if (error) {
                                console.error('❌ Failed to update:', error);
                                alert('❌ Error updating settings: ' + error.message);
                            } else {
                                console.log('✅ Settings updated successfully');
                                settingsCache = mergedData;
                                alert('✅ Settings saved successfully!');
                            }
                            submitButton.disabled = false;
                            submitButton.innerHTML = originalText;
                            isSavingSettings = false;
                        });
                    }
                });
            });
        } else {
            console.error('❌ SupabaseDB not available');
            alert('Error: Supabase is not available');
            submitButton.disabled = false;
            submitButton.innerHTML = originalText;
            isSavingSettings = false;
        }
    }

    function loadNotificationSettings() {
        const sound = localStorage.getItem('adminNotificationSound') || 'default';
        const select = document.getElementById('notificationSound');
        if(select) select.value = sound;
    }

    function saveNotificationSettings() {
        const sound = document.getElementById('notificationSound').value;
        localStorage.setItem('adminNotificationSound', sound);
        alert('Notification settings saved!');
    }

    function testNotificationSound() {
        const selectedSound = document.getElementById('notificationSound').value;
        if (window.playNotificationSound) {
            window.playNotificationSound(selectedSound);
        }
    }

    function resetData() {
        if (confirm('Are you sure you want to reset all data? This will clear all products, orders, and inquiries.')) {
            localStorage.clear();
            alert('Data reset. You will be logged out.');
            logout();
        }
    }
});