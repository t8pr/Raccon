import imageCompression from "browser-image-compression";

// Keep these limits aligned with backend/services/storage_service.py.
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
export const MAX_IMAGE_DIMENSION = 1200;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

function readDimensions(file, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const url = URL.createObjectURL(file);
    const image = new Image();
    const cleanup = () => {
      image.onload = null;
      image.onerror = null;
      signal?.removeEventListener("abort", abort);
      URL.revokeObjectURL(url);
    };
    const abort = () => {
      cleanup();
      image.src = "";
      reject(new DOMException("Aborted", "AbortError"));
    };
    image.onload = () => {
      const dimensions = {
        width: image.naturalWidth,
        height: image.naturalHeight,
      };
      cleanup();
      if (!dimensions.width || !dimensions.height) {
        reject(new Error("تعذر قراءة أبعاد الصورة."));
      } else {
        resolve(dimensions);
      }
    };
    image.onerror = () => {
      cleanup();
      reject(new Error("تعذر قراءة الصورة. اختر ملف صورة صالحًا."));
    };
    signal?.addEventListener("abort", abort, { once: true });
    image.src = url;
  });
}

export async function prepareHintImage(file, { signal } = {}) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("اختر صورة بصيغة JPG أو PNG أو WebP.");
  }
  if (!file.size) throw new Error("ملف الصورة فارغ.");

  const dimensions = await readDimensions(file, signal);
  if (
    file.size <= MAX_IMAGE_BYTES &&
    dimensions.width <= MAX_IMAGE_DIMENSION &&
    dimensions.height <= MAX_IMAGE_DIMENSION
  ) {
    return file; // Preserve the original bytes and quality when already valid.
  }

  const result = await imageCompression(file, {
    maxSizeMB: MAX_IMAGE_BYTES / (1024 * 1024),
    maxWidthOrHeight: MAX_IMAGE_DIMENSION,
    useWebWorker: true,
    fileType: "image/webp",
    initialQuality: 1,
    signal,
  });

  if (
    !result.size ||
    result.size > MAX_IMAGE_BYTES ||
    !ALLOWED_TYPES.includes(result.type)
  ) {
    throw new Error("تعذر تجهيز الصورة ضمن حد 2 MB. اختر صورة أصغر.");
  }
  const outputDimensions = await readDimensions(result, signal);
  if (
    outputDimensions.width > MAX_IMAGE_DIMENSION ||
    outputDimensions.height > MAX_IMAGE_DIMENSION
  ) {
    throw new Error("أبعاد الصورة بعد المعالجة تتجاوز 2048 بكسل.");
  }
  // Match the filename extension to the actual encoded MIME type.
  const extension = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  }[result.type];
  return new File(
    [result],
    `${file.name.replace(/\.[^.]+$/, "")}.${extension}`,
    {
      type: result.type,
      lastModified: Date.now(),
    },
  );
}
