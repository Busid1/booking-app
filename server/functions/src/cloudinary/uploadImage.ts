import { BadRequestException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import * as dotenv from 'dotenv';
import * as multer from 'multer';
import { Readable } from 'stream';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

/** Opciones de multer para subir imágenes a memoria (máx. 5 MB, solo imágenes). */
export const imageUploadOptions: multer.Options = {
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new BadRequestException('Solo se permiten archivos de imagen'));
    }
    cb(null, true);
  },
};

export const uploadToCloudinary = (buffer: Buffer | undefined, folder = 'services'): Promise<string> => {
  if (!buffer) return Promise.reject(new BadRequestException('No se ha recibido la imagen'));

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder }, (error, result) => {
      if (error || !result) return reject(error ?? new Error('Error subiendo imagen'));
      resolve(result.secure_url);
    });
    Readable.from(buffer).pipe(stream);
  });
};

/** Obtiene el public_id (incluida la carpeta) de una URL de Cloudinary. */
export function getPublicIdFromUrl(url: string): string | null {
  const [, path] = url.split('/upload/');
  if (!path) return null;
  const segments = path.split('/');
  const versionIndex = segments.findIndex(s => /^v\d+$/.test(s));
  const idSegments = versionIndex >= 0 ? segments.slice(versionIndex + 1) : segments;
  return idSegments.join('/').replace(/\.[a-z0-9]+$/i, '') || null;
}

export async function deleteFromCloudinary(url: string) {
  const publicId = getPublicIdFromUrl(url);
  if (!publicId) return;
  await cloudinary.uploader.destroy(publicId);
}
