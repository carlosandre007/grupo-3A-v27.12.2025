import React from 'react';
import { buildReceiptPDF, ReceiptData } from '../utils/receiptGenerator';

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
            const { file, doc, fileName, pdfBlob } = buildReceiptPDF(data);
            
            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: `Recibo - ${data.propertyCode || 'Grupo 3A'}`,
                    text: `Segue o recibo de pagamento no valor de ${formattedAmount}.`
                });
            } else {
                // Fallback to WhatsApp sharing with receipt text
                const textMsg = `Olá ${data.tenantName},\n\n*Aqui está o seu Recibo de Pagamento!*\n\n*Imóvel/Serviço:* ${data.propertyDescription} (${data.propertyCode})\n*Valor:* ${formattedAmount}\n*Referência:* ${data.month}/${data.year}\n*Data:* ${data.date}\n\nObrigado!`;
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

    const handleSendWhatsAppDirect = (e: React.MouseEvent) => {
        e.stopPropagation();
        const textMsg = `Olá ${data.tenantName},\n\n*Aqui está o seu Recibo de Pagamento!*\n\n*Imóvel/Serviço:* ${data.propertyDescription} (${data.propertyCode})\n*Valor:* ${formattedAmount}\n*Referência:* ${data.month}/${data.year}\n*Data:* ${data.date}\n\nObrigado!`;
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(textMsg)}`;
        window.open(whatsappUrl, '_blank');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-slate-900/50 dark:bg-black/70 backdrop-blur-sm">
            <div 
                className="fixed inset-0 transition-opacity" 
                onClick={onClose}
            />
            
            <div className="relative w-full max-w-md transform rounded-[32px] bg-slate-100 dark:bg-slate-900 p-6 text-left shadow-2xl transition-all border border-slate-200 dark:border-slate-800 flex flex-col gap-5 max-h-[90vh]">
                
                {/* Header */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-500 font-black">receipt_long</span>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                            Recibo Digital
                        </h3>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all"
                    >
                        <span className="material-symbols-outlined text-sm font-bold">close</span>
                    </button>
                </div>

                {/* Paper Receipt Body */}
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                    <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-850 shadow-sm relative overflow-hidden flex flex-col gap-4">
                        
                        {/* Cut lines effect */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-slate-200 via-transparent to-slate-200 dark:from-slate-800 dark:to-slate-850"></div>
                        
                        {/* Company Info */}
                        <div className="text-center pb-4 border-b border-dashed border-slate-200 dark:border-slate-800">
                            <h4 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-wider">Grupo 3A</h4>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Gestão Patrimonial & Comercial</p>
                        </div>

                        {/* Receipt Title */}
                        <div className="text-center py-2 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                            <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">
                                {data.propertyCode ? 'Recibo de Aluguel' : 'Recibo de Pagamento'}
                            </span>
                            <h2 className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                                {formattedAmount}
                            </h2>
                        </div>

                        {/* Content Fields */}
                        <div className="space-y-3.5 text-xs text-slate-600 dark:text-slate-350">
                            
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Pagador (Inquilino/Cliente)</span>
                                <span className="font-black text-slate-900 dark:text-white text-sm capitalize">{data.tenantName}</span>
                            </div>

                            {data.propertyCode && (
                                <div className="flex justify-between gap-4 py-2 border-t border-b border-slate-100 dark:border-slate-900">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Código</span>
                                        <span className="font-bold text-slate-800 dark:text-white font-mono">{data.propertyCode}</span>
                                    </div>
                                    <div className="flex flex-col gap-0.5 text-right">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Referência</span>
                                        <span className="font-bold text-slate-800 dark:text-white">{data.month}/{data.year}</span>
                                    </div>
                                </div>
                            )}

                            <div className="flex flex-col gap-0.5">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Imóvel / Descrição</span>
                                <span className="font-semibold text-slate-800 dark:text-white capitalize">{data.propertyDescription}</span>
                            </div>

                            {data.propertyAddress && data.propertyAddress !== '-' && (
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Endereço</span>
                                    <span className="font-medium text-slate-700 dark:text-slate-400">{data.propertyAddress}</span>
                                </div>
                            )}

                            <div className="flex justify-between items-center pt-2 border-t border-dashed border-slate-200 dark:border-slate-850">
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Data de Pagamento</span>
                                    <span className="font-bold text-slate-850 dark:text-white">{data.date}</span>
                                </div>
                                <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/20 px-2.5 py-1 rounded-full border border-emerald-100 dark:border-emerald-900/30 text-[10px] uppercase">
                                    <span className="material-symbols-outlined text-xs">verified</span> Pago
                                </div>
                            </div>
                        </div>

                        {/* Bottom decorative cut */}
                        <div className="flex justify-between text-slate-200 dark:text-slate-800 text-[8px] tracking-[3px] select-none font-bold uppercase mt-2">
                            ••••••••••••••••••••••••••••••••••••••••
                        </div>

                    </div>
                </div>

                {/* Actions Section */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
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
