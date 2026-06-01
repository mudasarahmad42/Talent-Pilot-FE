import { Injectable } from '@angular/core';

export type FileDownloadMethod = 'download' | 'open';

export interface FileDownloadResult {
  method: FileDownloadMethod;
}

type LegacyNavigator = Navigator & {
  msSaveOrOpenBlob?: (blob: Blob, fileName: string) => boolean;
};

@Injectable({ providedIn: 'root' })
export class FileDownloadService {
  saveBlob(blob: Blob, fileName: string): FileDownloadResult {
    if (blob.size === 0) {
      throw new Error('The exported file was empty.');
    }

    const safeFileName = this.toSafeFileName(fileName);
    const legacyNavigator = window.navigator as LegacyNavigator;

    if (legacyNavigator.msSaveOrOpenBlob) {
      legacyNavigator.msSaveOrOpenBlob(blob, safeFileName);
      return { method: 'download' };
    }

    const objectUrl = URL.createObjectURL(blob);

    try {
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = safeFileName;
      link.rel = 'noopener';
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      link.remove();

      this.revokeLater(objectUrl);
      return { method: 'download' };
    } catch (error) {
      const opened = window.open(objectUrl, '_blank', 'noopener');
      this.revokeLater(objectUrl);

      if (opened) {
        return { method: 'open' };
      }

      throw new Error('The browser blocked the file download.');
    }
  }

  private revokeLater(objectUrl: string): void {
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  }

  private toSafeFileName(fileName: string): string {
    const trimmed = fileName.trim() || 'download.xlsx';
    return trimmed.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-');
  }
}
