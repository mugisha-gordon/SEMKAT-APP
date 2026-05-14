import { ref, uploadBytes, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { Capacitor } from '@capacitor/core';
import { storage, ensureAuthReady } from './client';

const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v', '.3gp'] as const;
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.heic', '.heif'] as const;

function isLikelyVideoFile(file: File): boolean {
  if (file.type?.startsWith('video/')) {
    return true;
  }

  const fileName = (file.name || '').toLowerCase();
  if (VIDEO_EXTENSIONS.some((ext) => fileName.endsWith(ext))) {
    return true;
  }

  // Some Android WebView file pickers provide empty MIME type and a name without extension.
  // We still allow upload attempts as long as there is file content; contentType will be inferred.
  return !file.type && !!file.size;
}

function inferVideoContentType(file: File): string {
  if (file.type?.startsWith('video/')) {
    return file.type;
  }

  const name = (file.name || '').toLowerCase();
  if (name.endsWith('.webm')) return 'video/webm';
  if (name.endsWith('.mov')) return 'video/quicktime';
  if (name.endsWith('.avi')) return 'video/x-msvideo';
  if (name.endsWith('.mkv')) return 'video/x-matroska';
  if (name.endsWith('.3gp')) return 'video/3gpp';
  return 'video/mp4';
}

function extensionForVideoContentType(contentType: string): string {
  if (contentType === 'video/webm') return '.webm';
  if (contentType === 'video/quicktime') return '.mov';
  if (contentType === 'video/x-msvideo') return '.avi';
  if (contentType === 'video/x-matroska') return '.mkv';
  if (contentType === 'video/3gpp') return '.3gp';
  return '.mp4';
}

function normalizeVideoFileForNativeAndroid(file: File): File {
  const isAndroidNative = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  if (!isAndroidNative) {
    return file;
  }

  // Some Android pickers return files with blank MIME/name in WebView.
  // Re-wrap with stable metadata so Storage rules can evaluate contentType.
  const contentType = inferVideoContentType(file);
  const hasExtension = /\.[a-z0-9]+$/i.test(file.name || '');
  const safeName = file.name?.trim()
    ? hasExtension
      ? file.name
      : `${file.name}${extensionForVideoContentType(contentType)}`
    : `video_${Date.now()}${extensionForVideoContentType(contentType)}`;

  return new File([file], safeName, {
    type: contentType,
    lastModified: file.lastModified || Date.now(),
  });
}

function isLikelyImageFile(file: File): boolean {
  if (file.type?.startsWith('image/')) {
    return true;
  }
  const name = (file.name || '').toLowerCase();
  return IMAGE_EXTENSIONS.some((ext) => name.endsWith(ext));
}

function inferImageContentType(file: File): string {
  if (file.type?.startsWith('image/')) {
    return file.type;
  }
  const name = (file.name || '').toLowerCase();
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.webp')) return 'image/webp';
  if (name.endsWith('.gif')) return 'image/gif';
  if (name.endsWith('.bmp')) return 'image/bmp';
  if (name.endsWith('.heic')) return 'image/heic';
  if (name.endsWith('.heif')) return 'image/heif';
  return 'image/jpeg';
}

function wrapStorageError(error: any, prefix: string): Error {
  const e: any = new Error(`${prefix}: ${error?.message || 'Unknown error'}`);
  if (error?.code) {
    e.code = error.code;
  }
  return e as Error;
}

 function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
   return new Promise<T>((resolve, reject) => {
     const timer = setTimeout(() => reject(new Error(message)), timeoutMs);
     promise
       .then((value) => {
         clearTimeout(timer);
         resolve(value);
       })
       .catch((err) => {
         clearTimeout(timer);
         reject(err);
       });
   });
 }

export async function uploadKml(
  file: File,
  path: string
): Promise<string> {
  await ensureAuthReady();

  const name = (file?.name || '').toLowerCase();
  if (!name.endsWith('.kml')) {
    throw new Error('File must be a .kml');
  }

  // Validate file size (max 10MB)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error('KML file size must be less than 10MB');
  }

  const kmlRef = ref(storage, path);

  try {
    await withTimeout(
      uploadBytes(kmlRef, file, { contentType: 'application/vnd.google-earth.kml+xml' }),
      2 * 60 * 1000,
      'KML upload timed out. Please try again.'
    );

    const url = await withTimeout(
      getDownloadURL(kmlRef),
      30 * 1000,
      'Failed to get KML URL. Please try again.'
    );

    return url;
  } catch (error: any) {
    console.error('Error uploading KML:', error);
    throw wrapStorageError(error, 'Failed to upload KML');
  }
}

/**
 * Upload a video file to Firebase Storage
 */
