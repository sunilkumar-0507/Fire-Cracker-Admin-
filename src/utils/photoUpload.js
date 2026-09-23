/**
 * Getting a photo off the device and into a shape worth uploading.
 *
 * A phone camera writes 4–8 MB at 4000px across. The shop's product pages show
 * a photo at a few hundred pixels, so it is redrawn here at most 1600px on its
 * longest side and saved as a JPEG — usually a few hundred KB, which uploads
 * over a shop's mobile data in a second and keeps the product pages fast.
 *
 * Drawing it through `<img>` also bakes in the camera's EXIF rotation, which
 * browsers now apply on decode, so a portrait shot does not arrive sideways.
 */

const MAX_EDGE = 1600;
const QUALITY = 0.85;

/** What the API will store. Anything else has to be redrawn or refused. */
const STORABLE = new Set(['image/jpeg', 'image/png', 'image/webp']);

const decode = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('decode'));
    };
    img.src = url;
  });

/**
 * The file to upload: shrunk and re-encoded when the browser can read it, the
 * original when it cannot but the API can still take it, and a thrown sentence
 * when neither — an iPhone HEIC photo in a browser other than Safari, say.
 */
export const preparePhoto = async (file) => {
  let img;
  try {
    img = await decode(file);
  } catch {
    if (STORABLE.has(file.type)) return file;
    throw new Error(`${file.name} could not be read. Use a JPEG or PNG photo.`);
  }

  const scale = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.round(img.naturalWidth * scale);
  const height = Math.round(img.naturalHeight * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  // JPEG has no transparency; a cut-out PNG would otherwise go black behind.
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.drawImage(img, 0, 0, width, height);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', QUALITY));

  // A small, already-compressed original can come out larger once redrawn.
  if (!blob || (STORABLE.has(file.type) && blob.size >= file.size)) return file;

  const name = file.name.replace(/\.[^.]+$/, '') || 'photo';
  return new File([blob], `${name}.jpg`, { type: 'image/jpeg' });
};
