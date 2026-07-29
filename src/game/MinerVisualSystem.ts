import * as THREE from "three";

import type {
  RackInstance,
  InstalledMiner,
} from "../mining/RackTypes";

// ======================================================
// MINING TYCOON 3D
// MINER VISUAL SYSTEM
//
// Creates physical mining-server meshes inside racks.
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
  //
  // Main.ts calls this when a rack has been placed.
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

    // If rack already contains miners
    // later when save/load exists,
    // recreate their visuals.

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
  // REMOVE MINER
  //
  // Prepared for future uninstall/sell functionality.
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
  // CREATE MINER VISUAL
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
        "MinerVisualSystem: rack not registered:",
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
    // SERVER GROUP
    // ==================================================

    const server =
      new THREE.Group();

    server.name =
      `miner-${installedMiner.instanceId}`;

    server.userData.minerInstanceId =
      installedMiner.instanceId;

    server.userData.rackInstanceId =
      rack.instanceId;

    // ==================================================
    // SIZE
    //
    // Rack visuals currently use game-world dimensions,
    // so server dimensions are derived from rack size.
    // ==================================================

    const rackWidth =
      rack.definition.width;

    const rackHeight =
      rack.definition.height;

    const rackDepth =
      rack.definition.depth;

    const slotHeight =
      rackHeight /
      rack.definition.totalSlots;

    const serverHeight =
      Math.max(
        slotHeight *
          miner.rackSlots *
          0.82,
        0.08
      );

    const serverWidth =
      rackWidth * 0.76;

    const serverDepth =
      rackDepth * 0.72;

    // ==================================================
    // SERVER BODY
    // ==================================================

    const bodyMaterial =
      new THREE.MeshStandardMaterial({
        color: 0x111820,
        roughness: 0.38,
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
    // FRONT PANEL
    // ==================================================

    const frontMaterial =
      new THREE.MeshStandardMaterial({
        color: 0x080c11,
        roughness: 0.3,
        metalness: 0.9,
      });

    const front =
      new THREE.Mesh(
        new THREE.BoxGeometry(
          serverWidth * 0.96,
          serverHeight * 0.78,
          0.035
        ),
        frontMaterial
      );

    front.position.z =
      serverDepth / 2 +
      0.019;

    server.add(
      front
    );

    // ==================================================
    // FRONT VENTS
    // ==================================================

    const ventMaterial =
      new THREE.MeshStandardMaterial({
        color: 0x242d37,
        roughness: 0.65,
        metalness: 0.7,
      });

    const ventCount =
      Math.max(
        3,
        Math.min(
          8,
          miner.rackSlots * 3
        )
      );

    const ventAreaWidth =
      serverWidth * 0.52;

    const ventSpacing =
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
            ventSpacing * 0.52,
            serverHeight * 0.36,
            0.012
          ),
          ventMaterial
        );

      vent.position.set(
        -ventAreaWidth / 2 +
          ventSpacing / 2 +
          i * ventSpacing,
        0,
        serverDepth / 2 +
          0.041
      );

      server.add(
        vent
      );
    }

    // ==================================================
    // LED
    // ==================================================

    const ledColor =
      installedMiner.powered
        ? 0x39ff88
        : 0x5b626b;

    const ledMaterial =
      new THREE.MeshStandardMaterial({
        color: ledColor,

        emissive:
          installedMiner.powered
            ? 0x22ff77
            : 0x000000,

        emissiveIntensity:
          installedMiner.powered
            ? 4
            : 0,
      });

    const led =
      new THREE.Mesh(
        new THREE.SphereGeometry(
          Math.max(
            0.018,
            rackWidth * 0.018
          ),
          10,
          10
        ),
        ledMaterial
      );

    led.position.set(
      serverWidth * 0.36,
      0,
      serverDepth / 2 +
        0.055
    );

    server.add(
      led
    );

    // ==================================================
    // SECOND LED
    // ==================================================

    if (
      installedMiner.powered
    ) {
      const activityMaterial =
        new THREE.MeshStandardMaterial({
          color: 0x3d9cff,
          emissive: 0x1677ff,
          emissiveIntensity: 3,
        });

      const activityLED =
        new THREE.Mesh(
          new THREE.SphereGeometry(
            Math.max(
              0.012,
              rackWidth * 0.012
            ),
            8,
            8
          ),
          activityMaterial
        );

      activityLED.position.set(
        serverWidth * 0.29,
        0,
        serverDepth / 2 +
          0.055
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
        color: 0x303b47,
        roughness: 0.35,
        metalness: 0.85,
      });

    const leftRail =
      new THREE.Mesh(
        new THREE.BoxGeometry(
          0.035,
          serverHeight * 0.92,
          serverDepth * 0.9
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
    // slotIndex 0 starts at the bottom of the rack.
    //
    // We calculate the center of however many U
    // the miner occupies.
    // ==================================================

    const occupiedHeight =
      slotHeight *
      miner.rackSlots;

    const bottomY =
      -rackHeight / 2;

    const slotStartY =
      bottomY +
      installedMiner.slotIndex *
        slotHeight;

    const centerY =
      slotStartY +
      occupiedHeight / 2;

    server.position.set(
      0,
      centerY,
      0
    );

    // ==================================================
    // ADD TO RACK
    //
    // Important:
    // add to rackObject rather than scene directly.
    //
    // This means rack rotation/position automatically
    // applies to installed miners.
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
  // DISPOSE
  // ====================================================

  private disposeObject(
    object: THREE.Object3D
  ) {
    object.traverse(
      (child) => {
        if (
          !(child instanceof THREE.Mesh)
        ) {
          return;
        }

        child.geometry.dispose();

        const material =
          child.material;

        if (
          Array.isArray(
            material
          )
        ) {
          for (
            const item
            of material
          ) {
            item.dispose();
          }

          return;
        }

        material.dispose();
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

    // Kept here so this system can later own
    // scene-level effects without changing API.
    void this.scene;
  }
}
