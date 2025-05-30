import multer from 'multer';
import { v4 as uuid } from 'uuid';
import fs from 'fs';
import path from 'path';

const uploadDir = path.join(__dirname, 'uploads');

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const id = uuid()
        const extName = file.originalname.split('.').pop();
        const fileName = `${id}.${extName}`
        cb(null, fileName);
    }
});

export const singleUpload = multer({ storage }).single("photo")