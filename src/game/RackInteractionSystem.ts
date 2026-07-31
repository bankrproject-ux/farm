import * as THREE from "three";

import type {
  RackInstance,
} from "../mining/RackTypes";

// ======================================================
// MINING TYCOON 3D
// Rack Interaction System
// ======================================================

export type ManagedRack = {
  rack: RackInstance;
  object: THREE.Group;
};

export type RackInteractCallback = (
  rack: RackInstance,
  object: THREE.Group
) => void;

export default class RackInteractionSystem {
  private camera:
    THREE.PerspectiveCamera;

  private raycaster =
    new THREE.Raycaster();

  private racks:
    ManagedRack[] = [];

  private targetedRack:
    ManagedRack | null = null;

  private onInteract:
    RackInteractCallback;

  private prompt:
    HTMLDivElement;

  private enabled =
    true;

  private readonly maxDistance =
    3.2;

  constructor(
    camera: THREE.PerspectiveCamera,
    onInteract: RackInteractCallback
  ) {
    this.camera =
      camera;

    this.onInteract =
      onInteract;

    this.prompt =
      document.createElement(
        "div"
      );

    this.prompt.className =
      "interaction-prompt hidden";

    this.prompt.innerHTML = `
      <div class="interaction-key">
        E
      </div>

      <div class="interaction-text">
        <span>
          SERVER RACK
        </span>

        <strong>
          MANAGE RACK
        </strong>
      </div>
    `;

    document.body.appendChild(
      this.prompt
    );

    window.addEventListener(
      "keydown",
      (event) => {
        if (
          event.code !== "KeyE" ||
          event.repeat
        ) {
          return;
        }

        if (!this.enabled) {
          return;
        }

        if (!this.targetedRack) {
          return;
        }

        const target =
          this.targetedRack;

        this.onInteract(
          target.rack,
          target.object
        );
      }
    );
  }

  // ====================================================
  // REGISTER RACK
  // ====================================================

  public registerRack(
    rack: RackInstance,
    object: THREE.Group
  ) {
    const exists =
      this.racks.some(
        (entry) =>
          entry.rack.instanceId ===
          rack.instanceId
      );

    if (exists) {
      return;
    }

    object.traverse(
      (child) => {
        child.userData.rackInstanceId =
          rack.instanceId;
      }
    );

    this.racks.push({
      rack,
      object,
    });
  }

  // ====================================================
  // UNREGISTER RACK
  // ====================================================

  public unregisterRack(
    instanceId: string
  ) {
    this.racks =
      this.racks.filter(
        (entry) =>
          entry.rack.instanceId !==
          instanceId
      );

    if (
      this.targetedRack?.rack
        .instanceId ===
      instanceId
    ) {
      this.clearTarget();
    }
  }

  // ====================================================
  // CLEAR
  //
  // Used when:
  // - wallet disconnects
  // - player switches wallet
  // - another facility is loaded
  //
  // IMPORTANT:
  // This only clears registered interaction references.
  // RackPlacementSystem owns the actual world objects.
  // ====================================================

  public clear() {
    this.clearTarget();

    this.racks =
      [];
  }

  // ====================================================
  // ENABLE / DISABLE
  // ====================================================

  public setEnabled(
    enabled: boolean
  ) {
    this.enabled =
      enabled;

    if (!enabled) {
      this.clearTarget();
    }
  }

  public isEnabled():
    boolean {
    return this.enabled;
  }

  // ====================================================
  // UPDATE
  // ====================================================

  public update() {
    if (!this.enabled) {
      this.clearTarget();
      return;
    }

    if (
      this.racks.length === 0
    ) {
      this.clearTarget();
      return;
    }

    this.raycaster.setFromCamera(
      new THREE.Vector2(
        0,
        0
      ),
      this.camera
    );

    const rackObjects =
      this.racks.map(
        (entry) =>
          entry.object
      );

    const intersections =
      this.raycaster.intersectObjects(
        rackObjects,
        true
      );

    if (
      intersections.length === 0
    ) {
      this.clearTarget();
      return;
    }

    const validIntersection =
      intersections.find(
        (intersection) =>
          intersection.distance <=
          this.maxDistance
      );

    if (
      !validIntersection
    ) {
      this.clearTarget();
      return;
    }

    const rack =
      this.findRackFromObject(
        validIntersection.object
      );

    if (!rack) {
      this.clearTarget();
      return;
    }

    this.setTarget(
      rack
    );
  }

  // ====================================================
  // FIND RACK
  // ====================================================

  private findRackFromObject(
    object: THREE.Object3D
  ): ManagedRack | null {
    let current:
      THREE.Object3D | null =
      object;

    while (current) {
      const rackInstanceId =
        current.userData
          .rackInstanceId;

      if (
        typeof rackInstanceId ===
        "string"
      ) {
        return (
          this.racks.find(
            (entry) =>
              entry.rack
                .instanceId ===
              rackInstanceId
          ) ?? null
        );
      }

      current =
        current.parent;
    }

    return null;
  }

  // ====================================================
  // SET TARGET
  // ====================================================

  private setTarget(
    rack: ManagedRack
  ) {
    if (
      this.targetedRack?.rack
        .instanceId ===
      rack.rack.instanceId
    ) {
      this.showPrompt(
        rack
      );

      return;
    }

    this.targetedRack =
      rack;

    this.showPrompt(
      rack
    );
  }

  // ====================================================
  // SHOW PROMPT
  // ====================================================

  private showPrompt(
    rack: ManagedRack
  ) {
    const name =
      rack.rack.definition.name;

    const label =
      this.prompt.querySelector<HTMLElement>(
        ".interaction-text span"
      );

    if (label) {
      label.textContent =
        name.toUpperCase();
    }

    this.prompt.classList.remove(
      "hidden"
    );
  }

  // ====================================================
  // CLEAR TARGET
  // ====================================================

  private clearTarget() {
    this.targetedRack =
      null;

    this.prompt.classList.add(
      "hidden"
    );
  }

  // ====================================================
  // CURRENT TARGET
  // ====================================================

  public getTargetedRack():
    ManagedRack | null {
    return this.targetedRack;
  }

  // ====================================================
  // GET REGISTERED RACKS
  // ====================================================

  public getRacks():
    readonly ManagedRack[] {
    return this.racks;
  }
}
