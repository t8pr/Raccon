import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import DehmScan from "./DehmScan";
import HeroScanAnimation from "./HeroScanAnimation";

// مشغّل lottie وهمي: نتحكم متى «يجهز» ونسجل أوامر التشغيل
const player = vi.hoisted(() => ({ listeners: {}, play: vi.fn(), pause: vi.fn(), goToAndStop: vi.fn(), destroy: vi.fn() }));

vi.mock("lottie-web/build/player/lottie_light", () => ({
  default: {
    loadAnimation: () => {
      player.addEventListener = (name, handler) => {
        player.listeners[name] = handler;
      };
      return player;
    },
  },
}));

describe("HeroScanAnimation", () => {
  let reducedMotion;

  beforeEach(() => {
    reducedMotion = false;
    player.listeners = {};
    vi.stubGlobal("matchMedia", () => ({
      get matches() {
        return reducedMotion;
      },
      addEventListener() {},
      removeEventListener() {},
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  test("الصورة الثابتة أول، وبعد التحميل تشتغل الحركة ويظهر زر الإيقاف", async () => {
    const { container, unmount } = render(<HeroScanAnimation />);

    expect(container.querySelector(".auth-scan-animation-poster")).toBeInTheDocument();
    await waitFor(() => expect(player.listeners.DOMLoaded).toBeDefined());

    act(() => player.listeners.DOMLoaded());

    expect(player.play).toHaveBeenCalled();
    expect(container.querySelector(".auth-scan-animation-poster")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "إيقاف الحركة" }));
    expect(player.pause).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "تشغيل الحركة" })).toBeInTheDocument();

    unmount();
    expect(player.destroy).toHaveBeenCalled();
  });

  test("تقليل الحركة: إطار ثابت بدون تشغيل", async () => {
    reducedMotion = true;
    render(<HeroScanAnimation />);
    await waitFor(() => expect(player.listeners.DOMLoaded).toBeDefined());

    act(() => player.listeners.DOMLoaded());

    expect(player.goToAndStop).toHaveBeenCalledWith(290, true);
    expect(player.play).not.toHaveBeenCalled();
  });

  test("فشل تحميل الملف: تبقى الصورة الثابتة", async () => {
    const { container } = render(<HeroScanAnimation />);
    await waitFor(() => expect(player.listeners.data_failed).toBeDefined());

    act(() => player.listeners.data_failed());

    expect(container.querySelector(".auth-scan-animation-poster")).toBeInTheDocument();
  });
});

describe("DehmScan", () => {
  test("رسمة لها وصف لقارئ الشاشة", () => {
    render(<DehmScan tagNumber={4} />);

    expect(
      screen.getByRole("img", { name: "دهم يقرّب جواله من قطعة راكون على الستاند، ويطلع له: لقيت القطعة رقم 4" }),
    ).toBeInTheDocument();
  });

  test("paused يوقف الحركة", () => {
    render(<DehmScan paused />);

    expect(screen.getByRole("img")).toHaveClass("rc-scan", "is-paused");
  });
});
