import * as THREE from "three";
import "./style.css";

import PlayerController from "./game/PlayerController";
import GameState from "./game/GameState";
import InventorySystem from "./game/InventorySystem";
import RackPlacementSystem from "./game/RackPlacementSystem";
import RackInteractionSystem from "./game/RackInteractionSystem";
import MinerVisualSystem from "./game/MinerVisualSystem";
import PowerSystem from "./game/PowerSystem";
import PowerSourcePlacementSystem from "./game/PowerSourcePlacementSystem";

import ShopUI from "./ui/ShopUI";
import InventoryUI from "./ui/InventoryUI";
import RackManagementUI from "./ui/RackManagementUI";

// ======================================================
// MINING TYCOON 3D
// MAIN
// ======================================================

const app =
  document.querySelector<HTMLDivElement>(
    "#app"
  );

if (!app) {
  throw new Error(
    "App element not found."
  );
}

// ======================================================
// CORE SYSTEMS
// ======================================================

const gameState =
  new GameState();

const inventory =
  new InventorySystem();

const powerSystem =
  new PowerSystem();

// ======================================================
// SCENE
// ======================================================

const scene =
  new THREE.Scene();

scene.background =
  new THREE.Color(
    0x080b10
  );

scene.fog =
  new THREE.Fog(
    0x080b10,
    18,
    55
  );

// ======================================================
// CAMERA
// ======================================================

const camera =
  new THREE.PerspectiveCamera(
    70,
    window.innerWidth /
      window.innerHeight,
    0.1,
    100
  );

camera.position.set(
  0,
  1.7,
  7
);

// ======================================================
// RENDERER
// ======================================================

const renderer =
  new THREE.WebGLRenderer({
    antialias: true,
  });

renderer.setSize(
  window.innerWidth,
  window.innerHeight
);

renderer.setPixelRatio(
  Math.min(
    window.devicePixelRatio,
    2
  )
);

renderer.shadowMap.enabled =
  true;

renderer.shadowMap.type =
  THREE.PCFSoftShadowMap;

renderer.outputColorSpace =
  THREE.SRGBColorSpace;

renderer.toneMapping =
  THREE.ACESFilmicToneMapping;

renderer.toneMappingExposure =
  1.15;

app.appendChild(
  renderer.domElement
);

// ======================================================
// PLAYER
// ======================================================

const player =
  new PlayerController(
    camera,
    renderer.domElement
  );

// ======================================================
// MINER VISUAL SYSTEM
// ======================================================

const minerVisuals =
  new MinerVisualSystem(
    scene
  );

// ======================================================
// LIGHTS
// ======================================================

const ambientLight =
  new THREE.AmbientLight(
    0x8aa4c8,
    0.7
  );

scene.add(
  ambientLight
);

const mainLight =
  new THREE.DirectionalLight(
    0xffffff,
    2.5
  );

mainLight.position.set(
  4,
  8,
  5
);

mainLight.castShadow =
  true;

mainLight.shadow.mapSize.set(
  2048,
  2048
);

scene.add(
  mainLight
);

const blueLight =
  new THREE.PointLight(
    0x2388ff,
    18,
    12
  );

blueLight.position.set(
  -4,
  3,
  -4
);

scene.add(
  blueLight
);

// ======================================================
// MATERIALS
// ======================================================

const wallMaterial =
  new THREE.MeshStandardMaterial({
    color: 0x171c23,
    roughness: 0.82,
    metalness: 0.08,
  });

const floorMaterial =
  new THREE.MeshStandardMaterial({
    color: 0x242a32,
    roughness: 0.72,
    metalness: 0.18,
  });

// ======================================================
// FLOOR
// ======================================================

const floor =
  new THREE.Mesh(
    new THREE.PlaneGeometry(
      20,
      20
    ),
    floorMaterial
  );

floor.rotation.x =
  -Math.PI / 2;

floor.receiveShadow =
  true;

scene.add(
  floor
);

// ======================================================
// GRID
// ======================================================

const grid =
  new THREE.GridHelper(
    20,
    20,
    0x3f5269,
    0x303944
  );

grid.position.y =
  0.003;

scene.add(
  grid
);

// ======================================================
// WALLS
// ======================================================

const backWall =
  new THREE.Mesh(
    new THREE.BoxGeometry(
      20,
      5,
      0.3
    ),
    wallMaterial
  );

