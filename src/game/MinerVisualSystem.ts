import * as THREE from "three";

import type {
  RackInstance,
  InstalledMiner,
} from "../mining/RackTypes";

// ======================================================
// MINING TYCOON 3D
// MINER VISUAL SYSTEM
//
// Creates physical mining servers inside placed racks.
// Rack local origin:
// X = center
// Y = FLOOR / bottom of rack
// Z+ = front of rack
// ======================================================

type RackVisualEntry = {
  rack: RackInstance;
  rackObject: THREE.Group;
};

type MinerVisualEntry = {
  instanceId: string;
  rackInstanceId: string;
  object: THREE.Group;
};

// ======================================================
// SYSTEM
// ======================================================

export default class MinerVisualSystem {
  private scene:
    THREE.Scene;

  private racks:
    Map<string, RackVisualEntry> =
      new Map();

  private miners:
    Map<string, MinerVisualEntry> =
      new Map();

  constructor(
    scene: THREE.Scene
  ) {
    this.scene =
      scene;
  }

  // ====================================================
  // REGISTER RACK
  // ====================================================

  public registerRack(
    rack: RackInstance,
    rackObject: THREE.Group
  ) {
    this.racks.set(
      rack.instanceId,
      {
        rack,
        rackObject,
      }
    );

    // Useful later for save/load.
    for (
      const installedMiner
      of rack.miners
    ) {
      this.createMinerVisual(
        rack,
        installedMiner
      );
    }
  }

  // ====================================================
  // ADD MINER
  // ====================================================

  public addMiner(
    rack: RackInstance,
    installedMiner: InstalledMiner
  ) {
    if (
      this.miners.has(
        installedMiner.instanceId
      )
    ) {
      return;
    }

    this.createMinerVisual(
      rack,
      installedMiner
    );
  }

  // ====================================================
  // CREATE MINER
  // ====================================================

