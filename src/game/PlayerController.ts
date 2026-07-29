import * as THREE from "three";

export default class PlayerController {
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;

  private keys: Record<string, boolean> = {};

  private yaw = 0;
  private pitch = 0;

  private locked = false;

  private velocity = new THREE.Vector3();

  private readonly moveSpeed = 4.5;
  private readonly mouseSensitivity = 0.002;

  private readonly playerHeight = 1.7;

  private readonly roomLimitX = 9;
  private readonly roomLimitZ = 9;

  constructor(
    camera: THREE.PerspectiveCamera,
    domElement: HTMLElement
  ) {
    this.camera = camera;
    this.domElement = domElement;

    this.camera.position.y = this.playerHeight;

    this.bindEvents();
  }

  private bindEvents() {
    // Click game to lock mouse.
    this.domElement.addEventListener("click", () => {
      if (!this.locked) {
        this.domElement.requestPointerLock();
      }
    });

    document.addEventListener(
      "pointerlockchange",
      () => {
        this.locked =
          document.pointerLockElement === this.domElement;
      }
    );

    window.addEventListener("keydown", (event) => {
      this.keys[event.code] = true;
    });

    window.addEventListener("keyup", (event) => {
      this.keys[event.code] = false;
    });

    document.addEventListener("mousemove", (event) => {
      if (!this.locked) {
        return;
      }

      this.yaw -=
        event.movementX *
        this.mouseSensitivity;

      this.pitch -=
        event.movementY *
        this.mouseSensitivity;

      // Prevent camera from flipping upside down.
      const maxPitch =
        Math.PI / 2 - 0.05;

      this.pitch =
        THREE.MathUtils.clamp(
          this.pitch,
          -maxPitch,
          maxPitch
        );

      this.updateCameraRotation();
    });
  }

  private updateCameraRotation() {
    this.camera.rotation.order = "YXZ";

    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
  }

  public update(delta: number) {
    const input =
      new THREE.Vector3();

    if (this.keys["KeyW"]) {
      input.z -= 1;
    }

    if (this.keys["KeyS"]) {
      input.z += 1;
    }

    if (this.keys["KeyA"]) {
      input.x -= 1;
    }

    if (this.keys["KeyD"]) {
      input.x += 1;
    }

    if (input.lengthSq() > 0) {
      input.normalize();
    }

    // Forward direction based on camera rotation.
    const forward =
      new THREE.Vector3(
        0,
        0,
        -1
      );

    forward.applyQuaternion(
      this.camera.quaternion
    );

    // Ignore vertical camera angle for walking.
    forward.y = 0;

    forward.normalize();

    const right =
      new THREE.Vector3(
        1,
        0,
        0
      );

    right.applyQuaternion(
      this.camera.quaternion
    );

    right.y = 0;

    right.normalize();

    this.velocity.set(
      0,
      0,
      0
    );

    this.velocity.addScaledVector(
      forward,
      -input.z
    );

    this.velocity.addScaledVector(
      right,
      input.x
    );

    if (
      this.velocity.lengthSq() >
      0
    ) {
      this.velocity.normalize();

      this.camera.position.addScaledVector(
        this.velocity,
        this.moveSpeed * delta
      );
    }

    // Keep player at standing height.
    this.camera.position.y =
      this.playerHeight;

    // Keep player inside facility.
    this.camera.position.x =
      THREE.MathUtils.clamp(
        this.camera.position.x,
        -this.roomLimitX,
        this.roomLimitX
      );

    this.camera.position.z =
      THREE.MathUtils.clamp(
        this.camera.position.z,
        -this.roomLimitZ,
        this.roomLimitZ
      );
  }

  public isPointerLocked() {
    return this.locked;
  }
}
