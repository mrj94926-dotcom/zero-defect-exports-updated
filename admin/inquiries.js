document.addEventListener('DOMContentLoaded', function() {

    // Pagination & Search state
    let currentPage = 1;
    const itemsPerPage = 10;
    let currentSearchQuery = '';
    let allInquiries = [];
    let autoRefreshInterval = null;

    // Load inquiries
    loadInquiries();

    // Auto-refresh every 5 seconds
    autoRefreshInterval = setInterval(loadInquiries, 5000);

    // Event Listeners
    document.getElementById('inquirySearchInput').addEventListener('input', (e) => {
        currentSearchQuery = e.target.value.toLowerCase();
        currentPage = 1;
        renderTable();
    });
    document.getElementById('prevPageBtn').addEventListener('click', () => changePage(-1));
    document.getElementById('nextPageBtn').addEventListener('click', () => changePage(1));
    document.getElementById('closeModalBtn').addEventListener('click', closeModal);

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        if (autoRefreshInterval) clearInterval(autoRefreshInterval);
    });

    function loadInquiries() {
        // Load from Supabase
        if (window.SupabaseDB) {
            window.SupabaseDB.waitForReady().then(() => {
                window.SupabaseDB.fetchAll('inquiries').then(({ data, error }) => {
                    if (error) {
                        console.warn('Failed to load inquiries from Supabase, using localStorage:', error);
                        loadFromLocalStorage();
                    } else {
                        allInquiries = data || [];
                        // Sort by date descending
                        allInquiries.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                        updateDashboardCards(allInquiries);
                        renderTable();
                    }
                });
            });
        } else {
            loadFromLocalStorage();
        }
    }

    function loadFromLocalStorage() {
        const storedData = localStorage.getItem('zeroDefectExportData');
        if (storedData) {
            try {
                const data = JSON.parse(storedData);
                allInquiries = data.inquiries || [];
                // Sort by date descending
                allInquiries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            } catch (e) {
                console.error("Error parsing export data", e);
                allInquiries = [];
            }
        }
        updateDashboardCards(allInquiries);
        renderTable();
    }

    function renderTable() {
        const tableBody = document.getElementById('inquiriesBody');
        const paginationControls = document.getElementById('paginationControls');
        tableBody.innerHTML = '';

        // Filter
        let filteredInquiries = allInquiries;
        
        if (currentSearchQuery) {
            filteredInquiries = filteredInquiries.filter(item => 
                (item.name && item.name.toLowerCase().includes(currentSearchQuery)) ||
                (item.company && item.company.toLowerCase().includes(currentSearchQuery)) ||
                (item.country && item.country.toLowerCase().includes(currentSearchQuery)) ||
                (item.product && item.product.toLowerCase().includes(currentSearchQuery))
            );
        }

        // Pagination
        const totalPages = Math.ceil(filteredInquiries.length / itemsPerPage) || 1;
        if (currentPage > totalPages) currentPage = totalPages;
        
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const pageItems = filteredInquiries.slice(startIndex, endIndex);

        if (pageItems.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding: 20px;">No inquiries found.</td></tr>';
            paginationControls.style.display = 'none';
            return;
        }

        paginationControls.style.display = 'flex';
        document.getElementById('pageInfo').textContent = `Page ${currentPage} of ${totalPages}`;
        document.getElementById('prevPageBtn').disabled = currentPage === 1;
        document.getElementById('nextPageBtn').disabled = currentPage === totalPages;

        pageItems.forEach(inquiry => {
            const row = document.createElement('tr');
            const date = new Date(inquiry.timestamp || inquiry.created_at).toLocaleDateString();
            const status = inquiry.status || 'pending';
            const statusClass = status === 'completed' ? 'status-completed' : (status === 'reviewed' ? 'status-reviewed' : 'status-pending');
            
            // Use full_name from Supabase, fallback to name for localStorage
            const inquiryName = inquiry.full_name || inquiry.name || 'N/A';
            
            row.innerHTML = `
                <td>${date}</td>
                <td><strong>${escapeHtml(inquiryName)}</strong></td>
                <td>${escapeHtml(inquiry.company || '-')}</td>
                <td>${escapeHtml(inquiry.country)}</td>
                <td>${escapeHtml(inquiry.product)}</td>
                <td>${escapeHtml(inquiry.quantity)}</td>
                <td><span class="status-badge ${statusClass}">${status.charAt(0).toUpperCase() + status.slice(1)}</span></td>
                <td>
                    <button class="action-btn view-btn" data-id="${inquiry.id}" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn update-btn" data-id="${inquiry.id}" title="Update Status">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete-btn" data-id="${inquiry.id}" title="Delete" style="color: #e74c3c;">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }

    // Handle Table Actions
    document.getElementById('inquiriesBody').addEventListener('click', function(e) {
        if (e.target.closest('.view-btn')) {
            const id = e.target.closest('.view-btn').dataset.id;
            openInquiryModal(id);
        }
        if (e.target.closest('.update-btn')) {
            const id = e.target.closest('.update-btn').dataset.id;
            openStatusModal(id);
        }
        if (e.target.closest('.delete-btn')) {
            const id = e.target.closest('.delete-btn').dataset.id;
            deleteInquiry(id);
        }
    });

    function openInquiryModal(id) {
        // Find inquiry by ID instead of index for safety
        const inquiry = allInquiries.find(i => i.id == id);
        if (!inquiry) return;

        document.getElementById('modalTitle').textContent = 'Inquiry Details';
        
        const details = `
            <p><strong>Date:</strong> ${new Date(inquiry.timestamp).toLocaleString()}</p>
            <p><strong>Name:</strong> ${escapeHtml(inquiry.name)}</p>
            <p><strong>Email:</strong> ${escapeHtml(inquiry.email)}</p>
            <p><strong>Phone:</strong> ${escapeHtml(inquiry.phone || 'N/A')}</p>
            <p><strong>Company:</strong> ${escapeHtml(inquiry.company || 'N/A')}</p>
            <p><strong>Country:</strong> ${escapeHtml(inquiry.country)}</p>
            <p><strong>City:</strong> ${escapeHtml(inquiry.city || 'N/A')}</p>
            <hr style="margin: 10px 0; border: 0; border-top: 1px solid #eee;">
            <p><strong>Product:</strong> ${escapeHtml(inquiry.product)}</p>
            <p><strong>Quantity:</strong> ${escapeHtml(inquiry.quantity)}</p>
            <p><strong>Message:</strong><br>${escapeHtml(inquiry.message || 'No additional message')}</p>
            <div class="form-group" style="margin-top: 15px;">
                <label><strong>Status:</strong></label>
                <select id="inquiryStatusSelect" class="form-control" style="margin-top: 5px;">
                    <option value="pending" ${inquiry.status === 'pending' ? 'selected' : ''}>Pending</option>
                    <option value="reviewed" ${inquiry.status === 'reviewed' ? 'selected' : ''}>Reviewed</option>
                    <option value="completed" ${inquiry.status === 'completed' ? 'selected' : ''}>Completed</option>
                </select>
            </div>
        `;
        
        document.getElementById('modalBody').innerHTML = details;
        document.getElementById('modalFooter').innerHTML = `
            <button class="btn" id="modalSaveBtn" style="background-color: var(--color-green); color: white; border: none; padding: 8px 16px; border-radius: 5px; cursor: pointer;">Save Status</button>
        `;
        
        // Bind save event dynamically
        document.getElementById('modalSaveBtn').onclick = () => saveInquiryStatus(id);
        
        document.getElementById('inquiryModal').style.display = 'block';
    }

    function openStatusModal(id) {
        const inquiry = allInquiries.find(i => i.id == id);
        if (!inquiry) return;

        document.getElementById('modalTitle').textContent = 'Update Status';
        
        const content = `
            <p><strong>Inquiry From:</strong> ${escapeHtml(inquiry.name)}</p>
            <p><strong>Product:</strong> ${escapeHtml(inquiry.product)}</p>
            <div class="form-group" style="margin-top: 15px;">
                <label><strong>New Status:</strong></label>
                <select id="inquiryStatusSelect" class="form-control" style="margin-top: 5px;">
                    <option value="pending" ${inquiry.status === 'pending' ? 'selected' : ''}>Pending</option>
                    <option value="reviewed" ${inquiry.status === 'reviewed' ? 'selected' : ''}>Reviewed</option>
                    <option value="completed" ${inquiry.status === 'completed' ? 'selected' : ''}>Completed</option>
                </select>
            </div>
        `;
        
        document.getElementById('modalBody').innerHTML = content;
        document.getElementById('modalFooter').innerHTML = `
            <button class="btn" id="modalSaveBtn" style="background-color: var(--color-green); color: white; border: none; padding: 8px 16px; border-radius: 5px; cursor: pointer;">Update Status</button>
        `;
        
        document.getElementById('modalSaveBtn').onclick = () => saveInquiryStatus(id);
        document.getElementById('inquiryModal').style.display = 'block';
    }

    function saveInquiryStatus(id) {
        const newStatus = document.getElementById('inquiryStatusSelect').value;
        const inquiry = allInquiries.find(i => i.id == id);
        
        if (inquiry) {
            inquiry.status = newStatus;
            
            if (window.SupabaseDB) {
                window.SupabaseDB.waitForReady().then(() => {
                    window.SupabaseDB.update('inquiries', id, { status: newStatus }).then(({ error }) => {
                        if (error) {
                            console.error('Failed to update inquiry status in Supabase:', error);
                            const storedData = JSON.parse(localStorage.getItem('zeroDefectExportData') || '{}');
                            if (storedData.inquiries) {
                                const idx = storedData.inquiries.findIndex(i => i.id == id);
                                if (idx !== -1) {
                                    storedData.inquiries[idx].status = newStatus;
                                    localStorage.setItem('zeroDefectExportData', JSON.stringify(storedData));
                                }
                            }
                        }
                        closeModal();
                        loadInquiries();
                    });
                });
            } else {
                const storedData = JSON.parse(localStorage.getItem('zeroDefectExportData') || '{}');
                if (storedData.inquiries) {
                    const idx = storedData.inquiries.findIndex(i => i.id == id);
                    if (idx !== -1) {
                        storedData.inquiries[idx].status = newStatus;
                        localStorage.setItem('zeroDefectExportData', JSON.stringify(storedData));
                    }
                }
                closeModal();
                loadInquiries();
            }
        }
    }

    function deleteInquiry(id) {
        if (confirm('Are you sure you want to delete this inquiry?')) {
            if (window.SupabaseDB) {
                window.SupabaseDB.waitForReady().then(() => {
                    window.SupabaseDB.delete('inquiries', id).then(({ error }) => {
                        if (error) {
                            console.error('Failed to delete inquiry from Supabase:', error);
                            const storedData = JSON.parse(localStorage.getItem('zeroDefectExportData') || '{}');
                            if (storedData.inquiries) {
                                const index = storedData.inquiries.findIndex(i => i.id == id);
                                if (index !== -1) {
                                    storedData.inquiries.splice(index, 1);
                                    localStorage.setItem('zeroDefectExportData', JSON.stringify(storedData));
                                }
                            }
                        }
                        loadInquiries();
                    });
                });
            } else {
                const storedData = JSON.parse(localStorage.getItem('zeroDefectExportData') || '{}');
                if (storedData.inquiries) {
                    const index = storedData.inquiries.findIndex(i => i.id == id);
                    if (index !== -1) {
                        storedData.inquiries.splice(index, 1);
                        localStorage.setItem('zeroDefectExportData', JSON.stringify(storedData));
                    }
                }
                loadInquiries();
            }
        }
    }

    function closeModal() {
        document.getElementById('inquiryModal').style.display = 'none';
    }

    function changePage(delta) {
        currentPage += delta;
        renderTable();
    }

    function escapeHtml(text) {
        if (!text) return '';
        return text.toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    function updateDashboardCards(inquiries) {
        if (!document.getElementById('totalInquiries')) return;
        
        document.getElementById('totalInquiries').textContent = inquiries.length;
        document.getElementById('pendingInquiries').textContent = inquiries.filter(i => i.status === 'pending').length;
        document.getElementById('reviewedInquiries').textContent = inquiries.filter(i => i.status === 'reviewed').length;
        document.getElementById('completedInquiries').textContent = inquiries.filter(i => i.status === 'completed').length;
    }
});