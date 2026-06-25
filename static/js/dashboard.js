// Dashboard JavaScript

let currentData = null;
let currentAnalysis = null;
let currentPrediction = null;

// Chart instance registry — destroy before recreating to avoid Canvas-in-use errors
const chartInstances = {};

function getOrDestroyChart(canvasId) {
    if (chartInstances[canvasId]) {
        chartInstances[canvasId].destroy();
        delete chartInstances[canvasId];
    }
    return document.getElementById(canvasId);
}

function registerChart(canvasId, chartInstance) {
    chartInstances[canvasId] = chartInstance;
}

// Check authentication on load
document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('userToken');
    const userName = localStorage.getItem('userName');
    const userEmail = localStorage.getItem('userEmail');
    
    if (!token) {
        window.location.href = '/auth?mode=login';
        return;
    }
    
    // Set user info
    document.getElementById('userName').textContent = userName || 'Kullanıcı';
    document.getElementById('userEmail').textContent = userEmail || 'user@email.com';

    // Setup navigation
    setupNavigation();
    setupFileUpload();
    setupSearchInputs();
    loadOverview();
});

function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all items
            navItems.forEach(nav => nav.classList.remove('active'));
            
            // Add active class to clicked item
            this.classList.add('active');
            
            // Get page to show
            const pageName = this.dataset.page;
            showPage(pageName);
        });
    });
}

function showPage(pageName) {
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => page.classList.remove('active'));

    const pageMap = {
        'overview': 'overviewPage',
        'upload': 'uploadPage',
        'analysis': 'analysisPage',
        'prediction': 'predictionPage',
        'reports': 'reportsPage',
        'compare': 'comparePage',
        'alerts': 'alertsPage',
        'history': 'historyPage',
        'margin': 'marginPage',
        'eoq': 'eoqPage',
        'abc': 'abcPage',
        'profile': 'profilePage',
    };

    const targetPage = document.getElementById(pageMap[pageName]);
    if (targetPage) {
        targetPage.classList.add('active');
    }

    if (pageName === 'overview') loadOverview();
    if (pageName === 'alerts') loadAlerts();
    if (pageName === 'profile') loadProfile();
    if (pageName === 'compare') initComparePage();
    if (pageName === 'history') loadHistory();
    if (pageName === 'reports') {} // no action needed
}

function setupFileUpload() {
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');
    
    // Drag and drop
    uploadZone.addEventListener('dragover', function(e) {
        e.preventDefault();
        uploadZone.classList.add('dragover');
    });
    
    uploadZone.addEventListener('dragleave', function() {
        uploadZone.classList.remove('dragover');
    });
    
    uploadZone.addEventListener('drop', function(e) {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileUpload(files[0]);
        }
    });
    
    // File input change
    fileInput.addEventListener('change', function() {
        if (this.files.length > 0) {
            handleFileUpload(this.files[0]);
        }
    });
}

async function handleFileUpload(file) {
    // Validate file type
    const validTypes = ['.xlsx', '.xls', '.csv'];
    const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    if (!validTypes.includes(fileExt)) {
        alert('Lütfen Excel (.xlsx) veya CSV (.csv) dosyası yükleyin!');
        return;
    }
    
    // Show progress
    document.getElementById('uploadZone').style.display = 'none';
    document.getElementById('uploadProgress').style.display = 'block';
    
    // Create FormData
    const formData = new FormData();
    formData.append('file', file);
    
    const token = localStorage.getItem('userToken');
    
    try {
        // Simulate upload progress
        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += 10;
            document.getElementById('progressFill').style.width = progress + '%';
            document.getElementById('progressText').textContent = `Yükleniyor... ${progress}%`;
            
            if (progress >= 90) {
                clearInterval(progressInterval);
            }
        }, 200);
        
        const response = await fetch('/api/data/upload', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token
            },
            body: formData
        });
        
        clearInterval(progressInterval);
        
        const data = await response.json();
        
        if (response.ok) {
            document.getElementById('progressFill').style.width = '100%';
            document.getElementById('progressText').textContent = 'Yükleme tamamlandı!';
            
            setTimeout(() => {
                showUploadSuccess(data);
            }, 500);
        } else {
            throw new Error(data.message || 'Yükleme başarısız');
        }
    } catch (error) {
        console.error('Upload error:', error);
        alert('Dosya yüklenirken bir hata oluştu: ' + error.message);
        resetUpload();
    }
}

function showUploadSuccess(data) {
    document.getElementById('uploadProgress').style.display = 'none';
    document.getElementById('uploadSuccess').style.display = 'block';
    
    currentData = data;
    
    // Show file info
    document.getElementById('fileInfo').textContent = 
        `${data.row_count} satır, ${data.column_count} sütun`;
    
    // Show detected columns
    if (data.detected_columns && data.detected_columns.length > 0) {
        const columnsDiv = document.getElementById('detectedColumns');
        columnsDiv.innerHTML = '<h4>Algılanan Sütunlar:</h4><div class="column-list"></div>';
        
        const columnList = columnsDiv.querySelector('.column-list');
        data.detected_columns.forEach(col => {
            const badge = document.createElement('span');
            badge.className = 'column-badge';
            badge.textContent = col;
            columnList.appendChild(badge);
        });
    }
}

function resetUpload() {
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('uploadProgress').style.display = 'none';
    document.getElementById('uploadSuccess').style.display = 'none';
    document.getElementById('fileInput').value = '';
}

async function processData() {
    if (!currentData || !currentData.file_id) {
        alert('Lütfen önce bir dosya yükleyin!');
        return;
    }
    
    const token = localStorage.getItem('userToken');
    
    try {
        const response = await fetch('/api/data/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ file_id: currentData.file_id })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentAnalysis = data;
            showAnalysisResults(data);
            
            // Switch to analysis page
            document.querySelector('[data-page="analysis"]').click();
        } else {
            throw new Error(data.message || 'Analiz başarısız');
        }
    } catch (error) {
        console.error('Analysis error:', error);
        alert('Veri analizi sırasında bir hata oluştu: ' + error.message);
    }
}

function showAnalysisResults(data) {
    // Update stats
    document.getElementById('totalRevenue').textContent = formatCurrency(data.total_revenue);
    document.getElementById('totalExpense').textContent = formatCurrency(data.total_expense);
    document.getElementById('netProfit').textContent = formatCurrency(data.net_profit);
    document.getElementById('productCount').textContent = data.product_count;
    
    // Create sales trend chart
    if (data.monthly_sales && data.monthly_sales.length > 0) {
        createSalesTrendChart(data.monthly_sales);
    }
    
    // Create product profit chart
    if (data.product_profits && data.product_profits.length > 0) {
        createProductProfitChart(data.product_profits);
    }
    
    // Create top products table
    if (data.top_products && data.top_products.length > 0) {
        createTopProductsTable(data.top_products);
    }
}

function createSalesTrendChart(monthlyData) {
    const ctx = getOrDestroyChart('salesTrendChart');

    registerChart('salesTrendChart', new Chart(ctx, {
        type: 'line',
        data: {
            labels: monthlyData.map(d => d.month),
            datasets: [{
                label: 'Aylık Satış',
                data: monthlyData.map(d => d.sales),
                borderColor: '#0a2463',
                backgroundColor: 'rgba(10, 36, 99, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    }
                }
            }
        }
    }));
}

