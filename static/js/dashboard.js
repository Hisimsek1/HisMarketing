// Dashboard JavaScript

let currentData = null;
let currentAnalysis = null;
let currentPrediction = null;

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
        'upload': 'uploadPage',
        'analysis': 'analysisPage',
        'prediction': 'predictionPage',
        'reports': 'reportsPage'
    };
    
    const targetPage = document.getElementById(pageMap[pageName]);
    if (targetPage) {
        targetPage.classList.add('active');
    }
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
    const ctx = document.getElementById('salesTrendChart');
    
    new Chart(ctx, {
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
    });
}

function createProductProfitChart(productData) {
    const ctx = document.getElementById('productProfitChart');
    
    const top10 = productData.slice(0, 10);
    
    new Chart(ctx, {
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
        }
    });
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
        const barCtx = document.getElementById('monthlyBarChart');
        if (barCtx) {
            new Chart(barCtx, {
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
            });
        }
        
        // Create Donut Chart
        const donutCtx = document.getElementById('productDonutChart');
        if (donutCtx) {
            const colors = [
                '#0a2463', '#2563eb', '#3b5998', '#60a5fa',
                '#93c5fd', '#3e92cc', '#1e3a8a', '#1e40af'
            ];
            
            new Chart(donutCtx, {
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
            });
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
    const ctx = document.getElementById('predictionChart');
    
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
    
    new Chart(ctx, {
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
    });
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
