import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MONTH_NAMES } from './dateUtils';

export const exportDriverMonthlyPDF = ({
  driverName,
  driverPhone,
  year,
  month,
  daysInMonth,
  recordsMap,
  totalAmount,
  totalDue,
}) => {
  const monthName = MONTH_NAMES[month - 1];
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // 1. Header Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('DRIVER MONTHLY RECORD', pageWidth / 2, 18, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text('Digital Transport Book', pageWidth / 2, 23, { align: 'center' });

  // 2. Info Card Box
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setFillColor(248, 250, 252); // slate-50
  doc.roundedRect(14, 28, pageWidth - 28, 22, 2, 2, 'FD');

  // Left side: Driver details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(driverName, 18, 36);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  if (driverPhone) {
    doc.text(`Phone: ${driverPhone}`, 18, 43);
  } else {
    doc.text('Phone: Not provided', 18, 43);
  }

  // Right side: Month & Year
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(29, 78, 216); // blue-700
  doc.text(`${monthName} ${year}`, pageWidth - 18, 36, { align: 'right' });

  const activeDaysCount = Object.values(recordsMap).filter(
    (v) => v !== null && v !== undefined && v !== ''
  ).length;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Recorded Days: ${activeDaysCount} days`, pageWidth - 18, 43, { align: 'right' });

  // 3. Prepare Table Data
  const tableData = daysInMonth.map((dayItem) => {
    const rawAmount = recordsMap[dayItem.dateString]?.amount;
    const hasAmount = rawAmount !== null && rawAmount !== undefined && rawAmount !== '';
    const formattedAmount = hasAmount
      ? `Rs. ${Number(rawAmount).toLocaleString('en-IN')}`
      : '—';

    return [
      `${dayItem.displayDate} (${dayItem.dayOfWeek})`,
      formattedAmount,
      recordsMap[dayItem.dateString] ? `Rs. ${Number(recordsMap[dayItem.dateString].pending_amount || 0).toLocaleString('en-IN')}` : '—',
      recordsMap[dayItem.dateString]?.notes || '',
    ];
  });

  // 4. Render Table with autoTable
  autoTable(doc, {
    startY: 55,
    margin: { left: 14, right: 14, bottom: 25 },
    head: [['Date', 'Amount', 'Due', 'Notes']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59], // slate-800
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 10,
      halign: 'left',
    },
    columnStyles: {
      3: { cellWidth: 'auto', halign: 'left' },
      0: { cellWidth: 35, fontStyle: 'bold', halign: 'left' },
      2: { cellWidth: 35, halign: 'right', fontStyle: 'bold' },
      1: { cellWidth: 45, halign: 'right', fontStyle: 'bold' },
    },
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: 2.8,
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    foot: [
      [
        'Total Amount',
        `Rs. ${Number(totalAmount).toLocaleString('en-IN')}`,
        `Rs. ${Number(totalDue || 0).toLocaleString('en-IN')}`,
        '',
      ],
    ],
    footStyles: {
      fillColor: [239, 246, 255], // blue-50
      textColor: [30, 58, 138], // blue-900
      fontStyle: 'bold',
      fontSize: 11,
      lineColor: [191, 219, 254],
      lineWidth: 0.3,
    },
  });

  // 5. Footer notice
  const finalY = (doc.lastAutoTable?.finalY || 250) + 10;
  if (finalY < 280) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(
      `Generated from Digital Transport Book on ${new Date().toLocaleDateString('en-IN')}`,
      pageWidth / 2,
      finalY,
      { align: 'center' }
    );
  }

  // 6. Save PDF
  const sanitizedDriver = driverName.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `${sanitizedDriver}_${monthName}_${year}.pdf`;
  doc.save(filename);
};