function createProductProfitChart(productData) {
    const ctx = getOrDestroyChart('productProfitChart');

    const top10 = productData.slice(0, 10);

    registerChart('productProfitChart', new Chart(ctx, {
        type: 'bar',
        data: {
            labels: top10.map(p => p.product),
            datasets: [{
                label: 'Kâr',
                data: top10.map(p => p.profit),
                backgroundColor: '#2563eb'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    }
                }
            }
        }));
}

function createTopProductsTable(products) {
    const container = document.getElementById('topProductsTable');
    
    let html = '<table><thead><tr><th>Ürün</th><th>Satış Adedi</th><th>Gelir</th><th>Kâr</th></tr></thead><tbody>';
    
    products.slice(0, 10).forEach(product => {
        html += `
            <tr>
                <td><strong>${product.product}</strong></td>
                <td>${product.quantity}</td>
                <td>${formatCurrency(product.revenue)}</td>
                <td>${formatCurrency(product.profit)}</td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

async function generatePredictions() {
    if (!currentData || !currentData.file_id) {
        alert('Lütfen önce veri yükleyin ve analiz edin!');
        return;
    }
    
    const btn = document.getElementById('generateBtn');
    btn.disabled = true;
    
    // Animasyonlu loading mesajları
    const loadingMessages = [
        '<i class="fas fa-spinner fa-spin"></i> Veriler analiz ediliyor...',
        '<i class="fas fa-spinner fa-spin"></i> AI modeli hazırlanıyor...',
        '<i class="fas fa-spinner fa-spin"></i> Tahminler hesaplanıyor...',
        '<i class="fas fa-spinner fa-spin"></i> Öneriler oluşturuluyor...'
    ];
    
    let messageIndex = 0;
    btn.innerHTML = loadingMessages[0];
    
    // Her 1.5 saniyede bir mesajı değiştir
    const messageInterval = setInterval(() => {
        messageIndex = (messageIndex + 1) % loadingMessages.length;
        btn.innerHTML = loadingMessages[messageIndex];
    }, 1500);
    
    const token = localStorage.getItem('userToken');
    
    try {
        // Minimum 3 saniye loading süresi
        const [response] = await Promise.all([
            fetch('/api/prediction/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({ file_id: currentData.file_id })
            }),
            new Promise(resolve => setTimeout(resolve, 3000))
        ]);
        
        const data = await response.json();
        
        if (response.ok) {
            currentPrediction = data;
            clearInterval(messageInterval);
            btn.innerHTML = '<i class="fas fa-check"></i> Tamamlandı!';
            await new Promise(resolve => setTimeout(resolve, 500));
            showPredictionResults(data);
        } else {
            throw new Error(data.message || 'Tahmin oluşturulamadı');
        }
    } catch (error) {
        clearInterval(messageInterval);
        console.error('Prediction error:', error);
        alert('Tahmin oluşturulurken bir hata oluştu: ' + error.message);
    } finally {
        clearInterval(messageInterval);
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-magic"></i> Tahmin Oluştur';
    }
}

function showPredictionResults(data) {
    document.getElementById('predictionResults').style.display = 'block';
    
    // Store current prediction
    currentPrediction = data;
    
    // Show data summary first
    if (data.data_summary) {
        showDataSummary(data.data_summary, data.last_data_date);
    }
    
    // Show visual analysis charts
    if (data.predictions && data.predictions.length > 0) {
        createVisualAnalysis(data.predictions, data.future_months);
    }
    
    // Show accuracy
    const accuracyBadge = document.getElementById('accuracyBadge');
    accuracyBadge.style.display = 'flex';
    document.getElementById('accuracyText').textContent = 
        `Doğruluk: ${data.accuracy}%`;
    
    // Create prediction table
    if (data.predictions && data.predictions.length > 0) {
        createPredictionTable(data.predictions, data.future_months);
    }
    
    // Create prediction chart
    if (data.predictions && data.predictions.length > 0) {
        createPredictionChart(data.predictions, data.future_months);
    }
    
    // Show recommendations
    if (data.recommendations && data.recommendations.length > 0) {
        showRecommendations(data.recommendations);
    }
}

function showDataSummary(summary, lastDate) {
    const container = document.getElementById('predictionTable');
    
    let html = `
        <div style="background: linear-gradient(135deg, #0a2463 0%, #3e92cc 100%); color: white; padding: 24px; border-radius: 12px; margin-bottom: 24px;">
            <h3 style="margin: 0 0 16px 0; font-size: 20px;">📊 Veri Özeti</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
                <div>
                    <div style="font-size: 14px; opacity: 0.9;">Toplam Kayıt</div>
                    <div style="font-size: 24px; font-weight: bold;">${summary.total_rows.toLocaleString()}</div>
                </div>
                <div>
                    <div style="font-size: 14px; opacity: 0.9;">Farklı Ürün</div>
                    <div style="font-size: 24px; font-weight: bold;">${summary.unique_products}</div>
                </div>
                <div>
                    <div style="font-size: 14px; opacity: 0.9;">Toplam Satış Adedi</div>
                    <div style="font-size: 24px; font-weight: bold;">${summary.total_quantity.toLocaleString()}</div>
                </div>
                <div>
                    <div style="font-size: 14px; opacity: 0.9;">Son Veri Tarihi</div>
                    <div style="font-size: 18px; font-weight: bold;">${lastDate}</div>
                </div>
            </div>
            <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.2); font-size: 14px;">
                <strong>Veri Aralığı:</strong> ${summary.date_range}
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}
function createVisualAnalysis(predictions, futureMonths) {
    const container = document.getElementById('predictionTable');
    
    // Get month names
    const monthLabels = futureMonths ? futureMonths.map(m => m.month_name) : 
        ['Ay 1', 'Ay 2', 'Ay 3', 'Ay 4', 'Ay 5', 'Ay 6'];
    
    // Calculate monthly totals for bar chart
    const monthlyTotals = Array(6).fill(0);
    predictions.forEach(pred => {
        pred.monthly_predictions.forEach((val, idx) => {
            monthlyTotals[idx] += val;
        });
    });
    
    // Calculate product totals for donut chart
    const productTotals = predictions.map(pred => ({
        product: pred.product,
        total: pred.monthly_predictions.reduce((a, b) => a + b, 0)
    })).sort((a, b) => b.total - a.total).slice(0, 8);
    
    const html = `
        <div class="visual-analysis-container">
            <h3 style="margin: 0 0 20px 0; font-size: 22px; color: #0a2463;">
                <i class="fas fa-chart-bar"></i> 📊 Tahmin Görsel Analizi
            </h3>
            
            <div class="charts-grid">
                <!-- Bar & Line Chart Container -->
                <div class="chart-card chart-large">
                    <div class="chart-header">
                        <h4>📈 Aylık Toplam Tahmin</h4>
                        <p>Tüm ürünler için aylık toplam satış tahmini</p>
                    </div>
                    <canvas id="monthlyBarChart"></canvas>
                </div>
                
                <!-- Donut Chart Container -->
                <div class="chart-card chart-medium">
                    <div class="chart-header">
                        <h4>🎯 Ürün Bazlı Dağılım</h4>
                        <p>6 aylık toplam tahmin oranları</p>
                    </div>
                    <canvas id="productDonutChart"></canvas>
                </div>
            </div>
        </div>
    `;
    
    container.innerHTML += html;
    
    // Create Bar Chart with Line overlay
    setTimeout(() => {
        const barCtx = getOrDestroyChart('monthlyBarChart');
        if (barCtx) {
            registerChart('monthlyBarChart', new Chart(barCtx, {
                type: 'bar',
                data: {
                    labels: monthLabels,
                    datasets: [
                        {
                            type: 'bar',
                            label: 'Aylık Toplam',
                            data: monthlyTotals,
                            backgroundColor: 'rgba(10, 36, 99, 0.8)',
                            borderColor: '#0a2463',
                            borderWidth: 2,
                            borderRadius: 8
                        },
                        {
                            type: 'line',
                            label: 'Trend Çizgisi',
                            data: monthlyTotals,
                            borderColor: '#ef4444',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            borderWidth: 3,
                            tension: 0.4,
                            fill: true,
                            pointRadius: 6,
                            pointHoverRadius: 8,
                            pointBackgroundColor: '#ef4444',
                            pointBorderColor: '#fff',
                            pointBorderWidth: 2
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    interaction: {
                        mode: 'index',
                        intersect: false
                    },
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: {
                                padding: 15,
                                font: { size: 12, weight: '600' },
                                usePointStyle: true
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(10, 36, 99, 0.95)',
                            padding: 12,
                            titleFont: { size: 14, weight: 'bold' },
                            bodyFont: { size: 13 },
                            borderColor: '#3e92cc',
                            borderWidth: 1,
                            callbacks: {
                                label: function(context) {
                                    let label = context.dataset.label || '';
                                    if (label) {
                                        label += ': ';
                                    }
                                    label += Math.round(context.parsed.y).toLocaleString() + ' adet';
                                    return label;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(10, 36, 99, 0.08)'
                            },
                            ticks: {
                                font: { size: 11 },
                                callback: function(value) {
                                    return value.toLocaleString();
                                }
                            }
                        },
                        x: {
                            grid: {
                                display: false
                            },
                            ticks: {
                                font: { size: 11, weight: '600' }
                            }
                        }
                    }
                }
            }));
        }

        // Create Donut Chart
        const donutCtx = getOrDestroyChart('productDonutChart');
        if (donutCtx) {
            const colors = [
                '#0a2463', '#2563eb', '#3b5998', '#60a5fa',
                '#93c5fd', '#3e92cc', '#1e3a8a', '#1e40af'
            ];

            registerChart('productDonutChart', new Chart(donutCtx, {
                type: 'doughnut',
                data: {
                    labels: productTotals.map(p => p.product),
                    datasets: [{
                        data: productTotals.map(p => Math.round(p.total)),
                        backgroundColor: colors,
                        borderColor: '#fff',
                        borderWidth: 3,
                        hoverOffset: 15
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    cutout: '60%',
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: {
                                padding: 12,
                                font: { size: 11, weight: '600' },
                                generateLabels: function(chart) {
                                    const data = chart.data;
                                    if (data.labels.length && data.datasets.length) {
                                        const total = data.datasets[0].data.reduce((a, b) => a + b, 0);
                                        return data.labels.map((label, i) => {
                                            const value = data.datasets[0].data[i];
                                            const percentage = ((value / total) * 100).toFixed(1);
                                            return {
                                                text: `${label} (${percentage}%)`,
                                                fillStyle: data.datasets[0].backgroundColor[i],
                                                hidden: false,
                                                index: i
                                            };
                                        });
                                    }
                                    return [];
                                }
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(10, 36, 99, 0.95)',
                            padding: 12,
                            titleFont: { size: 14, weight: 'bold' },
                            bodyFont: { size: 13 },
                            borderColor: '#3e92cc',
                            borderWidth: 1,
                            callbacks: {
                                label: function(context) {
                                    const label = context.label || '';
                                    const value = context.parsed;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = ((value / total) * 100).toFixed(1);
                                    return [
                                        `${label}`,
                                        `Toplam: ${value.toLocaleString()} adet`,
                                        `Oran: ${percentage}%`
                                    ];
                                }
                            }
                        }
                    }
                }
            }));
        }
    }, 100);
}

function createPredictionTable(predictions, futureMonths) {
    const container = document.getElementById('predictionTable');
    
    // Get month names from server
    const months = futureMonths ? futureMonths.map(m => m.month_name) : 
        ['Ay 1', 'Ay 2', 'Ay 3', 'Ay 4', 'Ay 5', 'Ay 6'];
    
    let html = '<div style="margin-top: 24px;"><h3 style="margin-bottom: 16px;">📈 6 Aylık Tahmin Detayları</h3><table><thead><tr><th>Ürün</th>';
    
    months.forEach(month => {
        html += `<th>${month}</th>`;
    });
    html += '<th>Toplam</th></tr></thead><tbody>';
    
    predictions.forEach(pred => {
        const total = pred.monthly_predictions.reduce((a, b) => a + b, 0);
        html += `<tr><td><strong>${pred.product}</strong></td>`;
        pred.monthly_predictions.forEach(value => {
            html += `<td>${Math.round(value).toLocaleString()}</td>`;
        });
        html += `<td><strong>${Math.round(total).toLocaleString()}</strong></td>`;
        html += '</tr>';
    });
    
    html += '</tbody></table></div>';
    container.innerHTML += html;
}

function createPredictionChart(predictions, futureMonths) {
    const ctx = getOrDestroyChart('predictionChart');
    
    // Get month names
    const monthLabels = futureMonths ? futureMonths.map(m => m.month_name) : 
        ['Ay 1', 'Ay 2', 'Ay 3', 'Ay 4', 'Ay 5', 'Ay 6'];
    
    const datasets = predictions.slice(0, 5).map((pred, index) => {
        const colors = ['#0a2463', '#2563eb', '#3b5998', '#60a5fa', '#93c5fd'];
        return {
            label: pred.product,
            data: pred.monthly_predictions,
            borderColor: colors[index],
            backgroundColor: colors[index] + '20',
            tension: 0.4
        };
    });
    
    registerChart('predictionChart', new Chart(ctx, {
        type: 'line',
        data: {
            labels: monthLabels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                title: {
                    display: true,
                    text: 'Gelecek 6 Ay Tahmin Grafiği'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString();
                        }
                    }
                }
            }
        }
    }));
}

function showRecommendations(recommendations) {
    const container = document.getElementById('recommendations');
    
    let html = '<h3>Öneriler</h3>';
    
    recommendations.forEach(rec => {
        html += `<div class="recommendation-item"><strong>${rec.product}:</strong> ${rec.recommendation}</div>`;
    });
    
    container.innerHTML = html;
}

async function downloadPDF(type) {
    const token = localStorage.getItem('userToken');
    
    try {
        const response = await fetch(`/api/reports/pdf?type=${type}`, {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `hismarketing_${type}_raporu.pdf`;
            a.click();
            window.URL.revokeObjectURL(url);
        } else {
            throw new Error('PDF indirilemedi');
        }
    } catch (error) {
        console.error('PDF download error:', error);
        alert('PDF indirilirken bir hata oluştu');
    }
}

async function downloadExcel(type) {
    const token = localStorage.getItem('userToken');
    
    try {
        const response = await fetch(`/api/reports/excel?type=${type}`, {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `hismarketing_${type}_raporu.xlsx`;
            a.click();
            window.URL.revokeObjectURL(url);
        } else {
            throw new Error('Excel indirilemedi');
        }
    } catch (error) {
        console.error('Excel download error:', error);
        alert('Excel indirilirken bir hata oluştu');
    }
}

function handleLogout() {
    localStorage.removeItem('userToken');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    window.location.href = '/';
}

function formatCurrency(value) {
    if (value === undefined || value === null) return '₺0';
    return '₺' + value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ===== ALERTS =====

let savedThresholds = {};

async function loadAlerts() {
    const token = localStorage.getItem('userToken');

    // Kaydedilmiş eşikleri yükle
    try {
        const tRes = await fetch('/api/alerts/thresholds', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const tData = await tRes.json();
        if (tData.success) savedThresholds = tData.thresholds || {};
    } catch (_) {}

    // Tahmin verisi üzerinden editor oluştur
    if (currentPrediction && currentPrediction.predictions) {
        renderThresholdEditor(currentPrediction.predictions);
    } else {
        document.getElementById('thresholdEditor').innerHTML =
            '<p style="color:#64748b;font-size:13px;">Önce tahmin oluşturun, ardından eşik değerleri ayarlayabilirsiniz.</p>';
    }

    // Uyarıları kontrol et
    try {
        const res = await fetch('/api/alerts/check', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();
        if (data.success) renderAlerts(data);
    } catch (e) {
        console.error('Alerts error:', e);
    }
}

function renderThresholdEditor(predictions) {
    const container = document.getElementById('thresholdEditor');
    let html = `<table class="threshold-table">
        <thead><tr>
            <th>Ürün</th>
            <th>Mevcut Stok</th>
            <th>Min. Stok</th>
            <th>Yeniden Sipariş Noktası</th>
            <th>Tahmini Ay 1</th>
        </tr></thead><tbody>`;

    predictions.forEach(pred => {
        const t = savedThresholds[pred.product] || {};
        const nextMonth = Math.round(pred.monthly_predictions[0] || 0);
        html += `<tr data-product="${pred.product}">
            <td><strong>${pred.product}</strong></td>
            <td><input type="number" class="th-current" min="0" value="${t.current_stock ?? ''}" placeholder="-"></td>
            <td><input type="number" class="th-min" min="0" value="${t.min_stock ?? ''}" placeholder="-"></td>
            <td><input type="number" class="th-reorder" min="0" value="${t.reorder_point ?? ''}" placeholder="-"></td>
            <td style="color:#2563eb;font-weight:600;">${nextMonth.toLocaleString()}</td>
        </tr>`;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

async function saveThresholds() {
    const token = localStorage.getItem('userToken');
    const rows = document.querySelectorAll('#thresholdEditor tbody tr');
    const thresholds = {};

    rows.forEach(row => {
        const product = row.dataset.product;
        const current = row.querySelector('.th-current').value;
        const min = row.querySelector('.th-min').value;
        const reorder = row.querySelector('.th-reorder').value;
        thresholds[product] = {
            current_stock: current !== '' ? parseInt(current) : null,
            min_stock: min !== '' ? parseInt(min) : null,
            reorder_point: reorder !== '' ? parseInt(reorder) : null,
        };
    });

    try {
        const res = await fetch('/api/alerts/thresholds', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ thresholds }),
        });
        const data = await res.json();
        if (data.success) {
            savedThresholds = thresholds;
            loadAlerts();
        }
    } catch (e) {
        console.error('Save thresholds error:', e);
    }
}

function renderAlerts(data) {
    const summary = data.summary;
    const alerts = data.alerts;

    document.getElementById('alertsSummary').style.display = 'flex';
    document.getElementById('criticalCount').textContent = summary.critical;
    document.getElementById('warningCount').textContent = summary.warning;
    document.getElementById('okCount').textContent = summary.ok;

    // Sidebar badge
    const badge = document.getElementById('alertBadge');
    if (summary.critical > 0 || summary.warning > 0) {
        badge.textContent = summary.critical + summary.warning;
        badge.style.display = 'inline-flex';
    } else {
        badge.style.display = 'none';
    }

    const container = document.getElementById('alertsList');
    if (!alerts.length) {
        container.innerHTML = '<p style="color:#64748b;">Henüz uyarı bulunmuyor.</p>';
        return;
    }

    const icons = { critical: 'exclamation-circle', warning: 'exclamation-triangle', ok: 'check-circle' };
    let html = '';

    alerts.filter(a => a.level !== 'ok').forEach(a => {
        const icon = icons[a.level];
        const msgs = a.messages.length ? a.messages.join(' ') : 'Durum normal.';
        const demandInfo = `Tahmini talep: Ay 1 = ${a.next_month_demand.toLocaleString()}, 3 Ay = ${a.three_month_demand.toLocaleString()}`;
        html += `<div class="alert-item ${a.level}">
            <i class="fas fa-${icon}"></i>
            <div class="alert-item-content">
                <div class="alert-item-title">${a.product}</div>
                <div class="alert-item-body">${msgs}<br><span style="color:#94a3b8;">${demandInfo}</span></div>
            </div>
        </div>`;
    });

    if (!html) html = '<p style="color:#10b981;font-weight:600;">Tüm ürünler normal seviyede.</p>';
    container.innerHTML = html;
}

// ===== PROFILE =====

async function loadProfile() {
    const token = localStorage.getItem('userToken');
    try {
        const res = await fetch('/api/profile', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();
        if (data.success) {
            document.getElementById('profileName').value = data.name || '';
            document.getElementById('profileEmail').value = data.email || '';
            document.getElementById('profileCompany').value = data.company || '';
            document.getElementById('profileCreatedAt').value = data.created_at
                ? new Date(data.created_at).toLocaleDateString('tr-TR')
                : '';
        }
    } catch (e) {
        console.error('Profile load error:', e);
    }
}

async function saveProfile() {
    const token = localStorage.getItem('userToken');
    const name = document.getElementById('profileName').value.trim();
    const company = document.getElementById('profileCompany').value.trim();

    if (!name) { alert('İsim boş olamaz.'); return; }

    try {
        const res = await fetch('/api/profile', {
            method: 'PUT',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, company }),
        });
        const data = await res.json();
        if (data.success) {
            localStorage.setItem('userName', name);
            document.getElementById('userName').textContent = name;
            alert('Profil güncellendi.');
        } else {
            alert(data.message || 'Hata oluştu.');
        }
    } catch (e) {
        console.error('Save profile error:', e);
    }
}

async function changePassword() {
    const token = localStorage.getItem('userToken');
    const current = document.getElementById('currentPassword').value;
    const newPw = document.getElementById('newPassword').value;
    const confirm = document.getElementById('confirmPassword').value;
    const msgEl = document.getElementById('passwordMessage');

    if (!current || !newPw || !confirm) {
        msgEl.innerHTML = '<span style="color:#ef4444;">Tüm alanları doldurun.</span>';
        return;
    }
    if (newPw !== confirm) {
        msgEl.innerHTML = '<span style="color:#ef4444;">Şifreler eşleşmiyor.</span>';
        return;
    }
    if (newPw.length < 6) {
        msgEl.innerHTML = '<span style="color:#ef4444;">Şifre en az 6 karakter olmalı.</span>';
        return;
    }

    try {
        const res = await fetch('/api/profile/change-password', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ current_password: current, new_password: newPw }),
        });
        const data = await res.json();
        if (data.success) {
            msgEl.innerHTML = '<span style="color:#10b981;">Şifre başarıyla değiştirildi.</span>';
            document.getElementById('currentPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';
        } else {
            msgEl.innerHTML = `<span style="color:#ef4444;">${data.message}</span>`;
        }
    } catch (e) {
        msgEl.innerHTML = '<span style="color:#ef4444;">Sunucu hatası.</span>';
    }
}

// ===== PERIOD COMPARISON =====

let compareChartInstance = null;

function initComparePage() {
    // Önceki analizden tarih aralığını otomatik doldur
    if (currentAnalysis && currentAnalysis.monthly_sales && currentAnalysis.monthly_sales.length >= 2) {
        const months = currentAnalysis.monthly_sales.map(m => m.month).sort();
        const mid = Math.floor(months.length / 2);
        document.getElementById('p1Start').value = months[0] + '-01';
        document.getElementById('p1End').value = months[mid - 1] + '-28';
        document.getElementById('p2Start').value = months[mid] + '-01';
        document.getElementById('p2End').value = months[months.length - 1] + '-28';
    }
}

async function runComparison() {
    const token = localStorage.getItem('userToken');
    if (!currentData) { alert('Önce veri yükleyin.'); return; }

    const p1Start = document.getElementById('p1Start').value;
    const p1End = document.getElementById('p1End').value;
    const p2Start = document.getElementById('p2Start').value;
    const p2End = document.getElementById('p2End').value;

    if (!p1Start || !p1End || !p2Start || !p2End) {
        alert('Lütfen tüm tarihleri girin.');
        return;
    }

    try {
        const res = await fetch('/api/data/compare', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                file_id: currentData.file_id,
                period1_start: p1Start,
                period1_end: p1End,
                period2_start: p2Start,
                period2_end: p2End,
            }),
        });
        const data = await res.json();
        if (!data.success) { alert(data.message); return; }
        renderComparison(data);
    } catch (e) {
        console.error('Comparison error:', e);
        alert('Karşılaştırma sırasında hata oluştu.');
    }
}

