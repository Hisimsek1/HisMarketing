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

from backend.data_intelligence import DataIntelligence
from backend.prediction_engine import PredictionEngine
from backend.external_data import ExternalDataProvider
from backend.utils import (
    generate_file_id, generate_user_token, hash_password, verify_password,
    allowed_file, read_data_file, save_user_data, load_user_data,
    create_monthly_aggregation, create_product_summary, NumpyEncoder
)

# Flask app configuration
app = Flask(__name__)
app.config['SECRET_KEY'] = 'hismarketing_secret_key_2024'
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
def upload_data():
    """Veri dosyası yükleme"""
    try:
        # Token kontrolü
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        user_email = None
        
        for email, user_data in users_db.items():
            if user_data['token'] == token:
                user_email = email
                break
        
        if not user_email:
            return jsonify({'success': False, 'message': 'Yetkisiz erişim'}), 401
        
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
def analyze_data():
    """Veri analizi"""
    try:
        # Token kontrolü
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        user_email = None
        
        for email, user_data in users_db.items():
            if user_data['token'] == token:
                user_email = email
                break
        
        if not user_email:
            return jsonify({'success': False, 'message': 'Yetkisiz erişim'}), 401
        
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
def generate_prediction():
    """Tahmin oluştur"""
    try:
        # Token kontrolü
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        user_email = None
        
        for email, user_data in users_db.items():
            if user_data['token'] == token:
                user_email = email
                break
        
        if not user_email:
            return jsonify({'success': False, 'message': 'Yetkisiz erişim'}), 401
        
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
def download_pdf():
    """PDF raporu indir"""
    try:
        # Token kontrolü
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        user_email = None
        
        for email, user_data in users_db.items():
            if user_data['token'] == token:
                user_email = email
                break
        
        if not user_email:
            return jsonify({'success': False, 'message': 'Yetkisiz erişim'}), 401
        
        report_type = request.args.get('type', 'analysis')
        
        # Basit PDF oluşturma (gerçek uygulamada ReportLab kullanılır)
        # Şimdilik JSON olarak döndür
        data = load_user_data(user_email, report_type)
        
        if not data:
            return jsonify({'success': False, 'message': 'Rapor bulunamadı'}), 404
        
        # JSON dosyası olarak indir
        import io
        output = io.BytesIO()
        output.write(json.dumps(data, cls=NumpyEncoder, indent=2, ensure_ascii=False).encode('utf-8'))
        output.seek(0)
        
        return send_file(
            output,
            as_attachment=True,
            download_name=f'hismarketing_{report_type}_raporu.json',
            mimetype='application/json'
        )
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'İndirme hatası: {str(e)}'}), 500


@app.route('/api/reports/excel', methods=['GET'])
def download_excel():
    """Excel raporu indir"""
    try:
        # Token kontrolü
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        user_email = None
        
        for email, user_data in users_db.items():
            if user_data['token'] == token:
                user_email = email
                break
        
        if not user_email:
            return jsonify({'success': False, 'message': 'Yetkisiz erişim'}), 401
        
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


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