  private createMinerVisual(
    rack: RackInstance,
    installedMiner: InstalledMiner
  ) {
    const rackEntry =
      this.racks.get(
        rack.instanceId
      );

    if (!rackEntry) {
      console.warn(
        "MinerVisualSystem: rack not registered",
        rack.instanceId
      );

      return;
    }

    if (
      this.miners.has(
        installedMiner.instanceId
      )
    ) {
      return;
    }

    const miner =
      installedMiner.miner;

    const rackObject =
      rackEntry.rackObject;

    // ==================================================
    // RACK DIMENSIONS
    // ==================================================

    const rackWidth =
      rack.definition.width;

    const rackHeight =
      rack.definition.height;

    const rackDepth =
      rack.definition.depth;

    const totalSlots =
      rack.definition.totalSlots;

    const slotHeight =
      rackHeight /
      totalSlots;

    // ==================================================
    // SERVER DIMENSIONS
    // ==================================================

    const serverWidth =
      rackWidth * 0.72;

    const occupiedHeight =
      slotHeight *
      miner.rackSlots;

    const serverHeight =
      Math.max(
        occupiedHeight * 0.78,
        0.08
      );

    const serverDepth =
      rackDepth * 0.72;

    // ==================================================
    // SERVER GROUP
    // ==================================================

    const server =
      new THREE.Group();

    server.name =
      `miner_${installedMiner.instanceId}`;

    server.userData.minerInstanceId =
      installedMiner.instanceId;

    server.userData.rackInstanceId =
      rack.instanceId;

    // ==================================================
    // BODY
    // ==================================================

    const bodyMaterial =
      new THREE.MeshStandardMaterial({
        color: 0x18212b,
        roughness: 0.32,
        metalness: 0.82,
      });

    const body =
      new THREE.Mesh(
        new THREE.BoxGeometry(
          serverWidth,
          serverHeight,
          serverDepth
        ),
        bodyMaterial
      );

    body.castShadow =
      true;

    body.receiveShadow =
      true;

    server.add(
      body
    );

    // ==================================================
    // FRONT FACE
    //
    // RackPlacementSystem uses +Z as rack front.
    // ==================================================

    const frontMaterial =
      new THREE.MeshStandardMaterial({
        color: 0x05080c,
        roughness: 0.25,
        metalness: 0.9,
      });

    const front =
      new THREE.Mesh(
        new THREE.BoxGeometry(
          serverWidth * 0.97,
          serverHeight * 0.82,
          0.04
        ),
        frontMaterial
      );

    front.position.z =
      serverDepth / 2 +
      0.022;

    server.add(
      front
    );

    // ==================================================
    // VENT AREA
    // ==================================================

    const ventMaterial =
      new THREE.MeshStandardMaterial({
        color: 0x273441,
        roughness: 0.48,
        metalness: 0.75,
      });

    const ventCount =
      Math.max(
        4,
        miner.rackSlots * 4
      );

    const ventAreaWidth =
      serverWidth * 0.52;

    const ventWidth =
      ventAreaWidth /
      ventCount;

    for (
      let i = 0;
      i < ventCount;
      i++
    ) {
      const vent =
        new THREE.Mesh(
          new THREE.BoxGeometry(
            ventWidth * 0.48,
            serverHeight * 0.42,
            0.012
          ),
          ventMaterial
        );

      vent.position.set(
        -ventAreaWidth / 2 +
          ventWidth / 2 +
          i * ventWidth,

        0,

        serverDepth / 2 +
          0.046
      );

      server.add(
        vent
      );
    }

    // ==================================================
    // LEFT HANDLE
    // ==================================================

    const handleMaterial =
      new THREE.MeshStandardMaterial({
        color: 0x45515e,
        roughness: 0.3,
        metalness: 0.9,
      });

    const handleHeight =
      Math.max(
        serverHeight * 0.48,
        0.035
      );

    const leftHandle =
      new THREE.Mesh(
        new THREE.BoxGeometry(
          serverWidth * 0.055,
          handleHeight,
          0.025
        ),
        handleMaterial
      );

    leftHandle.position.set(
      -serverWidth * 0.4,
      0,
      serverDepth / 2 +
        0.05
    );

    server.add(
      leftHandle
    );

    // ==================================================
    // RIGHT HANDLE
    // ==================================================

    const rightHandle =
      leftHandle.clone();

    rightHandle.position.x =
      serverWidth * 0.4;

    server.add(
      rightHandle
    );

    // ==================================================
    // POWER LED
    // ==================================================

    const powerColor =
      installedMiner.powered
        ? 0x45ff8a
        : 0x3b4148;

    const powerLEDMaterial =
      new THREE.MeshStandardMaterial({
        color:
          powerColor,

        emissive:
          installedMiner.powered
            ? 0x20ff6d
            : 0x000000,

        emissiveIntensity:
          installedMiner.powered
            ? 5
            : 0,
      });

    const ledRadius =
      Math.max(
        0.012,
        Math.min(
          0.025,
          serverHeight * 0.13
        )
      );

    const powerLED =
      new THREE.Mesh(
        new THREE.SphereGeometry(
          ledRadius,
          12,
          12
        ),
        powerLEDMaterial
      );

    powerLED.position.set(
      serverWidth * 0.32,
      0,
      serverDepth / 2 +
        0.07
    );

    server.add(
      powerLED
    );

    // ==================================================
    // ACTIVITY LED
    // ==================================================

    if (
      installedMiner.powered
    ) {
      const activityMaterial =
        new THREE.MeshStandardMaterial({
          color: 0x45a3ff,
          emissive: 0x1677ff,
          emissiveIntensity: 5,
        });

      const activityLED =
        new THREE.Mesh(
          new THREE.SphereGeometry(
            ledRadius * 0.72,
            10,
            10
          ),
          activityMaterial
        );

      activityLED.position.set(
        serverWidth * 0.25,
        0,
        serverDepth / 2 +
          0.07
      );

      server.add(
        activityLED
      );
    }

    // ==================================================
    // SIDE RAILS
    // ==================================================

    const railMaterial =
      new THREE.MeshStandardMaterial({
        color: 0x354452,
        roughness: 0.3,
        metalness: 0.9,
      });

    const leftRail =
      new THREE.Mesh(
        new THREE.BoxGeometry(
          0.035,
          serverHeight * 0.92,
          serverDepth * 0.92
        ),
        railMaterial
      );

    leftRail.position.x =
      -serverWidth / 2 -
      0.018;

    server.add(
      leftRail
    );

    const rightRail =
      leftRail.clone();

    rightRail.position.x =
      serverWidth / 2 +
      0.018;

    server.add(
      rightRail
    );

    // ==================================================
    // POSITION INSIDE RACK
    //
    // IMPORTANT:
    //
    // RackPlacementSystem creates rack from:
    //
    // y = 0
    // to
    // y = rackHeight
    //
    // NOT:
    //
    // -rackHeight / 2
    // to
    // +rackHeight / 2
    //
    // slotIndex 0 therefore starts at floor/bottom.
    // ==================================================

    const slotBottom =
      installedMiner.slotIndex *
      slotHeight;

    const centerY =
      slotBottom +
      occupiedHeight / 2;

    // ==================================================
    // FRONT POSITION
    //
    // Empty slot bars are around:
    //
    // +rackDepth / 2
    //
    // Put server slightly behind them but still
    // clearly visible from the front.
    // ==================================================

    const centerZ =
      0.02;

    server.position.set(
      0,
      centerY,
      centerZ
    );

    // ==================================================
    // ADD TO RACK
    // ==================================================

    rackObject.add(
      server
    );

    // ==================================================
    // STORE
    // ==================================================

    this.miners.set(
      installedMiner.instanceId,
      {
        instanceId:
          installedMiner.instanceId,

        rackInstanceId:
          rack.instanceId,

        object:
          server,
      }
    );

    console.log(
      "Miner visual created:",
      {
        miner:
          miner.name,

        rack:
          rack.definition.name,

        slot:
          installedMiner.slotIndex,

        position: {
          x:
            server.position.x,

          y:
            server.position.y,

          z:
            server.position.z,
        },

        size: {
          width:
            serverWidth,

          height:
            serverHeight,

          depth:
            serverDepth,
        },
      }
    );
  }

