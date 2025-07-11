// src/cloudinary/multer.ts
import * as multer from 'multer';

export const multerOptions = {
  storage: multer.memoryStorage(),
};

export const upload = multer(multerOptions);