backWall.position.set(
  0,
  2.5,
  -10
);

backWall.receiveShadow =
  true;

scene.add(
  backWall
);

const leftWall =
  new THREE.Mesh(
    new THREE.BoxGeometry(
      0.3,
      5,
      20
    ),
    wallMaterial
  );

leftWall.position.set(
  -10,
  2.5,
  0
);

leftWall.receiveShadow =
  true;

scene.add(
  leftWall
);

const rightWall =
  new THREE.Mesh(
    new THREE.BoxGeometry(
      0.3,
      5,
      20
    ),
    wallMaterial
  );

rightWall.position.set(
  10,
  2.5,
  0
);

rightWall.receiveShadow =
  true;

scene.add(
  rightWall
);

const frontBeam =
  new THREE.Mesh(
    new THREE.BoxGeometry(
      20,
      0.35,
      0.35
    ),
    wallMaterial
  );

frontBeam.position.set(
  0,
  4.8,
  9.8
);

scene.add(
  frontBeam
);

// ======================================================
// CEILING
// ======================================================

const ceiling =
  new THREE.Mesh(
    new THREE.PlaneGeometry(
      20,
      20
    ),

    new THREE.MeshStandardMaterial({
      color: 0x10151c,
      roughness: 0.85,
      metalness: 0.1,
      side: THREE.DoubleSide,
    })
  );

ceiling.rotation.x =
  Math.PI / 2;

ceiling.position.y =
  5;

ceiling.receiveShadow =
  true;

scene.add(
  ceiling
);

// ======================================================
// CEILING LIGHTS
// ======================================================

function createCeilingLight(
  x: number,
  z: number
) {
  const fixture =
    new THREE.Mesh(
      new THREE.BoxGeometry(
        3.5,
        0.08,
        0.22
      ),

      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xd9ecff,
        emissiveIntensity: 4,
      })
    );

  fixture.position.set(
    x,
    4.86,
    z
  );

  scene.add(
    fixture
  );

  const light =
    new THREE.PointLight(
      0xd9ecff,
      9,
      8
    );

  light.position.set(
    x,
    4.4,
    z
  );

  scene.add(
    light
  );
}

createCeilingLight(
  -4,
  -5
);

createCeilingLight(
  4,
  -5
);

createCeilingLight(
  -4,
  2
);

createCeilingLight(
  4,
  2
);

// ======================================================
// HUD
// ======================================================

const hud =
  document.createElement(
    "div"
  );

hud.className =
  "hud";

hud.innerHTML = `
  <div class="game-title">
    MINING TYCOON

    <span>
      FACILITY 01
    </span>
  </div>

  <div class="stats">
    <div class="stat">
      <span class="stat-label">
        BALANCE
      </span>

      <strong data-hud="balance">
        $5,000.00
      </strong>
    </div>

    <div class="stat">
      <span class="stat-label">
        HASHRATE
      </span>

      <strong data-hud="hashrate">
        0 MH/s
      </strong>
    </div>

    <div class="stat">
      <span class="stat-label">
        POWER
      </span>

      <strong data-hud="power">
        0 W
      </strong>
    </div>

    <div class="stat">
      <span class="stat-label">
        CAPACITY
      </span>

      <strong data-hud="capacity">
        0 W
      </strong>
    </div>
  </div>

  <div class="crosshair"></div>

  <div class="help">
    CLICK TO ENTER
  </div>
`;

app.appendChild(
  hud
);

// ======================================================
// HUD REFERENCES
// ======================================================

const balanceHUD =
  hud.querySelector<HTMLElement>(
    '[data-hud="balance"]'
  );

const hashrateHUD =
  hud.querySelector<HTMLElement>(
    '[data-hud="hashrate"]'
  );

const powerHUD =
  hud.querySelector<HTMLElement>(
    '[data-hud="power"]'
  );

const capacityHUD =
  hud.querySelector<HTMLElement>(
    '[data-hud="capacity"]'
  );

const help =
  hud.querySelector<HTMLElement>(
    ".help"
  );

const crosshair =
  hud.querySelector<HTMLElement>(
    ".crosshair"
  );

// ======================================================
// FORMATTERS
// ======================================================

