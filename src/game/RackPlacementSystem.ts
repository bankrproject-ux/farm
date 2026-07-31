import * as THREE from "three";

import InventorySystem, {
  type InventoryRackItem,
} from "./InventorySystem";

import type {
  RackInstance,
} from "../mining/RackTypes";

// ======================================================
// MINING TYCOON 3D
// RACK PLACEMENT SYSTEM
//
// Supports:
// - Normal rack placement
// - Grid snapping
// - Collision detection
// - Rack export for persistence
// - Rack restore from persistence
// ======================================================

export type RackPlacedCallback = (
  rack: RackInstance,
  object: THREE.Group
) => void;

// ======================================================
// SAVED RACK
// ======================================================

export type SavedRackPlacement = {
  instanceId: string;

  definition:
    RackInstance["definition"];

  miners:
    RackInstance["miners"];

  position: {
    x: number;
    y: number;
    z: number;
  };

  rotationY: number;
};

// ======================================================
// SYSTEM
// ======================================================

export default class RackPlacementSystem {
  private scene:
    THREE.Scene;

  private camera:
    THREE.PerspectiveCamera;

  private domElement:
    HTMLElement;

  private inventory:
    InventorySystem;

  private activeItem:
    InventoryRackItem | null = null;

  private ghost:
    THREE.Group | null = null;

  private active =
    false;

  private validPlacement =
    false;

  private rotationY =
    0;

  private readonly placementDistance =
    4;

  private readonly roomLimitX =
    8.7;

  private readonly roomLimitZ =
    8.7;

  private readonly gridSize =
    0.5;

  private readonly collisionTolerance =
    0.015;

  private placedRackObjects:
    THREE.Group[] = [];

  private placedRackInstances:
    RackInstance[] = [];

