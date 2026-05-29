import { cloudinary } from '../config/cloudinary.js';
import { env } from '../config/env.js';

export interface AvatarUploadSignature {
  /** Cloudinary cloud name — needed to build the upload URL on the client. */
  cloudName: string;
  /** API key — public, paired with the signature. */
  apiKey: string;
  /** HMAC signature of the signed params. */
  signature: string;
  /** Unix timestamp (seconds) the signature was generated; client must echo it. */
  timestamp: number;
  /** Folder the upload is scoped to: syncup/avatars/<userId>. */
  folder: string;
}

export const uploadsService = {
  /**
   * Produce a signed upload signature scoped to the authenticated user's
   * avatar folder. Only `timestamp` and `folder` are signed, so the client
   * cannot upload outside its own folder without invalidating the signature.
   */
  signAvatarUpload(userId: string): AvatarUploadSignature {
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = `syncup/avatars/${userId}`;

    const signature = cloudinary.utils.api_sign_request(
      { timestamp, folder },
      env.CLOUDINARY_API_SECRET,
    );

    return {
      cloudName: env.CLOUDINARY_CLOUD_NAME,
      apiKey: env.CLOUDINARY_API_KEY,
      signature,
      timestamp,
      folder,
    };
  },
};
