document.addEventListener('DOMContentLoaded', function() {

    let autoRefreshInterval = null;

    // Event Listeners
    document.getElementById('profileImageInput').addEventListener('change', handleImageUpload);
    document.getElementById('passwordForm').addEventListener('submit', handlePasswordChange);

    // Auto-refresh every 5 seconds to catch external profile changes
    autoRefreshInterval = setInterval(loadAdminAvatar, 5000);

    // Note: loadAdminAvatar is now handled by admin-utils.js, which updates both .user-avatar and .user-avatar-large

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        if (autoRefreshInterval) clearInterval(autoRefreshInterval);
    });

    function handleImageUpload(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const imageData = e.target.result;
                const adminEmail = localStorage.getItem('adminEmail') || 'admin@zerodefect.com';
                
                if (window.SupabaseDB) {
                    window.SupabaseDB.waitForReady().then(() => {
                        // Check if admin profile exists
                        window.SupabaseDB.fetchWhere('admin_profiles', 'user_email', adminEmail).then(({ data: existing, error: fetchError }) => {
                            const profileData = {
                                user_email: adminEmail,
                                avatar_url: imageData,
                                name: 'Administrator',
                                role: 'admin'
                            };

                            if (fetchError || !existing || existing.length === 0) {
                                // Insert new profile
                                window.SupabaseDB.insert('admin_profiles', profileData).then(({ error }) => {
                                    if (error) {
                                        console.error('Failed to save image to Supabase:', error);
                                        localStorage.setItem('adminImage', imageData);
                                    } else {
                                        console.log('Profile image saved to Supabase successfully');
                                    }
                                    loadAdminAvatar();
                                    alert('Profile image updated successfully!');
                                });
                            } else {
                                // Update existing profile
                                window.SupabaseDB.update('admin_profiles', existing[0].id, profileData).then(({ error }) => {
                                    if (error) {
                                        console.error('Failed to update image in Supabase:', error);
                                        localStorage.setItem('adminImage', imageData);
                                    } else {
                                        console.log('Profile image updated in Supabase successfully');
                                    }
                                    loadAdminAvatar();
                                    alert('Profile image updated successfully!');
                                });
                            }
                        });
                    });
                } else {
                    localStorage.setItem('adminImage', imageData);
                    loadAdminAvatar();
                    alert('Profile image updated successfully!');
                }
            };
            reader.readAsDataURL(file);
        }
    }

    function handlePasswordChange(e) {
        e.preventDefault();
        const newPass = document.getElementById('newPassword').value;
        const confirmPass = document.getElementById('confirmPassword').value;

        if (newPass !== confirmPass) {
            alert('New passwords do not match!');
            return;
        }

        if (newPass.length < 6) {
            alert('Password must be at least 6 characters long.');
            return;
        }

        const adminUsername = sessionStorage.getItem('adminUsername') || 'admin';
        // WARNING: btoa is NOT secure hashing. 
        // TODO: Migrate to Supabase Auth (GoTrue) for secure password handling.
        const passwordHash = btoa(newPass); 

        if (window.SupabaseDB) {
            window.SupabaseDB.waitForReady().then(() => {
                // Fetch admin profile by username
                window.SupabaseDB.fetchWhere('admin_profiles', 'username', adminUsername).then(({ data: existing, error: fetchError }) => {
                    const profileData = {
                        username: adminUsername,
                        password: newPass,
                        password_hash: passwordHash,
                        updated_at: new Date().toISOString()
                    };

                    if (fetchError || !existing || existing.length === 0) {
                        // Insert new profile with password
                        console.log('Creating new admin profile with password');
                        window.SupabaseDB.insert('admin_profiles', profileData).then(({ data, error }) => {
                            if (error) {
                                console.error('Failed to create admin profile in Supabase:', error);
                                localStorage.setItem('adminPassword', newPass);
                                alert('Password updated locally (Supabase sync failed)');
                            } else {
                                console.log('✅ Password updated successfully in Supabase');
                                localStorage.setItem('adminPassword', newPass);
                                alert('Password updated successfully! Please login again.');
                                setTimeout(() => logout(), 1000);
                            }
                        });
                    } else {
                        // Update existing profile password
                        console.log('Updating existing admin profile password');
                        window.SupabaseDB.update('admin_profiles', existing[0].id, profileData).then(({ data, error }) => {
                            if (error) {
                                console.error('Failed to update password in Supabase:', error);
                                localStorage.setItem('adminPassword', newPass);
                                alert('Password updated locally (Supabase sync failed)');
                            } else {
                                console.log('✅ Password updated successfully in Supabase');
                                localStorage.setItem('adminPassword', newPass);
                                alert('Password updated successfully! Please login again.');
                                setTimeout(() => logout(), 1000);
                            }
                        });
                    }
                });
            });
        } else {
            localStorage.setItem('adminPassword', newPass);
            alert('Password updated successfully! Please login again.');
            setTimeout(() => logout(), 1000);
        }
    }
});