  private onRackPlaced:
    RackPlacedCallback;

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
    onRackPlaced:
      RackPlacedCallback
  ) {
    this.scene =
      scene;

    this.camera =
      camera;

    this.domElement =
      domElement;

    this.inventory =
      inventory;

    this.onRackPlaced =
      onRackPlaced;

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

        if (
          event.button !== 0
        ) {
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
    item: InventoryRackItem
  ) {
    if (this.active) {
      this.cancel();
    }

    this.activeItem =
      item;

    this.active =
      true;

    this.rotationY =
      0;

    if (
      document.pointerLockElement !==
      this.domElement
    ) {
      this.domElement
        .requestPointerLock()
        .catch(() => {
          // Placement can remain active.
        });
    }

    this.createGhost(
      item
    );
  }

  // ====================================================
  // CREATE GHOST
  // ====================================================

  private createGhost(
    item: InventoryRackItem
  ) {
    const definition =
      item.definition;

    const group =
      new THREE.Group();

    group.name =
      "rack-placement-ghost";

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

    group.add(
      body
    );

    const slotCount =
      Math.min(
        definition.totalSlots,
        20
      );

    const slotHeight =
      definition.height /
      definition.totalSlots;

    for (
      let i = 0;
      i < slotCount;
      i++
    ) {
      const slot =
        new THREE.Mesh(
          new THREE.BoxGeometry(
            definition.width *
              0.82,

            Math.max(
              0.025,
              slotHeight *
                0.55
            ),

            0.025
          ),

          this.validMaterial
        );

      const normalizedSlot =
        i /
        Math.max(
          slotCount - 1,
          1
        );

      slot.position.set(
        0,

        0.15 +
          normalizedSlot *
            (
              definition.height -
              0.3
            ),

        definition.depth /
          2 +
          0.02
      );

      group.add(
        slot
      );
    }

    const footprint =
      new THREE.Mesh(
        new THREE.PlaneGeometry(
          definition.width,
          definition.depth
        ),

        new THREE.MeshBasicMaterial({
          color: 0x42ff91,
          transparent: true,
          opacity: 0.18,
          side: THREE.DoubleSide,
          depthWrite: false,
        })
      );

    footprint.rotation.x =
      -Math.PI / 2;

    footprint.position.y =
      0.012;

    footprint.name =
      "placement-footprint";

    group.add(
      footprint
    );

    this.ghost =
      group;

    this.scene.add(
      group
    );
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

    forward.y =
      0;

    if (
      forward.lengthSq() ===
      0
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

    target.y =
      0;

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
      this.rotationY =
        0;
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
    // ROOM BOUNDS
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

    const rackPosition =
      new THREE.Vector2(
        x,
        z
      );

    if (
      playerPosition.distanceTo(
        rackPosition
      ) < 1.2
    ) {
      return false;
    }

    // ==================================================
    // RACK COLLISION
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

    const candidateBox =
      new THREE.Box3();

    candidateBox.setFromCenterAndSize(
      new THREE.Vector3(
        x,
        definition.height /
          2,
        z
      ),

      new THREE.Vector3(
        collisionWidth,

        Math.max(
          0.01,
          definition.height -
            this.collisionTolerance
        ),

        collisionDepth
      )
    );

    for (
      const object
      of this.placedRackObjects
    ) {
      const existingBox =
        new THREE.Box3()
          .setFromObject(
            object
          );

      existingBox.expandByScalar(
        -this.collisionTolerance /
          2
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
  // GHOST MATERIAL
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
        "rack"
    ) {
      this.cancel();

      return;
    }

    const rackObject =
      this.createRealRack(
        item
      );

    rackObject.position.copy(
      this.ghost.position
    );

    rackObject.rotation.y =
      this.rotationY;

    this.scene.add(
      rackObject
    );

    const rackInstance:
      RackInstance = {
        instanceId:
          item.instanceId,

        definition,

        miners: [],

        position: {
          x:
            rackObject.position.x,

          y:
            rackObject.position.y,

          z:
            rackObject.position.z,
        },

        rotationY:
          this.rotationY,
      };

    const removed =
      this.inventory.removeItem(
        item.instanceId
      );

    if (!removed) {
      this.scene.remove(
        rackObject
      );

      this.cancel();

      return;
    }

    this.placedRackObjects.push(
      rackObject
    );

    this.placedRackInstances.push(
      rackInstance
    );

    this.onRackPlaced(
      rackInstance,
      rackObject
    );

    this.finishPlacement();
  }

  // ====================================================
  // RESTORE PLACED RACK
  //
  // IMPORTANT:
  // This does NOT remove anything from inventory.
  // Saved placed racks are already outside inventory.
  // ====================================================

  public restoreRack(
    saved:
      SavedRackPlacement
  ): RackInstance | null {
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

    // Avoid restoring duplicate rack.
    const existing =
      this.placedRackInstances.find(
        (rack) =>
          rack.instanceId ===
          saved.instanceId
      );

    if (existing) {
      return existing;
    }

    const fakeInventoryItem:
      InventoryRackItem = {
        instanceId:
          saved.instanceId,

        type:
          "rack",

        definition:
          saved.definition,

        purchasedAt:
          0,
      };

    const rackObject =
      this.createRealRack(
        fakeInventoryItem
      );

    rackObject.position.set(
      x,
      y,
      z
    );

    rackObject.rotation.y =
      rotationY;

    this.scene.add(
      rackObject
    );

    const rackInstance:
      RackInstance = {
        instanceId:
          saved.instanceId,

        definition:
          saved.definition,

        miners:
          Array.isArray(
            saved.miners
          )
            ? saved.miners
            : [],

        position: {
          x,
          y,
          z,
        },

        rotationY,
      };

    this.placedRackObjects.push(
      rackObject
    );

    this.placedRackInstances.push(
      rackInstance
    );

    // Run exactly the same registration path
    // used by a normally placed rack.
    this.onRackPlaced(
      rackInstance,
      rackObject
    );

    return rackInstance;
  }

  // ====================================================
  // RESTORE MULTIPLE RACKS
  // ====================================================

  public restoreRacks(
    racks:
      SavedRackPlacement[]
  ) {
    if (
      !Array.isArray(
        racks
      )
    ) {
      return;
    }

    for (
      const rack
      of racks
    ) {
      this.restoreRack(
        rack
      );
    }
  }

  // ====================================================
  // EXPORT PLACED RACKS
  // ====================================================

  public exportPlacedRacks():
    SavedRackPlacement[] {
    return this
      .placedRackInstances
      .map(
        (
          rack
        ): SavedRackPlacement => {
          return {
            instanceId:
              rack.instanceId,

            definition: {
              ...rack.definition,
            },

            miners:
              Array.isArray(
                rack.miners
              )
                ? rack.miners.map(
                    (miner) => ({
                      ...miner,

                      miner: {
                        ...miner.miner,
                      },
                    })
                  )
                : [],

            position: {
              x:
                rack.position.x,

              y:
                rack.position.y,

              z:
                rack.position.z,
            },

            rotationY:
              rack.rotationY,
          };
        }
      );
  }

  // ====================================================
  // CLEAR PLACED RACKS
  // ====================================================

  public clearPlacedRacks() {
    this.cancel();

    for (
      const object
      of this.placedRackObjects
    ) {
      this.scene.remove(
        object
      );
    }

    this.placedRackObjects =
      [];

    this.placedRackInstances =
      [];
  }

  // ====================================================
  // CREATE REAL RACK
  // ====================================================

  private createRealRack(
    item: InventoryRackItem
  ): THREE.Group {
    const definition =
      item.definition;

    const group =
      new THREE.Group();

    group.name =
      `rack_${item.instanceId}`;

    group.userData.rackInstanceId =
      item.instanceId;

    const frameMaterial =
      new THREE.MeshStandardMaterial({
        color: 0x080b0f,
        roughness: 0.32,
        metalness: 0.88,
      });

    const sideMaterial =
      new THREE.MeshStandardMaterial({
        color: 0x121820,
        roughness: 0.48,
        metalness: 0.72,
      });

    const slotMaterial =
      new THREE.MeshStandardMaterial({
        color: 0x1c242d,
        roughness: 0.42,
        metalness: 0.68,
      });

    // ==================================================
    // SIDE PANELS
    // ==================================================

    const sideThickness =
      0.07;

    const leftSide =
      new THREE.Mesh(
        new THREE.BoxGeometry(
          sideThickness,
          definition.height,
          definition.depth
        ),
        sideMaterial
      );

    leftSide.position.set(
      -definition.width /
        2 +
        sideThickness /
          2,

      definition.height /
        2,

      0
    );

    leftSide.castShadow =
      true;

    leftSide.receiveShadow =
      true;

    group.add(
      leftSide
    );

    const rightSide =
      leftSide.clone();

    rightSide.position.x =
      definition.width /
        2 -
      sideThickness /
        2;

    group.add(
      rightSide
    );

    // ==================================================
    // TOP / BOTTOM
    // ==================================================

    const top =
      new THREE.Mesh(
        new THREE.BoxGeometry(
          definition.width,
          0.08,
          definition.depth
        ),
        frameMaterial
      );

    top.position.y =
      definition.height -
      0.04;

    top.castShadow =
      true;

    group.add(
      top
    );

    const bottom =
      top.clone();

    bottom.position.y =
      0.04;

    group.add(
      bottom
    );

    // ==================================================
    // REAR PANEL
    // ==================================================

    const rear =
      new THREE.Mesh(
        new THREE.BoxGeometry(
          definition.width -
            0.12,

          definition.height -
            0.16,

          0.05
        ),
        frameMaterial
      );

    rear.position.set(
      0,

      definition.height /
        2,

      -definition.depth /
        2 +
        0.03
    );

    rear.castShadow =
      true;

    rear.receiveShadow =
      true;

    group.add(
      rear
    );

    // ==================================================
    // EMPTY SLOTS
    // ==================================================

    const slotHeight =
      definition.height /
      definition.totalSlots;

    for (
      let i = 0;
      i <
      definition.totalSlots;
      i++
    ) {
      const slot =
        new THREE.Mesh(
          new THREE.BoxGeometry(
            definition.width *
              0.78,

            Math.max(
              0.018,
              slotHeight *
                0.16
            ),

            0.035
          ),

          slotMaterial
        );

      slot.position.set(
        0,

        slotHeight *
          (i + 0.5),

        definition.depth /
          2 -
          0.02
      );

      slot.castShadow =
        true;

      group.add(
        slot
      );
    }

    // ==================================================
    // FEET
    // ==================================================

    const footGeometry =
      new THREE.BoxGeometry(
        0.18,
        0.08,
        0.18
      );

    const footPositions = [
      [
        -definition.width /
          2 +
          0.15,

        -definition.depth /
          2 +
          0.15,
      ],

      [
        definition.width /
          2 -
          0.15,

        -definition.depth /
          2 +
          0.15,
      ],

      [
        -definition.width /
          2 +
          0.15,

        definition.depth /
          2 -
          0.15,
      ],

      [
        definition.width /
          2 -
          0.15,

        definition.depth /
          2 -
          0.15,
      ],
    ];

    for (
      const [
        x,
        z,
      ] of footPositions
    ) {
      const foot =
        new THREE.Mesh(
          footGeometry,
          frameMaterial
        );

      foot.position.set(
        x,
        0.04,
        z
      );

      foot.castShadow =
        true;

      group.add(
        foot
      );
    }

    return group;
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

      this.ghost =
        null;
    }

    this.activeItem =
      null;

    this.active =
      false;

    this.validPlacement =
      false;

    this.rotationY =
      0;
  }

  // ====================================================
  // STATE
  // ====================================================

  public isActive():
    boolean {
    return this.active;
  }

  // ====================================================
  // PLACED RACKS
  // ====================================================

  public getPlacedRacks():
    readonly RackInstance[] {
    return this
      .placedRackInstances;
  }

  public getPlacedRackObjects():
    readonly THREE.Group[] {
    return this
      .placedRackObjects;
  }
}
