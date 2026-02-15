document.addEventListener('DOMContentLoaded', function() {

    let autoRefreshInterval = null;

    // Load analytics
    loadAnalytics();

    // Auto-refresh every 10 seconds to update charts
    autoRefreshInterval = setInterval(loadAnalytics, 10000);

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        if (autoRefreshInterval) clearInterval(autoRefreshInterval);
    });

    function loadAnalytics() {
        // Load from Supabase first, fallback to localStorage
        if (window.SupabaseDB) {
            window.SupabaseDB.waitForReady().then(() => {
                // Load inquiries
                window.SupabaseDB.fetchAll('inquiries').then(({ data: inquiries, error: inquiryError }) => {
                    // Load orders
                    window.SupabaseDB.fetchAll('orders').then(({ data: orders, error: orderError }) => {
                        const inquiriesData = inquiries || [];
                        const ordersData = orders || [];

                        createInquiriesByCountryChart(inquiriesData);
                        createOrdersOverTimeChart(ordersData);
                        createProductPopularityChart(ordersData);
                    });
                });
            });
        } else {
            // Fallback to localStorage
            const inquiries = JSON.parse(localStorage.getItem('zeroDefectExportData') || '{"inquiries":[]}').inquiries;
            const orders = JSON.parse(localStorage.getItem('zeroDefectOrders') || '[]');

            createInquiriesByCountryChart(inquiries);
            createOrdersOverTimeChart(orders);
            createProductPopularityChart(orders);
        }
    }

    function createInquiriesByCountryChart(inquiries) {
        const ctx = document.getElementById('inquiriesByCountryChart').getContext('2d');
        const inquiriesByCountry = inquiries.reduce((acc, inquiry) => {
            acc[inquiry.country] = (acc[inquiry.country] || 0) + 1;
            return acc;
        }, {});

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(inquiriesByCountry),
                datasets: [{
                    label: 'Inquiries by Country',
                    data: Object.values(inquiriesByCountry),
                    backgroundColor: 'rgba(76, 175, 80, 0.2)',
                    borderColor: 'rgba(76, 175, 80, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    function createOrdersOverTimeChart(orders) {
        const ctx = document.getElementById('ordersOverTimeChart').getContext('2d');
        const ordersByDate = orders.reduce((acc, order) => {
            const date = new Date(order.timestamp).toLocaleDateString();
            acc[date] = (acc[date] || 0) + 1;
            return acc;
        }, {});

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: Object.keys(ordersByDate),
                datasets: [{
                    label: 'Orders Over Time',
                    data: Object.values(ordersByDate),
                    fill: false,
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1
                }]
            }
        });
    }

    function createProductPopularityChart(orders) {
        const ctx = document.getElementById('productPopularityChart').getContext('2d');
        
        // Extract product names from orders
        const productCounts = {};
        orders.forEach(order => {
            // Handle both single product and multiple products
            if (order.product_name) {
                const products = order.product_name.split(',').map(p => p.trim());
                products.forEach(product => {
                    productCounts[product] = (productCounts[product] || 0) + (order.quantity || 1);
                });
            }
        });

        // If no products found, show placeholder
        if (Object.keys(productCounts).length === 0) {
            new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: ['No Data'],
                    datasets: [{
                        label: 'Product Popularity',
                        data: [1],
                        backgroundColor: ['rgba(200, 200, 200, 0.2)'],
                        borderColor: ['rgba(200, 200, 200, 1)'],
                        borderWidth: 1
                    }]
                }
            });
            return;
        }

        const colors = [
            'rgba(255, 99, 132, 0.2)',
            'rgba(54, 162, 235, 0.2)',
            'rgba(255, 206, 86, 0.2)',
            'rgba(75, 192, 192, 0.2)',
            'rgba(153, 102, 255, 0.2)',
            'rgba(255, 159, 64, 0.2)',
            'rgba(255, 99, 132, 0.2)',
            'rgba(54, 162, 235, 0.2)'
        ];

        const borderColors = [
            'rgba(255, 99, 132, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(153, 102, 255, 1)',
            'rgba(255, 159, 64, 1)',
            'rgba(255, 99, 132, 1)',
            'rgba(54, 162, 235, 1)'
        ];

        new Chart(ctx, {
            type: 'pie',
            data: {
                labels: Object.keys(productCounts),
                datasets: [{
                    label: 'Product Popularity',
                    data: Object.values(productCounts),
                    backgroundColor: colors.slice(0, Object.keys(productCounts).length),
                    borderColor: borderColors.slice(0, Object.keys(productCounts).length),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }
});
