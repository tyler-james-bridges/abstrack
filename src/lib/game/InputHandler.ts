import type { Lane, LaneInput } from "./types";
import { LANE_KEYS, LANE_COUNT, getCanvasPadding } from "./constants";

type InputCallback = (input: LaneInput) => void;

/**
 * Check if a touch target (or any of its ancestors) is an interactive UI
 * element that should receive normal browser tap behaviour instead of being
 * consumed as a game lane input.
 *
 * We look for:
 *  - The `data-game-ui` attribute (explicit opt-in for overlaid UI)
 *  - Standard interactive elements: <button>, <a>, <input>, <select>, <textarea>
 *  - Elements with role="button" or role="link"
 */
function isInteractiveUI(target: EventTarget | null): boolean {
  let el = target as HTMLElement | null;
  while (el) {
    if (el.dataset?.gameUi !== undefined) return true;
    const tag = el.tagName;
    if (
      tag === "BUTTON" ||
      tag === "A" ||
      tag === "INPUT" ||
      tag === "SELECT" ||
      tag === "TEXTAREA"
    ) {
      return true;
    }
    const role = el.getAttribute?.("role");
    if (role === "button" || role === "link") return true;
    el = el.parentElement;
  }
  return false;
}

export class InputHandler {
  private callback: InputCallback | null = null;
  private boundKeyDown: ((e: KeyboardEvent) => void) | null = null;
  private boundKeyUp: ((e: KeyboardEvent) => void) | null = null;
  private boundTouchStart: ((e: TouchEvent) => void) | null = null;
  private boundTouchEnd: ((e: TouchEvent) => void) | null = null;
  private pressedKeys = new Set<string>();
  private touchElement: HTMLElement | null = null;

  start(callback: InputCallback, touchElement?: HTMLElement): void {
    this.callback = callback;

    this.boundKeyDown = (e: KeyboardEvent) => {
      const lane = LANE_KEYS[e.key];
      if (lane === undefined) return;
      if (this.pressedKeys.has(e.key)) return; // prevent repeat
      this.pressedKeys.add(e.key);
      e.preventDefault();
      this.callback?.({
        lane,
        timestamp: performance.now(),
        type: "press",
      });
    };

    this.boundKeyUp = (e: KeyboardEvent) => {
      const lane = LANE_KEYS[e.key];
      if (lane === undefined) return;
      this.pressedKeys.delete(e.key);
      e.preventDefault();
      this.callback?.({
        lane,
        timestamp: performance.now(),
        type: "release",
      });
    };

    window.addEventListener("keydown", this.boundKeyDown);
    window.addEventListener("keyup", this.boundKeyUp);

    // Touch support
    if (touchElement) {
      this.touchElement = touchElement;
      this.boundTouchStart = (e: TouchEvent) => {
        // Allow interactive UI elements (buttons, links, etc.) to handle
        // their own touch events normally.  Only preventDefault for game
        // lane taps so the browser doesn't scroll or trigger unintended
        // actions while playing.
        if (isInteractiveUI(e.target)) return;

        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
          const touch = e.changedTouches[i];
          const lane = this.touchToLane(touch, touchElement);
          if (lane !== null) {
            this.haptic();
            this.callback?.({
              lane,
              timestamp: performance.now(),
              type: "press",
            });
          }
        }
      };

      this.boundTouchEnd = (e: TouchEvent) => {
        if (isInteractiveUI(e.target)) return;

        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
          const touch = e.changedTouches[i];
          const lane = this.touchToLane(touch, touchElement);
          if (lane !== null) {
            this.callback?.({
              lane,
              timestamp: performance.now(),
              type: "release",
            });
          }
        }
      };

      touchElement.addEventListener("touchstart", this.boundTouchStart, {
        passive: false,
      });
      touchElement.addEventListener("touchend", this.boundTouchEnd, {
        passive: false,
      });
    }
  }

  private touchToLane(touch: Touch, element: HTMLElement): Lane | null {
    const rect = element.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const padding = getCanvasPadding(rect.width);
    // Map touch x to the padded lane area (same coordinates as GameCanvas)
    const laneAreaX = x - padding;
    const laneAreaWidth = rect.width - padding * 2;
    if (laneAreaX < 0 || laneAreaX >= laneAreaWidth) {
      // Touch is in the padding zone — snap to nearest edge lane
      if (x < rect.width / 2) return 0 as Lane;
      return (LANE_COUNT - 1) as Lane;
    }
    const laneWidth = laneAreaWidth / LANE_COUNT;
    const lane = Math.floor(laneAreaX / laneWidth);
    if (lane < 0 || lane >= LANE_COUNT) return null;
    return lane as Lane;
  }

  /** Fire a short haptic pulse on supported devices. */
  private haptic(): void {
    try {
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(8);
      }
    } catch {
      // Vibrate API may throw in some contexts — ignore silently.
    }
  }

  stop(): void {
    if (this.boundKeyDown) {
      window.removeEventListener("keydown", this.boundKeyDown);
    }
    if (this.boundKeyUp) {
      window.removeEventListener("keyup", this.boundKeyUp);
    }
    if (this.touchElement && this.boundTouchStart) {
      this.touchElement.removeEventListener("touchstart", this.boundTouchStart);
    }
    if (this.touchElement && this.boundTouchEnd) {
      this.touchElement.removeEventListener("touchend", this.boundTouchEnd);
    }
    this.pressedKeys.clear();
    this.callback = null;
    this.boundKeyDown = null;
    this.boundKeyUp = null;
    this.boundTouchStart = null;
    this.boundTouchEnd = null;
    this.touchElement = null;
  }
}
