"""
HisMarketing Flask Application
Ana uygulama dosyası
"""

from flask import Flask, render_template, request, jsonify, send_file, session
from flask_cors import CORS
from werkzeug.utils import secure_filename
import os
import json
from datetime import datetime
import pandas as pd
import functools

from backend.data_intelligence import DataIntelligence
from backend.prediction_engine import PredictionEngine
from backend.external_data import ExternalDataProvider
from backend.pdf_report import generate_analysis_pdf, generate_prediction_pdf
from backend.utils import (
    generate_file_id, generate_user_token, hash_password, verify_password,
    allowed_file, read_data_file, save_user_data, load_user_data,
    create_monthly_aggregation, create_product_summary, NumpyEncoder
)

# Flask app configuration
app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'hismarketing_secret_key_2024')
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB max file size

CORS(app)

# Create necessary directories
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs('user_data', exist_ok=True)

# User database file
USERS_DB_FILE = 'user_data/users.json'

def load_users_db():
    """Kullanıcı veritabanını yükle"""
    if os.path.exists(USERS_DB_FILE):
        try:
            with open(USERS_DB_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            return {}
    return {}

def save_users_db(users_db):
    """Kullanıcı veritabanını kaydet"""
    with open(USERS_DB_FILE, 'w', encoding='utf-8') as f:
        json.dump(users_db, f, ensure_ascii=False, indent=2)

# Load users from file
users_db = load_users_db()
user_files = {}


def get_user_from_token(token: str):
    """Token'dan kullanıcı e-postasını bul"""
    if not token:
        return None
    for email, user_data in users_db.items():
        if user_data.get('token') == token:
            return email
    return None


def require_auth(f):
    """Authentication decorator"""
    @functools.wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        user_email = get_user_from_token(token)
        if not user_email:
            return jsonify({'success': False, 'message': 'Yetkisiz erişim'}), 401
        return f(user_email, *args, **kwargs)
    return decorated


# ===== ROUTES =====

@app.route('/')
def index():
    """Ana sayfa"""
    return render_template('index.html')


@app.route('/auth')
def auth():
    """Giriş / Kayıt sayfası"""
    return render_template('auth.html')


@app.route('/dashboard')
def dashboard():
    """Dashboard sayfası"""
    return render_template('dashboard.html')


# ===== API ENDPOINTS =====

@app.route('/api/auth/register', methods=['POST'])
def register():
    """Kullanıcı kaydı"""
    try:
        data = request.json
        name = data.get('name')
        email = data.get('email')
        company = data.get('company')
        password = data.get('password')
        
        if not all([name, email, company, password]):
            return jsonify({'success': False, 'message': 'Tüm alanları doldurun'}), 400
        
        # Kullanıcı zaten var mı?
        if email in users_db:
            return jsonify({'success': False, 'message': 'Bu e-posta adresi zaten kayıtlı'}), 400
        
        # Yeni kullanıcı oluştur
        user_token = generate_user_token(email)
        users_db[email] = {
            'name': name,
            'email': email,
            'company': company,
            'password': hash_password(password),
            'token': user_token,
            'created_at': datetime.now().isoformat()
        }
        
        # Kullanıcıları dosyaya kaydet
        save_users_db(users_db)
        
        return jsonify({
            'success': True,
            'token': user_token,
            'name': name,
            'message': 'Kayıt başarılı'
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'Kayıt hatası: {str(e)}'}), 500


@app.route('/api/auth/login', methods=['POST'])
def login():
    """Kullanıcı girişi"""
    try:
        data = request.json
        email = data.get('email')
        password = data.get('password')
        
        if not all([email, password]):
            return jsonify({'success': False, 'message': 'E-posta ve şifre gerekli'}), 400
        
        # Kullanıcı var mı?
        user = users_db.get(email)
        if not user:
            return jsonify({'success': False, 'message': 'Kullanıcı bulunamadı'}), 404
        
        # Şifre doğru mu?
        if not verify_password(password, user['password']):
            return jsonify({'success': False, 'message': 'Hatalı şifre'}), 401
        
        return jsonify({
            'success': True,
            'token': user['token'],
            'name': user['name'],
            'message': 'Giriş başarılı'
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'Giriş hatası: {str(e)}'}), 500


@app.route('/api/data/upload', methods=['POST'])
@require_auth
def upload_data(user_email):
    """Veri dosyası yükleme"""
    try:
        # Dosya kontrolü
        if 'file' not in request.files:
            return jsonify({'success': False, 'message': 'Dosya bulunamadı'}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({'success': False, 'message': 'Dosya seçilmedi'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'success': False, 'message': 'Desteklenmeyen dosya formatı'}), 400
        
        # Dosyayı kaydet
        filename = secure_filename(file.filename)
        file_id = generate_file_id()
        file_ext = filename.rsplit('.', 1)[1].lower()
        save_filename = f"{file_id}.{file_ext}"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], save_filename)
        
        file.save(filepath)
        
        # Dosyayı oku ve analiz et
        df = read_data_file(filepath)
        
        # Data Intelligence ile analiz
        di = DataIntelligence()
        file_info = di.analyze_file(df)
        
        # Kullanıcı dosyasını kaydet
        if user_email not in user_files:
            user_files[user_email] = {}
        
        user_files[user_email][file_id] = {
            'file_id': file_id,
            'filename': filename,
            'filepath': filepath,
            'uploaded_at': datetime.now().isoformat(),
            'info': file_info,
            'data_intelligence': di
        }
        
        return jsonify({
            'success': True,
            'file_id': file_id,
            'filename': filename,
            'row_count': file_info['row_count'],
            'column_count': file_info['column_count'],
            'detected_columns': list(file_info['detected_columns'].values()),
            'message': 'Dosya başarıyla yüklendi'
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'Yükleme hatası: {str(e)}'}), 500


