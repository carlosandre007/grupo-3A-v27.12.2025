import React from 'react';
import { buildReceiptPDF, ReceiptData, valorParaExtenso } from '../utils/receiptGenerator';

interface ReceiptModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: ReceiptData | null;
}

const ReceiptModal: React.FC<ReceiptModalProps> = ({ isOpen, onClose, data }) => {
    if (!isOpen || !data) return null;

    const formattedAmount = Number(data.amount).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });

    const cpf = data.tenantCpf || '-';
    const email = data.tenantEmail || '-';
    const phone = data.tenantPhone || '-';
    const pMethod = data.paymentMethod || 'PIX';
    const dDate = data.dueDate || data.date;
    const locador = data.locadorName || 'ALANE MARIA';
    const rCode = data.receiptCode || `rec-${data.year}-${String(data.month).padStart(2, '0')}-${String(Math.floor(Math.random() * 800) + 100)}`;

    const extenso = valorParaExtenso(data.amount);
    const extensoCapitalized = extenso.charAt(0).toUpperCase() + extenso.slice(1);

    const handleDownload = (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const { doc, fileName } = buildReceiptPDF(data);
            doc.save(fileName);
        } catch (error) {
            console.error('Erro ao baixar PDF:', error);
            alert('Erro ao baixar recibo.');
        }
    };

    const handleShare = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const { file, fileName } = buildReceiptPDF(data);
            
            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: `Recibo - ${data.propertyCode || 'Grupo 3A'}`,
                    text: `Segue o recibo de aluguel referente a ${data.month}/${data.year}.`
                });
            } else {
                // Fallback to WhatsApp sharing with receipt text
                const textMsg = `Olá ${data.tenantName},\n\n*Aqui está o seu Recibo de Pagamento!*\n\n*Imóvel:* ${data.propertyDescription} (${data.propertyCode})\n*Valor:* ${formattedAmount}\n*Referência:* ${data.month}/${data.year}\n*Data de Vencimento:* ${dDate}\n*Data de Pagamento:* ${data.date}\n\nObrigado!`;
                const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(textMsg)}`;
                window.open(whatsappUrl, '_blank');
            }
        } catch (error) {
            console.error('Erro ao compartilhar:', error);
            // Download fallback
            const { doc, fileName } = buildReceiptPDF(data);
            doc.save(fileName);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm">
            <div 
                className="fixed inset-0 transition-opacity" 
                onClick={onClose}
            />
            
            <div className="relative w-full max-w-2xl transform rounded-[24px] bg-slate-100 dark:bg-slate-900 p-6 text-left shadow-2xl transition-all border border-slate-200 dark:border-slate-800 flex flex-col gap-5 max-h-[95vh]">
                
                {/* Header */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-850">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-500 font-black">receipt_long</span>
                        <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">
                            Visualização do Recibo
                        </h3>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all"
                    >
                        <span className="material-symbols-outlined text-sm font-bold">close</span>
                    </button>
                </div>

                {/* Printable receipt container */}
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                    <div className="bg-white dark:bg-slate-950 rounded-3xl border border-slate-200 dark:border-slate-850 shadow-md flex flex-col overflow-hidden relative font-sans text-slate-800 dark:text-slate-200">
                        
                        {/* Top Curved Dark Blue Banner */}
                        <div className="bg-[#0f172a] text-white p-6 text-center flex flex-col gap-1 select-none">
                            <h2 className="text-xl md:text-2xl font-black uppercase tracking-[0.2em] text-[#f8fafc]">
                                Recibo de Aluguel
                            </h2>
                            <span className="text-[10px] md:text-xs font-mono font-bold text-slate-400">
                                cod. {rCode}
                            </span>
                        </div>

                        {/* Receipt Details Body */}
                        <div className="p-6 flex flex-col gap-6">
                            
                            {/* DADOS DO IMÓVEL */}
                            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col gap-3.5 relative">
                                <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-wider">
                                    Dados do Imóvel
                                </span>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase">Código</span>
                                        <span className="font-bold text-slate-700 dark:text-slate-300 font-mono capitalize">{data.propertyCode}</span>
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase">Imóvel</span>
                                        <span className="font-bold text-slate-700 dark:text-slate-300 capitalize">{data.propertyDescription}</span>
                                    </div>
                                    <div className="flex flex-col gap-0.5 md:col-span-1">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase">Endereço</span>
                                        <span className="font-bold text-slate-700 dark:text-slate-300 capitalize">{data.propertyAddress}</span>
                                    </div>
                                </div>
                            </div>

                            {/* DADOS DO INQUILINO */}
                            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col gap-3.5 relative">
                                <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-wider">
                                    Dados do Inquilino
                                </span>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6 text-xs">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase">Nome Completo</span>
                                        <span className="font-bold text-slate-750 dark:text-slate-250 uppercase">{data.tenantName}</span>
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase">CPF</span>
                                        <span className="font-bold text-slate-750 dark:text-slate-250 font-mono">{cpf}</span>
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase">E-mail</span>
                                        <span className="font-bold text-slate-750 dark:text-slate-250 font-mono">{email}</span>
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase">Telefone</span>
                                        <span className="font-bold text-slate-750 dark:text-slate-250 font-mono">{phone}</span>
                                    </div>
                                </div>
                            </div>

                            {/* DETALHES DO PAGAMENTO */}
                            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col gap-3.5 relative overflow-hidden">
                                
                                {/* Rotate Watermark */}
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none -rotate-6 opacity-[0.03] dark:opacity-[0.05]">
                                    <span className="text-3xl md:text-4xl font-black text-emerald-600 tracking-widest uppercase">Pagamento Confirmado</span>
                                    <span className="text-[10px] font-bold text-emerald-500 tracking-[0.3em] uppercase">Ok // Comprovado Digitalmente</span>
                                </div>

                                <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-wider relative z-10">
                                    Detalhes do Pagamento
                                </span>
                                
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 relative z-10">
                                    
                                    {/* Box 1 */}
                                    <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-850 p-3 rounded-xl flex flex-col gap-1">
                                        <span className="text-[8px] font-black text-slate-400 uppercase leading-none">Valor do Aluguel</span>
                                        <span className="text-xs md:text-sm font-black text-slate-850 dark:text-white font-mono mt-0.5">{formattedAmount}</span>
                                    </div>

                                    {/* Box 2 */}
                                    <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-850 p-3 rounded-xl flex flex-col gap-1">
                                        <span className="text-[8px] font-black text-slate-400 uppercase leading-none">Mês de Referência</span>
                                        <span className="text-xs md:text-sm font-black text-slate-850 dark:text-white font-mono mt-0.5">{data.month}/{data.year}</span>
                                    </div>

                                    {/* Box 3 */}
                                    <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-850 p-3 rounded-xl flex flex-col gap-1">
                                        <span className="text-[8px] font-black text-slate-400 uppercase leading-none">Data do Pagamento</span>
                                        <span className="text-xs md:text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">{data.date}</span>
                                    </div>

                                    {/* Box 4 - Highlighted in Light Green */}
                                    <div className="bg-[#f0fdf4] dark:bg-emerald-950/20 border border-[#bbf7d0] dark:border-emerald-900/40 p-3 rounded-xl flex flex-col gap-1">
                                        <span className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 uppercase leading-none">Data do Vencimento</span>
                                        <span className="text-xs md:text-sm font-black text-emerald-700 dark:text-emerald-400 font-mono mt-0.5">{dDate}</span>
                                    </div>

                                </div>

                                <div className="flex justify-between items-center pt-2 mt-1 relative z-10">
                                    <span className="text-[10px] font-bold text-slate-500">
                                        Método de pagamento: <span className="font-black text-slate-800 dark:text-white uppercase font-mono">{pMethod}</span>
                                    </span>
                                    <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-[9px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest rounded-full select-none">
                                        Pago
                                    </span>
                                </div>
                            </div>

                            {/* TEXTUAL DECLARATION */}
                            <div className="bg-slate-50 dark:bg-slate-900/30 p-4 rounded-2xl text-xs md:text-sm text-slate-600 dark:text-slate-350 italic leading-relaxed border border-slate-100 dark:border-slate-850">
                                "Recebemos de <span className="font-bold text-slate-800 dark:text-white uppercase">{data.tenantName}</span> o valor de <span className="font-bold text-slate-800 dark:text-white font-mono">{formattedAmount}</span> ({extensoCapitalized}), referente ao aluguel do imóvel <span className="font-bold text-slate-800 dark:text-white">{data.propertyDescription}</span> situado em <span className="font-bold text-slate-800 dark:text-white">{data.propertyAddress}</span>, correspondente ao mês de referência <span className="font-bold text-slate-800 dark:text-white font-mono">{data.month}/{data.year}</span>."
                            </div>

                            {/* SIGNATURE AND METADATA */}
                            <div className="flex flex-col md:flex-row items-start md:items-end justify-between pt-4 border-t border-slate-100 dark:border-slate-850 gap-6 text-[10px]">
                                <div className="flex flex-col gap-1 text-slate-450 dark:text-slate-400">
                                    <span>Data de emissão: <strong className="text-slate-700 dark:text-slate-300 font-mono">{data.date}</strong></span>
                                    <span>Autenticador do SaaS: <strong className="text-slate-700 dark:text-slate-300 font-mono uppercase">{rCode}/ALUGUEL</strong></span>
                                </div>
                                
                                <div className="flex flex-col items-center md:items-end self-center md:self-auto w-full md:w-auto">
                                    <div className="w-48 h-px bg-slate-200 dark:bg-slate-850 mb-1.5"></div>
                                    <span className="text-[8px] text-slate-400 uppercase tracking-wider">Assinatura do Locador</span>
                                    <strong className="text-slate-800 dark:text-white uppercase text-xs mt-0.5">{locador}</strong>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 border-t border-slate-200 dark:border-slate-850">
                    <button
                        onClick={handleShare}
                        className="flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black shadow-lg shadow-emerald-600/20 active:scale-95 transition-all w-full"
                    >
                        <span className="material-symbols-outlined text-sm font-bold">share</span>
                        Compartilhar / WhatsApp
                    </button>
                    <button
                        onClick={handleDownload}
                        className="flex items-center justify-center gap-2 py-3 px-4 bg-slate-900 dark:bg-primary text-white dark:text-slate-900 rounded-2xl text-xs font-black active:scale-95 transition-all w-full hover:bg-slate-800 dark:hover:bg-primary-dark"
                    >
                        <span className="material-symbols-outlined text-sm font-bold">download</span>
                        Baixar Recibo (PDF)
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReceiptModal;
