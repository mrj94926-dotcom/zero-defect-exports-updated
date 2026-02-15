document.addEventListener('DOMContentLoaded', function() {

    // Pagination state
    let currentPage = 1;
    const itemsPerPage = 10;
    let currentAllItems = [];
    let currentSearchQuery = '';
    let autoRefreshInterval = null;

    // Load orders
    loadOrders();

    // Auto-refresh every 5 seconds
    autoRefreshInterval = setInterval(loadOrders, 5000);

    // Setup event listeners
    document.getElementById('refreshBtn').addEventListener('click', loadOrders);
    document.getElementById('exportBtn').addEventListener('click', exportToCSV);
    document.getElementById('searchInput').addEventListener('input', (e) => {
        currentSearchQuery = e.target.value.toLowerCase();
        currentPage = 1;
        renderTable();
    });
    document.getElementById('closeModalBtn').addEventListener('click', closeModal);
    
    document.getElementById('prevPageBtn').addEventListener('click', () => changePage(-1));
    document.getElementById('nextPageBtn').addEventListener('click', () => changePage(1));

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        if (autoRefreshInterval) clearInterval(autoRefreshInterval);
    });

    function loadOrders() {
        const loadingState = document.getElementById('loadingState');
        const emptyState = document.getElementById('emptyState');
        const tableBody = document.getElementById('ordersBody');

        // Show loading
        loadingState.style.display = 'block';

        // Load from Supabase only
        if (!window.SupabaseDB) {
            console.error('Supabase is not available');
            loadingState.style.display = 'none';
            return;
        }

        window.SupabaseDB.waitForReady().then(() => {
            Promise.all([
                window.SupabaseDB.fetchAll('orders'),
                window.SupabaseDB.fetchAll('inquiries')
            ]).then(([ordersResult, inquiriesResult]) => {
                const orders = ordersResult.data || [];
                const inquiries = inquiriesResult.data || [];
                processOrdersData(orders, inquiries);
                loadingState.style.display = 'none';
            }).catch((error) => {
                console.error('Failed to load data from Supabase:', error);
                loadingState.style.display = 'none';
            });
        });
    }

    function loadOrdersFromLocalStorage() {
        // Supabase only - no localStorage fallback
        console.warn('Attempted to use localStorage fallback, but Supabase-only mode is enabled');
    }

    function processOrdersData(orders, inquiries) {
        // Update dashboard cards (Keep strictly for orders stats)
        updateDashboardCards(orders);

        // Combine and sort all items by timestamp
        const allItems = [
            ...orders.map((o, i) => ({ ...o, _type: 'order', _originalIndex: i })),
            ...inquiries.map((i, idx) => ({ ...i, _type: 'inquiry', _originalIndex: idx }))
        ].sort((a, b) => new Date(b.created_at || b.timestamp) - new Date(a.created_at || a.timestamp));

        currentAllItems = allItems;
        renderTable();
    }

    function renderTable() {
        const tableBody = document.getElementById('ordersBody');
        const emptyState = document.getElementById('emptyState');
        const paginationControls = document.getElementById('paginationControls');
        
        // Filter items based on search query
        let filteredItems = currentAllItems;
        if (currentSearchQuery) {
            filteredItems = currentAllItems.filter(item => {
                let name = '';
                if (item._type === 'inquiry') {
                    name = item.full_name || item.name || '';
                } else {
                    name = item.customer_name || (item.customer ? item.customer.name : '') || '';
                }
                return name.toLowerCase().includes(currentSearchQuery);
            });
        }

        // Calculate total pages first to adjust current page if needed
        const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;
        if (currentPage > totalPages) currentPage = totalPages;
        
        tableBody.innerHTML = '';
        
        if (filteredItems.length === 0) {
            emptyState.style.display = 'block';
            paginationControls.style.display = 'none';
            return;
        }
        
        emptyState.style.display = 'none';
        paginationControls.style.display = 'flex';

        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const pageItems = filteredItems.slice(startIndex, endIndex);

        pageItems.forEach((item) => {
            const row = createOrderRow(item);
            tableBody.appendChild(row);
        });

        // Update pagination UI
        document.getElementById('pageInfo').textContent = `Page ${currentPage} of ${totalPages}`;
        document.getElementById('prevPageBtn').disabled = currentPage === 1;
        document.getElementById('nextPageBtn').disabled = currentPage === totalPages;
    }

    function updateDashboardCards(orders) {
        // Total orders
        document.getElementById('totalOrders').textContent = orders.length;

        // Pending orders (status = 'pending')
        const pending = orders.filter(o => o.status === 'pending').length;
        document.getElementById('pendingOrders').textContent = pending;

        // Shipped orders (status = 'shipped')
        const shipped = orders.filter(o => o.status === 'shipped').length;
        document.getElementById('shippedOrders').textContent = shipped;

        // Delivered orders (status = 'delivered')
        const delivered = orders.filter(o => o.status === 'delivered').length;
        document.getElementById('deliveredOrders').textContent = delivered;

        // Low Stock Items (Threshold < 100) - from Supabase
        if (window.SupabaseDB) {
            window.SupabaseDB.waitForReady().then(() => {
                window.SupabaseDB.fetchAll('products').then(({ data: products }) => {
                    products = products || [];
                    const lowStock = products.filter(p => (p.stock || 0) < 100).length;
                    const lowStockElement = document.getElementById('lowStockCount');
                    if (lowStockElement) lowStockElement.textContent = lowStock;
                }).catch(() => {
                    const lowStockElement = document.getElementById('lowStockCount');
                    if (lowStockElement) lowStockElement.textContent = 0;
                });
            });
        }
    }

    function createOrderRow(order) {
        const row = document.createElement('tr');

        // Format date
        const date = new Date(order.created_at || order.timestamp);
        const formattedDate = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });

        // Status badge
        const status = order.status || 'pending';
        const statusText = status.charAt(0).toUpperCase() + status.slice(1);
        let statusClass = `status-${status}`;
        
        // Map status to color classes
        const statusColorMap = {
            'pending': 'status-pending',
            'reviewed': 'status-reviewed',
            'shipped': 'status-shipped',
            'delivered': 'status-delivered',
            'completed': 'status-completed',
            'cancelled': 'status-cancelled'
        };
        statusClass = statusColorMap[status] || 'status-pending';
        
        // Determine data based on type
        const isInquiry = order._type === 'inquiry';
        
        let customerName, customerEmail, totalDisplay, itemsCount;
        
        if (isInquiry) {
            // Inquiry structure: full_name, email
            customerName = order.full_name || order.name || 'Unknown';
            customerEmail = order.email || 'No Email';
            totalDisplay = '<span style="color: #666; font-style: italic;">Inquiry</span>';
            itemsCount = order.product_interest || order.product || '1';
        } else {
            // Order structure: customer_name, customer_email (flat structure from script.js)
            customerName = order.customer_name || (order.customer ? order.customer.name : 'Unknown');
            customerEmail = order.customer_email || (order.customer ? order.customer.email : 'No Email');
            
            // Calculate total from total_amount field
            const total = order.total_amount || 0;
            totalDisplay = `₹${parseFloat(total).toFixed(2)}`;
            itemsCount = order.quantity || 1;
        }

        row.innerHTML = `
            <td>${formattedDate}</td>
            <td><strong>${escapeHtml(customerName)}</strong></td>
            <td>${escapeHtml(customerEmail)}</td>
            <td>${escapeHtml(String(itemsCount))}</td>
            <td>${totalDisplay}</td>
            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
            <td>
                <button class="action-btn view-btn" data-index="${order._originalIndex}" data-type="${order._type}" title="View Details">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="action-btn update-btn" data-index="${order._originalIndex}" data-type="${order._type}" title="Update Status">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn delete-btn" data-index="${order._originalIndex}" data-type="${order._type}" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;

        return row;
    }

    function escapeHtml(text) {
        if (text === null || typeof text === 'undefined') {
            return '';
        }
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function changePage(delta) {
        // Re-calculate filtered items to determine total pages correctly
        let filteredItems = currentAllItems;
        if (currentSearchQuery) {
            filteredItems = currentAllItems.filter(item => {
                let name = '';
                if (item._type === 'inquiry') {
                    name = item.full_name || item.name || '';
                } else {
                    name = item.customer_name || (item.customer ? item.customer.name : '') || '';
                }
                return name.toLowerCase().includes(currentSearchQuery);
            });
        }
        const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;
        const newPage = currentPage + delta;
        if (newPage >= 1 && newPage <= totalPages) {
            currentPage = newPage;
            renderTable();
        }
    }

    // Auto-refresh every 30 seconds
    setInterval(loadOrders, 30000);

    // Handle table actions
    document.addEventListener('click', function(e) {
        if (e.target.closest('.view-btn')) {
            const btn = e.target.closest('.view-btn');
            const index = btn.dataset.index;
            const type = btn.dataset.type;
            type === 'inquiry' ? viewInquiryDetails(index) : viewOrderDetails(index);
        }

        if (e.target.closest('.update-btn')) {
            const btn = e.target.closest('.update-btn');
            const index = btn.dataset.index;
            const type = btn.dataset.type;
            type === 'inquiry' ? updateInquiryStatus(index) : updateOrderStatus(index);
        }

        if (e.target.closest('.delete-btn')) {
            const btn = e.target.closest('.delete-btn');
            const index = btn.dataset.index;
            const type = btn.dataset.type;
            type === 'inquiry' ? deleteInquiry(index) : deleteOrder(index);
        }
    });

    function openModal() {
        document.getElementById('orderModal').style.display = 'block';
    }

    function closeModal() {
        document.getElementById('orderModal').style.display = 'none';
    }

    function viewOrderDetails(index) {
        const order = currentAllItems.find((o, i) => o._type === 'order' && o._originalIndex === parseInt(index));
        if (!order) return;

        document.getElementById('modalTitle').textContent = 'Order Details';
        
        // Handle both flat structure (from Supabase) and nested structure (legacy)
        const customerName = order.customer_name || (order.customer ? order.customer.name : 'Unknown');
        const customerEmail = order.customer_email || (order.customer ? order.customer.email : 'Unknown');
        const customerAddress = order.shipping_address || (order.customer ? order.customer.address : 'Unknown');
        
        let itemsHtml = '<ul>';
        if (order.items && Array.isArray(order.items)) {
            // Legacy structure with items array
            order.items.forEach(item => {
                itemsHtml += `<li>${item.name} (x${item.quantity}) - ₹${item.price * item.quantity}</li>`;
            });
        } else if (order.product_name) {
            // Flat structure from Supabase
            const productNames = order.product_name.split(', ');
            productNames.forEach(name => {
                itemsHtml += `<li>${name}</li>`;
            });
        }
        itemsHtml += '</ul>';

        const details = `
            <p><strong>Name:</strong> ${escapeHtml(customerName)}</p>
            <p><strong>Email:</strong> ${escapeHtml(customerEmail)}</p>
            <p><strong>Address:</strong> ${escapeHtml(customerAddress)}</p>
            <p><strong>Order Date:</strong> ${new Date(order.created_at || order.timestamp).toLocaleString()}</p>
            <p><strong>Order ID:</strong> ${escapeHtml(order.id || order.order_number)}</p>
            <p><strong>Total Amount:</strong> ₹${parseFloat(order.total_amount || 0).toFixed(2)}</p>
            <p><strong>Items:</strong></p>
            ${itemsHtml}
        `;
        document.getElementById('modalBody').innerHTML = details;
        
        const footer = `
            <button class="btn" id="printInvoiceBtn" style="background-color: var(--color-earth);">
                <i class="fas fa-print"></i> Print Invoice
            </button>
        `;
        document.getElementById('modalFooter').innerHTML = footer;
        document.getElementById('printInvoiceBtn').onclick = () => printInvoice(order);
        
        openModal();
    }

    function viewInquiryDetails(index) {
        const inquiry = currentAllItems.find((i, idx) => i._type === 'inquiry' && i._originalIndex === parseInt(index));
        if (!inquiry) return;

        document.getElementById('modalTitle').textContent = 'Inquiry Details';
        // Handle both full_name (Supabase) and name (legacy) fields
        const inquiryName = inquiry.full_name || inquiry.name || 'Unknown';
        const details = `
            <p><strong>Name:</strong> ${escapeHtml(inquiryName)}</p>
            <p><strong>Company:</strong> ${escapeHtml(inquiry.company || 'N/A')}</p>
            <p><strong>Country:</strong> ${escapeHtml(inquiry.country || 'N/A')}</p>
            <p><strong>Product:</strong> ${escapeHtml(inquiry.product_interest || inquiry.product || 'N/A')}</p>
            <p><strong>Quantity:</strong> ${escapeHtml(inquiry.quantity || 'N/A')}</p>
            <p><strong>Email:</strong> ${escapeHtml(inquiry.email)}</p>
            <p><strong>Phone:</strong> ${escapeHtml(inquiry.phone || 'N/A')}</p>
            <p><strong>Message:</strong> ${escapeHtml(inquiry.message || 'No message')}</p>
            <p><strong>Date:</strong> ${new Date(inquiry.created_at || inquiry.timestamp).toLocaleString()}</p>
        `;
        document.getElementById('modalBody').innerHTML = details;
        document.getElementById('modalFooter').innerHTML = '';
        openModal();
    }

    function updateOrderStatus(index) {
        const order = currentAllItems.find((o, i) => o._type === 'order' && o._originalIndex === parseInt(index));
        if (!order) return;

        document.getElementById('modalTitle').textContent = 'Update Order Status';
        const currentStatus = order.status || 'pending';
        const orderId = order.id || order.order_number;
        const customerName = order.customer_name || (order.customer ? order.customer.name : 'N/A');
        const body = `
            <p><strong>Order ID:</strong> ${escapeHtml(String(orderId))}</p>
            <p><strong>Customer:</strong> ${escapeHtml(customerName)}</p>
            <div class="form-group">
                <label for="statusSelect">Status:</label>
                <select id="statusSelect" class="form-control">
                    <option value="pending" ${currentStatus === 'pending' ? 'selected' : ''}>Pending</option>
                    <option value="shipped" ${currentStatus === 'shipped' ? 'selected' : ''}>Shipped</option>
                    <option value="delivered" ${currentStatus === 'delivered' ? 'selected' : ''}>Delivered</option>
                    <option value="cancelled" ${currentStatus === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                </select>
            </div>
        `;
        document.getElementById('modalBody').innerHTML = body;

        const footer = `
            <button class="btn" id="saveStatusBtn">Save</button>
        `;
        document.getElementById('modalFooter').innerHTML = footer;

        document.getElementById('saveStatusBtn').addEventListener('click', () => {
            const newStatus = document.getElementById('statusSelect').value;
            
            if (!window.SupabaseDB || !order.id) {
                console.error('Supabase not available or order ID missing');
                closeModal();
                return;
            }

            window.SupabaseDB.waitForReady().then(() => {
                window.SupabaseDB.update('orders', order.id, { status: newStatus }).then(({ error }) => {
                    if (error) {
                        console.error('Failed to update order status in Supabase:', error);
                        alert('Failed to update order status. Please try again.');
                    } else {
                        loadOrders();
                        closeModal();
                    }
                });
            }).catch((err) => {
                console.error('Supabase error:', err);
                alert('Failed to connect to Supabase. Please try again.');
            });
        });

        openModal();
    }

    function updateInquiryStatus(index) {
        const inquiry = currentAllItems.find((i, idx) => i._type === 'inquiry' && i._originalIndex === parseInt(index));
        if (!inquiry) return;

        document.getElementById('modalTitle').textContent = 'Update Inquiry Status';
        const currentStatus = inquiry.status || 'pending';
        const body = `
            <p><strong>Inquiry From:</strong> ${escapeHtml(inquiry.name || inquiry.full_name)}</p>
            <p><strong>Product:</strong> ${escapeHtml(inquiry.product || inquiry.product_interest)}</p>
            <div class="form-group">
                <label for="statusSelect">Status:</label>
                <select id="statusSelect" class="form-control">
                    <option value="pending" ${currentStatus === 'pending' ? 'selected' : ''}>Pending</option>
                    <option value="reviewed" ${currentStatus === 'reviewed' ? 'selected' : ''}>Reviewed</option>
                    <option value="completed" ${currentStatus === 'completed' ? 'selected' : ''}>Completed</option>
                </select>
            </div>
        `;
        document.getElementById('modalBody').innerHTML = body;

        const footer = `
            <button class="btn" id="saveStatusBtn">Save</button>
        `;
        document.getElementById('modalFooter').innerHTML = footer;

        document.getElementById('saveStatusBtn').addEventListener('click', () => {
            const newStatus = document.getElementById('statusSelect').value;
            
            if (!window.SupabaseDB || !inquiry.id) {
                console.error('Supabase not available or inquiry ID missing');
                closeModal();
                return;
            }

            window.SupabaseDB.waitForReady().then(() => {
                window.SupabaseDB.update('inquiries', inquiry.id, { status: newStatus }).then(({ error }) => {
                    if (error) {
                        console.error('Failed to update inquiry status in Supabase:', error);
                        alert('Failed to update inquiry status. Please try again.');
                    } else {
                        loadOrders();
                        closeModal();
                    }
                });
            }).catch((err) => {
                console.error('Supabase error:', err);
                alert('Failed to connect to Supabase. Please try again.');
            });
        });
        openModal();
    }

    function deleteOrder(index) {
        const order = currentAllItems.find((o, i) => o._type === 'order' && o._originalIndex === parseInt(index));
        if (!order || order._type === 'inquiry') return;

        if (confirm(`Are you sure you want to delete this order?`)) {
            if (!window.SupabaseDB || !order.id) {
                console.error('Supabase not available or order ID missing');
                alert('Cannot delete order - Supabase unavailable');
                return;
            }

            window.SupabaseDB.waitForReady().then(() => {
                window.SupabaseDB.delete('orders', order.id).then(({ error }) => {
                    if (error) {
                        console.error('Failed to delete order from Supabase:', error);
                        alert('Failed to delete order. Please try again.');
                    } else {
                        loadOrders();
                    }
                });
            }).catch((err) => {
                console.error('Supabase error:', err);
                alert('Failed to connect to Supabase. Please try again.');
            });
        }
    }

    function deleteInquiry(index) {
        const inquiry = currentAllItems.find((i, idx) => i._type === 'inquiry' && i._originalIndex === parseInt(index));
        if (!inquiry || inquiry._type !== 'inquiry') return;

        if (confirm(`Are you sure you want to delete this inquiry?`)) {
            if (!window.SupabaseDB || !inquiry.id) {
                console.error('Supabase not available or inquiry ID missing');
                alert('Cannot delete inquiry - Supabase unavailable');
                return;
            }

            window.SupabaseDB.waitForReady().then(() => {
                window.SupabaseDB.delete('inquiries', inquiry.id).then(({ error }) => {
                    if (error) {
                        console.error('Failed to delete inquiry from Supabase:', error);
                        alert('Failed to delete inquiry. Please try again.');
                    } else {
                        loadOrders();
                    }
                });
            }).catch((err) => {
                console.error('Supabase error:', err);
                alert('Failed to connect to Supabase. Please try again.');
            });
        }
    }

    function exportToCSV() {
        if (!currentAllItems || currentAllItems.length === 0) {
            alert("No data to export.");
            return;
        }

        const headers = ["Date", "Type", "Name", "Email", "Phone", "Company/Address", "Product/Items", "Quantity/Amount", "Status"];
        const csvRows = [headers.join(",")];

        currentAllItems.forEach(item => {
            const dateStr = item.created_at || item.timestamp;
            const date = dateStr ? new Date(dateStr).toLocaleDateString() : 'N/A';
            const type = item._type === 'inquiry' ? 'Inquiry' : 'Order';
            
            let name, email, phone, address, products, quantity, status;

            if (item._type === 'inquiry') {
                name = item.full_name || item.name || '';
                email = item.email || '';
                phone = item.phone || '';
                address = `${item.company || ''} ${item.country ? '(' + item.country + ')' : ''}`.trim();
                products = item.product || item.product_interest || '';
                quantity = item.quantity || '';
                status = item.status || 'pending';
            } else {
                name = item.customer_name || (item.customer ? item.customer.name : '') || '';
                email = item.customer_email || (item.customer ? item.customer.email : '') || '';
                phone = item.customer_phone || ''; 
                address = item.shipping_address || (item.customer ? item.customer.address : '') || '';
                
                if (item.product_name) {
                    products = item.product_name;
                } else {
                    products = item.items ? item.items.map(i => `${i.name} (x${i.quantity})`).join('; ') : '';
                }

                const total = item.total_amount !== undefined ? parseFloat(item.total_amount) : (item.items ? item.items.reduce((acc, i) => acc + (i.price * i.quantity), 0) : 0);
                quantity = `₹${total.toFixed(2)}`;
                status = item.status || 'pending';
            }

            const row = [date, type, name, email, phone, address, products, quantity, status].map(field => {
                const stringField = String(field || '');
                return `"${stringField.replace(/"/g, '""')}"`;
            });
            csvRows.push(row.join(","));
        });

        const csvContent = csvRows.join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `export_data_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function printInvoice(order) {
        const printWindow = window.open('', '_blank');
        
        // Handle both flat structure (from Supabase) and nested structure (legacy)
        const customerName = order.customer_name || (order.customer ? order.customer.name : 'Unknown');
        const customerEmail = order.customer_email || (order.customer ? order.customer.email : 'Unknown');
        const customerAddress = order.shipping_address || (order.customer ? order.customer.address : 'Unknown');
        const orderId = order.id || order.order_number;
        const total = order.total_amount || (order.items ? order.items.reduce((acc, item) => acc + (item.price * item.quantity), 0) : 0);
        const date = new Date(order.created_at || order.timestamp).toLocaleDateString();
        
        // Build items HTML
        let itemsHtml = '';
        if (order.items && Array.isArray(order.items)) {
            itemsHtml = order.items.map(item => `
                <tr>
                    <td>${escapeHtml(item.name)}</td>
                    <td>${item.quantity}</td>
                    <td>₹${item.price}</td>
                    <td>₹${(item.price * item.quantity).toFixed(2)}</td>
                </tr>
            `).join('');
        } else if (order.product_name) {
            // Flat structure - create a simple item row
            const quantity = order.quantity || 1;
            const unitPrice = order.unit_price || 0;
            itemsHtml = `
                <tr>
                    <td>${escapeHtml(order.product_name)}</td>
                    <td>${quantity}</td>
                    <td>₹${unitPrice}</td>
                    <td>₹${(unitPrice * quantity).toFixed(2)}</td>
                </tr>
            `;
        }
        
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Invoice #${orderId}</title>
                <style>
                    body { font-family: 'Inter', sans-serif; padding: 40px; color: #333; max-width: 800px; margin: 0 auto; }
                    .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
                    .logo { font-size: 24px; font-weight: bold; color: #2E7D32; margin-bottom: 5px; }
                    .invoice-info { display: flex; justify-content: space-between; margin-bottom: 40px; }
                    .customer-info, .order-info { width: 48%; }
                    h3 { color: #2E7D32; margin-bottom: 10px; font-size: 1.1rem; }
                    p { margin: 5px 0; font-size: 0.95rem; line-height: 1.5; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
                    th { background-color: #f9f9f9; font-weight: 600; color: #2E7D32; }
                    .total { text-align: right; font-size: 1.2rem; font-weight: bold; color: #2E7D32; margin-top: 20px; }
                    .footer { margin-top: 60px; text-align: center; font-size: 0.85rem; color: #666; border-top: 1px solid #eee; padding-top: 20px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="logo">ZERO DEFECT EXPORT</div>
                    <p>Premium Agricultural Export Solutions</p>
                    <p style="font-size: 0.9rem; margin-top: 5px;">GSTIN: 33AACCZ8905E1ZC</p>
                </div>
                
                <div class="invoice-info">
                    <div class="customer-info">
                        <h3>Bill To:</h3>
                        <p><strong>${escapeHtml(customerName)}</strong></p>
                        <p>${escapeHtml(customerEmail)}</p>
                        <p>${escapeHtml(customerAddress).replace(/\n/g, '<br>')}</p>
                    </div>
                    <div class="order-info">
                        <h3>Order Details:</h3>
                        <p><strong>Order ID:</strong> #${orderId}</p>
                        <p><strong>Date:</strong> ${date}</p>
                        <p><strong>Status:</strong> ${(order.status || 'pending').toUpperCase()}</p>
                    </div>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th>Quantity</th>
                            <th>Price</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                </table>
                
                <div class="total">
                    Total Amount: ₹${parseFloat(total).toFixed(2)}
                </div>
                
                <div class="footer">
                    <p>Thank you for your business!</p>
                    <p>Zero Defect Export & Manufacturing | India</p>
                    <p>Contact: zerodefectexportme@gmail.com</p>
                </div>
                
                <script>
                    window.onload = function() { window.print(); }
                </script>
            </body>
            </html>
        `;
        
        printWindow.document.write(html);
        printWindow.document.close();
    }
});
