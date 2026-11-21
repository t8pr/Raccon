import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import imageCompression from "browser-image-compression";

import { MAX_IMAGE_BYTES, prepareHintImage } from "./prepareHintImage";

vi.mock("browser-image-compression", () => ({ default: vi.fn() }));

// المتصفح يقرأ أبعاد الصورة بتحميلها في <img>. هنا نحدد الأبعاد لكل تحميل بالترتيب.
let dimensions = [];

class FakeImage {
  set src(value) {
    if (!value) return;
    const next = dimensions.shift();
    setTimeout(() => {
      if (next === "error") {
        this.onerror?.();
      } else {
        this.naturalWidth = next.width;
        this.naturalHeight = next.height;
        this.onload?.();
      }
    });
  }
}

beforeEach(() => {
  dimensions = [];
  vi.stubGlobal("Image", FakeImage);
  vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: () => "blob:x", revokeObjectURL: () => {} }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.mocked(imageCompression).mockReset();
});

const file = (type = "image/png", size = 1000, name = "hint.png") => {
  const blob = new File(["x"], name, { type });
  Object.defineProperty(blob, "size", { value: size });
  return blob;
};

describe("يرفض قبل المعالجة", () => {
  test("صيغة غير مدعومة", async () => {
    await expect(prepareHintImage(file("image/gif"))).rejects.toThrow("اختر صورة بصيغة JPG أو PNG أو WebP.");
  });

  test("ملف فاضي", async () => {
    await expect(prepareHintImage(file("image/png", 0))).rejects.toThrow("ملف الصورة فارغ.");
  });

  test("ملف تالف", async () => {
    dimensions = ["error"];
    await expect(prepareHintImage(file())).rejects.toThrow("تعذر قراءة الصورة. اختر ملف صورة صالحًا.");
  });

  test("أبعاد صفر", async () => {
    dimensions = [{ width: 0, height: 0 }];
    await expect(prepareHintImage(file())).rejects.toThrow("تعذر قراءة أبعاد الصورة.");
  });

  test("الإلغاء قبل البدء", async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(prepareHintImage(file(), { signal: controller.signal })).rejects.toThrow("Aborted");
  });
});

test("صورة صغيرة ومقبولة ترجع كما هي بدون ضغط", async () => {
  dimensions = [{ width: 800, height: 600 }];
  const original = file();

  await expect(prepareHintImage(original)).resolves.toBe(original);
  expect(imageCompression).not.toHaveBeenCalled();
});

describe("صورة كبيرة تنضغط إلى WebP", () => {
  test("ينضغط ويرجع ملف باسم وامتداد جديد", async () => {
    dimensions = [{ width: 4000, height: 3000 }, { width: 1200, height: 900 }];
    vi.mocked(imageCompression).mockResolvedValue(new Blob(["small"], { type: "image/webp" }));

    const result = await prepareHintImage(file("image/jpeg", 5_000_000, "photo.jpeg"));

    expect(imageCompression).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ maxWidthOrHeight: 1200, fileType: "image/webp" }),
    );
    expect(result.name).toBe("photo.webp");
    expect(result.type).toBe("image/webp");
  });

  test("الناتج أكبر من 2 MB", async () => {
    dimensions = [{ width: 4000, height: 3000 }];
    const big = new Blob(["x"], { type: "image/webp" });
    Object.defineProperty(big, "size", { value: MAX_IMAGE_BYTES + 1 });
    vi.mocked(imageCompression).mockResolvedValue(big);

    await expect(prepareHintImage(file("image/png", 5_000_000))).rejects.toThrow(
      "تعذر تجهيز الصورة ضمن حد 2 MB. اختر صورة أصغر.",
    );
  });

  test("الناتج أبعاده ما زالت كبيرة: يرفض", async () => {
    dimensions = [{ width: 4000, height: 3000 }, { width: 2000, height: 1500 }];
    vi.mocked(imageCompression).mockResolvedValue(new Blob(["x"], { type: "image/webp" }));

    await expect(prepareHintImage(file("image/png", 5_000_000))).rejects.toThrow();
  });

  // خطأ معروف: الحد الفعلي MAX_IMAGE_DIMENSION = 1200، لكن الرسالة تقول «2048 بكسل».
  // test.fails = يصف السلوك الصحيح ويُتوقع فشله حتى ينصلح. بعد الإصلاح احذف .fails
  test.fails("خطأ معروف: رسالة الأبعاد تذكر الحد الصحيح (1200)", async () => {
    dimensions = [{ width: 4000, height: 3000 }, { width: 2000, height: 1500 }];
    vi.mocked(imageCompression).mockResolvedValue(new Blob(["x"], { type: "image/webp" }));

    await expect(prepareHintImage(file("image/png", 5_000_000))).rejects.toThrow("1200");
  });
});
