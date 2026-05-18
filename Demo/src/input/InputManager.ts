import { clamp, normalize, type Vec2 } from '../core/math';

export class InputManager {
  readonly keys = new Set<string>();
  movement: Vec2 = { x: 0, y: 0 };
  interactPressed = false;
  inventoryPressed = false;
  characterPressed = false;
  savePressed = false;
  mapPressed = false;
  cancelPressed = false;
  zoomDelta = 0;

  private joystickPointer: number | null = null;
  private joystickOrigin: Vec2 = { x: 0, y: 0 };
  private joystickVector: Vec2 = { x: 0, y: 0 };

  constructor(private readonly uiRoot: HTMLElement) {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('wheel', this.onWheel, { passive: true });
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('wheel', this.onWheel);
  }

  bindMobileControls(joystick: HTMLElement, stick: HTMLElement, interactButton: HTMLButtonElement): void {
    joystick.addEventListener('pointerdown', (event) => {
      this.joystickPointer = event.pointerId;
      joystick.setPointerCapture(event.pointerId);
      const rect = joystick.getBoundingClientRect();
      this.joystickOrigin = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      this.updateJoystick(event, stick);
    });
    joystick.addEventListener('pointermove', (event) => {
      if (event.pointerId !== this.joystickPointer) return;
      this.updateJoystick(event, stick);
    });
    const end = (event: PointerEvent) => {
      if (event.pointerId !== this.joystickPointer) return;
      this.joystickPointer = null;
      this.joystickVector = { x: 0, y: 0 };
      stick.style.transform = 'translate(0px, 0px)';
    };
    joystick.addEventListener('pointerup', end);
    joystick.addEventListener('pointercancel', end);
    interactButton.addEventListener('pointerdown', () => {
      this.interactPressed = true;
    });
  }

  beforeUpdate(): void {
    const keyboard = {
      x:
        (this.keys.has('arrowright') || this.keys.has('d') ? 1 : 0) -
        (this.keys.has('arrowleft') || this.keys.has('a') ? 1 : 0),
      y:
        (this.keys.has('arrowdown') || this.keys.has('s') ? 1 : 0) -
        (this.keys.has('arrowup') || this.keys.has('w') ? 1 : 0),
    };
    const combined = {
      x: keyboard.x + this.joystickVector.x,
      y: keyboard.y + this.joystickVector.y,
    };
    this.movement = normalize(combined);
  }

  afterUpdate(): void {
    this.interactPressed = false;
    this.inventoryPressed = false;
    this.characterPressed = false;
    this.savePressed = false;
    this.mapPressed = false;
    this.cancelPressed = false;
    this.zoomDelta = 0;
  }

  private updateJoystick(event: PointerEvent, stick: HTMLElement): void {
    const dx = event.clientX - this.joystickOrigin.x;
    const dy = event.clientY - this.joystickOrigin.y;
    const radius = 42;
    const len = Math.hypot(dx, dy);
    const scale = len > radius ? radius / len : 1;
    const sx = dx * scale;
    const sy = dy * scale;
    stick.style.transform = `translate(${sx}px, ${sy}px)`;
    this.joystickVector = len < 8 ? { x: 0, y: 0 } : { x: clamp(dx / radius, -1, 1), y: clamp(dy / radius, -1, 1) };
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    const key = event.key.toLowerCase();
    this.keys.add(key);
    if (event.repeat) {
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'w', 'a', 's', 'd', 'f5', 'm', 'escape'].includes(key)) {
        event.preventDefault();
      }
      return;
    }
    if (key === 'e' || key === ' ') this.interactPressed = true;
    if (key === 'i') this.inventoryPressed = true;
    if (key === 'c') this.characterPressed = true;
    if (key === 'f5') this.savePressed = true;
    if (key === 'm') this.mapPressed = true;
    if (key === 'escape') this.cancelPressed = true;
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'w', 'a', 's', 'd', 'f5', 'm', 'escape'].includes(key)) {
      event.preventDefault();
    }
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.key.toLowerCase());
  };

  private readonly onWheel = (event: WheelEvent): void => {
    this.zoomDelta += event.deltaY > 0 ? -0.1 : 0.1;
  };
}