  // ====================================================
  // REMOVE MINER
  // ====================================================

  public removeMiner(
    instanceId: string
  ) {
    const entry =
      this.miners.get(
        instanceId
      );

    if (!entry) {
      return;
    }

    entry.object.removeFromParent();

    this.disposeObject(
      entry.object
    );

    this.miners.delete(
      instanceId
    );
  }

  // ====================================================
  // GET MINER OBJECT
  // ====================================================

  public getMinerObject(
    instanceId: string
  ): THREE.Group | null {
    return (
      this.miners.get(
        instanceId
      )?.object ??
      null
    );
  }

  // ====================================================
  // GET RACK OBJECT
  // ====================================================

  public getRackObject(
    rackInstanceId: string
  ): THREE.Group | null {
    return (
      this.racks.get(
        rackInstanceId
      )?.rackObject ??
      null
    );
  }

  // ====================================================
  // DISPOSE OBJECT
  // ====================================================

  private disposeObject(
    object: THREE.Object3D
  ) {
    object.traverse(
      (child) => {
        if (
          !(
            child instanceof
            THREE.Mesh
          )
        ) {
          return;
        }

        child.geometry.dispose();

        if (
          Array.isArray(
            child.material
          )
        ) {
          for (
            const material
            of child.material
          ) {
            material.dispose();
          }
        } else {
          child.material.dispose();
        }
      }
    );
  }

  // ====================================================
  // DESTROY
  // ====================================================

  public destroy() {
    for (
      const entry
      of this.miners.values()
    ) {
      entry.object.removeFromParent();

      this.disposeObject(
        entry.object
      );
    }

    this.miners.clear();

    this.racks.clear();

    void this.scene;
  }
}
