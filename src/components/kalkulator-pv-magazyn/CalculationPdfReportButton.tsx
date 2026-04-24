import type { RefObject } from 'react';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';

interface PdfMonthlyRow {
  month: number;
  consumption: number;
  production: number;
  autoconsumption: number;
  exportTotal: number;
  exportOsd: number;
  exportCoop: number;
  importValue: number;
  totalCost: number;
  revenue: number;
  net: number;
}

interface PdfResultData {
  monthlyRows: PdfMonthlyRow[];
  yearlyProduction: number;
  yearlyAutoconsumption: number;
  yearlyExport: number;
  yearlyImport: number;
  oldNet: number;
  newNet: number;
  annualSaving: number;
  savingsPercent: string;
  netInvestment: number;
  payback: number;
  roi: number;
  npv: number;
  newTotalCost: number;
  newRevenue: number;
  oldEnergyCost: number;
  oldDistTotal: number;
  oldFixedCost: number;
  newEnergyCost: number;
  newDistCost: number;
  newFixed: number;
  newBalanceCost: number;
}

interface PdfFormData {
  companyName: string;
  address: string;
  nip: string;
  distributor: string;
  tariff: string;
  contractedPower: number;
  existingPvPower: number;
  pvPower: number;
  annualConsumption: number;
  monthlySubscription: number;
}

interface CalculationPdfReportButtonProps {
  formData: PdfFormData;
  result: PdfResultData;
  cashflowCanvasRef: RefObject<HTMLCanvasElement | null>;
}

function cell(value: string | number, bold = false): { text: string; bold?: boolean } {
  return { text: String(value), bold };
}

