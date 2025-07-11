import { v2 as cloudinary } from 'cloudinary';
import * as dotenv from 'dotenv';
import { Stream } from 'stream';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadToCloudinary = (buffer: Buffer, folder = 'services'): Promise<string> => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (error) return reject(error);
        resolve(result!.secure_url);
      },
    );

    const readable = new Stream.Readable();
    readable.push(buffer);
    readable.push(null);
    readable.pipe(stream);
  });
};