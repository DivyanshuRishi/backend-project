// import multer from "multer";

// const storage = multer.diskStorage({
//     destination: function (req, file, cb) {
//     cb(null, "../public/temp")
//     },
//     filename: function (req, file, cb) {
//     cb(null, file.originalname)
//     }
// })

// export const upload = multer({
//     storage
// })

import multer from 'multer';
import path from 'path';




// Function to get __dirname
const __dirname = path.dirname(new URL(import.meta.url).pathname);

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../../public/temp')); // Adjusted path
    },
    filename: function (req, file, cb) {
    cb(null, file.originalname);
    }
});

export const upload = multer(
    { storage }
);
