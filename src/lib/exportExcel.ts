import * as XLSX from 'xlsx';
import { EstimateItem } from '@/types';

interface ExportData {
  estimateName: string;
  items: EstimateItem[];
}

export function exportEstimateToExcel({ estimateName, items }: ExportData) {
  const wb = XLSX.utils.book_new();

  const headers = ['번호', '공종', '품명', '규격', '단위', '수량', '단가', '노무비', '재료비', '경비', '합계'];

  // 공종별 그룹핑
  const groups = items.reduce<Record<string, EstimateItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  const rows: (string | number)[][] = [headers];
  let seq = 1;

  for (const [category, groupItems] of Object.entries(groups)) {
    // 공종 소계
    const subLabor = groupItems.reduce((s, i) => s + i.labor_amount, 0);
    const subMaterial = groupItems.reduce((s, i) => s + i.material_amount, 0);
    const subExpense = groupItems.reduce((s, i) => s + i.expense_amount, 0);
    const subTotal = groupItems.reduce((s, i) => s + i.total_amount, 0);

    rows.push(['', `[${category}]`, '', '', '', '', '', subLabor, subMaterial, subExpense, subTotal]);

    for (const item of groupItems) {
      rows.push([
        seq++,
        item.category,
        item.work_name,
        item.spec,
        item.unit,
        item.quantity,
        item.unit_price,
        item.labor_amount,
        item.material_amount,
        item.expense_amount,
        item.total_amount,
      ]);
    }
  }

  // 총계 행
  const totalLabor = items.reduce((s, i) => s + i.labor_amount, 0);
  const totalMaterial = items.reduce((s, i) => s + i.material_amount, 0);
  const totalExpense = items.reduce((s, i) => s + i.expense_amount, 0);
  const totalAmount = items.reduce((s, i) => s + i.total_amount, 0);
  rows.push(['합계', '', '', '', '', '', '', totalLabor, totalMaterial, totalExpense, totalAmount]);

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // 컬럼 너비
  ws['!cols'] = [
    { wch: 6 }, { wch: 12 }, { wch: 20 }, { wch: 14 }, { wch: 6 },
    { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, '내역서');
  XLSX.writeFile(wb, `${estimateName}.xlsx`);
}
