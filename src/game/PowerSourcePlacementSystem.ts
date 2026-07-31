import * as THREE from "three";

import InventorySystem, {
  type InventoryPowerSourceItem,
} from "./InventorySystem";

import type {
  PowerSourceInstance,
} from "../mining/PowerTypes";

// ======================================================
// MINING TYCOON 3D
// POWER SOURCE PLACEMENT SYSTEM
//
// Supports:
// - Normal power source placement
// - Ghost preview
// - Grid snapping
// - Rotation
// - Facility boundaries
// - Player collision
// - Rack collision
// - Power source collision
// - Export for persistence
// - Restore from persistence
// ======================================================

export type PowerSourcePlacedCallback = (
  source: PowerSourceInstance,
  object: THREE.Group
) => void;

// ======================================================
// SAVED POWER SOURCE
// ======================================================

export type SavedPowerSourcePlacement = {
  instanceId: string;

  definition:
    PowerSourceInstance["definition"];

  position: {
    x: number;
    y: number;
    z: number;
  };

  rotationY: number;

  enabled: boolean;
};

// ======================================================
// SYSTEM
// ======================================================

export default class PowerSourcePlacementSystem {
  private scene: THREE.Scene;

  private camera: THREE.PerspectiveCamera;

  private domElement: HTMLElement;

  private inventory: InventorySystem;

  private activeItem:
    InventoryPowerSourceItem | null = null;

  private ghost:
    THREE.Group | null = null;

  private active = false;

  private validPlacement = false;

  private rotationY = 0;

  // ====================================================
  // PLACEMENT SETTINGS
  // ====================================================

  private readonly placementDistance = 4;

  private readonly roomLimitX = 8.7;

  private readonly roomLimitZ = 8.7;

  private readonly gridSize = 0.5;

  private readonly collisionTolerance =
    0.015;

  // ====================================================
  // PLACED POWER SOURCES
  // ====================================================

  private placedPowerObjects:
    THREE.Group[] = [];

  private placedPowerInstances:
    PowerSourceInstance[] = [];

  // ====================================================
  // EXTERNAL COLLISION OBJECTS
  // ====================================================

  private collisionObjects:
    THREE.Object3D[] = [];

  // ====================================================
  // CALLBACK
  // ====================================================

  private onPowerSourcePlaced:
    PowerSourcePlacedCallback;

  // ====================================================
  // GHOST MATERIALS
  // ====================================================

  private validMaterial =
    new THREE.MeshStandardMaterial({
      color: 0x42ff91,

      emissive: 0x0b5529,

      emissiveIntensity: 0.8,

      transparent: true,

      opacity: 0.55,

      roughness: 0.4,

      metalness: 0.3,
    });

  private invalidMaterial =
    new THREE.MeshStandardMaterial({
      color: 0xff4f5e,

      emissive: 0x66121a,

      emissiveIntensity: 0.8,

      transparent: true,

      opacity: 0.55,

      roughness: 0.4,

      metalness: 0.3,
    });

