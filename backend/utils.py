"""
Utility Functions
Yardımcı fonksiyonlar ve araçlar
"""

import pandas as pd
import os
import uuid
from datetime import datetime
from typing import Dict, Any
import hashlib
import json


def generate_file_id() -> str:
    """Benzersiz dosya ID'si oluştur"""
    return str(uuid.uuid4())


def generate_user_token(email: str) -> str:
    """Kullanıcı için token oluştur"""
    timestamp = str(datetime.now().timestamp())
    data = f"{email}{timestamp}"
    return hashlib.sha256(data.encode()).hexdigest()


def hash_password(password: str) -> str:
    """Şifreyi hashle"""
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password(password: str, hashed: str) -> bool:
    """Şifre doğrulama"""
    return hash_password(password) == hashed


def allowed_file(filename: str) -> bool:
    """Dosya uzantısı kontrolü"""
    allowed_extensions = {'xlsx', 'xls', 'csv'}
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in allowed_extensions


def read_data_file(filepath: str) -> pd.DataFrame:
    """
    Veri dosyasını oku (Excel veya CSV)
    
    Args:
        filepath: Dosya yolu
        
    Returns:
        DataFrame
    """
    ext = filepath.rsplit('.', 1)[1].lower()
    
    if ext == 'csv':
        # CSV için farklı encoding ve delimiter denemeleri
        encodings = ['utf-8', 'latin1', 'iso-8859-9', 'cp1254']
        delimiters = [',', ';', '\t']
        
        for encoding in encodings:
            for delimiter in delimiters:
                try:
                    df = pd.read_csv(filepath, encoding=encoding, delimiter=delimiter)
                    if len(df.columns) > 1:  # En az 2 sütun olmalı
                        return df
                except:
                    continue
        
        # Hiçbiri çalışmazsa varsayılan
        return pd.read_csv(filepath)
    
    elif ext in ['xlsx', 'xls']:
        return pd.read_excel(filepath)
    
    else:
        raise ValueError(f"Desteklenmeyen dosya formatı: {ext}")


def save_user_data(user_email: str, data_type: str, data: Any) -> str:
    """
    Kullanıcı verisini kaydet
    
    Args:
        user_email: Kullanıcı e-postası
        data_type: Veri tipi (analysis, prediction vb.)
        data: Kaydedilecek veri
        
    Returns:
        Kayıt dosya yolu
    """
    # Kullanıcı klasörü
    user_dir = os.path.join('user_data', hashlib.md5(user_email.encode()).hexdigest())
    os.makedirs(user_dir, exist_ok=True)
    
    # Dosya adı
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f"{data_type}_{timestamp}.json"
    filepath = os.path.join(user_dir, filename)
    
    # JSON olarak kaydet
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2, default=str)
    
    return filepath


def load_user_data(user_email: str, data_type: str) -> Any:
    """
    Kullanıcı verisini yükle (en son)
    
    Args:
        user_email: Kullanıcı e-postası
        data_type: Veri tipi
        
    Returns:
        Veri veya None
    """
    user_dir = os.path.join('user_data', hashlib.md5(user_email.encode()).hexdigest())
    
    if not os.path.exists(user_dir):
        return None
    
    # En son dosyayı bul
    files = [f for f in os.listdir(user_dir) if f.startswith(data_type)]
    if not files:
        return None
    
    files.sort(reverse=True)
    filepath = os.path.join(user_dir, files[0])
    
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)


def format_currency(value: float) -> str:
    """Para birimi formatla"""
    return f"₺{value:,.2f}"


def format_number(value: float, decimals: int = 0) -> str:
    """Sayı formatla"""
    if decimals == 0:
        return f"{int(value):,}"
    else:
        return f"{value:,.{decimals}f}"


def calculate_statistics(df: pd.DataFrame, column: str) -> Dict[str, float]:
    """
    Sütun için istatistikler hesapla
    
    Args:
        df: DataFrame
        column: Sütun adı
        
    Returns:
        İstatistikler
    """
    return {
        'mean': float(df[column].mean()),
        'median': float(df[column].median()),
        'std': float(df[column].std()),
        'min': float(df[column].min()),
        'max': float(df[column].max()),
        'sum': float(df[column].sum()),
        'count': int(df[column].count())
    }


def create_monthly_aggregation(df: pd.DataFrame, date_col: str, value_col: str) -> pd.DataFrame:
    """
    Aylık toplama yap
    
    Args:
        df: DataFrame
        date_col: Tarih sütunu
        value_col: Değer sütunu
        
    Returns:
        Aylık toplanmış DataFrame
    """
    df = df.copy()
    df[date_col] = pd.to_datetime(df[date_col])
    df['year_month'] = df[date_col].dt.to_period('M')
    
    monthly = df.groupby('year_month')[value_col].sum().reset_index()
    monthly['year_month'] = monthly['year_month'].astype(str)
    
    return monthly


def create_product_summary(df: pd.DataFrame, product_col: str, quantity_col: str, 
                          revenue_col: str = None, cost_col: str = None) -> pd.DataFrame:
    """
    Ürün bazlı özet oluştur
    
    Args:
        df: DataFrame
        product_col: Ürün sütunu
        quantity_col: Miktar sütunu
        revenue_col: Gelir sütunu (opsiyonel)
        cost_col: Maliyet sütunu (opsiyonel)
        
    Returns:
        Ürün özet DataFrame
    """
    summary = df.groupby(product_col).agg({
        quantity_col: 'sum'
    }).reset_index()
    
    summary.columns = ['product', 'total_quantity']
    
    if revenue_col and revenue_col in df.columns:
        revenue_sum = df.groupby(product_col)[revenue_col].sum().reset_index()
        summary = summary.merge(revenue_sum, left_on='product', right_on=product_col, how='left')
        summary = summary.drop(columns=[product_col])
        summary = summary.rename(columns={revenue_col: 'total_revenue'})
    
    if cost_col and cost_col in df.columns:
        cost_sum = df.groupby(product_col)[cost_col].sum().reset_index()
        summary = summary.merge(cost_sum, left_on='product', right_on=product_col, how='left')
        summary = summary.drop(columns=[product_col])
        summary = summary.rename(columns={cost_col: 'total_cost'})
    
    if 'total_revenue' in summary.columns and 'total_cost' in summary.columns:
        summary['profit'] = summary['total_revenue'].fillna(0) - summary['total_cost'].fillna(0)
    elif 'total_revenue' in summary.columns:
        summary['profit'] = summary['total_revenue'].fillna(0)
    else:
        summary['profit'] = 0
    
    return summary.sort_values('total_quantity', ascending=False)


class NumpyEncoder(json.JSONEncoder):
    """NumPy ve Pandas tiplerini JSON'a dönüştürmek için"""
    def default(self, obj):
        if isinstance(obj, np.integer):
            return int(obj)
        elif isinstance(obj, np.floating):
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        elif isinstance(obj, pd.Timestamp):
            return obj.isoformat()
        return super(NumpyEncoder, self).default(obj)


import numpy as np  # NumpyEncoder için gerekli