function formatMoney(
  value: number
): string {
  return new Intl.NumberFormat(
    "en-US",
    {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  ).format(value);
}

function formatHashrate(
  value: number
): string {
  if (
    value >= 1_000_000
  ) {
    return `${(
      value /
      1_000_000
    ).toFixed(2)} TH/s`;
  }

  if (
    value >= 1000
  ) {
    return `${(
      value /
      1000
    ).toFixed(2)} GH/s`;
  }

  return `${value.toFixed(
    0
  )} MH/s`;
}

function formatPower(
  value: number
): string {
  if (
    value >= 1000
  ) {
    return `${(
      value /
      1000
    ).toFixed(2)} kW`;
  }

  return `${value.toFixed(
    0
  )} W`;
}

// ======================================================
// GAME STATE HUD
// ======================================================

gameState.subscribe(
  (state) => {
    if (balanceHUD) {
      balanceHUD.textContent =
        formatMoney(
          state.getBalance()
        );
    }

    if (hashrateHUD) {
      hashrateHUD.textContent =
        formatHashrate(
          state.getHashrate()
        );
    }

    if (powerHUD) {
      powerHUD.textContent =
        formatPower(
          state.getPowerUsage()
        );
    }
  }
);

// ======================================================
// POWER HUD
// ======================================================

function updatePowerHUD() {
  if (
    capacityHUD
  ) {
    capacityHUD.textContent =
      formatPower(
        powerSystem.getTotalCapacity()
      );
  }
}

powerSystem.subscribe(
  () => {
    updatePowerHUD();
  }
);

// ======================================================
// SYNC POWER SYSTEM -> GAME STATE
// ======================================================

function syncMiningPower() {
  const targetHashrate =
    powerSystem.getActiveHashrate();

  const targetPower =
    powerSystem.getCurrentPowerUsage();

  const currentHashrate =
    gameState.getHashrate();

  const currentPower =
    gameState.getPowerUsage();

  const hashDifference =
    targetHashrate -
    currentHashrate;

  const powerDifference =
    targetPower -
    currentPower;

  if (
    hashDifference > 0 ||
    powerDifference > 0
  ) {
    gameState.addMiningPower(
      Math.max(
        0,
        hashDifference
      ),

      Math.max(
        0,
        powerDifference
      )
    );
  }

  if (
    hashDifference < 0 ||
    powerDifference < 0
  ) {
    gameState.removeMiningPower(
      Math.max(
        0,
        -hashDifference
      ),

      Math.max(
        0,
        -powerDifference
      )
    );
  }
}

powerSystem.subscribe(
  () => {
    syncMiningPower();

    updatePowerHUD();
  }
);

// ======================================================
// SHOP
// ======================================================

const shop =
  new ShopUI(
    gameState,
    inventory
  );

// ======================================================
// RACK MANAGEMENT
// ======================================================

const rackManagement =
  new RackManagementUI(
    inventory,

    (
      rack,
      installedMiner,
      _inventoryItem
    ) => {
      // ----------------------------------------------
      // CREATE PHYSICAL MINER
      // ----------------------------------------------

      minerVisuals.addMiner(
        rack,
        installedMiner
      );

      // ----------------------------------------------
      // RECALCULATE ELECTRICITY
      // ----------------------------------------------

      powerSystem.recalculate();

      console.log(
        "Miner installed:",
        installedMiner
          .miner.name,

        "| Powered:",
        installedMiner.powered,

        "| Hashrate:",
        installedMiner.powered
          ? installedMiner
              .miner.hashRate
          : 0,

        "MH/s",

        "| Power:",
        installedMiner.powered
          ? installedMiner
              .miner.powerUsage
          : 0,

        "W"
      );
    }
  );

// ======================================================
// RACK INTERACTION
// ======================================================

const rackInteraction =
  new RackInteractionSystem(
    camera,

    (
      rack,
      _object
    ) => {
      if (
        anyMenuOpen()
      ) {
        return;
      }

      if (
        rackPlacement
          .isActive() ||
        powerPlacement
          .isActive()
      ) {
        return;
      }

      rackInteraction.setEnabled(
        false
      );

      rackManagement.open(
        rack
      );

      updateHUDState();
    }
  );

// ======================================================
// POWER SOURCE PLACEMENT
// ======================================================

const powerPlacement =
  new PowerSourcePlacementSystem(
    scene,
    camera,
    renderer.domElement,
    inventory,

    (
      powerSource,
      object
    ) => {
      powerSystem.registerPowerSource(
        powerSource
      );

      console.log(
        "Power source placed:",
        powerSource.definition.name,

        "| Capacity:",
        powerSource.definition.capacity,
        "W",

        "| Facility capacity:",
        powerSystem.getTotalCapacity(),
        "W"
      );

      void object;

      updateHUDState();
    }
  );

// ======================================================
// RACK PLACEMENT
// ======================================================

const rackPlacement =
  new RackPlacementSystem(
    scene,
    camera,
    renderer.domElement,
    inventory,

    (
      rack,
      object
    ) => {
      // ----------------------------------------------
      // INTERACTION
      // ----------------------------------------------

      rackInteraction.registerRack(
        rack,
        object
      );

      // ----------------------------------------------
      // MINER VISUAL SYSTEM
      // ----------------------------------------------

      minerVisuals.registerRack(
        rack,
        object
      );

      // ----------------------------------------------
      // ELECTRICAL NETWORK
      // ----------------------------------------------

      powerSystem.registerRack(
        rack
      );

      // ----------------------------------------------
      // POWER PLACEMENT COLLISION
      // ----------------------------------------------

      powerPlacement
        .registerCollisionObject(
          object
        );

      console.log(
        "Rack placed:",
        rack.instanceId
      );
    }
  );

// ======================================================
// INVENTORY
// ======================================================

const inventoryUI =
  new InventoryUI(
    inventory,

    // --------------------------------------------------
    // PLACE RACK
    // --------------------------------------------------

    (rackItem) => {
      powerPlacement.cancel();

      rackInteraction.setEnabled(
        false
      );

      rackPlacement.start(
        rackItem
      );

      updateHUDState();
    },

    // --------------------------------------------------
    // PLACE POWER SOURCE
    // --------------------------------------------------

    (powerItem) => {
      rackPlacement.cancel();

      rackInteraction.setEnabled(
        false
      );

      powerPlacement.start(
        powerItem
      );

      updateHUDState();
    }
  );

// ======================================================
// MENU STATE
// ======================================================

function anyMenuOpen():
  boolean {
  return (
    shop.isOpen() ||
    inventoryUI.isOpen() ||
    rackManagement.isOpen()
  );
}

// ======================================================
// ANY PLACEMENT ACTIVE
// ======================================================

function anyPlacementActive():
  boolean {
  return (
    rackPlacement.isActive() ||
    powerPlacement.isActive()
  );
}

// ======================================================
// INTERACTION STATE
// ======================================================

function updateInteractionState() {
  const shouldEnable =
    !anyMenuOpen() &&
    !anyPlacementActive();

  rackInteraction.setEnabled(
    shouldEnable
  );
}

// ======================================================
// HUD STATE
// ======================================================

function updateHUDState() {
  if (crosshair) {
    crosshair.style.display =
      anyMenuOpen()
        ? "none"
        : "";
  }

  if (!help) {
    return;
  }

  if (
    shop.isOpen()
  ) {
    help.textContent =
      "HARDWARE MARKET";

    return;
  }

  if (
    inventoryUI.isOpen()
  ) {
    help.textContent =
      "FACILITY INVENTORY";

    return;
  }

  if (
    rackManagement.isOpen()
  ) {
    help.textContent =
      "RACK MANAGEMENT";

    return;
  }

  if (
    rackPlacement.isActive()
  ) {
    help.textContent =
      "PLACE RACK  •  LEFT CLICK PLACE  •  R ROTATE  •  ESC CANCEL";

    return;
  }

  if (
    powerPlacement.isActive()
  ) {
    help.textContent =
      "PLACE POWER UNIT  •  LEFT CLICK PLACE  •  R ROTATE  •  ESC CANCEL";

    return;
  }

  if (
    player.isPointerLocked()
  ) {
    help.textContent =
      "WASD MOVE  •  B SHOP  •  I INVENTORY  •  E INTERACT  •  ESC RELEASE";

    return;
  }

  help.textContent =
    "CLICK TO ENTER  •  B SHOP  •  I INVENTORY";
}

// ======================================================
// B = SHOP
// ======================================================

window.addEventListener(
  "keydown",
  (event) => {
    if (
      event.code !==
        "KeyB" ||
      event.repeat
    ) {
      return;
    }

    if (
      anyPlacementActive()
    ) {
      return;
    }

    if (
      rackManagement.isOpen()
    ) {
      return;
    }

    if (
      inventoryUI.isOpen()
    ) {
      inventoryUI.close();
    }

    shop.toggle();

    updateInteractionState();

    setTimeout(
      updateHUDState,
      0
    );
  }
);

// ======================================================
// I = INVENTORY
// ======================================================

window.addEventListener(
  "keydown",
  (event) => {
    if (
      event.code !==
        "KeyI" ||
      event.repeat
    ) {
      return;
    }

    if (
      anyPlacementActive()
    ) {
      return;
    }

    if (
      rackManagement.isOpen()
    ) {
      return;
    }

    if (
      shop.isOpen()
    ) {
      shop.close();
    }

    inventoryUI.toggle();

    updateInteractionState();

    setTimeout(
      updateHUDState,
      0
    );
  }
);

// ======================================================
// ESCAPE MENU HANDLING
// ======================================================

window.addEventListener(
  "keydown",
  (event) => {
    if (
      event.code !==
      "Escape"
    ) {
      return;
    }

    if (
      anyPlacementActive()
    ) {
      setTimeout(
        () => {
          updateInteractionState();

          updateHUDState();
        },
        0
      );

      return;
    }

    if (
      rackManagement.isOpen()
    ) {
      rackManagement.close();

      updateInteractionState();

      updateHUDState();

      return;
    }

    if (
      inventoryUI.isOpen()
    ) {
      inventoryUI.close();

      updateInteractionState();

      updateHUDState();

      return;
    }

    if (
      shop.isOpen()
    ) {
      shop.close();

      updateInteractionState();

      updateHUDState();
    }
  }
);

// ======================================================
// POINTER LOCK
// ======================================================

document.addEventListener(
  "pointerlockchange",
  () => {
    updateHUDState();
  }
);

// ======================================================
// UI STATE WATCHER
// ======================================================

let lastUIState =
  "";

function updateUIStateWatcher() {
  const current =
    [
      shop.isOpen()
        ? "shop"
        : "",

      inventoryUI.isOpen()
        ? "inventory"
        : "",

      rackManagement.isOpen()
        ? "rack"
        : "",

      rackPlacement.isActive()
        ? "rack-placement"
        : "",

      powerPlacement.isActive()
        ? "power-placement"
        : "",
    ].join("|");

  if (
    current ===
    lastUIState
  ) {
    return;
  }

  lastUIState =
    current;

  updateInteractionState();

  updateHUDState();
}

// ======================================================
// RESIZE
// ======================================================

window.addEventListener(
  "resize",
  () => {
    camera.aspect =
      window.innerWidth /
      window.innerHeight;

    camera.updateProjectionMatrix();

    renderer.setSize(
      window.innerWidth,
      window.innerHeight
    );

    renderer.setPixelRatio(
      Math.min(
        window.devicePixelRatio,
        2
      )
    );
  }
);

// ======================================================
// CLOCK
// ======================================================

const clock =
  new THREE.Clock();

// ======================================================
// GAME LOOP
// ======================================================

function animate() {
  requestAnimationFrame(
    animate
  );

  const delta =
    Math.min(
      clock.getDelta(),
      0.05
    );

  // ----------------------------------------------
  // PLAYER
  // ----------------------------------------------

  if (
    !anyMenuOpen() &&
    !anyPlacementActive()
  ) {
    player.update(
      delta
    );
  }

  // ----------------------------------------------
  // PLACEMENT SYSTEMS
  // ----------------------------------------------

  rackPlacement.update();

  powerPlacement.update();

  // ----------------------------------------------
  // RACK INTERACTION
  // ----------------------------------------------

  if (
    !anyMenuOpen() &&
    !anyPlacementActive()
  ) {
    rackInteraction.update();
  }

  // ----------------------------------------------
  // MINING ECONOMY
  // ----------------------------------------------

  gameState.update(
    delta
  );

  // ----------------------------------------------
  // MINER VISUALS
  //
  // Synchronizes LEDs with miner.powered
  // and animates activity LEDs.
  // ----------------------------------------------

  minerVisuals.update(
    delta
  );

  // ----------------------------------------------
  // UI
  // ----------------------------------------------

  updateUIStateWatcher();

  // ----------------------------------------------
  // RENDER
  // ----------------------------------------------

  renderer.render(
    scene,
    camera
  );
}

animate();
