import {
  Component,
  Output,
  EventEmitter,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ZXingScannerModule } from '@zxing/ngx-scanner';
import { BarcodeFormat } from '@zxing/library';

@Component({
  selector: 'app-qr-scanner',
  standalone: true,
  imports: [CommonModule, ZXingScannerModule],
  templateUrl: './qr-scanner.component.html',
  styleUrls: ['./qr-scanner.component.css'],
})
export class QrScannerComponent {
  @Output() codeScanned = new EventEmitter<string>();
  @Output() scannerClosed = new EventEmitter<void>();

  hasPermission = signal(false);
  availableDevices = signal<MediaDeviceInfo[]>([]);
  currentDevice = signal<MediaDeviceInfo | undefined>(undefined);
  scannerEnabled = signal(true);

  allowedFormats = [BarcodeFormat.QR_CODE];

  hasMultipleCameras = computed(() => this.availableDevices().length > 1);

  onCamerasFound(devices: MediaDeviceInfo[]): void {
    this.availableDevices.set(devices);
    if (devices.length > 0 && !this.currentDevice()) {
      // Prefer back camera on mobile
      const backCamera = devices.find(
        (device) =>
          device.label.toLowerCase().includes('back') ||
          device.label.toLowerCase().includes('rear'),
      );
      this.currentDevice.set(backCamera || devices[0]);
    }
  }

  onCodeResult(result: any): void {
    const resultString =
      typeof result === 'string' ? result : result?.text || '';

    if (resultString && resultString.trim()) {
      const cleanCode = resultString.trim().toUpperCase();

      // Check if it's a valid 6-character lobby code
      if (/^[A-Z0-9]{6}$/.test(cleanCode)) {
        this.codeScanned.emit(cleanCode);
      } else {
        // Try to extract lobby code from URL or other formats
        const codeMatch = cleanCode.match(/[A-Z0-9]{6}/);
        if (codeMatch) {
          this.codeScanned.emit(codeMatch[0]);
        }
      }
    }
  }

  onPermissionResponse(permission: boolean): void {
    this.hasPermission.set(permission);
  }

  onScanError(error: any): void {
    console.error('QR Scan Error:', error);
  }

  switchCamera(): void {
    const devices = this.availableDevices();
    const current = this.currentDevice();

    if (devices.length > 1) {
      const currentIndex = devices.findIndex(
        (device) => device.deviceId === current?.deviceId,
      );
      const nextIndex = (currentIndex + 1) % devices.length;
      this.currentDevice.set(devices[nextIndex]);
    }
  }

  closeScanner(): void {
    this.scannerClosed.emit();
  }
}
