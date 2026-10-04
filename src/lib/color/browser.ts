import { extractDominantColor, fitWithin } from './extract';

export const MAX_PHOTO_SIDE = 1200;
const SAMPLE_SIDE = 64;

export class ImageDecodeError extends Error {
  code = 'IMAGE_DECODE';
}

async function decode(file: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file);
  } catch {
    throw new ImageDecodeError("This photo couldn't be opened. Try a JPEG or PNG.");
  }
}

function canvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const el = document.createElement('canvas');
  el.width = width;
  el.height = height;
  const ctx = el.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new ImageDecodeError('Your browser blocked image processing.');
  return [el, ctx];
}

/** Downscale to ≤1200px (FR-5) and read the dominant colour (FR-2), all on-device. */
export async function processPhoto(file: Blob): Promise<{ photo: Blob; color: string }> {
  const bitmap = await decode(file);
  try {
    const size = fitWithin(bitmap.width, bitmap.height, MAX_PHOTO_SIDE);
    const [full, fullCtx] = canvas(size.width, size.height);
    fullCtx.drawImage(bitmap, 0, 0, size.width, size.height);

    const sample = fitWithin(bitmap.width, bitmap.height, SAMPLE_SIDE);
    const [, sampleCtx] = canvas(sample.width, sample.height);
    sampleCtx.drawImage(bitmap, 0, 0, sample.width, sample.height);
    const { data } = sampleCtx.getImageData(0, 0, sample.width, sample.height);

    const photo = await new Promise<Blob>((resolve, reject) =>
      full.toBlob((b) => (b ? resolve(b) : reject(new ImageDecodeError('Could not compress this photo.'))), 'image/jpeg', 0.85),
    );
    return { photo, color: extractDominantColor(data, sample.width, sample.height) };
  } finally {
    bitmap.close();
  }
}