export default function CalculationPdfReportButton({
  formData,
  result,
  cashflowCanvasRef,
}: CalculationPdfReportButtonProps) {
  const handleGeneratePdf = () => {
    const vfs = (pdfFonts as { pdfMake?: { vfs?: unknown }; vfs?: unknown }).pdfMake?.vfs ??
      (pdfFonts as { vfs?: unknown }).vfs;
    if (vfs) {
      (pdfMake as { vfs?: unknown }).vfs = vfs;
    }

    const oldGrossCosts = result.oldEnergyCost + result.oldDistTotal + result.oldFixedCost;
    const oldRevenue = oldGrossCosts - result.oldNet;
    const generatedDate = new Date().toLocaleDateString('pl-PL');
    const chartImageDataUrl = cashflowCanvasRef.current?.toDataURL('image/png');

    const monthlyHeader = [
      cell('Miesiąc', true),
      cell('Zużycie (kWh)', true),
      cell('Produkcja PV (kWh)', true),
      cell('Autokonsumpcja (kWh)', true),
      cell('Eksport łącznie (kWh)', true),
      cell('Do sieci (kWh)', true),
      cell('Do spółdzielni (kWh)', true),
      cell('Import (kWh)', true),
      cell('Koszt całkowity (zł)', true),
      cell('Przychód (zł)', true),
      cell('Bilans netto (zł)', true),
    ];
    const monthlyBody = result.monthlyRows.map((row) => [
      cell(row.month),
      cell(row.consumption.toFixed(0)),
      cell(row.production.toFixed(0)),
      cell(row.autoconsumption.toFixed(0)),
      cell(row.exportTotal.toFixed(0)),
      cell(row.exportOsd.toFixed(0)),
      cell(row.exportCoop.toFixed(0)),
      cell(row.importValue.toFixed(0)),
      cell(row.totalCost.toFixed(2)),
      cell(row.revenue.toFixed(2)),
      cell(row.net.toFixed(2)),
    ]);

    const docDefinition = {
      pageOrientation: 'landscape' as const,
      pageSize: 'A4' as const,
      pageMargins: [30, 35, 30, 35] as [number, number, number, number],
      footer: (currentPage: number, pageCount: number) => ({
        margin: [30, 0, 30, 10],
        text: `Strona ${currentPage} z ${pageCount} • ${generatedDate}`,
        alignment: 'center' as const,
        fontSize: 9,
        color: '#666666',
      }),
      content: [
        { text: 'RAPORT INWESTYCYJNY – FOTOWOLTAIKA + MAGAZYN ENERGII', fontSize: 15, bold: true, color: '#3E0387' },
        {
          table: {
            widths: [90, '*'],
            body: [
              [cell('Nazwa', true), cell(formData.companyName || 'Odbiorca')],
              [cell('Adres', true), cell(formData.address || '—')],
              [cell('NIP', true), cell(formData.nip || '—')],
            ],
          },
          layout: 'lightHorizontalLines' as const,
          margin: [0, 8, 0, 12],
        },
        { text: '1. Podstawowe parametry', style: 'sectionHeader' },
        {
          table: {
            widths: ['*', '*', '*', '*'],
            body: [
              [cell('OSD', true), cell(formData.distributor.toUpperCase()), cell('Taryfa', true), cell(formData.tariff)],
              [cell('Moc umowna', true), cell(`${formData.contractedPower.toFixed(1)} kW`), cell('Abonament', true), cell(`${formData.monthlySubscription.toFixed(2)} zł/m-c`)],
              [cell('Moc istniejącej PV', true), cell(`${formData.existingPvPower.toFixed(1)} kWp`), cell('Moc planowanej PV', true), cell(`${formData.pvPower.toFixed(1)} kWp`)],
              [cell('Roczne zużycie', true), cell(`${formData.annualConsumption.toLocaleString('pl-PL')} kWh`), cell('Produkcja PV', true), cell(`${result.yearlyProduction.toFixed(0)} kWh`)],
              [cell('Autokonsumpcja', true), cell(`${result.yearlyAutoconsumption.toFixed(0)} kWh`), cell('Eksport / Import', true), cell(`${result.yearlyExport.toFixed(0)} / ${result.yearlyImport.toFixed(0)} kWh`)],
            ],
          },
          layout: 'lightHorizontalLines' as const,
        },
        { text: '2. Miesięczna tabela kosztów i przepływów energii', style: 'sectionHeader' },
        {
          table: {
            headerRows: 1,
            widths: [28, 50, 54, 54, 50, 44, 48, 44, 56, 58, 52],
            body: [monthlyHeader, ...monthlyBody],
          },
          layout: 'lightHorizontalLines' as const,
          fontSize: 8.5,
        },
        { text: '3. Porównanie struktury kosztów rocznych', style: 'sectionHeader' },
        {
          table: {
            headerRows: 1,
            widths: ['*', 120, 120, 120],
            body: [
              [cell('Kategoria', true), cell('Przed inwestycją', true), cell('Po inwestycji', true), cell('Różnica', true)],
              [cell('Energia czynna'), cell(result.oldEnergyCost.toFixed(2)), cell(result.newEnergyCost.toFixed(2)), cell((result.oldEnergyCost - result.newEnergyCost).toFixed(2))],
              [cell('Dystrybucja (zmienna)'), cell(result.oldDistTotal.toFixed(2)), cell(result.newDistCost.toFixed(2)), cell((result.oldDistTotal - result.newDistCost).toFixed(2))],
              [cell('Opłata stała sieciowa / abonament'), cell(result.oldFixedCost.toFixed(2)), cell((formData.monthlySubscription * 12).toFixed(2)), cell((result.oldFixedCost - formData.monthlySubscription * 12).toFixed(2))],
              [cell('Opłata bilansowa spółdzielni'), cell('0.00'), cell(result.newBalanceCost.toFixed(2)), cell((-result.newBalanceCost).toFixed(2))],
              [cell('EMS + opłata członkowska'), cell('0.00'), cell((result.newFixed - formData.monthlySubscription * 12).toFixed(2)), cell((-(result.newFixed - formData.monthlySubscription * 12)).toFixed(2))],
              [cell('RAZEM koszty', true), cell(oldGrossCosts.toFixed(2), true), cell(result.newTotalCost.toFixed(2), true), cell((oldGrossCosts - result.newTotalCost).toFixed(2), true)],
              [cell('Przychód ze sprzedaży'), cell(oldRevenue.toFixed(2)), cell(result.newRevenue.toFixed(2)), cell((oldRevenue - result.newRevenue).toFixed(2))],
              [cell('Bilans netto', true), cell(result.oldNet.toFixed(2), true), cell(result.newNet.toFixed(2), true), cell(result.annualSaving.toFixed(2), true)],
            ],
          },
          layout: 'lightHorizontalLines' as const,
        },
        { text: '4. Wyniki inwestycji (25 lat)', style: 'sectionHeader' },
        {
          table: {
            widths: ['*', '*'],
            body: [
              [cell('Inwestycja netto po dotacji', true), cell(`${result.netInvestment.toFixed(0)} zł`)],
              [cell('Prosty okres zwrotu', true), cell(Number.isFinite(result.payback) ? `${result.payback.toFixed(1)} lat` : '—')],
              [cell('ROI po 25 latach', true), cell(`${result.roi.toFixed(1)} %`)],
              [cell('NPV (7%)', true), cell(`${result.npv.toFixed(0)} zł`)],
              [cell('Roczne oszczędności', true), cell(`${result.annualSaving.toFixed(2)} zł (${result.savingsPercent})`)],
            ],
          },
          layout: 'lightHorizontalLines' as const,
        },
        { text: '5. Roczny cash-flow (wykres)', style: 'sectionHeader' },
        ...(chartImageDataUrl
          ? [
              {
                image: chartImageDataUrl,
                width: 760,
                alignment: 'center' as const,
                margin: [0, 4, 0, 0],
              },
            ]
          : [{ text: 'Brak danych wykresu do osadzenia w raporcie.' }]),
      ],
      styles: {
        sectionHeader: { fontSize: 12, bold: true, color: '#3E0387', margin: [0, 12, 0, 6] },
      },
      defaultStyle: { fontSize: 10 },
    };

    const safeName = (formData.companyName || 'Odbiorca').replace(/[^\w\- ]/g, '_');
    pdfMake.createPdf(docDefinition).download(`${safeName}_Raport_PV_Magazyn.pdf`);
  };

  return (
    <button className="calc-button" onClick={handleGeneratePdf} type="button">
      Pobierz profesjonalny raport PDF
    </button>
  );
}
