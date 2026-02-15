document.addEventListener('DOMContentLoaded', function() {

    // Sort state
    let currentSortField = null;
    let currentSortDirection = 'desc';
    
    // Pagination & Filter state
    let currentPage = 1;
    const itemsPerPage = 10;
    let currentCategoryFilter = 'all';
    let allProducts = [];
    let currentSearchQuery = '';
    let autoRefreshInterval = null;

    // Load products
    loadProducts();

    // Auto-refresh every 5 seconds to catch external changes
    autoRefreshInterval = setInterval(loadProducts, 5000);

    // Event Listeners
    document.getElementById('addProductBtn').addEventListener('click', openAddModal);
    document.getElementById('closeModalBtn').addEventListener('click', closeModal);
    document.getElementById('productForm').addEventListener('submit', handleProductSubmit);
    document.getElementById('sortStockHeader').addEventListener('click', toggleStockSort);
    document.getElementById('productSearchInput').addEventListener('input', (e) => {
        currentSearchQuery = e.target.value.toLowerCase();
        currentPage = 1;
        renderTable();
    });
    document.getElementById('selectAllProducts').addEventListener('change', toggleSelectAll);
    document.getElementById('bulkDeleteBtn').addEventListener('click', bulkDeleteProducts);
    
    document.getElementById('categoryFilter').addEventListener('change', (e) => {
        currentCategoryFilter = e.target.value;
        currentPage = 1;
        renderTable();
    });
    document.getElementById('prevPageBtn').addEventListener('click', () => changePage(-1));
    document.getElementById('nextPageBtn').addEventListener('click', () => changePage(1));

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        if (autoRefreshInterval) clearInterval(autoRefreshInterval);
    });
    
    // Drag and Drop Logic
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('productImage');

    dropZone.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) processFile(e.target.files[0]);
    });

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drop-zone--over');
    });

    ['dragleave', 'dragend'].forEach(type => {
        dropZone.addEventListener(type, () => dropZone.classList.remove('drop-zone--over'));
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drop-zone--over');
        if (e.dataTransfer.files.length) {
            fileInput.files = e.dataTransfer.files; // Update input files
            processFile(e.dataTransfer.files[0]);
        }
    });
    
    // Cropper variables
    let cropper = null;
    document.getElementById('closeCropBtn').addEventListener('click', closeCropModal);
    document.getElementById('cropSaveBtn').addEventListener('click', saveCrop);

    function loadProducts() {
        let products = JSON.parse(localStorage.getItem('zeroDefectProducts') || '[]');

        // If no products in storage, initialize defaults (same as script.js)
        if (products.length === 0) {
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
                { id: 10, name: 'Black Pepper', subtitle: 'King of Spices', price: 450, category: 'spices', subCategory: 'whole', image: 'https://placehold.co/400x300?text=Black+Pepper', images: ['https://placehold.co/400x300?text=Black+Pepper'], isBestSeller: true, stock: 200, isNew: false },
                { id: 11, name: 'Cardamom', subtitle: 'Queen of Spices', price: 1200, category: 'spices', subCategory: 'whole', image: 'https://placehold.co/400x300?text=Cardamom', images: ['https://placehold.co/400x300?text=Cardamom'], isBestSeller: false, stock: 100, isNew: true },
                { id: 12, name: 'Desiccated Coconut', subtitle: 'High Fat Powder', price: 180, category: 'coconut', subCategory: 'desiccated', image: 'https://placehold.co/400x300?text=Desiccated+Coconut', images: ['https://placehold.co/400x300?text=Desiccated+Coconut'], isBestSeller: false, stock: 500, isNew: false },
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
            products = defaultProducts;
            localStorage.setItem('zeroDefectProducts', JSON.stringify(products));
        }

        allProducts = products;
        renderTable();

        // Sync with Supabase
        syncWithSupabase();
    }

    // Helper to convert snake_case to camelCase
    function denormalizeProduct(p) {
        return {
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
            images: [p.image]
        };
    }

    async function syncWithSupabase() {
        if (!window.supabaseClient) return;
        try {
            const { data, error } = await window.supabaseClient.from('products').select('*');
            if (!error && data && data.length > 0) {
                // Convert snake_case from database to camelCase
                allProducts = data.map(denormalizeProduct);
                localStorage.setItem('zeroDefectProducts', JSON.stringify(allProducts));
                renderTable();
            }
        } catch (e) { console.warn('Supabase sync failed'); }
    }

    function renderTable() {
        const tableBody = document.getElementById('productsBody');
        const paginationControls = document.getElementById('paginationControls');
        tableBody.innerHTML = '';

        // Map to preserve original index for editing/deleting
        let displayProducts = allProducts.map((p, index) => ({...p, _originalIndex: index}));

        // Apply Filter
        if (currentCategoryFilter !== 'all') {
            displayProducts = displayProducts.filter(p => p.category === currentCategoryFilter);
        }
        
        // Apply Search
        if (currentSearchQuery) {
            displayProducts = displayProducts.filter(p => 
                p.name.toLowerCase().includes(currentSearchQuery) || 
                p.subtitle.toLowerCase().includes(currentSearchQuery)
            );
        }

        // Apply sorting
        if (currentSortField === 'stock') {
            displayProducts.sort((a, b) => {
                const valA = a.stock || 0;
                const valB = b.stock || 0;
                return currentSortDirection === 'asc' ? valA - valB : valB - valA;
            });
        }

        // Pagination Logic
        const totalPages = Math.ceil(displayProducts.length / itemsPerPage) || 1;
        if (currentPage > totalPages) currentPage = totalPages;
        
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const pageItems = displayProducts.slice(startIndex, endIndex);

        // Render Rows
        pageItems.forEach((product) => {
            const row = document.createElement('tr');
            const index = product._originalIndex;
            
            row.innerHTML = `
                <td><input type="checkbox" class="product-checkbox" data-index="${index}"></td>
                <td><img src="${product.image || 'https://placehold.co/50x50?text=No+Img'}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px;"></td>
                <td>
                    <strong>${escapeHtml(product.name)}</strong>
                    ${product.isBestSeller ? '<span class="status-badge status-reviewed" style="font-size: 0.7rem; margin-left: 5px; background-color: #FFF3E0; color: #E65100;">Best Seller</span>' : ''}
                </td>
                <td>${escapeHtml(product.subtitle)}</td>
                <td><span class="status-badge status-completed">${product.category}</span></td>
                <td>${product.stock || 0}</td>
                <td>₹${product.price}</td>
                <td>
                    <button class="action-btn restock-btn" data-index="${index}" title="Quick Restock">
                        <i class="fas fa-plus-circle"></i>
                    </button>
                    <button class="action-btn edit-btn" data-index="${index}" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete-btn" data-index="${index}" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });
        
        // Reset select all checkbox
        document.getElementById('selectAllProducts').checked = false;
        updateBulkDeleteButton();

        // Update Pagination UI
        if (displayProducts.length > 0) {
            paginationControls.style.display = 'flex';
            document.getElementById('pageInfo').textContent = `Page ${currentPage} of ${totalPages}`;
            document.getElementById('prevPageBtn').disabled = currentPage === 1;
            document.getElementById('nextPageBtn').disabled = currentPage === totalPages;
        } else {
            paginationControls.style.display = 'none';
        }
    }

    // Handle Edit and Delete clicks
    document.getElementById('productsBody').addEventListener('click', function(e) {
        if (e.target.closest('.edit-btn')) {
            const index = e.target.closest('.edit-btn').dataset.index;
            openEditModal(index);
        }
        if (e.target.closest('.delete-btn')) {
            const index = e.target.closest('.delete-btn').dataset.index;
            deleteProduct(index);
        }
        if (e.target.closest('.restock-btn')) {
            const index = e.target.closest('.restock-btn').dataset.index;
            restockProduct(index);
        }
        if (e.target.classList.contains('product-checkbox')) {
            updateBulkDeleteButton();
        }
    });
    
    function toggleSelectAll(e) {
        const checkboxes = document.querySelectorAll('.product-checkbox');
        checkboxes.forEach(cb => cb.checked = e.target.checked);
        updateBulkDeleteButton();
    }
    
    function updateBulkDeleteButton() {
        const selectedCount = document.querySelectorAll('.product-checkbox:checked').length;
        const btn = document.getElementById('bulkDeleteBtn');
        if (selectedCount > 0) {
            btn.style.display = 'flex';
            btn.innerHTML = `<i class="fas fa-trash"></i> Delete (${selectedCount})`;
        } else {
            btn.style.display = 'none';
        }
    }
    
    async function bulkDeleteProducts() {
        const selectedCheckboxes = document.querySelectorAll('.product-checkbox:checked');
        if (selectedCheckboxes.length === 0) return;
        
        if (confirm(`Are you sure you want to delete ${selectedCheckboxes.length} products?`)) {
            const products = JSON.parse(localStorage.getItem('zeroDefectProducts'));
            // Get indices to delete (sort descending to avoid index shifting issues)
            const indicesToDelete = Array.from(selectedCheckboxes)
                .map(cb => parseInt(cb.dataset.index))
                .sort((a, b) => b - a);
            
            // Supabase Delete (Try first)
            if (window.supabaseClient) {
                try {
                    const idsToDelete = indicesToDelete.map(index => products[index].id);
                    // Delete each product individually to avoid RLS issues with .in()
                    for (const id of idsToDelete) {
                        const { error } = await window.supabaseClient.from('products').delete().eq('id', id);
                        if (error) throw error;
                    }
                    console.log('Deleted products from Supabase:', idsToDelete);
                } catch (err) {
                    console.warn('Supabase bulk delete failed, falling back to local storage:', err);
                }
            }
                
            indicesToDelete.forEach(index => products.splice(index, 1));
            
            localStorage.setItem('zeroDefectProducts', JSON.stringify(products));
            loadProducts();
        }
    }

    async function restockProduct(index) {
        const quantity = prompt("Enter quantity to add to stock:");
        if (quantity && !isNaN(quantity) && Number(quantity) > 0) {
            const products = JSON.parse(localStorage.getItem('zeroDefectProducts'));
            products[index].stock = (products[index].stock || 0) + Number(quantity);
            
            // Supabase Update (Try first)
            if (window.supabaseClient) {
                try {
                    const { error } = await window.supabaseClient
                        .from('products')
                        .update({ stock: products[index].stock })
                        .eq('id', products[index].id);
                    if (error) throw error;
                    console.log('Product restocked in Supabase:', products[index].id);
                } catch (err) {
                    console.warn('Supabase restock failed, falling back to local storage:', err);
                }
            }

            localStorage.setItem('zeroDefectProducts', JSON.stringify(products));
            loadProducts();
        }
    }

    function openAddModal() {
        document.getElementById('modalTitle').textContent = 'Add Product';
        document.getElementById('productForm').reset();
        document.getElementById('productId').value = '';
        document.getElementById('existingImage').value = '';
        document.getElementById('imagePreviewContainer').style.display = 'none';
        document.getElementById('productStock').value = '';
        document.getElementById('productSubCategory').value = '';
        document.getElementById('productBestSeller').checked = false;
        document.getElementById('productNewArrival').checked = false;
        document.getElementById('productModal').style.display = 'block';
    }

    function openEditModal(index) {
        const products = JSON.parse(localStorage.getItem('zeroDefectProducts'));
        const product = products[index];

        document.getElementById('modalTitle').textContent = 'Edit Product';
        document.getElementById('productId').value = index; // Use index as ID for simplicity in this context
        document.getElementById('productName').value = product.name;
        document.getElementById('productSubtitle').value = product.subtitle;
        document.getElementById('productCategory').value = product.category;
        document.getElementById('productPrice').value = product.price;
        document.getElementById('productStock').value = product.stock || 0;
        document.getElementById('productSubCategory').value = product.subCategory || '';
        document.getElementById('productBestSeller').checked = product.isBestSeller || false;
        document.getElementById('productNewArrival').checked = product.isNew || false;
        
        // Handle image preview
        const imagePreview = document.getElementById('imagePreview');
        const previewContainer = document.getElementById('imagePreviewContainer');
        const existingImage = document.getElementById('existingImage');
        
        if (product.image) {
            imagePreview.src = product.image;
            existingImage.value = product.image;
            previewContainer.style.display = 'block';
        } else {
            existingImage.value = '';
            previewContainer.style.display = 'none';
        }

        document.getElementById('productModal').style.display = 'block';
    }

    async function handleProductSubmit(e) {
        e.preventDefault();
        
        const index = document.getElementById('productId').value;
        const products = JSON.parse(localStorage.getItem('zeroDefectProducts') || '[]');
        const fileInput = document.getElementById('productImage');
        let imageData = document.getElementById('existingImage').value;

        // Process new image if selected
        if (fileInput.files && fileInput.files[0]) {
            try {
                imageData = await readFileAsBase64(fileInput.files[0]);
            } catch (err) {
                alert('Error reading image file');
                return;
            }
        }
        
        const isEdit = index !== '';
        const currentId = isEdit ? products[index].id : Date.now();

        const newProduct = {
            id: currentId,
            name: document.getElementById('productName').value,
            subtitle: document.getElementById('productSubtitle').value,
            category: document.getElementById('productCategory').value,
            price: Number(document.getElementById('productPrice').value),
            stock: Number(document.getElementById('productStock').value),
            image: imageData || 'https://placehold.co/400x300?text=No+Image',
            isBestSeller: document.getElementById('productBestSeller').checked,
            subCategory: document.getElementById('productSubCategory').value,
            isNew: document.getElementById('productNewArrival').checked
        };

        if (isEdit) {
            // Update existing
            // Preserve gallery images if they exist
            if (products[index].images) {
                newProduct.images = products[index].images;
            }
        } else {
            // Add new
            newProduct.images = [newProduct.image];
        }

        // Sanitize for Supabase (convert to snake_case)
        const sanitizedProduct = {
            id: newProduct.id,
            name: newProduct.name,
            subtitle: newProduct.subtitle,
            category: newProduct.category,
            price: newProduct.price,
            stock: newProduct.stock,
            image: newProduct.image,
            is_best_seller: newProduct.isBestSeller,
            sub_category: newProduct.subCategory || null,
            is_new: newProduct.isNew || false
        };

        // Supabase Write (Try first)
        if (window.supabaseClient) {
            try {
                let error;
                if (isEdit) {
                    const { error: updateError } = await window.supabaseClient.from('products').update(sanitizedProduct).eq('id', currentId);
                    error = updateError;
                    if (!error) console.log('Product updated in Supabase:', currentId);
                } else {
                    const { error: insertError } = await window.supabaseClient.from('products').insert([sanitizedProduct]);
                    error = insertError;
                    if (!error) console.log('Product inserted to Supabase:', currentId);
                }
                if (error) throw error;
            } catch (err) { 
                console.warn('Supabase write failed, falling back to local storage:', err); 
            }
        }

        // Local Storage Sync (Always runs)
        if (isEdit) {
            products[index] = newProduct;
        } else {
            products.push(newProduct);
        }
        
        localStorage.setItem('zeroDefectProducts', JSON.stringify(products));
        closeModal();
        loadProducts();
    }

    function processFile(file) {
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                // Open crop modal instead of direct preview
                openCropModal(e.target.result);
            }
            reader.readAsDataURL(file);
        }
    }

    function openCropModal(imageSrc) {
        const cropModal = document.getElementById('cropModal');
        const image = document.getElementById('cropImageTarget');
        
        image.src = imageSrc;
        cropModal.style.display = 'block';
        
        // Initialize cropper
        if (cropper) {
            cropper.destroy();
        }
        
        cropper = new Cropper(image, {
            aspectRatio: 4 / 3, // Standard product aspect ratio
            viewMode: 1,
            autoCropArea: 1,
        });
    }

    function closeCropModal() {
        document.getElementById('cropModal').style.display = 'none';
        if (cropper) {
            cropper.destroy();
            cropper = null;
        }
        // Clear input so we don't accidentally upload uncropped file if cancelled
        // or if saved, the data is already in existingImage
        document.getElementById('productImage').value = '';
    }

    function saveCrop() {
        if (!cropper) return;
        
        const canvas = cropper.getCroppedCanvas({
            width: 800, // Resize for optimization
            height: 600
        });
        
        const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        
        // Update preview
        document.getElementById('imagePreview').src = croppedDataUrl;
        document.getElementById('imagePreviewContainer').style.display = 'block';
        
        // Update hidden input for submission
        document.getElementById('existingImage').value = croppedDataUrl;
        
        closeCropModal();
    }

    function readFileAsBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
            reader.readAsDataURL(file);
        });
    }

    async function deleteProduct(index) {
        if (confirm('Are you sure you want to delete this product?')) {
            const products = JSON.parse(localStorage.getItem('zeroDefectProducts'));
            
            // Supabase Delete (Try first)
            if (window.supabaseClient) {
                try {
                    const { error } = await window.supabaseClient.from('products').delete().eq('id', products[index].id);
                    if (error) throw error;
                    console.log('Product deleted from Supabase:', products[index].id);
                } catch (err) {
                    console.warn('Supabase delete failed, falling back to local storage:', err);
                }
            }

            products.splice(index, 1);
            localStorage.setItem('zeroDefectProducts', JSON.stringify(products));
            loadProducts();
        }
    }

    function closeModal() {
        document.getElementById('productModal').style.display = 'none';
    }

    function escapeHtml(text) {
        if (!text) return '';
        return text.toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    function toggleStockSort() {
        if (currentSortField === 'stock') {
            currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            currentSortField = 'stock';
            currentSortDirection = 'asc';
        }
        
        document.getElementById('sortStockIcon').className = currentSortDirection === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
        renderTable();
    }

    function changePage(delta) {
        // Calculate total pages based on current filtered list
        let displayProducts = allProducts;
        if (currentCategoryFilter !== 'all') {
            displayProducts = displayProducts.filter(p => p.category === currentCategoryFilter);
        }
        const totalPages = Math.ceil(displayProducts.length / itemsPerPage) || 1;
        
        const newPage = currentPage + delta;
        if (newPage >= 1 && newPage <= totalPages) {
            currentPage = newPage;
            renderTable();
        }
    }
});