"""
PDF Rapor Oluşturucu
ReportLab ile analiz ve tahmin raporları
"""

import io
from datetime import datetime
from typing import Dict, Any

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont


BRAND_BLUE = colors.HexColor('#2563EB')
BRAND_DARK = colors.HexColor('#1E293B')
BRAND_LIGHT = colors.HexColor('#F1F5F9')
BRAND_GREEN = colors.HexColor('#10B981')
BRAND_RED = colors.HexColor('#EF4444')
BRAND_ORANGE = colors.HexColor('#F59E0B')


def _styles():
    base = getSampleStyleSheet()
    custom = {
        'title': ParagraphStyle(
            'ReportTitle',
            parent=base['Title'],
            fontSize=22,
            textColor=BRAND_BLUE,
            spaceAfter=6,
            alignment=TA_CENTER,
        ),
        'subtitle': ParagraphStyle(
            'ReportSubtitle',
            parent=base['Normal'],
            fontSize=11,
            textColor=colors.HexColor('#64748B'),
            spaceAfter=4,
            alignment=TA_CENTER,
        ),
        'section': ParagraphStyle(
            'SectionHeader',
            parent=base['Heading2'],
            fontSize=13,
            textColor=BRAND_BLUE,
            spaceBefore=14,
            spaceAfter=6,
            borderPad=4,
        ),
        'body': ParagraphStyle(
            'BodyText',
            parent=base['Normal'],
            fontSize=9,
            textColor=BRAND_DARK,
            spaceAfter=4,
        ),
        'small': ParagraphStyle(
            'SmallText',
            parent=base['Normal'],
            fontSize=8,
            textColor=colors.HexColor('#64748B'),
        ),
        'metric_label': ParagraphStyle(
            'MetricLabel',
            parent=base['Normal'],
            fontSize=8,
            textColor=colors.HexColor('#64748B'),
            alignment=TA_CENTER,
        ),
        'metric_value': ParagraphStyle(
            'MetricValue',
            parent=base['Normal'],
            fontSize=14,
            textColor=BRAND_DARK,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold',
        ),
    }
    return custom


def _metric_table(metrics: list) -> Table:
    """Üst satır metrik kartları tablosu: [(label, value, color), ...]"""
    styles = _styles()
    col_data = []
    for label, value, color in metrics:
        col_data.append([
            Paragraph(label, styles['metric_label']),
            Paragraph(f'<font color="{color}">{value}</font>', styles['metric_value']),
        ])

    col_count = len(metrics)
    col_width = (A4[0] - 4 * cm) / col_count

    table = Table(
        [col_data[i] for i in range(col_count)],
        colWidths=[col_width] * col_count,
    )
    # Actually need row format - each metric is a column, not row
    # Rebuild: one row, multiple columns
    header_row = [Paragraph(m[0], styles['metric_label']) for m in metrics]
    value_row = [Paragraph(f'<font color="{m[2]}">{m[1]}</font>', styles['metric_value']) for m in metrics]

    t = Table([header_row, value_row], colWidths=[col_width] * col_count)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), BRAND_LIGHT),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#CBD5E1')),
        ('LINEAFTER', (0, 0), (-2, -1), 0.5, colors.HexColor('#CBD5E1')),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('ROUNDEDCORNERS', [4]),
    ]))
    return t


