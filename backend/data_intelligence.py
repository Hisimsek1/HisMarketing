"""
Data Intelligence Module
Akıllı veri anlama ve sütun algılama modülü
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Any
import re
from difflib import SequenceMatcher


class DataIntelligence:
    """
    Otomatik veri anlama ve sütun eşleştirme sınıfı
    """
    
    # Sütun isimleri için anahtar kelimeler (çoklu dil desteği)
    COLUMN_PATTERNS = {
        'product': ['ürün', 'product', 'item', 'stok', 'mal', 'article', 'urun', 'name', 'ad', 'isim'],
        'date': ['tarih', 'date', 'gün', 'gun', 'day', 'zaman', 'time', 'dönem', 'donem', 'period'],
        'quantity': ['adet', 'miktar', 'quantity', 'qty', 'amount', 'sayi', 'sayı', 'number', 'count', 'piece'],
        'price': ['fiyat', 'price', 'tutar', 'ucret', 'ücret', 'cost', 'birim', 'unit'],
        'revenue': ['gelir', 'revenue', 'sales', 'satış', 'satis', 'toplam', 'total'],
        'cost': ['maliyet', 'cost', 'gider', 'expense', 'alış', 'alis', 'purchase'],
        'category': ['kategori', 'category', 'grup', 'group', 'type', 'tip', 'tür', 'tur', 'class'],
        'supplier': ['tedarikçi', 'tedarikci', 'supplier', 'vendor', 'sağlayıcı', 'saglayici'],
        'location': ['konum', 'location', 'yer', 'place', 'şube', 'sube', 'branch'],
    }
    
    def __init__(self):
        self.detected_columns = {}
        self.data_info = {}
        
    def analyze_file(self, df: pd.DataFrame) -> Dict[str, Any]:
        """
        Dosyayı analiz et ve yapıyı anla
        
        Args:
            df: Pandas DataFrame
            
        Returns:
            Analiz sonuçları
        """
        self.df = df
        
        # Temel bilgiler
        info = {
            'row_count': len(df),
            'column_count': len(df.columns),
            'columns': list(df.columns),
            'detected_columns': {},
            'data_types': {},
            'missing_values': {},
            'sample_data': {}
        }
        
        # Her sütunu analiz et
        for col in df.columns:
            info['data_types'][col] = str(df[col].dtype)
            info['missing_values'][col] = int(df[col].isnull().sum())
            info['sample_data'][col] = df[col].head(3).tolist()
        
        # Otomatik sütun eşleştirme
        self.detected_columns = self._detect_columns(df)
        info['detected_columns'] = self.detected_columns
        
        self.data_info = info
        return info
    
    def _detect_columns(self, df: pd.DataFrame) -> Dict[str, str]:
        """
        Sütunları otomatik olarak algıla ve eşleştir
        
        Args:
            df: DataFrame
            
        Returns:
            Eşleştirme sözlüğü {column_type: column_name}
        """
        detected = {}
        
        for column_type, keywords in self.COLUMN_PATTERNS.items():
            best_match = None
            best_score = 0
            
            for col in df.columns:
                col_lower = str(col).lower().strip()
                
                # İsim eşleşmesi
                for keyword in keywords:
                    # Tam eşleşme
                    if keyword in col_lower or col_lower in keyword:
                        score = len(keyword)
                        if score > best_score:
                            best_score = score
                            best_match = col
                    
                    # Benzerlik skoru
                    similarity = SequenceMatcher(None, col_lower, keyword).ratio()
                    if similarity > 0.6 and similarity * 100 > best_score:
                        best_score = similarity * 100
                        best_match = col
                
                # Veri içeriğine göre tahmin
                if column_type == 'date':
                    if self._is_date_column(df[col]):
                        score = 90
                        if score > best_score:
                            best_score = score
                            best_match = col
                
                elif column_type == 'price' or column_type == 'revenue' or column_type == 'cost':
                    if pd.api.types.is_numeric_dtype(df[col]) and df[col].max() > 0:
                        # Fiyat gibi görünen sayısal sütun
                        if df[col].median() > 1:
                            score = 60
                            if score > best_score and column_type not in detected:
                                best_score = score
                                best_match = col
                
                elif column_type == 'quantity':
                    if pd.api.types.is_numeric_dtype(df[col]):
                        # Adet gibi görünen tam sayı sütunu
                        if df[col].dtype in ['int64', 'int32'] or (df[col] % 1 == 0).all():
                            score = 65
                            if score > best_score and column_type not in detected:
                                best_score = score
                                best_match = col
            
            if best_match and best_score > 40:
                detected[column_type] = best_match
        
        return detected
    
    def _is_date_column(self, series: pd.Series) -> bool:
        """
        Sütunun tarih sütunu olup olmadığını kontrol et
        """
        try:
            # Bazı değerleri tarih olarak parse etmeyi dene
            sample = series.dropna().head(10)
            pd.to_datetime(sample, errors='raise')
            return True
        except:
            return False
    
    def get_column(self, column_type: str) -> str:
        """
        Belirli bir sütun tipinin gerçek sütun adını döndür
        
        Args:
            column_type: Sütun tipi (örn: 'product', 'date')
            
        Returns:
            Gerçek sütun adı veya None
        """
        return self.detected_columns.get(column_type)
    
    def prepare_dataframe(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        DataFrame'i analiz için hazırla
        - Tarih sütunlarını dönüştür
        - Eksik değerleri doldur
        - Veri tiplerini düzelt
        """
        df_prepared = df.copy()
        
        # Tarih sütununu dönüştür
        date_col = self.get_column('date')
        if date_col and date_col in df_prepared.columns:
            try:
                df_prepared[date_col] = pd.to_datetime(df_prepared[date_col], errors='coerce')
            except:
                pass
        
        # Sayısal sütunları dönüştür
        numeric_types = ['quantity', 'price', 'revenue', 'cost']
        for col_type in numeric_types:
            col_name = self.get_column(col_type)
            if col_name and col_name in df_prepared.columns:
                df_prepared[col_name] = pd.to_numeric(df_prepared[col_name], errors='coerce')
                
                # Eksik değerleri doldur
                if df_prepared[col_name].isnull().any():
                    # Medyan ile doldur
                    median_val = df_prepared[col_name].median()
                    if pd.notna(median_val):
                        df_prepared[col_name].fillna(median_val, inplace=True)
                    else:
                        df_prepared[col_name].fillna(0, inplace=True)
        
        # Metin sütunlarındaki eksik değerleri doldur
        text_types = ['product', 'category', 'supplier', 'location']
        for col_type in text_types:
            col_name = self.get_column(col_type)
            if col_name and col_name in df_prepared.columns:
                df_prepared[col_name].fillna('Bilinmeyen', inplace=True)
        
        return df_prepared
    
    def extract_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Ek özellikler çıkar (tarih bazlı, kategori bazlı vb.)
        """
        df_features = df.copy()
        
        # Tarih özelliklerini çıkar
        date_col = self.get_column('date')
        if date_col and date_col in df_features.columns:
            df_features[date_col] = pd.to_datetime(df_features[date_col], errors='coerce')
            
            df_features['year'] = df_features[date_col].dt.year
            df_features['month'] = df_features[date_col].dt.month
            df_features['day'] = df_features[date_col].dt.day
            df_features['day_of_week'] = df_features[date_col].dt.dayofweek
            df_features['is_weekend'] = df_features['day_of_week'].isin([5, 6]).astype(int)
            df_features['quarter'] = df_features[date_col].dt.quarter
        
        return df_features
    
    def get_summary_statistics(self, df: pd.DataFrame) -> Dict[str, Any]:
        """
        Özet istatistikler çıkar
        """
        stats = {}
        
        # Ürün sayısı
        product_col = self.get_column('product')
        if product_col:
            stats['unique_products'] = df[product_col].nunique()
            stats['top_products'] = df[product_col].value_counts().head(10).to_dict()
        
        # Toplam satış
        quantity_col = self.get_column('quantity')
        if quantity_col:
            stats['total_quantity'] = int(df[quantity_col].sum())
            stats['avg_quantity'] = float(df[quantity_col].mean())
        
        # Gelir
        revenue_col = self.get_column('revenue')
        if revenue_col:
            stats['total_revenue'] = float(df[revenue_col].sum())
            stats['avg_revenue'] = float(df[revenue_col].mean())
        
        # Maliyet
        cost_col = self.get_column('cost')
        if cost_col:
            stats['total_cost'] = float(df[cost_col].sum())
        
        # Kâr hesaplama
        if revenue_col and cost_col:
            stats['total_profit'] = stats.get('total_revenue', 0) - stats.get('total_cost', 0)
            stats['profit_margin'] = (stats['total_profit'] / stats['total_revenue'] * 100) if stats.get('total_revenue', 0) > 0 else 0
        
        return stats
