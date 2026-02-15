/**
 * Shared Supabase Client
 * Handles SDK loading, client initialization, and data sync
 */
(function() {
    // REPLACE WITH YOUR ACTUAL SUPABASE PROJECT CREDENTIALS
    const SUPABASE_URL = 'https://eagihyjabrnlpziikfft.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhZ2loeWphYnJubHB6aWlrZmZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNDY4NzEsImV4cCI6MjA4NTYyMjg3MX0.OkAvIX16M3AIj_xdsccyf6bayne3CUEHpt6dDCuQklA';

    function initSupabase() {
        if (window.supabase && !window.supabaseClient) {
            window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
                auth: {
                    persistSession: true,
                    autoRefreshToken: true,
                },
                headers: {
                    'X-Client-Info': 'supabase-js/2'
                }
            });
            console.log('Supabase client initialized with URL:', SUPABASE_URL);
            window.dispatchEvent(new CustomEvent('supabaseReady'));
            
            // Wait a bit then seed
            setTimeout(() => {
                seedSupabaseIfEmpty();
            }, 500);
        }
    }

    // Convert camelCase to snake_case for database
    function sanitizeProduct(product) {
        return {
            id: product.id,
            name: product.name,
            subtitle: product.subtitle,
            category: product.category,
            price: product.price,
            stock: product.stock,
            image: product.image,
            is_best_seller: product.isBestSeller || false,
            sub_category: product.subCategory || null,
            is_new: product.isNew || false
        };
    }

    // Convert snake_case back to camelCase from database
    function denormalizeProduct(product) {
        return {
            id: product.id,
            name: product.name,
            subtitle: product.subtitle,
            category: product.category,
            price: product.price,
            stock: product.stock,
            image: product.image,
            isBestSeller: product.is_best_seller || false,
            subCategory: product.sub_category || null,
            isNew: product.is_new || false
        };
    }

    // ============ GLOBAL DATABASE HELPERS ============
    // Exposed to window for use in other modules
    window.SupabaseDB = {
        // Wait for Supabase client to be ready
        waitForReady: function() {
            return new Promise(resolve => {
                if (window.supabaseClient) {
                    resolve(window.supabaseClient);
                } else {
                    const onReady = () => {
                        window.removeEventListener('supabaseReady', onReady);
                        resolve(window.supabaseClient);
                    };
                    window.addEventListener('supabaseReady', onReady);
                    // Timeout after 5 seconds
                    setTimeout(() => resolve(null), 5000);
                }
            });
        },

        // Insert record
        insert: async function(table, data) {
            if (!window.supabaseClient) return { error: 'Client not ready' };
            try {
                console.log(`[${table}] Attempting insert with data:`, data);
                const { data: result, error } = await window.supabaseClient
                    .from(table)
                    .insert([data]);
                if (error) throw error;
                console.log(`[${table}] Insert successful:`, result);
                return { data: result, error: null };
            } catch (err) {
                console.error(`[${table}] Insert failed:`, err.message);
                console.error(`[${table}] Full error:`, JSON.stringify(err, null, 2));
                return { data: null, error: err };
            }
        },

        // Update record
        update: async function(table, id, data) {
            if (!window.supabaseClient) return { error: 'Client not ready' };
            try {
                console.log(`[${table}] Attempting update for id: ${id}`, data);
                const { data: result, error } = await window.supabaseClient
                    .from(table)
                    .update(data)
                    .eq('id', id)
                    .select();  // Add select() to return updated row
                if (error) throw error;
                console.log(`[${table}] Update successful: ${id}`, result);
                return { data: result, error: null };
            } catch (err) {
                console.error(`[${table}] Update failed:`, err.message);
                console.error(`[${table}] Full error:`, JSON.stringify(err, null, 2));
                return { data: null, error: err };
            }
        },

        // Delete record
        delete: async function(table, id) {
            if (!window.supabaseClient) return { error: 'Client not ready' };
            try {
                const { error } = await window.supabaseClient
                    .from(table)
                    .delete()
                    .eq('id', id);
                if (error) throw error;
                console.log(`[${table}] Delete successful: ${id}`);
                return { error: null };
            } catch (err) {
                console.warn(`[${table}] Delete failed:`, err.message);
                return { error: err };
            }
        },

        // Fetch all records
        fetchAll: async function(table) {
            if (!window.supabaseClient) return { data: [], error: 'Client not ready' };
            try {
                const { data, error } = await window.supabaseClient
                    .from(table)
                    .select('*');
                if (error) throw error;
                console.log(`[${table}] Fetched ${data?.length || 0} records`);
                return { data, error: null };
            } catch (err) {
                console.warn(`[${table}] Fetch failed:`, err.message);
                return { data: [], error: err };
            }
        },

        // Fetch with filter
        fetchWhere: async function(table, filterColumn, filterValue) {
            if (!window.supabaseClient) return { data: [], error: 'Client not ready' };
            try {
                const { data, error } = await window.supabaseClient
                    .from(table)
                    .select('*')
                    .eq(filterColumn, filterValue);
                if (error) throw error;
                return { data, error: null };
            } catch (err) {
                console.warn(`[${table}] Filter fetch failed:`, err.message);
                return { data: [], error: err };
            }
        }
    };

    async function seedSupabaseIfEmpty() {
        if (!window.supabaseClient) return;
        
        try {
            // Check if products already exist in the database
            const { data: existingProducts, error: countError } = await window.supabaseClient
                .from('products')
                .select('id')
                .limit(1);
            
            // If table already has products, don't seed
            if (!countError && existingProducts && existingProducts.length > 0) {
                console.log('Products table already has data, skipping seed');
                return;
            }
            
            // If table is empty, seed with local products
            const localProducts = localStorage.getItem('zeroDefectProducts');
            if (localProducts) {
                let products = JSON.parse(localProducts);
                if (products.length > 0) {
                    // Sanitize all products before inserting
                    products = products.map(sanitizeProduct);
                    
                    const { error: insertError } = await window.supabaseClient
                        .from('products')
                        .insert(products)
                        .select();
                    
                    if (insertError) {
                        console.warn('Seed insert failed - check Supabase RLS policies:', insertError.message);
                    } else {
                        console.log('Supabase seeded with', products.length, 'products');
                    }
                }
            }
        } catch (e) {
            console.warn('Seed check failed:', e.message);
        }
    }

    // Load SDK if not present
    if (typeof window.supabase === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
        script.onload = initSupabase;
        script.onerror = () => console.warn('Supabase SDK failed to load - falling back to local storage');
        document.head.appendChild(script);
    } else {
        initSupabase();
    }
})();