def generate_analysis_pdf(data: Dict[str, Any], user_name: str = '', company: str = '') -> io.BytesIO:
    """
    Analiz verilerinden PDF raporu oluştur.

    Args:
        data: /api/data/analyze endpoint çıktısı
        user_name: Kullanıcı adı (opsiyonel)
        company: Şirket adı (opsiyonel)

    Returns:
        BytesIO PDF buffer
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
    )

    styles = _styles()
    story = []

    # --- Başlık ---
    story.append(Paragraph('HisMarketing', styles['title']))
    story.append(Paragraph('Satış Analiz Raporu', styles['subtitle']))
    story.append(Paragraph(
        f'Oluşturulma: {datetime.now().strftime("%d.%m.%Y %H:%M")}' +
        (f' &nbsp;|&nbsp; {company}' if company else ''),
        styles['small']
    ))
    story.append(Spacer(1, 0.3 * cm))
    story.append(HRFlowable(width='100%', thickness=1.5, color=BRAND_BLUE))
    story.append(Spacer(1, 0.4 * cm))

    # --- Özet Metrikler ---
    total_revenue = data.get('total_revenue', 0)
    total_expense = data.get('total_expense', 0)
    net_profit = data.get('net_profit', 0)
    product_count = data.get('product_count', 0)

    profit_color = '#10B981' if net_profit >= 0 else '#EF4444'

    metrics = [
        ('Toplam Gelir', f'₺{total_revenue:,.0f}', '#2563EB'),
        ('Toplam Gider', f'₺{total_expense:,.0f}', '#F59E0B'),
        ('Net Kâr/Zarar', f'₺{net_profit:,.0f}', profit_color),
        ('Ürün Sayısı', str(product_count), '#6366F1'),
    ]
    story.append(_metric_table(metrics))
    story.append(Spacer(1, 0.5 * cm))

    # --- Aylık Satışlar ---
    monthly_sales = data.get('monthly_sales', [])
    if monthly_sales:
        story.append(Paragraph('Aylık Satış Trendi', styles['section']))

        table_data = [['Ay', 'Satış Adedi']]
        for row in monthly_sales:
            table_data.append([
                str(row.get('month', '')),
                f"{row.get('sales', 0):,.0f}",
            ])

        col_w = (A4[0] - 4 * cm) / 2
        t = Table(table_data, colWidths=[col_w * 1.2, col_w * 0.8])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), BRAND_BLUE),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, BRAND_LIGHT]),
            ('GRID', (0, 0), (-1, -1), 0.4, colors.HexColor('#CBD5E1')),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ]))
        story.append(t)
        story.append(Spacer(1, 0.4 * cm))

    # --- Ürün Performansı ---
    product_profits = data.get('product_profits', [])
    if product_profits:
        story.append(Paragraph('Ürün Bazlı Performans (İlk 20)', styles['section']))

        table_data = [['Ürün', 'Adet', 'Gelir (₺)', 'Kâr (₺)']]
        for row in product_profits[:20]:
            profit = row.get('profit', 0)
            profit_str = f'₺{profit:,.0f}'
            table_data.append([
                str(row.get('product', ''))[:35],
                f"{row.get('quantity', 0):,}",
                f"₺{row.get('revenue', 0):,.0f}",
                profit_str,
            ])

        cw = (A4[0] - 4 * cm) / 10
        t = Table(table_data, colWidths=[cw * 4, cw * 1.5, cw * 2.5, cw * 2])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), BRAND_DARK),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, BRAND_LIGHT]),
            ('GRID', (0, 0), (-1, -1), 0.3, colors.HexColor('#CBD5E1')),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        story.append(t)

    # --- Footer ---
    story.append(Spacer(1, 0.6 * cm))
    story.append(HRFlowable(width='100%', thickness=0.5, color=colors.HexColor('#CBD5E1')))
    story.append(Spacer(1, 0.2 * cm))
    story.append(Paragraph(
        'Bu rapor HisMarketing tarafından otomatik oluşturulmuştur. '
        'Gizli ve ticari nitelikte olup üçüncü şahıslarla paylaşılmaması önerilir.',
        styles['small']
    ))

    doc.build(story)
    buffer.seek(0)
    return buffer


def generate_prediction_pdf(data: Dict[str, Any], user_name: str = '', company: str = '') -> io.BytesIO:
    """
    Tahmin verilerinden PDF raporu oluştur.

    Args:
        data: /api/prediction/generate endpoint çıktısı
        user_name: Kullanıcı adı (opsiyonel)
        company: Şirket adı (opsiyonel)

    Returns:
        BytesIO PDF buffer
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
    )

    styles = _styles()
    story = []

    # --- Başlık ---
    story.append(Paragraph('HisMarketing', styles['title']))
    story.append(Paragraph('6 Aylık AI Talep Tahmin Raporu', styles['subtitle']))
    story.append(Paragraph(
        f'Oluşturulma: {datetime.now().strftime("%d.%m.%Y %H:%M")}' +
        (f' &nbsp;|&nbsp; {company}' if company else ''),
        styles['small']
    ))
    story.append(Spacer(1, 0.3 * cm))
    story.append(HRFlowable(width='100%', thickness=1.5, color=BRAND_BLUE))
    story.append(Spacer(1, 0.4 * cm))

    # --- Özet Metrikler ---
    predictions = data.get('predictions', [])
    avg_accuracy = data.get('accuracy', 0)
    total_products = data.get('total_products', 0)
    last_date = data.get('last_data_date', '')

    total_predicted_all = sum(p.get('total_predicted', 0) for p in predictions)

    metrics = [
        ('Model Doğruluğu', f'%{avg_accuracy:.1f}', '#10B981'),
        ('Tahmin Edilen Ürün', str(total_products), '#2563EB'),
        ('6 Ay Toplam Tahmin', f'{total_predicted_all:,.0f} adet', '#6366F1'),
        ('Son Veri Tarihi', last_date, '#F59E0B'),
    ]
    story.append(_metric_table(metrics))
    story.append(Spacer(1, 0.5 * cm))

    # --- Gelecek Aylar ---
    future_months = data.get('future_months', [])
    month_labels = [m.get('month_name', f'Ay {i+1}') for i, m in enumerate(future_months)]
    if not month_labels:
        month_labels = [f'Ay {i+1}' for i in range(6)]

    # --- Tahmin Tablosu ---
    if predictions:
        story.append(Paragraph('Ürün Bazlı Aylık Tahminler', styles['section']))

        header = ['Ürün', 'Doğruluk'] + month_labels + ['6 Ay Toplam']
        table_data = [header]

        for pred in predictions:
            monthly = pred.get('monthly_predictions', [0] * 6)
            row = [
                str(pred.get('product', ''))[:28],
                f"%{pred.get('accuracy', 0):.0f}",
            ]
            row += [f"{v:,.0f}" for v in monthly]
            row.append(f"{pred.get('total_predicted', 0):,.0f}")
            table_data.append(row)

        col_count = 2 + len(month_labels) + 1
        total_w = A4[0] - 4 * cm
        product_w = total_w * 0.22
        acc_w = total_w * 0.08
        month_w = (total_w - product_w - acc_w - total_w * 0.10) / max(len(month_labels), 1)
        total_col_w = total_w * 0.10
        col_widths = [product_w, acc_w] + [month_w] * len(month_labels) + [total_col_w]

        t = Table(table_data, colWidths=col_widths, repeatRows=1)
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), BRAND_DARK),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 7),
            ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, BRAND_LIGHT]),
            ('GRID', (0, 0), (-1, -1), 0.3, colors.HexColor('#CBD5E1')),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('BACKGROUND', (-1, 1), (-1, -1), colors.HexColor('#EFF6FF')),
            ('FONTNAME', (-1, 1), (-1, -1), 'Helvetica-Bold'),
        ]))
        story.append(t)
        story.append(Spacer(1, 0.5 * cm))

    # --- Öneriler ---
    recommendations = data.get('recommendations', [])
    if recommendations:
        story.append(Paragraph('AI Stok Önerileri', styles['section']))
        for rec in recommendations[:10]:
            priority = rec.get('priority', 'low')
            color = {'high': '#EF4444', 'medium': '#F59E0B', 'low': '#10B981'}.get(priority, '#6B7280')
            change = rec.get('change_percentage', 0)
            sign = '+' if change >= 0 else ''
            text = rec.get('recommendation', '')
            # Remove emoji characters for PDF compatibility
            import re
            text = re.sub(r'[^\x00-\x7FÀ-ɏĀ-ſƀ-ɏḀ-ỿ]', '', text)
            story.append(KeepTogether([
                Paragraph(
                    f'<font color="{color}">■</font> &nbsp;'
                    f'<b>{rec.get("product", "")}</b> '
                    f'<font color="{color}">({sign}{change:.1f}%)</font>',
                    styles['body']
                ),
                Paragraph(text.strip(), styles['small']),
                Spacer(1, 0.15 * cm),
            ]))

    # --- Footer ---
    story.append(Spacer(1, 0.4 * cm))
    story.append(HRFlowable(width='100%', thickness=0.5, color=colors.HexColor('#CBD5E1')))
    story.append(Spacer(1, 0.2 * cm))
    story.append(Paragraph(
        'Bu rapor HisMarketing AI motoru tarafından otomatik oluşturulmuştur. '
        'Tahminler geçmiş verilere ve istatistiksel modellere dayanmaktadır.',
        styles['small']
    ))

    doc.build(story)
    buffer.seek(0)
    return buffer