function renderComparison(data) {
    document.getElementById('compareResults').style.display = 'block';

    const p1 = data.period1;
    const p2 = data.period2;
    const ch = data.changes;

    function arrow(pct) {
        if (pct === null || pct === undefined) return '';
        return pct >= 0
            ? `<span style="color:#10b981;">▲ %${Math.abs(pct)}</span>`
            : `<span style="color:#ef4444;">▼ %${Math.abs(pct)}</span>`;
    }

    const statsEl = document.getElementById('compareStats');
    statsEl.innerHTML = `
        <div class="stat-card">
            <div class="stat-icon revenue"><i class="fas fa-boxes"></i></div>
            <div class="stat-content">
                <h3>Satış Adedi</h3>
                <p class="stat-value">${p1.total_quantity.toLocaleString()} → ${p2.total_quantity.toLocaleString()}</p>
                <small>${arrow(ch.quantity_pct)}</small>
            </div>
        </div>
        ${p1.total_revenue !== undefined ? `
        <div class="stat-card">
            <div class="stat-icon profit"><i class="fas fa-dollar-sign"></i></div>
            <div class="stat-content">
                <h3>Toplam Gelir</h3>
                <p class="stat-value">${formatCurrency(p1.total_revenue)} → ${formatCurrency(p2.total_revenue)}</p>
                <small>${arrow(ch.revenue_pct)}</small>
            </div>
        </div>` : ''}
        <div class="stat-card">
            <div class="stat-icon products"><i class="fas fa-calendar-alt"></i></div>
            <div class="stat-content">
                <h3>Dönem 1</h3>
                <p class="stat-value" style="font-size:13px;">${p1.label}</p>
                <small>${p1.row_count.toLocaleString()} kayıt</small>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon expense"><i class="fas fa-calendar-alt"></i></div>
            <div class="stat-content">
                <h3>Dönem 2</h3>
                <p class="stat-value" style="font-size:13px;">${p2.label}</p>
                <small>${p2.row_count.toLocaleString()} kayıt</small>
            </div>
        </div>
    `;

    // Chart
    const ctx = document.getElementById('compareChart');
    if (compareChartInstance) { compareChartInstance.destroy(); }

    const labels1 = (data.monthly_period1 || []).map(r => r.month);
    const labels2 = (data.monthly_period2 || []).map(r => r.month);
    const allLabels = [...new Set([...labels1, ...labels2])].sort();

    const vals1 = allLabels.map(l => {
        const row = (data.monthly_period1 || []).find(r => r.month === l);
        return row ? row.period1 : 0;
    });
    const vals2 = allLabels.map(l => {
        const row = (data.monthly_period2 || []).find(r => r.month === l);
        return row ? row.period2 : 0;
    });

    compareChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: allLabels,
            datasets: [
                { label: p1.label, data: vals1, backgroundColor: '#2563eb99', borderColor: '#2563eb', borderWidth: 1 },
                { label: p2.label, data: vals2, backgroundColor: '#7c3aed99', borderColor: '#7c3aed', borderWidth: 1 },
            ],
        },
        options: {
            responsive: true,
            plugins: { legend: { position: 'bottom' } },
            scales: { y: { beginAtZero: true } },
        },
    });

    // Product table
    const products = data.products || [];
    if (products.length) {
        let html = `<table><thead><tr>
            <th>Ürün</th>
            <th>${p1.label}</th>
            <th>${p2.label}</th>
            <th>Değişim</th>
        </tr></thead><tbody>`;
        products.forEach(p => {
            const pct = p.change_pct;
            const pctHtml = pct === null ? '-'
                : pct >= 0 ? `<span style="color:#10b981;">▲ %${Math.abs(pct)}</span>`
                : `<span style="color:#ef4444;">▼ %${Math.abs(pct)}</span>`;
            html += `<tr>
                <td><strong>${p.product}</strong></td>
                <td>${p.period1_qty.toLocaleString()}</td>
                <td>${p.period2_qty.toLocaleString()}</td>
                <td>${pctHtml}</td>
            </tr>`;
        });
        html += '</tbody></table>';
        document.getElementById('compareProductTable').innerHTML = html;
    }
}

