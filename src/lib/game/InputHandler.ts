import type { Lane, LaneInput } from "./types";
import { LANE_KEYS } from "./constants";

type InputCallback = (input: LaneInput) => void;

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
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
          const touch = e.changedTouches[i];
          const lane = this.touchToLane(touch, touchElement);
          if (lane !== null) {
            this.callback?.({
              lane,
              timestamp: performance.now(),
              type: "press",
            });
          }
        }
      };

      this.boundTouchEnd = (e: TouchEvent) => {
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
    const laneWidth = rect.width / 4;
    const lane = Math.floor(x / laneWidth);
    if (lane < 0 || lane > 3) return null;
    return lane as Lane;
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
