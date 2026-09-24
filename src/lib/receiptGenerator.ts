import PDFDocument from 'pdfkit';
import { RideReceipt } from '../types.ts';

export async function generateRideReceiptPdf(data: RideReceipt): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 40,
        size: 'A4',
        info: {
          Title: `Comprovante da Corrida - ${data.receiptCode}`,
          Author: 'VaiCar São Sebastião',
          Subject: 'Comprovante de Transporte de Passageiros',
          Creator: 'VaiCar Platform Technology',
        },
      });

      const buffers: Buffer[] = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      const primaryEmerald = '#059669';
      const darkNavy = '#0f172a';
      const textGray = '#475569';
      const lightBg = '#f8fafc';
      const borderGray = '#e2e8f0';

      // --- HEADER SECTION ---
      doc.rect(40, 40, 515, 80).fill('#022c22');

      doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold')
        .text('VaiCar', 60, 56);
      
      doc.fillColor('#34d399').fontSize(9).font('Helvetica-Bold')
        .text('TRANSPORTE MUNICIPAL • SÃO SEBASTIÃO - SP', 60, 82);

      doc.fillColor('#ffffff').fontSize(14).font('Helvetica-Bold')
        .text('COMPROVANTE DA CORRIDA', 300, 56, { align: 'right', width: 235 });

      doc.fillColor('#94a3b8').fontSize(9).font('Helvetica')
        .text(`Nº ${data.receiptCode}`, 300, 75, { align: 'right', width: 235 });

      const issueDate = data.createdAt ? new Date(data.createdAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : new Date().toLocaleString('pt-BR');
      doc.text(`Emitido em: ${issueDate}`, 300, 89, { align: 'right', width: 235 });

      let currentY = 135;

      // --- RIDE & SUMMARY CARD ---
      doc.roundedRect(40, currentY, 515, 65, 6).fillAndStroke(lightBg, borderGray);
      doc.fillColor(darkNavy).fontSize(10).font('Helvetica-Bold').text('IDENTIFICAÇÃO DA VIAGEM', 55, currentY + 12);
      
      doc.fillColor(textGray).fontSize(8.5).font('Helvetica');
      doc.text(`ID da Corrida:`, 55, currentY + 30);
      doc.fillColor(darkNavy).font('Helvetica-Bold').text(data.rideId, 120, currentY + 30);

      doc.fillColor(textGray).font('Helvetica').text(`Distância:`, 55, currentY + 45);
      doc.fillColor(darkNavy).font('Helvetica-Bold').text(`${data.distanceKm.toFixed(1)} km`, 120, currentY + 45);

      doc.fillColor(textGray).font('Helvetica').text(`Duração Total:`, 300, currentY + 30);
      doc.fillColor(darkNavy).font('Helvetica-Bold').text(`${data.durationMinutes} minutos`, 380, currentY + 30);

      doc.fillColor(textGray).font('Helvetica').text(`Status da Viagem:`, 300, currentY + 45);
      doc.fillColor(primaryEmerald).font('Helvetica-Bold').text('FINALIZADA COM SUCESSO', 380, currentY + 45);

      currentY += 80;

      // --- PASSENGER & DRIVER TWO-COLUMN BLOCK ---
      // Passenger Box (Left)
      doc.roundedRect(40, currentY, 250, 85, 6).fillAndStroke(lightBg, borderGray);
      doc.fillColor(darkNavy).fontSize(9.5).font('Helvetica-Bold').text('PASSAGEIRO(A)', 52, currentY + 10);
      doc.fillColor(textGray).fontSize(8.5).font('Helvetica');
      doc.text('Nome:', 52, currentY + 28);
      doc.fillColor(darkNavy).font('Helvetica-Bold').text(data.passengerName || 'Passageiro', 100, currentY + 28, { width: 180 });
      doc.fillColor(textGray).font('Helvetica').text('Telefone:', 52, currentY + 44);
      doc.fillColor(darkNavy).font('Helvetica-Bold').text(data.passengerPhone || '-', 100, currentY + 44);
      if (data.passengerEmail) {
        doc.fillColor(textGray).font('Helvetica').text('E-mail:', 52, currentY + 60);
        doc.fillColor(darkNavy).font('Helvetica-Bold').text(data.passengerEmail, 100, currentY + 60, { width: 180 });
      }

      // Driver Box (Right)
      doc.roundedRect(305, currentY, 250, 85, 6).fillAndStroke(lightBg, borderGray);
      doc.fillColor(darkNavy).fontSize(9.5).font('Helvetica-Bold').text('MOTORISTA PARCEIRO(A)', 317, currentY + 10);
      doc.fillColor(textGray).fontSize(8.5).font('Helvetica');
      doc.text('Nome:', 317, currentY + 28);
      doc.fillColor(darkNavy).font('Helvetica-Bold').text(data.driverName || 'Motorista', 365, currentY + 28, { width: 180 });
      doc.fillColor(textGray).font('Helvetica').text('Telefone:', 317, currentY + 44);
      doc.fillColor(darkNavy).font('Helvetica-Bold').text(data.driverPhone || '-', 365, currentY + 44);
      doc.fillColor(textGray).font('Helvetica').text('Veículo:', 317, currentY + 60);
      const vehicleText = `${data.driverVehicle || 'Veículo'}${data.driverLicensePlate ? ` (${data.driverLicensePlate})` : ''}`;
      doc.fillColor(darkNavy).font('Helvetica-Bold').text(vehicleText, 365, currentY + 60, { width: 180 });

      currentY += 100;

      // --- ROUTE & ITINERARY BOX ---
      doc.roundedRect(40, currentY, 515, 80, 6).fillAndStroke(lightBg, borderGray);
      doc.fillColor(darkNavy).fontSize(9.5).font('Helvetica-Bold').text('TRAJETO E LOCALIZAÇÃO', 55, currentY + 10);

      // Origin
      doc.circle(60, currentY + 34, 4).fillAndStroke(primaryEmerald, primaryEmerald);
      doc.fillColor(textGray).fontSize(8.5).font('Helvetica').text('Origem / Embarque:', 72, currentY + 29);
      doc.fillColor(darkNavy).font('Helvetica-Bold').text(data.originAddress, 175, currentY + 29, { width: 365 });

      // Destination
      doc.circle(60, currentY + 58, 4).fillAndStroke('#0284c7', '#0284c7');
      doc.fillColor(textGray).fontSize(8.5).font('Helvetica').text('Destino / Desembarque:', 72, currentY + 53);
      doc.fillColor(darkNavy).font('Helvetica-Bold').text(data.destinationAddress, 175, currentY + 53, { width: 365 });

      currentY += 95;

      // --- FINANCIAL BREAKDOWN TABLE ---
      doc.roundedRect(40, currentY, 515, 140, 6).fillAndStroke(lightBg, borderGray);
      doc.fillColor(darkNavy).fontSize(10).font('Helvetica-Bold').text('DISCRIMINAÇÃO DOS VALORES', 55, currentY + 12);

      let rowY = currentY + 32;

      const drawRow = (label: string, value: string, isBold: boolean = false, highlightColor?: string) => {
        doc.fillColor(highlightColor || (isBold ? darkNavy : textGray))
          .fontSize(isBold ? 9.5 : 8.5)
          .font(isBold ? 'Helvetica-Bold' : 'Helvetica')
          .text(label, 55, rowY);

        doc.fillColor(highlightColor || (isBold ? darkNavy : textGray))
          .fontSize(isBold ? 9.5 : 8.5)
          .font(isBold ? 'Helvetica-Bold' : 'Helvetica')
          .text(value, 350, rowY, { align: 'right', width: 190 });

        doc.moveTo(55, rowY + 14).lineTo(540, rowY + 14).strokeColor(borderGray).lineWidth(0.5).stroke();
        rowY += 18;
      };

      drawRow('Tarifa Base da Corrida (Distância e Trajeto)', `R$ ${data.baseFare.toFixed(2).replace('.', ',')}`);
      
      if (data.dynamicMultiplier && data.dynamicMultiplier !== 1.0) {
        drawRow(`Fator de Demanda Dinâmica (${data.dynamicMultiplier}x)`, 'Aplicado no cálculo base');
      }

      if (data.waitingMinutes && data.waitingMinutes > 0) {
        const fee = data.waitingFee || 0;
        drawRow(`Tempo de Espera (${data.waitingMinutes} min - excedente)`, `R$ ${fee.toFixed(2).replace('.', ',')}`);
      }

      const methodLabel = data.paymentMethod === 'PIX' ? 'PIX' : (data.paymentMethod === 'CARD_CREDIT' ? 'Cartão de Crédito' : (data.paymentMethod === 'CARD_DEBIT' ? 'Cartão de Débito' : 'Dinheiro'));
      drawRow('Forma de Pagamento Registrada', methodLabel);

      // Total Row Highlighted
      rowY += 4;
      doc.rect(48, rowY - 4, 499, 26).fill('#ecfdf5');
      doc.fillColor('#065f46').fontSize(11).font('Helvetica-Bold').text('VALOR TOTAL DA CORRIDA:', 58, rowY + 2);
      doc.fillColor('#047857').fontSize(12).font('Helvetica-Bold').text(`R$ ${data.finalTotal.toFixed(2).replace('.', ',')}`, 350, rowY + 2, { align: 'right', width: 190 });

      currentY += 155;

      // --- LEGAL NOTICE & PLATFORM FOOTER ---
      doc.roundedRect(40, currentY, 515, 50, 4).fillAndStroke('#f1f5f9', '#cbd5e1');
      doc.fillColor('#64748b').fontSize(7.5).font('Helvetica')
        .text('Este documento é um comprovante de prestação de serviço de transporte emitido pela plataforma tecnológica VaiCar São Sebastião, intermediadora entre passageiro e motorista autônomo credenciado.', 50, currentY + 8, { width: 495, align: 'justify' })
        .text('Para dúvidas, suporte ou reporte de ocorrências acesse o painel VaiCar ou entre em contato pelo canal oficial de suporte da plataforma.', 50, currentY + 28, { width: 495, align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