@app.route('/api/data/analyze', methods=['POST'])
@require_auth
def analyze_data(user_email):
    """Veri analizi"""
    try:
        # Dosya ID
        file_id = request.json.get('file_id')
        
        if not file_id or user_email not in user_files or file_id not in user_files[user_email]:
            return jsonify({'success': False, 'message': 'Dosya bulunamadı'}), 404
        
        # Dosya bilgilerini al
        file_data = user_files[user_email][file_id]
        filepath = file_data['filepath']
        di = file_data['data_intelligence']
        
        # DataFrame'i oku ve hazırla
        df = read_data_file(filepath)
        df_prepared = di.prepare_dataframe(df)
        df_features = di.extract_features(df_prepared)
        
        # Analiz yap
        stats = di.get_summary_statistics(df_features)
        
        # Aylık satış trendi
        date_col = di.get_column('date')
        quantity_col = di.get_column('quantity')
        revenue_col = di.get_column('revenue')
        
        monthly_sales = []
        if date_col and quantity_col:
            monthly_df = create_monthly_aggregation(df_features, date_col, quantity_col)
            monthly_sales = [
                {'month': row['year_month'], 'sales': float(row[quantity_col])}
                for _, row in monthly_df.iterrows()
            ]
        
        # Ürün bazlı kâr
        product_col = di.get_column('product')
        cost_col = di.get_column('cost')
        
        product_profits = []
        if product_col and revenue_col and cost_col:
            product_summary = create_product_summary(df_features, product_col, quantity_col, revenue_col, cost_col)
            product_profits = [
                {
                    'product': row['product'],
                    'quantity': int(row['total_quantity']),
                    'revenue': float(row.get('total_revenue', 0)),
                    'profit': float(row.get('profit', 0))
                }
                for _, row in product_summary.head(20).iterrows()
            ]
        
        # Sonuçları kaydet
        analysis_result = {
            'total_revenue': stats.get('total_revenue', 0),
            'total_expense': stats.get('total_cost', 0),
            'net_profit': stats.get('total_profit', 0),
            'product_count': stats.get('unique_products', 0),
            'monthly_sales': monthly_sales,
            'product_profits': product_profits,
            'top_products': product_profits[:10]
        }
        
        # Kullanıcı verisi olarak kaydet
        save_user_data(user_email, 'analysis', analysis_result)
        
        # Dosya verilerine ekle
        user_files[user_email][file_id]['analysis'] = analysis_result
        user_files[user_email][file_id]['df'] = df_features
        
        return jsonify({
            'success': True,
            **analysis_result
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': f'Analiz hatası: {str(e)}'}), 500


@app.route('/api/prediction/generate', methods=['POST'])
@require_auth
def generate_prediction(user_email):
    """Tahmin oluştur"""
    try:
        # Dosya ID
        file_id = request.json.get('file_id')
        
        if not file_id or user_email not in user_files or file_id not in user_files[user_email]:
            return jsonify({'success': False, 'message': 'Dosya bulunamadı'}), 404
        
        # Dosya bilgilerini al
        file_data = user_files[user_email][file_id]
        
        if 'df' not in file_data:
            return jsonify({'success': False, 'message': 'Önce veri analizi yapın'}), 400
        
        df = file_data['df']
        di = file_data['data_intelligence']
        
        # Sütunları al
        product_col = di.get_column('product')
        date_col = di.get_column('date')
        quantity_col = di.get_column('quantity')
        
        if not all([product_col, date_col, quantity_col]):
            return jsonify({'success': False, 'message': 'Gerekli sütunlar bulunamadı'}), 400
        
        # Tahmin motoru
        pe = PredictionEngine()
        
        # Tahmin oluştur
        prediction_result = pe.generate_predictions(
            df, product_col, date_col, quantity_col, top_n=15
        )
        
        # Kullanıcı verisi olarak kaydet
        save_user_data(user_email, 'prediction', prediction_result)
        
        # Dosya verilerine ekle
        user_files[user_email][file_id]['prediction'] = prediction_result
        
        return jsonify({
            'success': True,
            **prediction_result
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': f'Tahmin hatası: {str(e)}'}), 500


@app.route('/api/reports/pdf', methods=['GET'])
@require_auth
def download_pdf(user_email):
    """PDF raporu indir"""
    try:
        report_type = request.args.get('type', 'analysis')
        data = load_user_data(user_email, report_type)

        if not data:
            return jsonify({'success': False, 'message': 'Rapor bulunamadı'}), 404

        user_info = users_db.get(user_email, {})
        user_name = user_info.get('name', '')
        company = user_info.get('company', '')

        if report_type == 'analysis':
            pdf_buffer = generate_analysis_pdf(data, user_name=user_name, company=company)
        else:
            pdf_buffer = generate_prediction_pdf(data, user_name=user_name, company=company)

        return send_file(
            pdf_buffer,
            as_attachment=True,
            download_name=f'hismarketing_{report_type}_raporu.pdf',
            mimetype='application/pdf'
        )
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'İndirme hatası: {str(e)}'}), 500


@app.route('/api/reports/excel', methods=['GET'])
@require_auth
def download_excel(user_email):
    """Excel raporu indir"""
    try:
        report_type = request.args.get('type', 'prediction')
        
        data = load_user_data(user_email, report_type)
        
        if not data:
            return jsonify({'success': False, 'message': 'Rapor bulunamadı'}), 404
        
        # Excel oluştur
        import io
        output = io.BytesIO()
        
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            if report_type == 'prediction' and 'predictions' in data:
                # Tahmin verileri
                predictions_data = []
                for pred in data['predictions']:
                    row = {'Ürün': pred['product']}
                    for i, val in enumerate(pred['monthly_predictions'], 1):
                        row[f'Ay {i}'] = val
                    row['Toplam'] = pred['total_predicted']
                    predictions_data.append(row)
                
                df_pred = pd.DataFrame(predictions_data)
                df_pred.to_excel(writer, sheet_name='Tahminler', index=False)
        
        output.seek(0)
        
        return send_file(
            output,
            as_attachment=True,
            download_name=f'hismarketing_{report_type}_raporu.xlsx',
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'İndirme hatası: {str(e)}'}), 500


# ===== PERIOD COMPARISON API =====

@app.route('/api/data/compare', methods=['POST'])
@require_auth
def compare_periods(user_email):
    """
    İki dönem arasında satış karşılaştırması yap.
    Body: { file_id, period1_start, period1_end, period2_start, period2_end }
    Tarihler ISO format: 'YYYY-MM-DD'
    """
    try:
        body = request.json
        file_id = body.get('file_id')

        if not file_id or user_email not in user_files or file_id not in user_files[user_email]:
            return jsonify({'success': False, 'message': 'Dosya bulunamadı'}), 404

        file_data = user_files[user_email][file_id]
        if 'df' not in file_data:
            return jsonify({'success': False, 'message': 'Önce veri analizi yapın'}), 400

        df = file_data['df'].copy()
        di = file_data['data_intelligence']

        date_col = di.get_column('date')
        quantity_col = di.get_column('quantity')
        revenue_col = di.get_column('revenue')
        product_col = di.get_column('product')

        if not date_col or not quantity_col:
            return jsonify({'success': False, 'message': 'Tarih veya miktar sütunu bulunamadı'}), 400

        df[date_col] = pd.to_datetime(df[date_col], errors='coerce')
        df = df.dropna(subset=[date_col])

        p1_start = pd.to_datetime(body.get('period1_start'))
        p1_end = pd.to_datetime(body.get('period1_end'))
        p2_start = pd.to_datetime(body.get('period2_start'))
        p2_end = pd.to_datetime(body.get('period2_end'))

        mask1 = (df[date_col] >= p1_start) & (df[date_col] <= p1_end)
        mask2 = (df[date_col] >= p2_start) & (df[date_col] <= p2_end)

        df1 = df[mask1]
        df2 = df[mask2]

        def period_stats(dff):
            stats = {
                'total_quantity': float(dff[quantity_col].sum()),
                'avg_quantity': float(dff[quantity_col].mean()) if len(dff) else 0,
                'row_count': int(len(dff)),
            }
            if revenue_col and revenue_col in dff.columns:
                stats['total_revenue'] = float(dff[revenue_col].sum())
            return stats

        stats1 = period_stats(df1)
        stats2 = period_stats(df2)

        def pct_change(old, new):
            if old == 0:
                return None
            return round((new - old) / old * 100, 1)

        comparison = {
            'period1': {'label': f"{p1_start.strftime('%d.%m.%Y')} - {p1_end.strftime('%d.%m.%Y')}", **stats1},
            'period2': {'label': f"{p2_start.strftime('%d.%m.%Y')} - {p2_end.strftime('%d.%m.%Y')}", **stats2},
            'changes': {
                'quantity_pct': pct_change(stats1['total_quantity'], stats2['total_quantity']),
                'revenue_pct': pct_change(
                    stats1.get('total_revenue', 0), stats2.get('total_revenue', 0)
                ) if 'total_revenue' in stats1 else None,
            },
        }

        # Ürün bazlı karşılaştırma
        if product_col:
            prod1 = df1.groupby(product_col)[quantity_col].sum().rename('p1')
            prod2 = df2.groupby(product_col)[quantity_col].sum().rename('p2')
            prod_df = pd.concat([prod1, prod2], axis=1).fillna(0)
            prod_df['change_pct'] = prod_df.apply(
                lambda r: pct_change(r['p1'], r['p2']), axis=1
            )
            prod_df = prod_df.reset_index()
            comparison['products'] = [
                {
                    'product': str(row[product_col]),
                    'period1_qty': int(row['p1']),
                    'period2_qty': int(row['p2']),
                    'change_pct': row['change_pct'],
                }
                for _, row in prod_df.nlargest(20, 'p2').iterrows()
            ]

        # Aylık trend karşılaştırması
        def monthly_series(dff, label):
            dff = dff.copy()
            dff['ym'] = dff[date_col].dt.to_period('M').astype(str)
            g = dff.groupby('ym')[quantity_col].sum().reset_index()
            g.columns = ['month', label]
            return g

        m1 = monthly_series(df1, 'period1')
        m2 = monthly_series(df2, 'period2')
        comparison['monthly_period1'] = m1.to_dict(orient='records')
        comparison['monthly_period2'] = m2.to_dict(orient='records')

        return jsonify({'success': True, **comparison})

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500


# ===== ALERTS API =====

@app.route('/api/alerts/thresholds', methods=['POST'])
@require_auth
def save_alert_thresholds(user_email):
    """Kullanıcı stok eşik değerlerini kaydet"""
    try:
        thresholds = request.json.get('thresholds', {})
        save_user_data(user_email, 'thresholds', thresholds)
        return jsonify({'success': True, 'message': 'Eşik değerleri kaydedildi'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/alerts/thresholds', methods=['GET'])
@require_auth
def get_alert_thresholds(user_email):
    """Kullanıcının kayıtlı eşik değerlerini getir"""
    try:
        thresholds = load_user_data(user_email, 'thresholds') or {}
        return jsonify({'success': True, 'thresholds': thresholds})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/alerts/check', methods=['GET'])
@require_auth
def check_alerts(user_email):
    """
    Tahmin verileri ve eşik değerlerine göre stok uyarıları üret.
    Her ürün için mevcut stok, minimum stok ve yeniden sipariş noktası
    karşılaştırılır; tahmin edilen tüketim de hesaba katılır.
    """
    try:
        prediction_data = load_user_data(user_email, 'prediction')
        thresholds = load_user_data(user_email, 'thresholds') or {}

        if not prediction_data:
            return jsonify({'success': True, 'alerts': [], 'summary': {
                'total': 0, 'critical': 0, 'warning': 0, 'ok': 0
            }})

        alerts = []
        predictions = prediction_data.get('predictions', [])

        for pred in predictions:
            product = pred['product']
            monthly_preds = pred.get('monthly_predictions', [])
            next_month_demand = monthly_preds[0] if monthly_preds else 0
            three_month_demand = sum(monthly_preds[:3]) if len(monthly_preds) >= 3 else sum(monthly_preds)
            change_pct = pred.get('metrics', {}).get('change_percentage', 0)

            threshold = thresholds.get(product, {})
            current_stock = threshold.get('current_stock', None)
            min_stock = threshold.get('min_stock', None)
            reorder_point = threshold.get('reorder_point', None)

            alert = {
                'product': product,
                'next_month_demand': round(next_month_demand),
                'three_month_demand': round(three_month_demand),
                'current_stock': current_stock,
                'min_stock': min_stock,
                'reorder_point': reorder_point,
                'accuracy': pred.get('accuracy', 0),
                'level': 'ok',
                'messages': [],
            }

            # Eşik değerleri ayarlanmışsa kontrol et
            if current_stock is not None:
                if reorder_point is not None and current_stock <= reorder_point:
                    alert['level'] = 'critical'
                    alert['messages'].append(
                        f'Stok ({current_stock}) yeniden sipariş noktasının ({reorder_point}) altında!'
                    )
                elif min_stock is not None and current_stock <= min_stock:
                    alert['level'] = 'critical'
                    alert['messages'].append(
                        f'Stok ({current_stock}) minimum seviyenin ({min_stock}) altında!'
                    )
                elif next_month_demand > 0 and current_stock < next_month_demand:
                    alert['level'] = 'warning'
                    alert['messages'].append(
                        f'Mevcut stok ({current_stock}) önümüzdeki ay tahmini talebini ({round(next_month_demand)}) karşılamaya yetmeyebilir.'
                    )
                else:
                    alert['level'] = 'ok'
            else:
                # Eşik yok — sadece yüksek değişim varsa uyar
                priority = next(
                    (p.get('priority') for p in prediction_data.get('recommendations', [])
                     if p.get('product') == product),
                    'low'
                )
                if priority == 'high':
                    alert['level'] = 'warning'
                    alert['messages'].append('Yüksek talep değişimi tespit edildi. Stok eşiği ayarlamanız önerilir.')

            alerts.append(alert)

        # Sırala: critical > warning > ok
        order = {'critical': 0, 'warning': 1, 'ok': 2}
        alerts.sort(key=lambda a: order[a['level']])

        summary = {
            'total': len(alerts),
            'critical': sum(1 for a in alerts if a['level'] == 'critical'),
            'warning': sum(1 for a in alerts if a['level'] == 'warning'),
            'ok': sum(1 for a in alerts if a['level'] == 'ok'),
        }

        return jsonify({'success': True, 'alerts': alerts, 'summary': summary})

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500


# ===== PROFILE API =====

@app.route('/api/profile', methods=['GET'])
@require_auth
def get_profile(user_email):
    """Kullanıcı profilini getir"""
    try:
        user = users_db.get(user_email, {})
        return jsonify({
            'success': True,
            'name': user.get('name', ''),
            'email': user_email,
            'company': user.get('company', ''),
            'created_at': user.get('created_at', ''),
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/profile', methods=['PUT'])
@require_auth
def update_profile(user_email):
    """Kullanıcı profilini güncelle"""
    try:
        data = request.json
        name = data.get('name', '').strip()
        company = data.get('company', '').strip()

        if not name:
            return jsonify({'success': False, 'message': 'İsim boş olamaz'}), 400

        users_db[user_email]['name'] = name
        users_db[user_email]['company'] = company
        save_users_db(users_db)

        return jsonify({'success': True, 'message': 'Profil güncellendi'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/profile/change-password', methods=['POST'])
@require_auth
def change_password(user_email):
    """Şifre değiştir"""
    try:
        data = request.json
        current_password = data.get('current_password', '')
        new_password = data.get('new_password', '')

        if not current_password or not new_password:
            return jsonify({'success': False, 'message': 'Tüm alanları doldurun'}), 400

        if len(new_password) < 6:
            return jsonify({'success': False, 'message': 'Yeni şifre en az 6 karakter olmalı'}), 400

        user = users_db.get(user_email)
        if not verify_password(current_password, user['password']):
            return jsonify({'success': False, 'message': 'Mevcut şifre hatalı'}), 401

        users_db[user_email]['password'] = hash_password(new_password)
        save_users_db(users_db)

        return jsonify({'success': True, 'message': 'Şifre başarıyla değiştirildi'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
