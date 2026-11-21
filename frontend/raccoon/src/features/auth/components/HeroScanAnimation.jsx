import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

const ANIMATION_URL = `${process.env.PUBLIC_URL}/animations/raccon-hero.json`;
const POSTER_URL = `${process.env.PUBLIC_URL}/animations/raccon-hero-poster.png`;
const STILL_FRAME = 290;

export default function HeroScanAnimation() {
  const containerRef = useRef(null);
  const syncPlaybackRef = useRef(null);
  const pausedRef = useRef(false);
  const [paused, setPaused] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let disposed = false;
    let player;
    let loaded = false;
    let visible = true;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");

    function syncPlayback() {
      if (!loaded || disposed) return;

      if (motion.matches) {
        player.goToAndStop(STILL_FRAME, true);
      } else if (visible && !document.hidden && !pausedRef.current) {
        player.play();
      } else {
        player.pause();
      }
    }

    syncPlaybackRef.current = syncPlayback;

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      syncPlayback();
    });

    observer.observe(containerRef.current);
    motion.addEventListener("change", syncPlayback);
    document.addEventListener("visibilitychange", syncPlayback);

    import("lottie-web/build/player/lottie_light")
      .then(({ default: lottie }) => {
        if (disposed) return;

        player = lottie.loadAnimation({
          container: containerRef.current,
          renderer: "svg",
          loop: true,
          autoplay: false,
          path: ANIMATION_URL,
          rendererSettings: {
            preserveAspectRatio: "xMidYMid meet",
          },
        });

        player.addEventListener("DOMLoaded", () => {
          if (disposed) return;

          loaded = true;
          player.goToAndStop(motion.matches ? STILL_FRAME : 0, true);
          setReady(true);
          syncPlayback();
        });

        player.addEventListener("data_failed", () => {
          if (!disposed) setReady(false);
        });
      })
      .catch(() => {
        // تبقى الصورة الثابتة ظاهرة إذا تعذر تحميل الحركة.
      });

    return () => {
      disposed = true;
      syncPlaybackRef.current = null;
      observer.disconnect();
      motion.removeEventListener("change", syncPlayback);
      document.removeEventListener("visibilitychange", syncPlayback);
      player?.destroy();
    };
  }, []);

  useEffect(() => {
    pausedRef.current = paused;
    syncPlaybackRef.current?.();
  }, [paused]);

  return (
    <div className="auth-scan-animation">
      {!ready && (
        <img className="auth-scan-animation-poster" src={POSTER_URL} alt="" />
      )}

      <div
        ref={containerRef}
        className="auth-scan-animation-player"
        aria-hidden="true"
      />

      {ready && (
        <button
          type="button"
          className="auth-scan-animation-toggle"
          aria-label={paused ? "تشغيل الحركة" : "إيقاف الحركة"}
          onClick={() => setPaused((value) => !value)}
        >
          {paused ? (
            <Play size={14} aria-hidden="true" />
          ) : (
            <Pause size={14} aria-hidden="true" />
          )}
        </button>
      )}
    </div>
  );
}