// ===== PRODUCT SEARCH =====

function setupSearchInputs() {
    function bindSearch(inputId, tableId) {
        const input = document.getElementById(inputId);
        if (!input) return;
        input.addEventListener('input', function () {
            const query = this.value.toLowerCase().trim();
            const rows = document.querySelectorAll(`#${tableId} tbody tr`);
            rows.forEach(row => {
                const text = row.querySelector('td')?.textContent?.toLowerCase() || '';
                row.style.display = query === '' || text.includes(query) ? '' : 'none';
            });
        });
    }
    bindSearch('productSearchAnalysis', 'topProductsTable');
    bindSearch('productSearchPrediction', 'predictionTable');
}

// ===== GENEL BAKIŞ =====

async function loadOverview() {
    const token = localStorage.getItem('userToken');
    const content = document.getElementById('overviewContent');
    if (!content) return;

    try {
        const res = await fetch('/api/dashboard/summary', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        renderOverview(data);
    } catch (err) {
        if (content) content.innerHTML = `<div class="alert-item critical">Genel bakış yüklenemedi: ${err.message}</div>`;
    }
}

function renderOverview(data) {
    const content = document.getElementById('overviewContent');
    if (!content) return;
    const userName = localStorage.getItem('userName') || 'Kullanıcı';

    if (!data.has_analysis && !data.has_prediction) {
        content.innerHTML = `
            <div style="text-align:center;padding:60px 20px;">
                <i class="fas fa-rocket" style="font-size:4rem;color:#2563eb;margin-bottom:20px;"></i>
                <h2>Hoş geldiniz, ${userName}!</h2>
                <p style="color:#64748b;font-size:1.1rem;margin:12px 0 28px;">Başlamak için veri yükleyin ve analiz çalıştırın.</p>
                <button class="btn-primary" onclick="document.querySelector('[data-page=upload]').click()">
                    <i class="fas fa-upload"></i> Veri Yükle
                </button>
            </div>`;
        return;
    }

    let html = `<div style="display:grid;gap:20px;">`;

    if (data.has_analysis) {
        const a = data.analysis;
        const profitColor = a.net_profit >= 0 ? '#10b981' : '#ef4444';
        html += `
            <div class="card">
                <h3 style="margin-bottom:16px;"><i class="fas fa-chart-bar" style="color:#2563eb;margin-right:8px;"></i> Son Analiz Özeti</h3>
                <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;">
                    <div class="stat-card">
                        <div class="stat-label">Toplam Gelir</div>
                        <div class="stat-value">${formatCurrency(a.total_revenue)}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Toplam Gider</div>
                        <div class="stat-value">${formatCurrency(a.total_expense)}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Net Kâr</div>
                        <div class="stat-value" style="color:${profitColor};">${formatCurrency(a.net_profit)}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Ürün Sayısı</div>
                        <div class="stat-value">${a.product_count}</div>
                    </div>
                </div>
                ${a.top_product ? `<div style="margin-top:14px;padding:12px 16px;background:#eff6ff;border-radius:8px;color:#1e40af;font-size:.9rem;">
                    <i class="fas fa-trophy" style="color:#f59e0b;margin-right:6px;"></i>
                    En çok satan ürün: <strong>${a.top_product}</strong>
                </div>` : ''}
            </div>`;
    }

    if (data.has_prediction) {
        const p = data.prediction;
        html += `
            <div class="card">
                <h3 style="margin-bottom:16px;"><i class="fas fa-brain" style="color:#10b981;margin-right:8px;"></i> Son Tahmin Özeti</h3>
                <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;">
                    <div class="stat-card">
                        <div class="stat-label">Model Doğruluğu</div>
                        <div class="stat-value" style="color:#2563eb;">%${p.accuracy}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Tahmin Edilen Ürünler</div>
                        <div class="stat-value">${p.total_products}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Stok Uyarıları</div>
                        <div class="stat-value" style="color:${p.alerts_count > 0 ? '#ef4444' : '#10b981'};">
                            ${p.alerts_count > 0 ? '⚠️ ' + p.alerts_count : '✅ 0'}
                        </div>
                    </div>
                </div>
                ${p.last_data_date ? `<div style="margin-top:14px;color:#64748b;font-size:.85rem;">
                    <i class="fas fa-calendar-alt" style="margin-right:6px;"></i>Son veri tarihi: ${p.last_data_date}
                </div>` : ''}
            </div>`;
    }

    // Hızlı eylem butonları
    html += `
        <div class="card">
            <h3 style="margin-bottom:16px;"><i class="fas fa-bolt" style="color:#f59e0b;margin-right:8px;"></i> Hızlı Erişim</h3>
            <div style="display:flex;gap:12px;flex-wrap:wrap;">
                <button class="btn-primary" onclick="document.querySelector('[data-page=upload]').click()">
                    <i class="fas fa-upload"></i> Yeni Veri Yükle
                </button>
                <button class="btn-secondary" onclick="document.querySelector('[data-page=analysis]').click()" style="background:#f1f5f9;color:#475569;border:1.5px solid #e2e8f0;padding:10px 18px;border-radius:8px;cursor:pointer;font-weight:600;">
                    <i class="fas fa-chart-bar"></i> Analizi Gör
                </button>
                <button class="btn-secondary" onclick="document.querySelector('[data-page=abc]').click()" style="background:#f1f5f9;color:#475569;border:1.5px solid #e2e8f0;padding:10px 18px;border-radius:8px;cursor:pointer;font-weight:600;">
                    <i class="fas fa-layer-group"></i> ABC Analizi
                </button>
                <button class="btn-secondary" onclick="document.querySelector('[data-page=alerts]').click()" style="background:#f1f5f9;color:#475569;border:1.5px solid #e2e8f0;padding:10px 18px;border-radius:8px;cursor:pointer;font-weight:600;">
                    <i class="fas fa-bell"></i> Uyarılar
                </button>
            </div>
        </div>
    </div>`;

    content.innerHTML = html;
}

// ===== GEÇMİŞ =====

async function loadHistory() {
    const token = localStorage.getItem('userToken');
    const content = document.getElementById('historyContent');
    content.innerHTML = '<div style="text-align:center;padding:30px;"><i class="fas fa-spinner fa-spin" style="font-size:2rem;color:#2563eb;"></i><p style="margin-top:12px;">Geçmiş yükleniyor...</p></div>';

    try {
        const res = await fetch('/api/history/list', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);

        if (!data.history || data.history.length === 0) {
            content.innerHTML = `<div class="info-card" style="text-align:center;padding:40px;">
                <i class="fas fa-folder-open" style="font-size:3rem;color:#94a3b8;margin-bottom:16px;"></i>
                <h3 style="color:#64748b;">Henüz analiz geçmişi yok</h3>
                <p style="color:#94a3b8;">Veri yükleyip analiz/tahmin yaptıktan sonra burada görünür.</p>
            </div>`;
            return;
        }

        const typeLabels = { analysis: 'Analiz', prediction: 'Tahmin' };
        const typeColors = { analysis: '#2563eb', prediction: '#10b981' };
        const typeIcons = { analysis: 'fa-chart-bar', prediction: 'fa-brain' };

        let html = `<div class="card"><h3 style="margin-bottom:16px;">${data.history.length} Kayıt Bulundu</h3>
            <div style="overflow-x:auto;"><table>
                <thead><tr><th>Tür</th><th>Tarih</th><th>Boyut</th><th>İşlem</th></tr></thead>
                <tbody>`;

        data.history.forEach((item, i) => {
            const color = typeColors[item.type] || '#64748b';
            const icon = typeIcons[item.type] || 'fa-file';
            const label = typeLabels[item.type] || item.type;
            html += `<tr style="background:${i%2===0?'#fff':'#f8fafc'}">
                <td><span style="background:${color}20;color:${color};padding:4px 12px;border-radius:20px;font-weight:600;font-size:.85rem;">
                    <i class="fas ${icon}"></i> ${label}
                </span></td>
                <td>${item.display_date}</td>
                <td>${item.size_kb} KB</td>
                <td>
                    <button onclick="viewHistoryEntry('${item.filename}','${item.type}')"
                        style="background:${color};color:#fff;border:none;padding:6px 14px;border-radius:6px;cursor:pointer;font-size:.85rem;">
                        <i class="fas fa-eye"></i> Görüntüle
                    </button>
                </td>
            </tr>`;
        });

        html += '</tbody></table></div></div>';
        html += '<div id="historyDetail" style="margin-top:20px;"></div>';
        content.innerHTML = html;
    } catch (err) {
        content.innerHTML = `<div class="alert-item critical"><i class="fas fa-exclamation-circle"></i> Hata: ${err.message}</div>`;
    }
}

async function viewHistoryEntry(filename, type) {
    const token = localStorage.getItem('userToken');
    const detail = document.getElementById('historyDetail');
    if (!detail) return;
    detail.innerHTML = '<div style="text-align:center;padding:20px;"><i class="fas fa-spinner fa-spin" style="color:#2563eb;"></i> Yükleniyor...</div>';

    try {
        const res = await fetch(`/api/history/load?filename=${encodeURIComponent(filename)}`, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const resp = await res.json();
        if (!res.ok) throw new Error(resp.message);
        const data = resp.data;

        let html = `<div class="card"><h3 style="margin-bottom:16px;"><i class="fas fa-file-alt"></i> ${filename}</h3>`;

        if (type === 'analysis') {
            html += `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px;">
                <div class="stat-card"><div class="stat-label">Toplam Gelir</div><div class="stat-value">${formatCurrency(data.total_revenue||0)}</div></div>
                <div class="stat-card"><div class="stat-label">Gider</div><div class="stat-value">${formatCurrency(data.total_expense||0)}</div></div>
                <div class="stat-card"><div class="stat-label">Net Kâr</div><div class="stat-value">${formatCurrency(data.net_profit||0)}</div></div>
                <div class="stat-card"><div class="stat-label">Ürün Sayısı</div><div class="stat-value">${data.product_count||0}</div></div>
            </div>`;
        } else if (type === 'prediction') {
            const preds = data.predictions || [];
            html += `<p style="margin-bottom:12px;color:#64748b;">Model doğruluğu: <strong>${data.accuracy}%</strong> — ${preds.length} ürün tahmini</p>
                <table><thead><tr><th>Ürün</th><th>Toplam Tahmin</th><th>Doğruluk</th></tr></thead><tbody>`;
            preds.slice(0, 10).forEach((p, i) => {
                html += `<tr style="background:${i%2===0?'#fff':'#f8fafc'}">
                    <td>${p.product}</td>
                    <td>${Math.round(p.total_predicted).toLocaleString()}</td>
                    <td>%${p.accuracy?.toFixed(1)||'—'}</td>
                </tr>`;
            });
            html += '</tbody></table>';
        }

        html += `<button onclick="document.getElementById('historyDetail').innerHTML=''"
            style="margin-top:16px;background:#f1f5f9;color:#475569;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;">
            <i class="fas fa-times"></i> Kapat
        </button></div>`;
        detail.innerHTML = html;
    } catch (err) {
        detail.innerHTML = `<div class="alert-item critical">Hata: ${err.message}</div>`;
    }
}

// ===== KAR MARJI ANALİZİ =====

async function runMarginAnalysis() {
    if (!currentData || !currentData.file_id) {
        alert('Lütfen önce veri yükleyip analiz edin!');
        return;
    }
    const token = localStorage.getItem('userToken');
    const content = document.getElementById('marginContent');
    content.innerHTML = '<div style="text-align:center;padding:30px;"><i class="fas fa-spinner fa-spin" style="font-size:2rem;color:#2563eb;"></i><p style="margin-top:12px;">Kar marjları hesaplanıyor...</p></div>';

    try {
        const res = await fetch('/api/data/margin-analysis', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ file_id: currentData.file_id })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        renderMarginResults(data);
    } catch (err) {
        content.innerHTML = `<div class="alert-item critical"><i class="fas fa-exclamation-circle"></i> Hata: ${err.message}</div>`;
    }
}

function renderMarginResults(data) {
    const { products, overall } = data;
    const fmt = v => v.toLocaleString('tr-TR', {minimumFractionDigits:2, maximumFractionDigits:2});
    const pctColor = p => p >= 30 ? '#10b981' : p >= 15 ? '#f59e0b' : '#ef4444';

    // Genel özet kartları
    let html = `
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px;">
            <div class="stat-card"><div class="stat-label">Toplam Gelir</div><div class="stat-value">₺${fmt(overall.revenue)}</div></div>
            <div class="stat-card"><div class="stat-label">Toplam Maliyet</div><div class="stat-value">₺${fmt(overall.cost)}</div></div>
            <div class="stat-card"><div class="stat-label">Net Kâr</div><div class="stat-value" style="color:${overall.profit>=0?'#10b981':'#ef4444'}">₺${fmt(overall.profit)}</div></div>
            <div class="stat-card"><div class="stat-label">Genel Marj</div><div class="stat-value" style="color:${pctColor(overall.margin_pct)}">%${overall.margin_pct}</div></div>
        </div>`;

    // Grafik
    html += `<div class="card" style="margin-bottom:24px;">
        <h3 style="margin-bottom:16px;">Ürün Kar Marjı Grafiği (İlk 15 Ürün)</h3>
        <canvas id="marginChart" height="120"></canvas>
    </div>`;

    // Tablo
    html += `<div class="card"><h3 style="margin-bottom:16px;">Ürün Bazında Kar Marjı</h3>
        <div style="overflow-x:auto;"><table>
            <thead><tr><th>Ürün</th><th>Gelir</th><th>Maliyet</th><th>Kâr</th><th>Marj %</th></tr></thead>
            <tbody>`;

    products.forEach((p, i) => {
        const color = pctColor(p.margin_pct);
        html += `<tr style="background:${i%2===0?'#fff':'#f8fafc'}">
            <td><strong>${p.product}</strong></td>
            <td>₺${fmt(p.revenue)}</td>
            <td>₺${fmt(p.cost)}</td>
            <td style="color:${p.profit>=0?'#10b981':'#ef4444'}">₺${fmt(p.profit)}</td>
            <td><span style="background:${color}20;color:${color};font-weight:700;padding:3px 10px;border-radius:20px;border:1.5px solid ${color};">%${p.margin_pct}</span></td>
        </tr>`;
    });
    html += '</tbody></table></div></div>';

    document.getElementById('marginContent').innerHTML = html;

    // Grafiği çiz
    const top15 = products.slice(0, 15);
    const bgColors = top15.map(p => pctColor(p.margin_pct) + 'cc');
    const borderColors = top15.map(p => pctColor(p.margin_pct));

    setTimeout(() => {
        const ctx = getOrDestroyChart('marginChart');
        if (ctx) {
            registerChart('marginChart', new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: top15.map(p => p.product),
                    datasets: [{
                        label: 'Kar Marjı %',
                        data: top15.map(p => p.margin_pct),
                        backgroundColor: bgColors,
                        borderColor: borderColors,
                        borderWidth: 2,
                        borderRadius: 6,
                    }]
                },
                options: {
                    responsive: true,
                    indexAxis: 'y',
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { beginAtZero: true, ticks: { callback: v => '%' + v } },
                        y: { ticks: { font: { size: 11 } } }
                    }
                }
            }));
        }
    }, 50);
}

