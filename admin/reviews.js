document.addEventListener('DOMContentLoaded', function() {

    // Pagination & Search state
    let currentPage = 1;
    const itemsPerPage = 10;
    let currentSearchQuery = '';
    let allReviews = [];
    let autoRefreshInterval = null;

    // Load reviews
    loadReviews();

    // Auto-refresh every 5 seconds
    autoRefreshInterval = setInterval(loadReviews, 5000);

    // Listen for real-time updates from notifications.js
    window.addEventListener('reviewsUpdated', loadReviews);

    // Event Listeners
    document.getElementById('closeModalBtn').addEventListener('click', closeModal);
    document.getElementById('reviewForm').addEventListener('submit', handleReviewSubmit);
    document.getElementById('reviewSearchInput').addEventListener('input', (e) => {
        currentSearchQuery = e.target.value.toLowerCase();
        currentPage = 1;
        renderTable();
    });
    document.getElementById('prevPageBtn').addEventListener('click', () => changePage(-1));
    document.getElementById('nextPageBtn').addEventListener('click', () => changePage(1));
    document.getElementById('closeReplyModalBtn').addEventListener('click', closeReplyModal);
    document.getElementById('replyForm').addEventListener('submit', handleReplySubmit);

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        if (autoRefreshInterval) clearInterval(autoRefreshInterval);
    });

    function loadReviews() {
        // Load from Supabase
        if (window.SupabaseDB) {
            window.SupabaseDB.waitForReady().then(() => {
                window.SupabaseDB.fetchAll('reviews').then(({ data, error }) => {
                    if (error) {
                        console.warn('Failed to load reviews from Supabase, using localStorage:', error);
                        allReviews = JSON.parse(localStorage.getItem('zeroDefectReviews') || '[]');
                    } else {
                        allReviews = data || [];
                    }
                    renderTable();
                });
            });
        } else {
            allReviews = JSON.parse(localStorage.getItem('zeroDefectReviews') || '[]');
            renderTable();
        }
    }

    function renderTable() {
        const tableBody = document.getElementById('reviewsBody');
        const paginationControls = document.getElementById('paginationControls');
        tableBody.innerHTML = '';

        // Filter
        let filteredReviews = allReviews.map((r, i) => ({...r, _originalIndex: i}));
        if (currentSearchQuery) {
            filteredReviews = filteredReviews.filter(r => 
                r.name.toLowerCase().includes(currentSearchQuery) || 
                r.message.toLowerCase().includes(currentSearchQuery)
            );
        }

        // Pagination
        const totalPages = Math.ceil(filteredReviews.length / itemsPerPage) || 1;
        if (currentPage > totalPages) currentPage = totalPages;
        
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const pageItems = filteredReviews.slice(startIndex, endIndex);

        if (pageItems.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px;">No reviews found.</td></tr>';
            paginationControls.style.display = 'none';
            return;
        }
        
        paginationControls.style.display = 'flex';
        document.getElementById('pageInfo').textContent = `Page ${currentPage} of ${totalPages}`;
        document.getElementById('prevPageBtn').disabled = currentPage === 1;
        document.getElementById('nextPageBtn').disabled = currentPage === totalPages;

        pageItems.forEach((review) => {
            const row = document.createElement('tr');
            const index = review._originalIndex;
            const date = new Date(review.date || review.created_at).toLocaleDateString();
            const statusBadge = review.approved || review.is_approved
                ? '<span class="status-badge status-completed">Approved</span>' 
                : '<span class="status-badge status-pending">Pending</span>';
            const toggleIcon = (review.approved || review.is_approved) ? 'fa-times' : 'fa-check';
            const toggleTitle = (review.approved || review.is_approved) ? 'Reject' : 'Approve';
            const toggleColor = (review.approved || review.is_approved) ? '#e74c3c' : '#4CAF50';
            
            // Use reviewer_name from Supabase, fallback to name for localStorage
            const reviewerName = review.reviewer_name || review.name || 'Anonymous';
            const reviewText = review.review_text || review.message || '';
            
            row.innerHTML = `
                <td>${date}</td>
                <td><strong>${escapeHtml(reviewerName)}</strong></td>
                <td><span style="color: #FFC107;">${review.rating} <i class="fas fa-star"></i></span></td>
                <td>${escapeHtml(reviewText)}</td>
                <td>${statusBadge}</td>
                <td>
                    <div style="display: flex; gap: 15px; align-items: center;">
                        <button class="action-btn toggle-status-btn" data-index="${index}" title="${toggleTitle}" style="color: ${toggleColor}; margin: 0;">
                            <i class="fas ${toggleIcon}"></i>
                        </button>
                        <button class="action-btn reply-btn" data-index="${index}" title="Reply" style="color: var(--color-earth); margin: 0;">
                            <i class="fas fa-reply"></i>
                        </button>
                        <button class="action-btn edit-btn" data-index="${index}" title="Edit" style="margin: 0;">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete-btn" data-index="${index}" title="Delete" style="color: #e74c3c; margin: 0;">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }

    // Handle Edit and Delete clicks
    document.getElementById('reviewsBody').addEventListener('click', function(e) {
        if (e.target.closest('.toggle-status-btn')) {
            const index = e.target.closest('.toggle-status-btn').dataset.index;
            toggleReviewStatus(index);
        }
        if (e.target.closest('.reply-btn')) {
            const index = e.target.closest('.reply-btn').dataset.index;
            openReplyModal(index);
        }
        if (e.target.closest('.edit-btn')) {
            const index = e.target.closest('.edit-btn').dataset.index;
            openEditModal(index);
        }
        if (e.target.closest('.delete-btn')) {
            const index = e.target.closest('.delete-btn').dataset.index;
            deleteReview(index);
        }
    });

    function toggleReviewStatus(index) {
        const review = allReviews[index];
        
        // Handle both 'approved' (local) and 'is_approved' (Supabase) properties
        const currentStatus = review.approved === true || review.is_approved === true;
        const newStatus = !currentStatus;
        
        // Update local state immediately for UI
        review.approved = newStatus;
        review.is_approved = newStatus;
        
        if (window.SupabaseDB && review.id) {
            window.SupabaseDB.waitForReady().then(() => {
                window.SupabaseDB.update('reviews', review.id, { is_approved: newStatus }).then(({ error }) => {
                    if (error) {
                        console.error('Failed to update review status in Supabase:', error);
                        // Revert on error
                        review.approved = currentStatus;
                        review.is_approved = currentStatus;
                        renderTable();
                    } else {
                        loadReviews();
                    }
                });
            });
        } else {
            localStorage.setItem('zeroDefectReviews', JSON.stringify(allReviews));
            loadReviews();
        }
    }

    function openEditModal(index) {
        const review = allReviews[index];

        document.getElementById('modalTitle').textContent = 'Edit Review';
        document.getElementById('reviewId').value = index;
        document.getElementById('reviewName').value = review.name;
        document.getElementById('reviewRating').value = review.rating;
        document.getElementById('reviewMessage').value = review.message;

        document.getElementById('reviewModal').style.display = 'block';
    }

    function openReplyModal(index) {
        const review = allReviews[index];
        
        document.getElementById('replyReviewId').value = index;
        document.getElementById('replyCustomerName').textContent = review.name;
        document.getElementById('replyCustomerMessage').textContent = review.message;
        document.getElementById('replyMessage').value = review.reply || '';
        
        document.getElementById('replyModal').style.display = 'block';
    }

    function handleReplySubmit(e) {
        e.preventDefault();
        const index = document.getElementById('replyReviewId').value;
        const reply = document.getElementById('replyMessage').value;
        
        if (index !== '' && allReviews[index]) {
            const review = allReviews[index];
            review.reply = reply;
            
            if (window.SupabaseDB && review.id) {
                window.SupabaseDB.waitForReady().then(() => {
                    window.SupabaseDB.update('reviews', review.id, { admin_reply: reply }).then(({ error }) => {
                        if (error) {
                            console.error('Failed to save reply in Supabase:', error);
                            localStorage.setItem('zeroDefectReviews', JSON.stringify(allReviews));
                        } else {
                            console.log('Reply saved successfully');
                        }
                        closeReplyModal();
                        loadReviews();
                    });
                });
            } else {
                localStorage.setItem('zeroDefectReviews', JSON.stringify(allReviews));
                closeReplyModal();
                loadReviews();
            }
        }
    }

    function closeReplyModal() {
        document.getElementById('replyModal').style.display = 'none';
    }

    function handleReviewSubmit(e) {
        e.preventDefault();
        
        const index = document.getElementById('reviewId').value;
        
        if (index !== '' && allReviews[index]) {
            const review = allReviews[index];
            review.name = document.getElementById('reviewName').value;
            review.rating = parseFloat(document.getElementById('reviewRating').value);
            review.message = document.getElementById('reviewMessage').value;
            
            if (window.SupabaseDB && review.id) {
                window.SupabaseDB.waitForReady().then(() => {
                    window.SupabaseDB.update('reviews', review.id, {
                        reviewer_name: review.name,
                        rating: review.rating,
                        review_text: review.message
                    }).then(({ error }) => {
                        if (error) {
                            console.error('Failed to update review in Supabase:', error);
                            localStorage.setItem('zeroDefectReviews', JSON.stringify(allReviews));
                        }
                        closeModal();
                        loadReviews();
                    });
                });
            } else {
                localStorage.setItem('zeroDefectReviews', JSON.stringify(allReviews));
                closeModal();
                loadReviews();
            }
        }
    }

    function deleteReview(index) {
        if (confirm('Are you sure you want to delete this review?')) {
            const reviewToDelete = allReviews[index];
            
            if (window.SupabaseDB && reviewToDelete.id) {
                window.SupabaseDB.waitForReady().then(() => {
                    window.SupabaseDB.delete('reviews', reviewToDelete.id).then(({ error }) => {
                        if (error) {
                            console.error('Failed to delete review from Supabase:', error);
                            allReviews.splice(index, 1);
                            localStorage.setItem('zeroDefectReviews', JSON.stringify(allReviews));
                        }
                        loadReviews();
                    });
                });
            } else {
                allReviews.splice(index, 1);
                localStorage.setItem('zeroDefectReviews', JSON.stringify(allReviews));
                loadReviews();
            }
        }
    }

    function closeModal() {
        document.getElementById('reviewModal').style.display = 'none';
    }

    function escapeHtml(text) {
        if (!text) return '';
        return text.toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    function changePage(delta) {
        let filteredReviews = allReviews;
        if (currentSearchQuery) {
            filteredReviews = filteredReviews.filter(r => 
                r.name.toLowerCase().includes(currentSearchQuery) || 
                r.message.toLowerCase().includes(currentSearchQuery)
            );
        }
        const totalPages = Math.ceil(filteredReviews.length / itemsPerPage) || 1;
        const newPage = currentPage + delta;
        if (newPage >= 1 && newPage <= totalPages) {
            currentPage = newPage;
            renderTable();
        }
    }
});