  // ====================================================
  // CONSTRUCTOR
  // ====================================================

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    domElement: HTMLElement,
    inventory: InventorySystem,
    onPowerSourcePlaced:
      PowerSourcePlacedCallback
  ) {
    this.scene = scene;

    this.camera = camera;

    this.domElement = domElement;

    this.inventory = inventory;

    this.onPowerSourcePlaced =
      onPowerSourcePlaced;

    this.bindEvents();
  }

  // ====================================================
  // EVENTS
  // ====================================================

  private bindEvents() {
    window.addEventListener(
      "keydown",
      (event) => {
        if (!this.active) {
          return;
        }

        if (
          event.code === "KeyR" &&
          !event.repeat
        ) {
          this.rotate();
        }

        if (
          event.code === "Escape"
        ) {
          this.cancel();
        }
      }
    );

    this.domElement.addEventListener(
      "mousedown",
      (event) => {
        if (!this.active) {
          return;
        }

        if (event.button !== 0) {
          return;
        }

        event.preventDefault();

        this.confirmPlacement();
      }
    );
  }

  // ====================================================
  // START PLACEMENT
  // ====================================================

  public start(
    item: InventoryPowerSourceItem
  ) {
    if (this.active) {
      this.cancel();
    }

    this.activeItem = item;

    this.active = true;

    this.validPlacement = false;

    this.rotationY = 0;

    this.createGhost(item);

    if (
      document.pointerLockElement !==
      this.domElement
    ) {
      this.domElement
        .requestPointerLock()
        .catch(() => {
          // Browser may require another user click.
        });
    }
  }

  // ====================================================
  // CREATE GHOST
  // ====================================================

  private createGhost(
    item: InventoryPowerSourceItem
  ) {
    const definition =
      item.definition;

    const group =
      new THREE.Group();

    group.name =
      "power-source-placement-ghost";

    // ==================================================
    // MAIN BODY
    // ==================================================

    const body =
      new THREE.Mesh(
        new THREE.BoxGeometry(
          definition.width,
          definition.height,
          definition.depth
        ),

        this.validMaterial
      );

    body.position.y =
      definition.height / 2;

    group.add(body);

    // ==================================================
    // FRONT PANEL
    // ==================================================

    const front =
      new THREE.Mesh(
        new THREE.BoxGeometry(
          definition.width * 0.78,

          definition.height * 0.72,

          0.025
        ),

        this.validMaterial
      );

    front.position.set(
      0,

      definition.height * 0.52,

      definition.depth / 2 +
        0.02
    );

    group.add(front);

    // ==================================================
    // FLOOR FOOTPRINT
    // ==================================================

    const footprintMaterial =
      new THREE.MeshBasicMaterial({
        color: 0x42ff91,

        transparent: true,

        opacity: 0.18,

        side: THREE.DoubleSide,

        depthWrite: false,
      });

    const footprint =
      new THREE.Mesh(
        new THREE.PlaneGeometry(
          definition.width,
          definition.depth
        ),

        footprintMaterial
      );

    footprint.rotation.x =
      -Math.PI / 2;

    footprint.position.y =
      0.012;

    footprint.name =
      "placement-footprint";

    group.add(footprint);

    this.ghost = group;

    this.scene.add(group);
  }

  // ====================================================
  // UPDATE
  // ====================================================

  public update() {
    if (
      !this.active ||
      !this.activeItem ||
      !this.ghost
    ) {
      return;
    }

    const forward =
      new THREE.Vector3();

    this.camera.getWorldDirection(
      forward
    );

    forward.y = 0;

    if (
      forward.lengthSq() === 0
    ) {
      forward.set(
        0,
        0,
        -1
      );
    }

    forward.normalize();

    const target =
      this.camera.position
        .clone()
        .addScaledVector(
          forward,
          this.placementDistance
        );

    target.x =
      Math.round(
        target.x /
          this.gridSize
      ) *
      this.gridSize;

    target.z =
      Math.round(
        target.z /
          this.gridSize
      ) *
      this.gridSize;

    target.y = 0;

    this.ghost.position.copy(
      target
    );

    this.ghost.rotation.y =
      this.rotationY;

    this.validPlacement =
      this.checkPlacement();

    this.updateGhostMaterial();
  }

  // ====================================================
  // ROTATE
  // ====================================================

  private rotate() {
    this.rotationY +=
      Math.PI / 2;

    if (
      this.rotationY >=
      Math.PI * 2
    ) {
      this.rotationY = 0;
    }

    if (this.ghost) {
      this.ghost.rotation.y =
        this.rotationY;
    }
  }

  // ====================================================
  // CHECK PLACEMENT
  // ====================================================

  private checkPlacement():
    boolean {
    if (
      !this.activeItem ||
      !this.ghost
    ) {
      return false;
    }

    const definition =
      this.activeItem.definition;

    const rotated =
      Math.abs(
        Math.sin(
          this.rotationY
        )
      ) > 0.5;

    const width =
      rotated
        ? definition.depth
        : definition.width;

    const depth =
      rotated
        ? definition.width
        : definition.depth;

    const halfWidth =
      width / 2;

    const halfDepth =
      depth / 2;

    const x =
      this.ghost.position.x;

    const z =
      this.ghost.position.z;

    // ==================================================
    // FACILITY BOUNDARIES
    // ==================================================

    if (
      x - halfWidth <
        -this.roomLimitX ||

      x + halfWidth >
        this.roomLimitX ||

      z - halfDepth <
        -this.roomLimitZ ||

      z + halfDepth >
        this.roomLimitZ
    ) {
      return false;
    }

    // ==================================================
    // PLAYER COLLISION
    // ==================================================

    const playerPosition =
      new THREE.Vector2(
        this.camera.position.x,
        this.camera.position.z
      );

    const objectPosition =
      new THREE.Vector2(
        x,
        z
      );

    const distanceFromPlayer =
      playerPosition.distanceTo(
        objectPosition
      );

    if (
      distanceFromPlayer <
      1.1
    ) {
      return false;
    }

    // ==================================================
    // COLLISION BOX
    // ==================================================

    const collisionWidth =
      Math.max(
        0.01,

        width -
          this.collisionTolerance
      );

    const collisionDepth =
      Math.max(
        0.01,

        depth -
          this.collisionTolerance
      );

    const collisionHeight =
      Math.max(
        0.01,

        definition.height -
          this.collisionTolerance
      );

    const candidateBox =
      new THREE.Box3();

    candidateBox.setFromCenterAndSize(
      new THREE.Vector3(
        x,

        definition.height / 2,

        z
      ),

      new THREE.Vector3(
        collisionWidth,

        collisionHeight,

        collisionDepth
      )
    );

    // ==================================================
    // POWER SOURCE COLLISION
    // ==================================================

    for (
      const object
      of this.placedPowerObjects
    ) {
      const existingBox =
        new THREE.Box3()
          .setFromObject(
            object
          );

      this.shrinkBox(
        existingBox
      );

      if (
        candidateBox.intersectsBox(
          existingBox
        )
      ) {
        return false;
      }
    }

    // ==================================================
    // EXTERNAL / RACK COLLISION
    // ==================================================

    for (
      const object
      of this.collisionObjects
    ) {
      const existingBox =
        new THREE.Box3()
          .setFromObject(
            object
          );

      this.shrinkBox(
        existingBox
      );

      if (
        candidateBox.intersectsBox(
          existingBox
        )
      ) {
        return false;
      }
    }

    return true;
  }

  // ====================================================
  // SHRINK COLLISION BOX
  // ====================================================

  private shrinkBox(
    box: THREE.Box3
  ) {
    const amount =
      this.collisionTolerance /
      2;

    if (
      box.max.x - box.min.x >
      amount * 2
    ) {
      box.min.x += amount;
      box.max.x -= amount;
    }

    if (
      box.max.y - box.min.y >
      amount * 2
    ) {
      box.min.y += amount;
      box.max.y -= amount;
    }

    if (
      box.max.z - box.min.z >
      amount * 2
    ) {
      box.min.z += amount;
      box.max.z -= amount;
    }
  }

  // ====================================================
  // UPDATE GHOST MATERIAL
  // ====================================================

  private updateGhostMaterial() {
    if (!this.ghost) {
      return;
    }

    const material =
      this.validPlacement
        ? this.validMaterial
        : this.invalidMaterial;

    const footprintColor =
      this.validPlacement
        ? 0x42ff91
        : 0xff4f5e;

    this.ghost.traverse(
      (object) => {
        if (
          !(
            object instanceof
            THREE.Mesh
          )
        ) {
          return;
        }

        if (
          object.name ===
          "placement-footprint"
        ) {
          const footprintMaterial =
            object.material;

          if (
            footprintMaterial instanceof
            THREE.MeshBasicMaterial
          ) {
            footprintMaterial.color.setHex(
              footprintColor
            );
          }

          return;
        }

        object.material =
          material;
      }
    );
  }

  // ====================================================
  // CONFIRM PLACEMENT
  // ====================================================

  private confirmPlacement() {
    if (
      !this.active ||
      !this.activeItem ||
      !this.ghost ||
      !this.validPlacement
    ) {
      return;
    }

    const item =
      this.activeItem;

    const definition =
      item.definition;

    const inventoryItem =
      this.inventory.getItem(
        item.instanceId
      );

    if (
      !inventoryItem ||
      inventoryItem.type !==
        "power_source"
    ) {
      this.cancel();

      return;
    }

    const powerObject =
      this.createRealPowerSource(
        item
      );

    powerObject.position.copy(
      this.ghost.position
    );

    powerObject.rotation.y =
      this.rotationY;

    this.scene.add(
      powerObject
    );

    const powerInstance:
      PowerSourceInstance = {
        instanceId:
          item.instanceId,

        definition,

        position: {
          x:
            powerObject.position.x,

          y:
            powerObject.position.y,

          z:
            powerObject.position.z,
        },

        rotationY:
          this.rotationY,

        enabled: true,
      };

    const removed =
      this.inventory.removeItem(
        item.instanceId
      );

    if (!removed) {
      this.scene.remove(
        powerObject
      );

      this.cancel();

      return;
    }

    this.placedPowerObjects.push(
      powerObject
    );

    this.placedPowerInstances.push(
      powerInstance
    );

    this.onPowerSourcePlaced(
      powerInstance,
      powerObject
    );

    this.finishPlacement();
  }

  // ====================================================
  // RESTORE POWER SOURCE
  //
  // Does NOT remove anything from inventory.
  // A placed power source already lives in the world.
  // ====================================================

  public restorePowerSource(
    saved:
      SavedPowerSourcePlacement
  ): PowerSourceInstance | null {
    if (
      !saved ||
      typeof saved !==
        "object"
    ) {
      return null;
    }

    if (
      typeof saved.instanceId !==
        "string" ||
      !saved.instanceId
    ) {
      return null;
    }

    if (
      !saved.definition ||
      typeof saved.definition !==
        "object"
    ) {
      return null;
    }

    if (
      !saved.position ||
      typeof saved.position !==
        "object"
    ) {
      return null;
    }

    const x =
      saved.position.x;

    const y =
      saved.position.y;

    const z =
      saved.position.z;

    const rotationY =
      saved.rotationY;

    if (
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      !Number.isFinite(z) ||
      !Number.isFinite(
        rotationY
      )
    ) {
      return null;
    }

    // Prevent duplicate restore.
    const existing =
      this.placedPowerInstances.find(
        (source) =>
          source.instanceId ===
          saved.instanceId
      );

    if (existing) {
      return existing;
    }

    const fakeInventoryItem:
      InventoryPowerSourceItem = {
        instanceId:
          saved.instanceId,

        type:
          "power_source",

        definition:
          saved.definition,

        purchasedAt: 0,
      };

    const powerObject =
      this.createRealPowerSource(
        fakeInventoryItem
      );

    powerObject.position.set(
      x,
      y,
      z
    );

    powerObject.rotation.y =
      rotationY;

    this.scene.add(
      powerObject
    );

    const powerInstance:
      PowerSourceInstance = {
        instanceId:
          saved.instanceId,

        definition:
          saved.definition,

        position: {
          x,
          y,
          z,
        },

        rotationY,

        enabled:
          saved.enabled !== false,
      };

    this.placedPowerObjects.push(
      powerObject
    );

    this.placedPowerInstances.push(
      powerInstance
    );

    // Same registration path as normal placement.
    this.onPowerSourcePlaced(
      powerInstance,
      powerObject
    );

    return powerInstance;
  }

  // ====================================================
  // RESTORE MULTIPLE POWER SOURCES
  // ====================================================

  public restorePowerSources(
    sources:
      SavedPowerSourcePlacement[]
  ) {
    if (
      !Array.isArray(
        sources
      )
    ) {
      return;
    }

    for (
      const source
      of sources
    ) {
      this.restorePowerSource(
        source
      );
    }
  }

  // ====================================================
  // EXPORT POWER SOURCES
  // ====================================================

  public exportPlacedPowerSources():
    SavedPowerSourcePlacement[] {
    return this
      .placedPowerInstances
      .map(
        (
          source
        ): SavedPowerSourcePlacement => {
          return {
            instanceId:
              source.instanceId,

            definition: {
              ...source.definition,
            },

            position: {
              x:
                source.position.x,

              y:
                source.position.y,

              z:
                source.position.z,
            },

            rotationY:
              source.rotationY,

            enabled:
              source.enabled,
          };
        }
      );
  }

  // ====================================================
  // CLEAR PLACED POWER SOURCES
  // ====================================================

  public clearPlacedPowerSources() {
    this.cancel();

    for (
      const object
      of this.placedPowerObjects
    ) {
      this.scene.remove(
        object
      );
    }

    this.placedPowerObjects =
      [];

    this.placedPowerInstances =
      [];
  }

  // ====================================================
  // CREATE REAL POWER SOURCE
  // ====================================================

  private createRealPowerSource(
    item: InventoryPowerSourceItem
  ): THREE.Group {
    const definition =
      item.definition;

    const group =
      new THREE.Group();

    group.name =
      `power_source_${item.instanceId}`;

    group.userData.powerSourceInstanceId =
      item.instanceId;

    // ==================================================
    // MATERIALS
    // ==================================================

    const bodyMaterial =
      new THREE.MeshStandardMaterial({
        color: 0x0c1117,

        roughness: 0.38,

        metalness: 0.82,
      });

    const frameMaterial =
      new THREE.MeshStandardMaterial({
        color: 0x05080c,

        roughness: 0.3,

        metalness: 0.9,
      });

    const panelMaterial =
      new THREE.MeshStandardMaterial({
        color: 0x121a22,

        roughness: 0.48,

        metalness: 0.72,
      });

    // ==================================================
    // MAIN BODY
    // ==================================================

    const body =
      new THREE.Mesh(
        new THREE.BoxGeometry(
          definition.width,
          definition.height,
          definition.depth
        ),

        bodyMaterial
      );

    body.position.y =
      definition.height / 2;

    body.castShadow = true;

    body.receiveShadow = true;

    group.add(body);

    // ==================================================
    // FRONT PANEL
    // ==================================================

    const front =
      new THREE.Mesh(
        new THREE.BoxGeometry(
          definition.width * 0.78,

          definition.height * 0.72,

          0.035
        ),

        panelMaterial
      );

    front.position.set(
      0,

      definition.height * 0.52,

      definition.depth / 2 +
        0.02
    );

    front.castShadow = true;

    group.add(front);

    // ==================================================
    // FRONT DIVIDERS
    // ==================================================

    const dividerGeometry =
      new THREE.BoxGeometry(
        definition.width * 0.66,

        0.018,

        0.018
      );

    for (
      let i = 0;
      i < 4;
      i++
    ) {
      const divider =
        new THREE.Mesh(
          dividerGeometry,

          frameMaterial
        );

      divider.position.set(
        0,

        definition.height *
          (0.3 +
            i * 0.14),

        definition.depth / 2 +
          0.045
      );

      group.add(
        divider
      );
    }

    // ==================================================
    // POWER LED
    // ==================================================

    const ledMaterial =
      new THREE.MeshStandardMaterial({
        color: 0x45ff8a,

        emissive: 0x22ff72,

        emissiveIntensity: 5,
      });

    const led =
      new THREE.Mesh(
        new THREE.SphereGeometry(
          0.035,
          12,
          12
        ),

        ledMaterial
      );

    led.position.set(
      definition.width * 0.28,

      definition.height * 0.22,

      definition.depth / 2 +
        0.055
    );

    group.add(led);

    // ==================================================
    // POWER SWITCH
    // ==================================================

    const switchBody =
      new THREE.Mesh(
        new THREE.BoxGeometry(
          definition.width * 0.15,

          definition.height * 0.12,

          0.04
        ),

        frameMaterial
      );

    switchBody.position.set(
      -definition.width * 0.25,

      definition.height * 0.22,

      definition.depth / 2 +
        0.055
    );

    group.add(
      switchBody
    );

    // ==================================================
    // TOP CAP
    // ==================================================

    const top =
      new THREE.Mesh(
        new THREE.BoxGeometry(
          definition.width +
            0.04,

          0.045,

          definition.depth +
            0.04
        ),

        frameMaterial
      );

    top.position.y =
      definition.height -
      0.0225;

    top.castShadow = true;

    group.add(top);

    // ==================================================
    // BOTTOM CAP
    // ==================================================

    const bottom =
      new THREE.Mesh(
        new THREE.BoxGeometry(
          definition.width +
            0.04,

          0.045,

          definition.depth +
            0.04
        ),

        frameMaterial
      );

    bottom.position.y =
      0.0225;

    bottom.castShadow = true;

    group.add(bottom);

    return group;
  }

  // ====================================================
  // REGISTER EXTERNAL COLLISION OBJECT
  // ====================================================

  public registerCollisionObject(
    object: THREE.Object3D
  ) {
    if (
      this.collisionObjects.includes(
        object
      )
    ) {
      return;
    }

    this.collisionObjects.push(
      object
    );
  }

  // ====================================================
  // UNREGISTER EXTERNAL COLLISION OBJECT
  // ====================================================

  public unregisterCollisionObject(
    object: THREE.Object3D
  ) {
    this.collisionObjects =
      this.collisionObjects.filter(
        (current) =>
          current !== object
      );
  }

  // ====================================================
  // CLEAR EXTERNAL COLLISION OBJECTS
  // ====================================================

  public clearCollisionObjects() {
    this.collisionObjects =
      [];
  }

  // ====================================================
  // CANCEL
  // ====================================================

  public cancel() {
    if (!this.active) {
      return;
    }

    this.finishPlacement();
  }

  // ====================================================
  // FINISH PLACEMENT
  // ====================================================

  private finishPlacement() {
    if (this.ghost) {
      this.scene.remove(
        this.ghost
      );

      this.ghost = null;
    }

    this.activeItem = null;

    this.active = false;

    this.validPlacement = false;

    this.rotationY = 0;
  }

  // ====================================================
  // STATE
  // ====================================================

  public isActive():
    boolean {
    return this.active;
  }

  // ====================================================
  // PLACED POWER SOURCES
  // ====================================================

  public getPlacedPowerSources():
    readonly PowerSourceInstance[] {
    return this
      .placedPowerInstances;
  }

  public getPlacedPowerObjects():
    readonly THREE.Group[] {
    return this
      .placedPowerObjects;
  }
}