// ===== EOQ HESAPLAYICI =====

async function runEoqCalc() {
    if (!currentData || !currentData.file_id) {
        alert('Lütfen önce veri yükleyip analiz edin!');
        return;
    }

    const holdingCostPct = parseFloat(document.getElementById('holdingCostPct').value) || 20;
    const orderCost = parseFloat(document.getElementById('orderCost').value) || 50;
    const token = localStorage.getItem('userToken');
    const resultsDiv = document.getElementById('eoqResults');
    resultsDiv.innerHTML = '<div style="text-align:center;padding:30px;"><i class="fas fa-spinner fa-spin" style="font-size:2rem;color:#2563eb;"></i><p style="margin-top:12px;">Hesaplanıyor...</p></div>';

    try {
        const res = await fetch('/api/tools/eoq', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ file_id: currentData.file_id, holding_cost_pct: holdingCostPct, order_cost: orderCost })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        renderEoqResults(data);
    } catch (err) {
        resultsDiv.innerHTML = `<div class="alert-item critical"><i class="fas fa-exclamation-circle"></i> Hata: ${err.message}</div>`;
    }
}

function renderEoqResults(data) {
    const { results, holding_cost_pct, order_cost } = data;
    let html = `
        <div class="card">
            <h3 style="margin-bottom:4px;">Optimal Sipariş Miktarları</h3>
            <p style="color:#64748b;margin-bottom:16px;font-size:.88rem;">
                Tutma maliyeti: %${holding_cost_pct} — Sipariş maliyeti: ₺${order_cost}
            </p>
            <div style="overflow-x:auto;">
            <table>
                <thead><tr>
                    <th>Ürün</th>
                    <th>Yıllık Talep</th>
                    <th>Birim Fiyat</th>
                    <th><span title="Economic Order Quantity — Optimal sipariş miktarı">EOQ ⓘ</span></th>
                    <th>Yılda Sipariş</th>
                    <th>Sipariş Aralığı (gün)</th>
                    <th>Yıllık Maliyet</th>
                </tr></thead>
                <tbody>`;

    results.forEach((r, i) => {
        html += `<tr style="background:${i%2===0?'#fff':'#f8fafc'}">
            <td><strong>${r.product}</strong></td>
            <td>${r.annual_demand.toLocaleString('tr-TR')}</td>
            <td>₺${r.unit_price.toLocaleString('tr-TR', {minimumFractionDigits:2,maximumFractionDigits:2})}</td>
            <td><strong style="color:#2563eb;">${r.eoq.toLocaleString('tr-TR')}</strong></td>
            <td>${r.orders_per_year}</td>
            <td>${r.cycle_days} gün</td>
            <td>₺${r.total_annual_cost.toLocaleString('tr-TR', {minimumFractionDigits:2,maximumFractionDigits:2})}</td>
        </tr>`;
    });

    html += `</tbody></table></div>
        <div style="margin-top:16px;padding:14px;background:#eff6ff;border-radius:8px;font-size:.85rem;color:#1e40af;">
            <strong>EOQ Formülü:</strong> EOQ = √(2 × Yıllık Talep × Sipariş Maliyeti / Birim Tutma Maliyeti)
            — En az toplam maliyetle sipariş verilmesi gereken miktarı gösterir.
        </div>
        </div>`;

    document.getElementById('eoqResults').innerHTML = html;
}