export async function uploadVideo(
  file: File,
  userId: string,
  options?: {
    onProgress?: (progress: number, bytesTransferred?: number) => void;
  }
): Promise<{ videoUrl: string; coverUrl?: string }> {
  await ensureAuthReady();
  const uploadFile = normalizeVideoFileForNativeAndroid(file);

  // Validate file type
  if (!isLikelyVideoFile(uploadFile)) {
    throw new Error('File must be a video');
  }

  // Validate file size (max 200MB - increased for better UX)
  const maxSize = 200 * 1024 * 1024; // 200MB
  if (uploadFile.size > maxSize) {
    throw new Error('Video file size must be less than 200MB');
  }

  // Generate unique filename - sanitize filename to avoid issues
  const timestamp = Date.now();
  const sanitizedName = uploadFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filename = `videos/${userId}/${timestamp}_${sanitizedName}`;
  const videoRef = ref(storage, filename);
  const contentType = inferVideoContentType(uploadFile);

  try {
    const attemptResumable = async () => {
      const uploadTask = uploadBytesResumable(videoRef, uploadFile, {
        contentType,
      });

      await new Promise<void>((resolve, reject) => {
        // Larger timeouts reduce forced retries on real mobile networks.
        // Retries make uploads feel "slow" because progress resets.
        const totalTimeoutMs = 20 * 60 * 1000;
        const idleTimeoutMs = 2 * 60 * 1000;

        let totalTimer: any;
        let idleTimer: any;

        const clearTimers = () => {
          if (totalTimer) clearTimeout(totalTimer);
          if (idleTimer) clearTimeout(idleTimer);
        };

        const fail = (err: any) => {
          clearTimers();
          try {
            uploadTask.cancel();
          } catch {
            // ignore
          }
          reject(err);
        };

        const resetIdle = () => {
          if (idleTimer) clearTimeout(idleTimer);
          idleTimer = setTimeout(() => {
            fail(new Error('Upload stalled. Please check your connection and try again.'));
          }, idleTimeoutMs);
        };

        totalTimer = setTimeout(() => {
          fail(new Error('Upload timed out. Please try again.'));
        }, totalTimeoutMs);

        resetIdle();
        // Don't force a 0% event here; the SDK will emit state changes quickly.

        uploadTask.on(
          'state_changed',
          (snapshot) => {
            resetIdle();
            const progress = snapshot.totalBytes
              ? (snapshot.bytesTransferred / snapshot.totalBytes) * 100
              : 0;
            options?.onProgress?.(progress, snapshot.bytesTransferred);
          },
          (error) => {
            console.error('Upload error:', error);
            fail(error);
          },
          () => {
            clearTimers();
            options?.onProgress?.(100, uploadFile.size);
            resolve();
          }
        );
      });
    };

    try {
      await attemptResumable();
    } catch (resumableError: any) {
      const msg = String(resumableError?.message || resumableError);
      console.warn('Resumable upload failed, falling back to non-resumable uploadBytes:', resumableError);
      options?.onProgress?.(0, 0);
      await withTimeout(
        uploadBytes(videoRef, uploadFile, { contentType }),
        10 * 60 * 1000,
        'Upload timed out. Please try again.'
      );
      options?.onProgress?.(100, uploadFile.size);
      void msg;
    }

    // Get download URL after upload completes
    let videoUrl: string | null = null;
    let retries = 3;
    
    while (retries > 0) {
      try {
        videoUrl = await withTimeout(
          getDownloadURL(videoRef),
          30 * 1000,
          'Failed to get video URL. Please try again.'
        );
        if (videoUrl && videoUrl.length > 0) {
          break;
        }
      } catch (error: any) {
        retries--;
        if (retries === 0) {
          throw new Error(`Failed to get video download URL after 3 attempts: ${error.message}`);
        }
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    if (!videoUrl) {
      throw new Error('Failed to get video download URL after upload');
    }

    return { videoUrl };
  } catch (error: any) {
    console.error('Error uploading video:', error);
    throw wrapStorageError(error, 'Failed to upload video');
  }
}

/**
 * Upload an image file to Firebase Storage
 */
export async function uploadImage(
  file: File,
  path: string
): Promise<string> {
  await ensureAuthReady();

  // Validate file type
  if (!isLikelyImageFile(file)) {
    throw new Error('File must be an image');
  }

  // Validate file size (max 50MB)
  const maxSize = 50 * 1024 * 1024; // 50MB
  if (file.size > maxSize) {
    throw new Error('Image file size must be less than 50MB');
  }

  const imageRef = ref(storage, path);

  try {
    // Upload with explicit contentType (required by storage.rules contentType matcher)
    // Add a timeout + a few retries for flaky networks
    let uploadRetries = 3;
    while (uploadRetries > 0) {
      try {
        await withTimeout(
          uploadBytes(imageRef, file, { contentType: inferImageContentType(file) }),
          2 * 60 * 1000,
          'Image upload timed out. Please try again.'
        );
        break;
      } catch (error: any) {
        uploadRetries--;
        if (uploadRetries === 0) throw error;
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    // Retry download URL retrieval (sometimes immediate read can race)
    let imageUrl: string | null = null;
    let urlRetries = 3;
    while (urlRetries > 0) {
      try {
        imageUrl = await withTimeout(
          getDownloadURL(imageRef),
          30 * 1000,
          'Failed to get image URL. Please try again.'
        );
        if (imageUrl && imageUrl.length > 0) break;
      } catch (error: any) {
        urlRetries--;
        if (urlRetries === 0) throw error;
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    if (!imageUrl) {
      throw new Error('Failed to get image download URL after upload');
    }

    return imageUrl;
  } catch (error: any) {
    console.error('Error uploading image:', error);
    throw wrapStorageError(error, 'Failed to upload image');
  }
}

/**
 * Delete a file from Firebase Storage
 */
export async function deleteFile(fileUrl: string): Promise<void> {
  try {
    // The Firebase v9 `ref` function supports full URLs (including download URLs)
    // as well as relative storage paths.
    const fileRef = ref(storage, fileUrl);
    await deleteObject(fileRef);
  } catch (error: any) {
    console.error('Error deleting file:', error);
    throw wrapStorageError(error, 'Failed to delete file');
  }
}
