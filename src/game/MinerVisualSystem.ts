import * as THREE from "three";

import type {
  RackInstance,
  InstalledMiner,
} from "../mining/RackTypes";

// ======================================================
// MINING TYCOON 3D
// MINER VISUAL SYSTEM
// ======================================================

type RackVisualEntry = {
  rack: RackInstance;
  rackObject: THREE.Group;
};

type MinerVisualEntry = {
  instanceId: string;
  rackInstanceId: string;

  installedMiner: InstalledMiner;

  object: THREE.Group;

  powerLED: THREE.Mesh;
  powerLEDMaterial: THREE.MeshStandardMaterial;

  activityLED: THREE.Mesh;
  activityLEDMaterial: THREE.MeshStandardMaterial;

  blinkOffset: number;
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

  private elapsedTime =
    0;

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
  // UPDATE
  //
  // Keeps LEDs synchronized with PowerSystem and
  // animates activity lights.
  // ====================================================

  public update(
    delta: number
  ) {
    this.elapsedTime +=
      delta;

    for (
      const entry
      of this.miners.values()
    ) {
      const powered =
        entry.installedMiner.powered;

      // ----------------------------------------------
      // POWER LED
      // ----------------------------------------------

      if (powered) {
        entry.powerLEDMaterial.color.setHex(
          0x39ff88
        );

        entry.powerLEDMaterial.emissive.setHex(
          0x18ff68
        );

        entry.powerLEDMaterial.emissiveIntensity =
          7;

        entry.powerLED.visible =
          true;
      } else {
        entry.powerLEDMaterial.color.setHex(
          0x303840
        );

        entry.powerLEDMaterial.emissive.setHex(
          0x000000
        );

        entry.powerLEDMaterial.emissiveIntensity =
          0.15;

        entry.powerLED.visible =
          true;
      }

      // ----------------------------------------------
      // ACTIVITY LED
      //
      // Different blinkOffset prevents every server
      // from blinking at exactly the same time.
      // ----------------------------------------------

      if (!powered) {
        entry.activityLED.visible =
          false;

        entry.activityLEDMaterial.emissiveIntensity =
          0;

        continue;
      }

      entry.activityLED.visible =
        true;

      const blinkTime =
        this.elapsedTime * 7 +
        entry.blinkOffset;

      const blink =
        Math.sin(
          blinkTime
        );

      const secondaryBlink =
        Math.sin(
          blinkTime * 2.37 +
          entry.blinkOffset
        );

      const active =
        blink > -0.15 ||
        secondaryBlink > 0.72;

      if (active) {
        entry.activityLEDMaterial.color.setHex(
          0x52a8ff
        );

        entry.activityLEDMaterial.emissive.setHex(
          0x1685ff
        );

        entry.activityLEDMaterial.emissiveIntensity =
          9;

        entry.activityLED.scale.setScalar(
          1.08
        );
      } else {
        entry.activityLEDMaterial.color.setHex(
          0x12314c
        );

        entry.activityLEDMaterial.emissive.setHex(
          0x06192b
        );

        entry.activityLEDMaterial.emissiveIntensity =
          0.5;

        entry.activityLED.scale.setScalar(
          0.92
        );
      }
    }
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
    //
    // Make the server fill most of the rack width/depth
    // so it is clearly visible from first-person view.
    // ==================================================

    const serverWidth =
      rackWidth * 0.82;

    const occupiedHeight =
      slotHeight *
      miner.rackSlots;

    const serverHeight =
      Math.max(
        occupiedHeight * 0.82,
        0.1
      );

    const serverDepth =
      rackDepth * 0.76;

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
        color: 0x202b36,
        roughness: 0.3,
        metalness: 0.78,
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
        color: 0x10171e,
        roughness: 0.25,
        metalness: 0.88,
      });

    const front =
      new THREE.Mesh(
        new THREE.BoxGeometry(
          serverWidth * 0.97,
          serverHeight * 0.84,
          0.055
        ),
        frontMaterial
      );

    front.position.z =
      serverDepth / 2 +
      0.03;

    server.add(
      front
    );

    // ==================================================
    // VENT AREA
    // ==================================================

    const ventMaterial =
      new THREE.MeshStandardMaterial({
        color: 0x465665,
        roughness: 0.42,
        metalness: 0.7,
      });

    const ventCount =
      Math.max(
        5,
        miner.rackSlots * 5
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
            ventWidth * 0.42,
            serverHeight * 0.42,
            0.018
          ),
          ventMaterial
        );

      vent.position.set(
        -ventAreaWidth / 2 +
          ventWidth / 2 +
          i * ventWidth,

        0,

        serverDepth / 2 +
          0.064
      );

      server.add(
        vent
      );
    }

    // ==================================================
    // HANDLES
    // ==================================================

    const handleMaterial =
      new THREE.MeshStandardMaterial({
        color: 0x667788,
        roughness: 0.25,
        metalness: 0.9,
      });

    const handleHeight =
      Math.max(
        serverHeight * 0.5,
        0.04
      );

    const leftHandle =
      new THREE.Mesh(
        new THREE.BoxGeometry(
          serverWidth * 0.055,
          handleHeight,
          0.035
        ),
        handleMaterial
      );

    leftHandle.position.set(
      -serverWidth * 0.4,
      0,
      serverDepth / 2 +
        0.075
    );

    server.add(
      leftHandle
    );

    const rightHandle =
      leftHandle.clone();

    rightHandle.position.x =
      serverWidth * 0.4;

    server.add(
      rightHandle
    );

    // ==================================================
    // LED SIZE
    // ==================================================

    const ledRadius =
      Math.max(
        0.018,
        Math.min(
          0.035,
          serverHeight * 0.16
        )
      );

    // ==================================================
    // POWER LED - GREEN
    // ==================================================

    const powerLEDMaterial =
      new THREE.MeshStandardMaterial({
        color: 0x303840,
        emissive: 0x000000,
        emissiveIntensity: 0,
        roughness: 0.2,
        metalness: 0.1,
      });

    const powerLED =
      new THREE.Mesh(
        new THREE.SphereGeometry(
          ledRadius,
          16,
          16
        ),
        powerLEDMaterial
      );

    powerLED.position.set(
      serverWidth * 0.31,
      serverHeight * 0.08,
      serverDepth / 2 +
        0.095
    );

    server.add(
      powerLED
    );

    // ==================================================
    // ACTIVITY LED - BLUE
    // ==================================================

    const activityLEDMaterial =
      new THREE.MeshStandardMaterial({
        color: 0x12314c,
        emissive: 0x06192b,
        emissiveIntensity: 0,
        roughness: 0.2,
        metalness: 0.1,
      });

    const activityLED =
      new THREE.Mesh(
        new THREE.SphereGeometry(
          ledRadius * 0.78,
          16,
          16
        ),
        activityLEDMaterial
      );

    activityLED.position.set(
      serverWidth * 0.23,
      serverHeight * 0.08,
      serverDepth / 2 +
        0.095
    );

    server.add(
      activityLED
    );

    // ==================================================
    // LED BACKPLATE
    //
    // Gives LEDs contrast against the dark server.
    // ==================================================

    const ledPlate =
      new THREE.Mesh(
        new THREE.BoxGeometry(
          serverWidth * 0.23,
          Math.max(
            serverHeight * 0.32,
            0.06
          ),
          0.018
        ),

        new THREE.MeshStandardMaterial({
          color: 0x05080b,
          roughness: 0.35,
          metalness: 0.7,
        })
      );

    ledPlate.position.set(
      serverWidth * 0.27,
      serverHeight * 0.08,
      serverDepth / 2 +
        0.073
    );

    server.add(
      ledPlate
    );

    // Make sure LEDs render in front of plate.
    powerLED.position.z =
      serverDepth / 2 +
      0.105;

    activityLED.position.z =
      serverDepth / 2 +
      0.105;

    // ==================================================
    // SIDE RAILS
    // ==================================================

    const railMaterial =
      new THREE.MeshStandardMaterial({
        color: 0x526273,
        roughness: 0.3,
        metalness: 0.9,
      });

    const leftRail =
      new THREE.Mesh(
        new THREE.BoxGeometry(
          0.04,
          serverHeight * 0.92,
          serverDepth * 0.92
        ),
        railMaterial
      );

    leftRail.position.x =
      -serverWidth / 2 -
      0.02;

    server.add(
      leftRail
    );

    const rightRail =
      leftRail.clone();

    rightRail.position.x =
      serverWidth / 2 +
      0.02;

    server.add(
      rightRail
    );

    // ==================================================
    // POSITION INSIDE RACK
    // ==================================================

    const slotBottom =
      installedMiner.slotIndex *
      slotHeight;

    const centerY =
      slotBottom +
      occupiedHeight / 2;

    // Push the server toward the FRONT of the rack.
    //
    // Previously centerZ = 0.02, which left the server
    // too deep inside the dark rack.
    const centerZ =
      rackDepth * 0.08;

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

        installedMiner,

        object:
          server,

        powerLED,

        powerLEDMaterial,

        activityLED,

        activityLEDMaterial,

        blinkOffset:
          Math.random() *
          Math.PI *
          2,
      }
    );

    console.log(
      "Miner visual created:",
      miner.name,
      "| Rack:",
      rack.definition.name,
      "| Slot:",
      installedMiner.slotIndex
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
  // DISPOSE
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