// ===== ABC ANALİZİ =====

async function runAbcAnalysis() {
    if (!currentData || !currentData.file_id) {
        alert('Lütfen önce veri yükleyip analiz edin!');
        return;
    }

    const token = localStorage.getItem('userToken');
    const content = document.getElementById('abcContent');
    content.innerHTML = '<div style="text-align:center;padding:40px;"><i class="fas fa-spinner fa-spin" style="font-size:2rem;color:#2563eb;"></i><p style="margin-top:12px;">ABC analizi hesaplanıyor...</p></div>';

    try {
        const res = await fetch('/api/data/abc-analysis', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ file_id: currentData.file_id })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        renderAbcResults(data);
    } catch (err) {
        content.innerHTML = `<div class="alert-item critical"><i class="fas fa-exclamation-circle"></i> Hata: ${err.message}</div>`;
    }
}

function renderAbcResults(data) {
    const { products, summary, value_label, total_value } = data;

    const classColors = { A: '#10b981', B: '#f59e0b', C: '#ef4444' };
    const classBg    = { A: '#d1fae5', B: '#fef3c7', C: '#fee2e2' };

    let html = `
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:28px;">
            ${['A','B','C'].map(cls => `
            <div style="background:${classBg[cls]};border:2px solid ${classColors[cls]};border-radius:12px;padding:20px;text-align:center;">
                <div style="font-size:2rem;font-weight:800;color:${classColors[cls]};">${cls}</div>
                <div style="font-size:1.4rem;font-weight:700;margin:4px 0;">${summary[cls].count} Ürün</div>
                <div style="color:#475569;font-size:.9rem;">${value_label} Katkısı: <strong>%${summary[cls].revenue_pct}</strong></div>
            </div>`).join('')}
        </div>
        <div style="margin-bottom:12px;display:flex;align-items:center;gap:12px;">
            <h3 style="margin:0;">Ürün Sınıflandırması</h3>
            <span style="font-size:.85rem;color:#64748b;">(${value_label} bazlı)</span>
        </div>
        <div style="overflow-x:auto;">
        <table>
            <thead><tr>
                <th>#</th><th>Ürün</th>
                <th>${value_label}</th>
                <th>Pay %</th>
                <th>Kümülatif %</th>
                <th>Sınıf</th>
            </tr></thead>
            <tbody>`;

    products.forEach((p, i) => {
        const bg = classBg[p.class];
        const col = classColors[p.class];
        html += `<tr style="background:${i % 2 === 0 ? '#fff' : '#f8fafc'}">
            <td>${i + 1}</td>
            <td><strong>${p.product}</strong></td>
            <td>${Number(p.value).toLocaleString('tr-TR', {maximumFractionDigits:0})}</td>
            <td>%${p.pct}</td>
            <td>%${p.cumulative_pct}</td>
            <td><span style="background:${bg};color:${col};font-weight:700;padding:4px 12px;border-radius:20px;border:1.5px solid ${col};">${p.class}</span></td>
        </tr>`;
    });

    html += `</tbody></table></div>
        <div style="margin-top:20px;padding:16px;background:#f1f5f9;border-radius:10px;font-size:.88rem;color:#475569;">
            <strong>ABC Analizi Nedir?</strong> — A sınıfı ürünler toplam gelirin %80'ini oluşturur, öncelikli yönetim gerektirir.
            B sınıfı orta önem taşır (%15). C sınıfı çok sayıda fakat düşük katkılı ürünlerdir (%5).
        </div>`;

    document.getElementById('abcContent').innerHTML = html;
}
