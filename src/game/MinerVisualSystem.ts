import * as THREE from "three";

import type {
  RackInstance,
  InstalledMiner,
} from "../mining/RackTypes";

// ======================================================
// MINING TYCOON 3D
// MINER VISUAL + AUDIO SYSTEM
// ======================================================

type RackVisualEntry = {
  rack: RackInstance;
  rackObject: THREE.Group;

  audio: THREE.PositionalAudio | null;
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
  private scene: THREE.Scene;

  private racks:
    Map<string, RackVisualEntry> =
      new Map();

  private miners:
    Map<string, MinerVisualEntry> =
      new Map();

  private elapsedTime = 0;

  // ====================================================
  // AUDIO
  // ====================================================

  private audioListener:
    THREE.AudioListener;

  private audioLoader:
    THREE.AudioLoader;

  private audioBuffer:
    AudioBuffer | null =
      null;

  private audioUnlocked =
    false;

  private readonly audioPath =
    "/audio/miner-hum.wav";

  constructor(
    scene: THREE.Scene,
    camera?: THREE.Camera
  ) {
    this.scene = scene;

    this.audioListener =
      new THREE.AudioListener();

    if (camera) {
      camera.add(
        this.audioListener
      );
    } else {
      this.scene.add(
        this.audioListener
      );
    }

    this.audioLoader =
      new THREE.AudioLoader();

    this.loadMinerAudio();

    this.bindAudioUnlock();
  }

  // ====================================================
  // LOAD AUDIO
  // ====================================================

  private loadMinerAudio() {
    this.audioLoader.load(
      this.audioPath,

      (buffer) => {
        this.audioBuffer =
          buffer;

        console.log(
          "Miner audio loaded:",
          this.audioPath
        );

        for (
          const rackEntry
          of this.racks.values()
        ) {
          this.createRackAudio(
            rackEntry
          );
        }
      },

      undefined,

      (error) => {
        console.error(
          "Failed to load miner audio:",
          this.audioPath,
          error
        );
      }
    );
  }

  // ====================================================
  // BROWSER AUDIO UNLOCK
  // ====================================================

  private bindAudioUnlock() {
    const unlock =
      async () => {
        if (
          this.audioUnlocked
        ) {
          return;
        }

        try {
          const context =
            this.audioListener.context;

          if (
            context.state ===
            "suspended"
          ) {
            await context.resume();
          }

          this.audioUnlocked =
            true;

          this.updateRackAudio();

          console.log(
            "Miner audio unlocked."
          );
        } catch (error) {
          console.warn(
            "Could not unlock miner audio:",
            error
          );
        }
      };

    window.addEventListener(
      "pointerdown",
      unlock,
      {
        once: true,
      }
    );

    window.addEventListener(
      "keydown",
      unlock,
      {
        once: true,
      }
    );
  }

  // ====================================================
  // REGISTER RACK
  // ====================================================

  public registerRack(
    rack: RackInstance,
    rackObject: THREE.Group
  ) {
    const existing =
      this.racks.get(
        rack.instanceId
      );

    if (existing) {
      existing.rack =
        rack;

      existing.rackObject =
        rackObject;

      return;
    }

    const rackEntry:
      RackVisualEntry = {
        rack,
        rackObject,
        audio: null,
      };

    this.racks.set(
      rack.instanceId,
      rackEntry
    );

    this.createRackAudio(
      rackEntry
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
  // CREATE RACK AUDIO
  // ====================================================

  private createRackAudio(
    rackEntry: RackVisualEntry
  ) {
    if (
      rackEntry.audio
    ) {
      return;
    }

    if (
      !this.audioBuffer
    ) {
      return;
    }

    const audio =
      new THREE.PositionalAudio(
        this.audioListener
      );

    audio.setBuffer(
      this.audioBuffer
    );

    audio.setLoop(
      true
    );

    audio.setVolume(
      0.28
    );

    audio.setRefDistance(
      2.2
    );

    audio.setRolloffFactor(
      1.5
    );

    audio.setMaxDistance(
      15
    );

    audio.setDistanceModel(
      "inverse"
    );

    rackEntry.rackObject.add(
      audio
    );

    rackEntry.audio =
      audio;
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

    this.updateRackAudio();
  }

  // ====================================================
  // UPDATE
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

    this.updateRackAudio();
  }

  // ====================================================
  // UPDATE RACK AUDIO
  // ====================================================

  private updateRackAudio() {
    if (
      !this.audioUnlocked
    ) {
      return;
    }

    for (
      const rackEntry
      of this.racks.values()
    ) {
      const audio =
        rackEntry.audio;

      if (
        !audio ||
        !this.audioBuffer
      ) {
        continue;
      }

      const poweredMiners =
        rackEntry.rack.miners.filter(
          (miner) =>
            miner.powered
        );

      const poweredCount =
        poweredMiners.length;

      if (
        poweredCount === 0
      ) {
        if (
          audio.isPlaying
        ) {
          audio.stop();
        }

        continue;
      }

      const volume =
        THREE.MathUtils.clamp(
          0.18 +
            poweredCount *
              0.025,
          0.18,
          0.42
        );

      audio.setVolume(
        volume
      );

      if (
        !audio.isPlaying
      ) {
        try {
          audio.play();
        } catch (error) {
          console.warn(
            "Could not play rack audio:",
            error
          );
        }
      }
    }
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
    // VENTS
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
    // LEDS
    // ==================================================

    const ledRadius =
      Math.max(
        0.018,
        Math.min(
          0.035,
          serverHeight * 0.16
        )
      );

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
    // POSITION
    // ==================================================

    const slotBottom =
      installedMiner.slotIndex *
      slotHeight;

    const centerY =
      slotBottom +
      occupiedHeight / 2;

    const centerZ =
      rackDepth * 0.08;

    server.position.set(
      0,
      centerY,
      centerZ
    );

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

    this.updateRackAudio();

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

    this.updateRackAudio();
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
  // CLEAR
  //
  // Reset visuals when disconnecting or switching wallet.
  //
  // IMPORTANT:
  // AudioListener and loaded AudioBuffer are preserved,
  // so this MinerVisualSystem can immediately be reused
  // for the next wallet/facility.
  // ====================================================

  public clear() {
    // Stop and detach rack audio.

    for (
      const rackEntry
      of this.racks.values()
    ) {
      if (
        !rackEntry.audio
      ) {
        continue;
      }

      if (
        rackEntry.audio.isPlaying
      ) {
        rackEntry.audio.stop();
      }

      rackEntry.audio.removeFromParent();

      rackEntry.audio =
        null;
    }

    // Remove miner models and release their GPU
    // geometry/material resources.

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

    this.elapsedTime =
      0;

    console.log(
      "Miner visuals cleared."
    );
  }

  // ====================================================
  // DESTROY
  //
  // Permanent destruction of this entire system.
  // Unlike clear(), this also removes AudioListener.
  // ====================================================

  public destroy() {
    this.clear();

    this.audioListener.removeFromParent();

    void this.scene;
  }
}
