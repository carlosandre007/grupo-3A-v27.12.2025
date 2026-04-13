import { jsPDF } from 'jspdf';

interface ReceiptData {
    propertyCode: string;
    propertyDescription: string;
    propertyAddress: string;
    tenantName: string;
    amount: number;
    month: string;
    year: number;
    date: string;
}

export const generateReceiptPDF = (data: ReceiptData) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Branding/Header
    doc.setFillColor(15, 23, 42); // slate-900 
    doc.rect(0, 0, pageWidth, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('RECIBO DE ALUGUEL', pageWidth / 2, 25, { align: 'center' });

    // Reset text color
    doc.setTextColor(51, 65, 85); // slate-700

    // Property Info Box
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setFillColor(248, 250, 252); // slate-50
    doc.roundedRect(15, 50, pageWidth - 30, 40, 3, 3, 'FD');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('DADOS DO IMÓVEL', 20, 58);

    doc.setFont('helvetica', 'normal');
    doc.text(`Código: ${data.propertyCode}`, 20, 65);
    doc.text(`Imóvel: ${data.propertyDescription}`, 20, 72);
    doc.text(`Endereço: ${data.propertyAddress}`, 20, 79);

    // Tenant Info Box
    doc.roundedRect(15, 95, pageWidth - 30, 25, 3, 3, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.text('DADOS DO INQUILINO', 20, 103);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nome Completo: ${data.tenantName}`, 20, 110);

    // Payment Info Box
    doc.roundedRect(15, 125, pageWidth - 30, 35, 3, 3, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.text('DETALHES DO PAGAMENTO', 20, 133);

    doc.setFont('helvetica', 'normal');
    doc.text(`Valor do Aluguel: R$ ${data.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 20, 140);
    doc.text(`Mês/Ano de Referência: ${data.month}/${data.year}`, 20, 147);
    doc.text(`Data do Pagamento: ${data.date}`, 20, 154);

    // Main Declaration text
    const mainText = `Recebemos de ${data.tenantName} o valor de R$ ${data.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}, referente ao aluguel do imóvel ${data.propertyDescription} em ${data.propertyAddress}, correspondente ao mês de ${data.month}/${data.year}.`;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    const splitText = doc.splitTextToSize(mainText, pageWidth - 40);
    doc.text(splitText, 20, 180);

    // Date and Sign Line
    const today = new Date().toLocaleDateString('pt-BR');
    doc.text(`Data de emissão: ${today}`, 20, 220);

    doc.line(60, 250, pageWidth - 60, 250);
    doc.setFontSize(10);
    doc.text('Assinatura do Locador', pageWidth / 2, 255, { align: 'center' });

    // Save the PDF
    doc.save(`Recibo_Aluguel_${data.propertyCode}_${data.month}_${data.year}.pdf`);
};
