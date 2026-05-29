import { v2 as cloudinary } from 'cloudinary';
import { env } from './env.js';

// Signed, server-mediated uploads only. The API secret stays on the server;
// the client receives a short-lived signature scoped to a specific folder.
cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
});

export { cloudinary };
