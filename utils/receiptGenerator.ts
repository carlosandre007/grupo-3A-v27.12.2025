import { jsPDF } from 'jspdf';

export interface ReceiptData {
    propertyCode: string;
    propertyDescription: string;
    propertyAddress: string;
    tenantName: string;
    tenantCpf?: string;
    tenantEmail?: string;
    tenantPhone?: string;
    amount: number;
    month: string;
    year: number;
    date: string; // Data do Pagamento
    dueDate?: string; // Data do Vencimento
    paymentMethod?: string; // Método de pagamento
    receiptCode?: string; // cod. rec-2026-0542
    locadorName?: string; // Assinatura do Locador
}

export function valorParaExtenso(valor: number): string {
    const unidades = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"];
    const dezenas = ["", "dez", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
    const especiais = ["dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
    const centenas = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

    if (valor === 0) return "zero reais";

    const inteiro = Math.floor(valor);
    const centavos = Math.round((valor - inteiro) * 100);

    const extensoMilhares = (num: number): string => {
        if (num === 0) return "";
        if (num === 100) return "cem";
        
        let c = Math.floor(num / 100);
        let d = Math.floor((num % 100) / 10);
        let u = num % 10;
        
        let partes = [];
        if (c > 0) partes.push(centenas[c]);
        
        if (d === 1) {
            partes.push(especiais[u]);
        } else {
            if (d > 0) partes.push(dezenas[d]);
            if (u > 0) partes.push(unidades[u]);
        }
        
        return partes.join(" e ");
    };

    let partesReal = [];
    const milhoes = Math.floor(inteiro / 1000000);
    const milhares = Math.floor((inteiro % 1000000) / 1000);
    const unidadesCentenas = inteiro % 1000;

    if (milhoes > 0) {
        partesReal.push(extensoMilhares(milhoes) + (milhoes === 1 ? " milhão" : " milhões"));
    }
    if (milhares > 0) {
        partesReal.push(extensoMilhares(milhares) + " mil");
    }
    if (unidadesCentenas > 0 || partesReal.length === 0) {
        partesReal.push(extensoMilhares(unidadesCentenas));
    }

    let textoReal = partesReal.join(" e ");
    if (inteiro === 1) textoReal += " real";
    else if (inteiro > 1) textoReal += " reais";

    let textoCentavos = "";
    if (centavos > 0) {
        let partesCentavo = [];
        let d = Math.floor(centavos / 10);
        let u = centavos % 10;
        
        if (d === 1) {
            partesCentavo.push(especiais[u]);
        } else {
            if (d > 0) partesCentavo.push(dezenas[d]);
            if (u > 0) partesCentavo.push(unidades[u]);
        }
        textoCentavos = partesCentavo.join(" e ") + (centavos === 1 ? " centavo" : " centavos");
    }

    if (textoReal && textoCentavos) return `${textoReal} e ${textoCentavos}`;
    if (textoReal) return textoReal;
    return textoCentavos;
}

export const buildReceiptPDF = (data: ReceiptData) => {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const cpf = data.tenantCpf || '-';
    const email = data.tenantEmail || '-';
    const phone = data.tenantPhone || '-';
    const pMethod = data.paymentMethod || 'PIX';
    const dDate = data.dueDate || data.date;
    const locador = data.locadorName || 'ALANE MARIA';
    
    // Gen receipt code
    const rCode = data.receiptCode || `rec-${data.year}-${String(data.month).padStart(2, '0')}-${String(Math.floor(Math.random() * 800) + 100)}`;

    // 1. Dark Blue Header
    doc.setFillColor(15, 23, 42); // slate-900 / #0f172a
    doc.roundedRect(10, 10, pageWidth - 20, 30, 4, 4, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('RECIBO DE ALUGUEL', pageWidth / 2, 24, { align: 'center' });
    
    doc.setFontSize(9);
    doc.setFont('courier', 'bold');
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(`cod. ${rCode}`, pageWidth / 2, 32, { align: 'center' });

    // Reset color to Slate-700
    doc.setTextColor(51, 65, 85); 

    // Helper for structured cards
    const drawCardHeader = (title: string, y: number) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(15, 23, 42);
        doc.text(title, 15, y);
    };

    // --- CARD 1: DADOS DO IMÓVEL ---
    let yPos = 48;
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(10, yPos, pageWidth - 20, 22, 3, 3, 'FD');
    drawCardHeader('DADOS DO IMÓVEL', yPos + 6);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(`Código: ${data.propertyCode}`, 15, yPos + 13);
    doc.text(`Imóvel: ${data.propertyDescription}`, 60, yPos + 13);
    
    // Address text wrap
    const addressTxt = `Endereço: ${data.propertyAddress}`;
    const wrappedAddress = doc.splitTextToSize(addressTxt, pageWidth - 35);
    doc.text(wrappedAddress, 115, yPos + 13);

    // --- CARD 2: DADOS DO INQUILINO ---
    yPos = 76;
    doc.roundedRect(10, yPos, pageWidth - 20, 26, 3, 3, 'FD');
    drawCardHeader('DADOS DO INQUILINO', yPos + 6);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(`Nome Completo: ${data.tenantName}`, 15, yPos + 13);
    doc.text(`CPF: ${cpf}`, 115, yPos + 13);
    doc.text(`E-mail: ${email}`, 15, yPos + 20);
    doc.text(`Telefone: ${phone}`, 115, yPos + 20);

    // --- CARD 3: DETALHES DO PAGAMENTO ---
    yPos = 108;
    doc.roundedRect(10, yPos, pageWidth - 20, 42, 3, 3, 'FD');
    drawCardHeader('DETALHES DO PAGAMENTO', yPos + 6);

    // Watermark Background
    doc.saveGraphicsState();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.setTextColor(240, 253, 244); // light green
    doc.text('PAGAMENTO CONFIRMADO', pageWidth / 2, yPos + 22, { align: 'center', angle: 5 });
    doc.setFontSize(8);
    doc.setTextColor(220, 252, 231); // slightly darker light green
    doc.text('OK // COMPROVADO DIGITALMENTE', pageWidth / 2, yPos + 28, { align: 'center', angle: 5 });
    doc.restoreGraphicsState();

    // 4 mini boxes in a grid
    const boxW = (pageWidth - 30) / 4;
    const boxH = 16;
    const boxY = yPos + 10;
    
    const drawMiniBox = (x: number, title: string, value: string, isHighlighted = false) => {
        if (isHighlighted) {
            doc.setFillColor(240, 253, 244); // green-50
            doc.setDrawColor(187, 247, 208); // green-200
            doc.roundedRect(x, boxY, boxW - 2, boxH, 2, 2, 'FD');
            doc.setTextColor(21, 128, 61); // green-700
        } else {
            doc.setFillColor(248, 250, 252); // slate-50
            doc.setDrawColor(241, 245, 249); // slate-100
            doc.roundedRect(x, boxY, boxW - 2, boxH, 2, 2, 'FD');
            doc.setTextColor(15, 23, 42); // slate-900
        }
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.text(title, x + 3, boxY + 5);
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(value, x + 3, boxY + 11);
    };

    drawMiniBox(13, 'VALOR DO ALUGUEL', `R$ ${data.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    drawMiniBox(13 + boxW, 'MÊS DE REFERÊNCIA', `${data.month}/${data.year}`);
    drawMiniBox(13 + boxW * 2, 'DATA DO PAGAMENTO', data.date, true);
    drawMiniBox(13 + boxW * 3, 'DATA DO VENCIMENTO', dDate, true);

    // Reset styles
    doc.setDrawColor(226, 232, 240);
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(`Método de pagamento: ${pMethod}`, 15, yPos + 34);

    // Status Badge
    doc.setFillColor(220, 252, 231); // green-100
    doc.roundedRect(pageWidth - 30, yPos + 31, 18, 5, 2.5, 2.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(21, 128, 61); // green-700
    doc.text('PAGO', pageWidth - 21, yPos + 34.5, { align: 'center' });

    // --- CARD 4: TEXTUAL DECLARATION BOX ---
    yPos = 156;
    doc.setFillColor(248, 250, 252); // slate-50
    doc.roundedRect(10, yPos, pageWidth - 20, 28, 3, 3, 'F');

    const extenso = valorParaExtenso(data.amount);
    const extensoCapitalized = extenso.charAt(0).toUpperCase() + extenso.slice(1);
    
    const declarationText = `"Recebemos de ${data.tenantName} o valor de R$ ${data.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${extensoCapitalized}), referente ao aluguel do imóvel ${data.propertyDescription} situado em ${data.propertyAddress}, correspondente ao mês de referência ${data.month}/${data.year}."`;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(51, 65, 85); // slate-700
    
    const splitText = doc.splitTextToSize(declarationText, pageWidth - 30);
    doc.text(splitText, 15, yPos + 8);

    // --- FOOTER AND SIGNATURE ---
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(`Data de emissão: ${data.date}`, 15, 205);
    doc.text(`Autenticador do SaaS: ${rCode}/ALUGUEL`, 15, 210);

    // Signature line
    const sigX = pageWidth - 75;
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.line(sigX, 203, pageWidth - 15, 203);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Assinatura do Locador', sigX + 30, 207, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(locador, sigX + 30, 212, { align: 'center' });

    // Decorative divider line at the very bottom
    doc.setDrawColor(241, 245, 249);
    doc.line(10, 230, pageWidth - 10, 230);

    const fileName = `Recibo_Aluguel_${data.propertyCode}_${data.month}_${data.year}.pdf`;
    const pdfBlob = doc.output('blob');
    const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

    return {
        doc,
        file,
        fileName,
        pdfBlob
    };
};

export const generateReceiptPDF = (data: ReceiptData) => {
    const { doc, file, fileName, pdfBlob } = buildReceiptPDF(data);

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({
            files: [file],
            title: `Recibo de Aluguel - ${data.propertyCode}`,
            text: `Segue em anexo o recibo de aluguel referente a ${data.month}/${data.year}.`
        })
        .then(() => console.log('Recibo compartilhado com sucesso.'))
        .catch((error) => {
            console.error('Erro ao compartilhar:', error);
            doc.save(fileName);
        });
    } else {
        const blobUrl = URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
    }
};
