import * as THREE from "three";
import "./style.css";

import PlayerController from "./game/PlayerController";
import GameState from "./game/GameState";
import InventorySystem from "./game/InventorySystem";
import RackPlacementSystem from "./game/RackPlacementSystem";

import ShopUI from "./ui/ShopUI";
import InventoryUI from "./ui/InventoryUI";

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
// BACK WALL
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

// ======================================================
// LEFT WALL
// ======================================================

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

// ======================================================
// RIGHT WALL
// ======================================================

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

// ======================================================
// FRONT BEAM
// ======================================================

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
      value / 1000
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
      value / 1000
    ).toFixed(2)} kW`;
  }

  return `${value.toFixed(
    0
  )} W`;
}

// ======================================================
// LIVE GAME STATE HUD
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
// SHOP
// ======================================================

const shop =
  new ShopUI(
    gameState,
    inventory
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
      console.log(
        "Rack placed:",
        rack.instanceId,
        object.position
      );
    }
  );

// ======================================================
// INVENTORY
// ======================================================

const inventoryUI =
  new InventoryUI(
    inventory,

    (rackItem) => {
      rackPlacement.start(
        rackItem
      );
    }
  );

// ======================================================
// UI STATE
// ======================================================

function anyMenuOpen():
  boolean {
  return (
    shop.isOpen() ||
    inventoryUI.isOpen()
  );
}

function updateHUDState() {
  if (
    crosshair
  ) {
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
    rackPlacement.isActive()
  ) {
    help.textContent =
      "LEFT CLICK PLACE  •  R ROTATE  •  ESC CANCEL";

    return;
  }

  if (
    player.isPointerLocked()
  ) {
    help.textContent =
      "WASD MOVE  •  B SHOP  •  I INVENTORY  •  ESC RELEASE";

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
      event.code !== "KeyB" ||
      event.repeat
    ) {
      return;
    }

    // Don't open shop during
    // rack placement.

    if (
      rackPlacement.isActive()
    ) {
      return;
    }

    // Close inventory first.

    if (
      inventoryUI.isOpen()
    ) {
      inventoryUI.close();
    }

    shop.toggle();

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
      event.code !== "KeyI" ||
      event.repeat
    ) {
      return;
    }

    // Don't open inventory
    // during placement.

    if (
      rackPlacement.isActive()
    ) {
      return;
    }

    // Close shop first.

    if (
      shop.isOpen()
    ) {
      shop.close();
    }

    inventoryUI.toggle();

    setTimeout(
      updateHUDState,
      0
    );
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
// PERIODIC HUD STATE
//
// Shop/Inventory close buttons are managed
// internally, so this keeps the bottom help
// synchronized after clicking X.
// ======================================================

let lastMenuState = "";

function updateMenuStateWatcher() {
  const current =
    [
      shop.isOpen()
        ? "shop"
        : "",
      inventoryUI.isOpen()
        ? "inventory"
        : "",
      rackPlacement.isActive()
        ? "placement"
        : "",
    ].join("|");

  if (
    current !==
    lastMenuState
  ) {
    lastMenuState =
      current;

    updateHUDState();
  }
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
    !rackPlacement.isActive()
  ) {
    player.update(
      delta
    );
  }

  // ----------------------------------------------
  // RACK PLACEMENT
  // ----------------------------------------------

  rackPlacement.update();

  // ----------------------------------------------
  // ECONOMY
  // ----------------------------------------------

  gameState.update(
    delta
  );

  // ----------------------------------------------
  // UI
  // ----------------------------------------------

  updateMenuStateWatcher();

  // ----------------------------------------------
  // RENDER
  // ----------------------------------------------

  renderer.render(
    scene,
    camera
  );
}

animate();
