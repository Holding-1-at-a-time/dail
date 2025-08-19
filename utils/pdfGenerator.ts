import jsPDF from 'jspdf';
import { Job, Customer, Vehicle, Service, Company } from '../types';

interface BrandingInfo {
    name: string;
    logoUrl: string | null;
    brandColor?: string;
}

// Helper to fetch image and convert to Data URL
const imageToDataUrl = (url: string): Promise<string> => {
    return fetch(url)
        .then(response => response.blob())
        .then(blob => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        }));
};


const generatePdf = async (
    docType: 'Invoice' | 'Work Order',
    job: Job,
    customer: Customer,
    vehicle: Vehicle,
    services: Service[],
    branding: BrandingInfo
) => {
    const doc = new jsPDF();
    const brandColor = branding.brandColor || '#00AE98';

    // --- Header ---
    if (branding.logoUrl) {
        try {
            const logoData = await imageToDataUrl(branding.logoUrl);
            doc.addImage(logoData, 'PNG', 15, 12, 40, 15, undefined, 'FAST');
        } catch (error) {
            console.error("Error loading logo for PDF:", error);
            doc.setFontSize(20).setFont('helvetica', 'bold').text(branding.name, 15, 20);
        }
    } else {
        doc.setFontSize(20).setFont('helvetica', 'bold').text(branding.name, 15, 20);
    }
    
    doc.setFontSize(22).setFont('helvetica', 'bold').setTextColor(brandColor).text(docType, 200, 20, { align: 'right' });
    doc.setFontSize(10).setTextColor(100).text(`Job #${job._id.substring(0,6)}`, 200, 26, { align: 'right' });
    doc.setDrawColor(brandColor).setLineWidth(0.5).line(15, 35, 200, 35);

    // --- Customer & Vehicle Info ---
    doc.setFontSize(10).setFont('helvetica', 'bold').setTextColor(brandColor).text('CUSTOMER', 15, 45);
    doc.setFontSize(10).setFont('helvetica', 'normal').setTextColor(50)
        .text(customer.name, 15, 51)
        .text(customer.phone, 15, 56)
        .text(customer.email, 15, 61);
        
    doc.setFontSize(10).setFont('helvetica', 'bold').setTextColor(brandColor).text('VEHICLE', 110, 45);
    doc.setFontSize(10).setFont('helvetica', 'normal').setTextColor(50)
        .text(`${vehicle.year} ${vehicle.make} ${vehicle.model}`, 110, 51)
        .text(`Color: ${vehicle.color}`, 110, 56)
        .text(`VIN: ${vehicle.vin}`, 110, 61);

    // --- Line Items Table ---
    let yPos = 80;
    doc.setFontSize(10).setFont('helvetica', 'bold').setTextColor(brandColor)
        .text('DESCRIPTION', 15, yPos)
        .text('AMOUNT', 200, yPos, { align: 'right' });
    doc.setDrawColor(200).setLineWidth(0.2).line(15, yPos + 2, 200, yPos + 2);
    yPos += 8;

    job.jobItems.forEach(item => {
        const service = services.find(s => s._id === item.serviceId);
        if (service) {
            doc.setFontSize(10).setFont('helvetica', 'bold').setTextColor(50).text(service.name, 15, yPos);
            doc.setFontSize(10).setFont('helvetica', 'normal').setTextColor(50).text(`$${item.total.toFixed(2)}`, 200, yPos, { align: 'right' });
            yPos += 5;
        }
    });

    // --- Totals ---
    yPos += 10;
    doc.setDrawColor(200).setLineWidth(0.2).line(120, yPos - 5, 200, yPos - 5);
    doc.setFontSize(10).setFont('helvetica', 'bold').setTextColor(50).text('Total:', 160, yPos, { align: 'right' });
    doc.setFontSize(10).setFont('helvetica', 'normal').setTextColor(50).text(`$${job.totalAmount.toFixed(2)}`, 200, yPos, { align: 'right' });
    yPos += 6;
    doc.setFontSize(10).setFont('helvetica', 'bold').setTextColor(50).text('Paid:', 160, yPos, { align: 'right' });
    doc.setFontSize(10).setFont('helvetica', 'normal').setTextColor(50).text(`$${job.paymentReceived.toFixed(2)}`, 200, yPos, { align: 'right' });
    yPos += 8;
    
    doc.setFillColor(brandColor).rect(120, yPos - 5, 80, 10, 'F');
    doc.setFontSize(12).setFont('helvetica', 'bold').setTextColor('#FFFFFF').text('Balance Due:', 160, yPos + 1, { align: 'right' });
    doc.setFontSize(12).setFont('helvetica', 'bold').setTextColor('#FFFFFF').text(`$${(job.totalAmount - job.paymentReceived).toFixed(2)}`, 200, yPos + 1, { align: 'right' });

    doc.save(`${docType}-${job._id.substring(0,6)}.pdf`);
};

export const generateInvoicePdf = (job: Job, customer: Customer, vehicle: Vehicle, services: Service[], branding: BrandingInfo) => {
    generatePdf('Invoice', job, customer, vehicle, services, branding);
};

export const generateWorkOrderPdf = (job: Job, customer: Customer, vehicle: Vehicle, services: Service[], branding: BrandingInfo) => {
    generatePdf('Work Order', job, customer, vehicle, services, branding);
};
