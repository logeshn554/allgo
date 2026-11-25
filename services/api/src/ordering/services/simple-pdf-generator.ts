export class SimplePdfGenerator {
  public static generatePdf(title: string, lines: string[]): Buffer {
    const streamContent = [
      'BT',
      '/F1 12 Tf',
      '40 750 Td',
      `(${title}) Tj`,
      'ET',
      ...lines.map((line, idx) => {
        const y = 720 - idx * 16;
        const sanitized = line.replace(/[()\\]/g, ' ');
        return `BT /F1 10 Tf 40 ${y} Td (${sanitized}) Tj ET`;
      }),
    ].join('\n');

    const streamLength = Buffer.byteLength(streamContent, 'utf8');

    const pdfParts: string[] = [
      '%PDF-1.4',
      '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj',
      '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj',
      '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj',
      `4 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamContent}\nendstream\nendobj`,
      '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj',
    ];

    let offset = 0;
    const xrefOffsets = [0];
    let body = '';

    for (const part of pdfParts) {
      xrefOffsets.push(offset);
      body += part + '\n';
      offset = Buffer.byteLength(body, 'utf8');
    }

    const xrefStart = offset;
    let xref = `xref\n0 ${pdfParts.length + 1}\n0000000000 65535 f \n`;
    for (let i = 1; i <= pdfParts.length; i++) {
      const offVal = xrefOffsets[i] ?? 0;
      const offStr = offVal.toString().padStart(10, '0');
      xref += `${offStr} 00000 n \n`;
    }

    const trailer = `trailer\n<< /Size ${pdfParts.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
    const fullPdf = body + xref + trailer;

    return Buffer.from(fullPdf, 'utf8');
  }
}
