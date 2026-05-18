import { Injectable } from '@nestjs/common';
import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';

const PDF_MIME = 'application/pdf';
const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

@Injectable()
export class ResumeDocumentParserService {
  async extractText(buffer: Buffer, mimeType: string): Promise<string> {
    if (mimeType === PDF_MIME) {
      return ResumeDocumentParserService.extractPdf(buffer);
    }

    if (mimeType === DOCX_MIME) {
      return ResumeDocumentParserService.extractDocx(buffer);
    }

    throw new Error(`Unsupported resume MIME type for parsing: ${mimeType}`);
  }

  private static async extractPdf(buffer: Buffer): Promise<string> {
    const result = await pdfParse(buffer);
    return (result.text ?? '').trim();
  }

  private static async extractDocx(buffer: Buffer): Promise<string> {
    const result = await mammoth.extractRawText({ buffer });
    return (result.value ?? '').trim();
  }
}
