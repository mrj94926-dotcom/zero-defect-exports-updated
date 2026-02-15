/**
 * Shared Admin Utilities
 * Handles Sidebar, Dark Mode, Logout, and Profile Avatar
 * Safe for use across all admin pages including login
 */

// Define global functions immediately to be available for other scripts
window.logout = function() {
    if (confirm('Are you sure you want to logout?')) {
        sessionStorage.removeItem('adminLoggedIn');
        sessionStorage.removeItem('adminUsername');
        window.location.href = 'login.html';
    }
};

window.loadAdminAvatar = function() {
    // Try to load from Supabase first
    if (window.SupabaseDB) {
        window.SupabaseDB.waitForReady().then(() => {
            // Try to fetch admin profile by email
            window.SupabaseDB.fetchWhere('admin_profiles', 'user_email', 'admin@zerodefect.com').then(({ data, error }) => {
                let avatarImg = null;
                
                if (!error && data && data.length > 0) {
                    avatarImg = data[0].avatar_url;
                }
                
                // If not in Supabase, fall back to localStorage
                if (!avatarImg) {
                    avatarImg = localStorage.getItem('adminImage');
                }
                
                updateAvatarUI(avatarImg);
            });
        });
    } else {
        // Fallback to localStorage if Supabase not available
        const avatarImg = localStorage.getItem('adminImage');
        updateAvatarUI(avatarImg);
    }
};

function updateAvatarUI(avatarImg) {
    // Update topbar avatars
    const avatars = document.querySelectorAll('.user-avatar');
    avatars.forEach(el => {
        if (avatarImg) {
            el.innerHTML = `<img src="${avatarImg}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
        } else {
            el.innerHTML = '<i class="fas fa-user"></i>';
        }
    });

    // Update large profile avatars (if present)
    const largeAvatars = document.querySelectorAll('.user-avatar-large');
    largeAvatars.forEach(el => {
        if (avatarImg) {
            if (el.tagName === 'IMG') {
                el.src = avatarImg;
            } else {
                el.innerHTML = `<img src="${avatarImg}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
            }
        }
    });
}

window.toggleDarkMode = function() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('adminDarkMode', isDark);
    
    const toggleBtn = document.getElementById('darkModeToggle');
    if (toggleBtn) {
        toggleBtn.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    }
};

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', function() {
    
    // 1. Sidebar Logic
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    const collapseBtn = document.getElementById('sidebarCollapseBtn');
    
    if (collapseBtn && sidebar) {
        collapseBtn.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            if (mainContent) {
                mainContent.classList.toggle('expanded');
            }
        });
    }

    // 2. Dark Mode Logic
    const isDarkMode = localStorage.getItem('adminDarkMode') === 'true';
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
    }
    
    const toggleBtn = document.getElementById('darkModeToggle');
    if (toggleBtn) {
        toggleBtn.innerHTML = isDarkMode ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        toggleBtn.addEventListener('click', window.toggleDarkMode);
    }

    // 3. Logout Logic
    const logoutBtns = document.querySelectorAll('#logoutBtn, #logoutBtnTop, .logout-btn');
    logoutBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            window.logout();
        });
    });

    // 4. Profile Avatar
    window.loadAdminAvatar();

    // 5. Admin Name Display
    const usernameEl = document.getElementById('username');
    if (usernameEl) {
        const username = sessionStorage.getItem('adminUsername') || 'Admin';
        usernameEl.textContent = username.charAt(0).toUpperCase() + username.slice(1);
    }

    // 6. Notifications UI
    const notificationBell = document.querySelector('.notification-bell');
    const notificationDropdown = document.querySelector('.notification-dropdown');
    
    if (notificationBell && notificationDropdown) {
        notificationBell.addEventListener('click', (e) => {
            e.stopPropagation();
            notificationDropdown.classList.toggle('active');
        });

        document.addEventListener('click', (e) => {
            if (!notificationDropdown.contains(e.target) && !notificationBell.contains(e.target)) {
                notificationDropdown.classList.remove('active');
            }
        });
    }
});