/**
 * Shared Notification System
 * Handles storage and rendering of admin notifications
 */
(function() {
    const KEY = 'zeroDefectNotifications';

    const NotificationSystem = {
        // Add a new notification (Used by Landing Page)
        add: function(type, title, message) {
            const notificationData = {
                type: type,
                title: title,
                message: message,
                is_read: false,
                icon: this.getIconForType(type)
            };

            if (window.SupabaseDB) {
                window.SupabaseDB.waitForReady().then(() => {
                    window.SupabaseDB.insert('notifications', notificationData).then(({ error }) => {
                        if (error) {
                            console.error('Failed to add notification to Supabase:', error);
                            this.addToLocalStorage(type, title, message);
                        } else {
                            this.render();
                        }
                    });
                });
            } else {
                this.addToLocalStorage(type, title, message);
            }
        },

        getIconForType: function(type) {
            if (type === 'order') return 'shopping-cart';
            if (type === 'inquiry') return 'envelope';
            if (type === 'review') return 'star';
            return 'bell';
        },

        addToLocalStorage: function(type, title, message) {
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
            
            // Keep limit to 50 to prevent storage bloat
            if (notifications.length > 50) notifications.pop();
            
            localStorage.setItem(KEY, JSON.stringify(notifications));
        },

        // Get all notifications
        getAll: function() {
            return new Promise((resolve) => {
                if (window.SupabaseDB) {
                    window.SupabaseDB.waitForReady().then(() => {
                        window.SupabaseDB.fetchAll('notifications').then(({ data, error }) => {
                            if (error) {
                                console.warn('Failed to load notifications from Supabase, using localStorage:', error);
                                resolve(this.getAllFromLocalStorage());
                            } else {
                                // Convert Supabase format to expected format
                                const notifications = (data || []).map(n => ({
                                    id: n.id,
                                    type: n.type,
                                    title: n.title,
                                    message: n.message,
                                    timestamp: new Date(n.created_at).getTime(),
                                    read: n.is_read || false
                                }));
                                resolve(notifications);
                            }
                        });
                    });
                } else {
                    resolve(this.getAllFromLocalStorage());
                }
            });
        },

        getAllFromLocalStorage: function() {
            return JSON.parse(localStorage.getItem(KEY) || '[]');
        },

        // Mark specific notification as read
        markAsRead: function(id) {
            if (window.SupabaseDB) {
                window.SupabaseDB.waitForReady().then(() => {
                    window.SupabaseDB.update('notifications', id, { is_read: true }).then(({ error }) => {
                        if (error) {
                            console.error('Failed to mark notification as read in Supabase:', error);
                            this.markAsReadLocalStorage(id);
                        } else {
                            this.render();
                        }
                    });
                });
            } else {
                this.markAsReadLocalStorage(id);
            }
        },

        markAsReadLocalStorage: function(id) {
            const notifications = JSON.parse(localStorage.getItem(KEY) || '[]');
            const note = notifications.find(n => n.id === id);
            if (note) {
                note.read = true;
                localStorage.setItem(KEY, JSON.stringify(notifications));
                this.render();
            }
        },

        // Mark all as read
        markAllRead: function() {
            if (window.SupabaseDB) {
                window.SupabaseDB.waitForReady().then(() => {
                    this.getAll().then((notifications) => {
                        const updatePromises = notifications
                            .filter(n => !n.read)
                            .map(n => window.SupabaseDB.update('notifications', n.id, { is_read: true }));
                        
                        Promise.all(updatePromises).then((results) => {
                            const hasErrors = results.some(r => r.error);
                            if (hasErrors) {
                                console.error('Some notifications failed to update');
                                this.markAllReadLocalStorage();
                            } else {
                                this.render();
                            }
                        });
                    });
                });
            } else {
                this.markAllReadLocalStorage();
            }
        },

        markAllReadLocalStorage: function() {
            const notifications = JSON.parse(localStorage.getItem(KEY) || '[]');
            notifications.forEach(n => n.read = true);
            localStorage.setItem(KEY, JSON.stringify(notifications));
            this.render();
        },

        // Inject CSS for notifications
        injectStyles: function() {
            if (document.getElementById('notification-styles')) return;
            
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                .notification-wrapper { position: relative; margin-right: 15px; }
                .notification-bell { position: relative; font-size: 1.2rem; background: none; border: none; cursor: pointer; color: #333; padding: 5px; }
                .notification-badge { 
                    position: absolute; top: 0; right: 0; 
                    background: #e74c3c; color: white; 
                    border-radius: 50%; padding: 2px 5px; 
                    font-size: 0.6rem; font-weight: bold;
                    display: none; min-width: 15px; text-align: center;
                }
                .notification-dropdown {
                    display: none; position: absolute; right: 0; top: 100%;
                    background: white; border: 1px solid #ddd;
                    box-shadow: 0 5px 15px rgba(0,0,0,0.1);
                    width: 300px; z-index: 1000; border-radius: 8px;
                    max-height: 400px; overflow-y: auto;
                }
                .notification-dropdown.active { display: block; }
                .notification-header { padding: 10px 15px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; }
                .notification-header h4 { margin: 0; font-size: 1rem; color: #333; }
                .notification-header-buttons { display: flex; gap: 10px; }
                .clear-all-btn { background: none; border: none; color: #2E7D32; cursor: pointer; font-size: 0.8rem; font-weight: 600; }
                .clear-all-btn:hover { text-decoration: underline; }
                .notification-item { padding: 10px 15px; border-bottom: 1px solid #eee; cursor: pointer; display: flex; gap: 10px; text-align: left; }
                .notification-item:hover { background: #f9f9f9; }
                .notification-item.unread { background: #f0f9f0; }
                .notification-item-icon { width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0; font-size: 0.8rem; }
                .notification-item-icon.order { background: #3498db; }
                .notification-item-icon.inquiry { background: #9b59b6; }
                .notification-item-icon.review { background: #f1c40f; }
                .notification-item-content { flex: 1; }
                .notification-item-title { font-weight: 600; font-size: 0.9rem; margin-bottom: 2px; color: #333; }
                .notification-item-msg { font-size: 0.8rem; color: #666; margin-bottom: 2px; }
                .notification-item-time { font-size: 0.7rem; color: #999; }
                .empty-notifications { padding: 20px; text-align: center; color: #999; }
            `;
            document.head.appendChild(style);
        },

        // Render notifications in Admin UI
        render: function() {
            const bell = document.querySelector('.notification-bell');
            const dropdown = document.querySelector('.notification-dropdown');
            
            if (!bell || !dropdown) return;

            this.getAll().then((notifications) => {
                const unreadCount = notifications.filter(n => !n.read).length;

                // 1. Update Badge
                let badge = bell.querySelector('.notification-badge');
                if (!badge) {
                    badge = document.createElement('span');
                    badge.className = 'notification-badge';
                    bell.appendChild(badge);
                }
                badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
                badge.style.display = unreadCount > 0 ? 'flex' : 'none';

                // 2. Prepare Dropdown Structure
                let header = dropdown.querySelector('.notification-header');
                let list = dropdown.querySelector('.notification-list');

                if (!header) {
                    header = document.createElement('div');
                    header.className = 'notification-header';
                    header.innerHTML = '<h4>Notifications</h4><button class="clear-all-btn">Mark all read</button>';
                    dropdown.insertBefore(header, dropdown.firstChild);
                    
                    header.querySelector('.clear-all-btn').addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.markAllRead();
                    });
                }
                
                // Toggle button visibility based on unread count
                const clearBtn = header.querySelector('.clear-all-btn');
                if (clearBtn) {
                    clearBtn.style.display = unreadCount > 0 ? 'block' : 'none';
                }

                if (!list) {
                    list = document.createElement('div');
                    list.className = 'notification-list';
                    dropdown.appendChild(list);
                }

                // 3. Populate List
                list.innerHTML = '';
                if (notifications.length === 0) {
                    list.innerHTML = '<div class="empty-notifications">No notifications</div>';
                    return;
                }

                notifications.slice(0, 10).forEach((n) => {
                    const item = document.createElement('div');
                    item.className = `notification-item ${n.read ? '' : 'unread'}`;
                    
                    let iconClass = 'fa-bell';
                    if (n.type === 'order') iconClass = 'fa-shopping-cart';
                    if (n.type === 'inquiry') iconClass = 'fa-envelope';
                    if (n.type === 'review') iconClass = 'fa-star';

                    item.innerHTML = `
                        <div class="notification-item-icon ${n.type}">
                            <i class="fas ${iconClass}"></i>
                        </div>
                        <div class="notification-item-content">
                            <div class="notification-item-title">${n.title}</div>
                            <div class="notification-item-msg">${n.message}</div>
                            <div class="notification-item-time">${new Date(n.timestamp).toLocaleString()}</div>
                        </div>
                    `;
                    item.addEventListener('click', () => this.markAsRead(n.id));
                    list.appendChild(item);
                });
            });
        }
    };

    // Expose to window
    window.NotificationSystem = NotificationSystem;

    // Auto-init on DOM Ready
    document.addEventListener('DOMContentLoaded', () => {
        NotificationSystem.injectStyles();
        NotificationSystem.render();
        
        // Auto-refresh notifications every 3 seconds
        setInterval(() => {
            NotificationSystem.render();
        }, 3000);
    });
})();