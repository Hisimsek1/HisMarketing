"""
External Data Module
Hava durumu, özel günler ve diğer harici veri kaynaklarını yönetir
"""

import requests
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import json


class ExternalDataProvider:
    """
    Harici veri sağlayıcı sınıfı
    """
    
    # Türkiye'deki özel günler ve tatiller (2024-2025)
    SPECIAL_DAYS = {
        '2024-01-01': {'name': 'Yılbaşı', 'type': 'public_holiday', 'impact': 'high'},
        '2024-04-10': {'name': 'Ramazan Bayramı Arifesi', 'type': 'holiday_eve', 'impact': 'high'},
        '2024-04-11': {'name': 'Ramazan Bayramı 1. Gün', 'type': 'public_holiday', 'impact': 'high'},
        '2024-04-12': {'name': 'Ramazan Bayramı 2. Gün', 'type': 'public_holiday', 'impact': 'high'},
        '2024-04-13': {'name': 'Ramazan Bayramı 3. Gün', 'type': 'public_holiday', 'impact': 'high'},
        '2024-04-23': {'name': '23 Nisan Ulusal Egemenlik ve Çocuk Bayramı', 'type': 'public_holiday', 'impact': 'medium'},
        '2024-05-01': {'name': 'İşçi Bayramı', 'type': 'public_holiday', 'impact': 'medium'},
        '2024-05-19': {'name': '19 Mayıs Atatürk\'ü Anma Gençlik ve Spor Bayramı', 'type': 'public_holiday', 'impact': 'medium'},
        '2024-06-15': {'name': 'Kurban Bayramı Arifesi', 'type': 'holiday_eve', 'impact': 'high'},
        '2024-06-16': {'name': 'Kurban Bayramı 1. Gün', 'type': 'public_holiday', 'impact': 'high'},
        '2024-06-17': {'name': 'Kurban Bayramı 2. Gün', 'type': 'public_holiday', 'impact': 'high'},
        '2024-06-18': {'name': 'Kurban Bayramı 3. Gün', 'type': 'public_holiday', 'impact': 'high'},
        '2024-06-19': {'name': 'Kurban Bayramı 4. Gün', 'type': 'public_holiday', 'impact': 'high'},
        '2024-07-15': {'name': 'Demokrasi ve Milli Birlik Günü', 'type': 'public_holiday', 'impact': 'medium'},
        '2024-08-30': {'name': 'Zafer Bayramı', 'type': 'public_holiday', 'impact': 'medium'},
        '2024-10-28': {'name': 'Cumhuriyet Bayramı Arifesi', 'type': 'holiday_eve', 'impact': 'medium'},
        '2024-10-29': {'name': 'Cumhuriyet Bayramı', 'type': 'public_holiday', 'impact': 'high'},
        '2025-01-01': {'name': 'Yılbaşı', 'type': 'public_holiday', 'impact': 'high'},
        '2025-03-30': {'name': 'Ramazan Bayramı Arifesi', 'type': 'holiday_eve', 'impact': 'high'},
        '2025-03-31': {'name': 'Ramazan Bayramı 1. Gün', 'type': 'public_holiday', 'impact': 'high'},
        '2025-04-01': {'name': 'Ramazan Bayramı 2. Gün', 'type': 'public_holiday', 'impact': 'high'},
        '2025-04-02': {'name': 'Ramazan Bayramı 3. Gün', 'type': 'public_holiday', 'impact': 'high'},
        '2025-04-23': {'name': '23 Nisan', 'type': 'public_holiday', 'impact': 'medium'},
        '2025-05-01': {'name': 'İşçi Bayramı', 'type': 'public_holiday', 'impact': 'medium'},
        '2025-05-19': {'name': '19 Mayıs', 'type': 'public_holiday', 'impact': 'medium'},
        '2025-06-06': {'name': 'Kurban Bayramı Arifesi', 'type': 'holiday_eve', 'impact': 'high'},
        '2025-06-07': {'name': 'Kurban Bayramı 1. Gün', 'type': 'public_holiday', 'impact': 'high'},
        '2025-06-08': {'name': 'Kurban Bayramı 2. Gün', 'type': 'public_holiday', 'impact': 'high'},
        '2025-06-09': {'name': 'Kurban Bayramı 3. Gün', 'type': 'public_holiday', 'impact': 'high'},
        '2025-06-10': {'name': 'Kurban Bayramı 4. Gün', 'type': 'public_holiday', 'impact': 'high'},
        '2025-07-15': {'name': 'Demokrasi Günü', 'type': 'public_holiday', 'impact': 'medium'},
        '2025-08-30': {'name': 'Zafer Bayramı', 'type': 'public_holiday', 'impact': 'medium'},
        '2025-10-28': {'name': 'Cumhuriyet Bayramı Arifesi', 'type': 'holiday_eve', 'impact': 'medium'},
        '2025-10-29': {'name': 'Cumhuriyet Bayramı', 'type': 'public_holiday', 'impact': 'high'},
    }
    
    # Sezonsal etkiler
    SEASONAL_FACTORS = {
        1: {'season': 'winter', 'factor': 0.9},  # Ocak - Kış
        2: {'season': 'winter', 'factor': 0.85},  # Şubat
        3: {'season': 'spring', 'factor': 1.0},  # Mart - İlkbahar
        4: {'season': 'spring', 'factor': 1.1},  # Nisan
        5: {'season': 'spring', 'factor': 1.15},  # Mayıs
        6: {'season': 'summer', 'factor': 1.2},  # Haziran - Yaz
        7: {'season': 'summer', 'factor': 1.25},  # Temmuz
        8: {'season': 'summer', 'factor': 1.15},  # Ağustos
        9: {'season': 'fall', 'factor': 1.1},  # Eylül - Sonbahar
        10: {'season': 'fall', 'factor': 1.05},  # Ekim
        11: {'season': 'fall', 'factor': 0.95},  # Kasım
        12: {'season': 'winter', 'factor': 1.3},  # Aralık - Kış (Yılbaşı etkisi)
    }
    
    def __init__(self):
        self.weather_cache = {}
    
    def is_special_day(self, date: datetime) -> Optional[Dict]:
        """
        Verilen tarihin özel gün olup olmadığını kontrol et
        
        Args:
            date: Kontrol edilecek tarih
            
        Returns:
            Özel gün bilgisi veya None
        """
        # NaT kontrolü
        if pd.isna(date):
            return None
        
        date_str = date.strftime('%Y-%m-%d')
        return self.SPECIAL_DAYS.get(date_str)
    
    def is_weekend(self, date: datetime) -> bool:
        """
        Hafta sonu kontrolü
        """
        return date.weekday() >= 5
    
    def get_seasonal_factor(self, month: int) -> float:
        """
        Ay için sezonsal faktör
        """
        return self.SEASONAL_FACTORS.get(month, {}).get('factor', 1.0)
    
    def get_season(self, month: int) -> str:
        """
        Mevsim bilgisi
        """
        return self.SEASONAL_FACTORS.get(month, {}).get('season', 'unknown')
    
    def get_weather_data(self, location: str = 'Istanbul', date: datetime = None) -> Dict:
        """
        Hava durumu verisi al (simüle edilmiş)
        Gerçek kullanımda OpenWeatherMap, WeatherAPI gibi servisler kullanılabilir
        
        Args:
            location: Lokasyon
            date: Tarih (None ise bugün)
            
        Returns:
            Hava durumu bilgisi
        """
        if date is None:
            date = datetime.now()
        
        # Basit simülasyon
        month = date.month
        
        # Mevsime göre ortalama sıcaklık
        avg_temps = {
            1: 7, 2: 8, 3: 11, 4: 16, 5: 21, 6: 26,
            7: 29, 8: 29, 9: 25, 10: 19, 11: 14, 12: 9
        }
        
        temp = avg_temps.get(month, 15)
        
        # Yağış olasılığı (kış aylarında daha yüksek)
        rain_prob = {
            1: 0.6, 2: 0.5, 3: 0.4, 4: 0.4, 5: 0.3, 6: 0.2,
            7: 0.1, 8: 0.1, 9: 0.2, 10: 0.4, 11: 0.5, 12: 0.6
        }
        
        return {
            'temperature': temp,
            'condition': 'rainy' if rain_prob.get(month, 0.3) > 0.4 else 'sunny',
            'humidity': 60 + (month % 3) * 10,
            'rain_probability': rain_prob.get(month, 0.3)
        }
    
    def get_date_features(self, date: datetime) -> Dict:
        """
        Tarih için tüm özellikleri topla
        
        Args:
            date: Tarih
            
        Returns:
            Tarih özellikleri
        """
        features = {
            'date': date.strftime('%Y-%m-%d'),
            'year': date.year,
            'month': date.month,
            'day': date.day,
            'day_of_week': date.weekday(),
            'is_weekend': int(self.is_weekend(date)),
            'week_of_year': date.isocalendar()[1],
            'quarter': (date.month - 1) // 3 + 1,
            'season': self.get_season(date.month),
            'seasonal_factor': self.get_seasonal_factor(date.month),
        }
        
        # Özel gün kontrolü
        special_day = self.is_special_day(date)
        if special_day:
            features['is_special_day'] = 1
            features['special_day_type'] = special_day['type']
            features['special_day_impact'] = special_day['impact']
        else:
            features['is_special_day'] = 0
            features['special_day_type'] = 'none'
            features['special_day_impact'] = 'none'
        
        # Hava durumu (simüle)
        weather = self.get_weather_data(date=date)
        features['temperature'] = weather['temperature']
        features['weather_condition'] = weather['condition']
        features['rain_probability'] = weather['rain_probability']
        
        return features
    
    def get_future_dates(self, start_date: datetime, months: int = 6) -> List[datetime]:
        """
        Gelecek tarihler listesi oluştur
        
        Args:
            start_date: Başlangıç tarihi
            months: Kaç ay ilerisi
            
        Returns:
            Tarih listesi
        """
        dates = []
        current = start_date
        
        # Her ay için bir tarih
        for i in range(months):
            dates.append(current)
            # Bir sonraki ay
            if current.month == 12:
                current = current.replace(year=current.year + 1, month=1)
            else:
                current = current.replace(month=current.month + 1)
        
        return dates
    
    def calculate_competition_factor(self, location: str = None) -> float:
        """
        Rekabet faktörü hesapla (simüle edilmiş)
        Gerçek kullanımda coğrafi veri ve rakip analizi yapılabilir
        
        Args:
            location: Lokasyon
            
        Returns:
            Rekabet faktörü (0.5 - 1.5 arası)
        """
        # Basit simülasyon - lokasyona göre değişebilir
        competition_levels = {
            'istanbul': 1.3,
            'ankara': 1.2,
            'izmir': 1.15,
            'bursa': 1.1,
            'antalya': 1.05,
        }
        
        if location:
            loc_lower = location.lower()
            for key, value in competition_levels.items():
                if key in loc_lower:
                    return value
        
        return 1.0  # Varsayılan
    
    def get_product_shelf_life(self, product_name: str, category: str = None) -> int:
        """
        Ürün raf ömrü tahmini (gün)
        
        Args:
            product_name: Ürün adı
            category: Kategori
            
        Returns:
            Raf ömrü (gün)
        """
        product_lower = product_name.lower()
        
        # Temel kategoriler
        if any(word in product_lower for word in ['süt', 'milk', 'yoğurt', 'yogurt', 'peynir', 'cheese']):
            return 7
        elif any(word in product_lower for word in ['et', 'meat', 'tavuk', 'chicken', 'balık', 'fish']):
            return 3
        elif any(word in product_lower for word in ['sebze', 'vegetable', 'meyve', 'fruit']):
            return 5
        elif any(word in product_lower for word in ['ekmek', 'bread']):
            return 2
        elif any(word in product_lower for word in ['konserve', 'canned', 'makarna', 'pasta', 'pirinç', 'rice']):
            return 365
        else:
            return 30  # Varsayılan
