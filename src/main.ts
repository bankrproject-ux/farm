import * as THREE from "three";
import "./style.css";

import PlayerController from "./game/PlayerController";
import GameState from "./game/GameState";
import InventorySystem from "./game/InventorySystem";
import ShopUI from "./ui/ShopUI";

// ======================================================
// MINING TYCOON 3D
// Main Entry Point
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
// CORE GAME SYSTEMS
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
// LIGHTING
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

// Blue industrial accent.

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
// FLOOR GRID
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
// FRONT TOP BEAM
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
// TEMPORARY DISPLAY RACK
//
// This rack is ONLY scenery.
// It is not owned by the player and does not mine.
//
// Later we remove this once rack placement is working.
// ======================================================

const displayRack =
  new THREE.Group();

const rackFrameMaterial =
  new THREE.MeshStandardMaterial({
    color: 0x080a0d,
    roughness: 0.35,
    metalness: 0.85,
  });

const rackBody =
  new THREE.Mesh(
    new THREE.BoxGeometry(
      1.6,
      3.2,
      1.1
    ),
    rackFrameMaterial
  );

rackBody.castShadow =
  true;

rackBody.receiveShadow =
  true;

displayRack.add(
  rackBody
);

const slotMaterial =
  new THREE.MeshStandardMaterial({
    color: 0x151b21,
    roughness: 0.45,
    metalness: 0.7,
  });

const ledMaterial =
  new THREE.MeshStandardMaterial({
    color: 0x00ff88,
    emissive: 0x00ff88,
    emissiveIntensity: 4,
  });

for (
  let i = 0;
  i < 8;
  i++
) {
  const slot =
    new THREE.Mesh(
      new THREE.BoxGeometry(
        1.35,
        0.27,
        0.08
      ),
      slotMaterial
    );

  slot.position.set(
    0,
    -1.15 +
      i * 0.33,
    0.565
  );

  displayRack.add(
    slot
  );

  const led =
    new THREE.Mesh(
      new THREE.BoxGeometry(
        0.05,
        0.05,
        0.03
      ),
      ledMaterial
    );

  led.position.set(
    0.5,
    -1.15 +
      i * 0.33,
    0.62
  );

  displayRack.add(
    led
  );
}

displayRack.position.set(
  0,
  1.6,
  -6
);

scene.add(
  displayRack
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

      <strong
        data-hud="balance"
      >
        $5,000.00
      </strong>
    </div>

    <div class="stat">
      <span class="stat-label">
        HASHRATE
      </span>

      <strong
        data-hud="hashrate"
      >
        0 MH/s
      </strong>
    </div>

    <div class="stat">
      <span class="stat-label">
        POWER
      </span>

      <strong
        data-hud="power"
      >
        0 W
      </strong>
    </div>
  </div>

  <div class="crosshair">
  </div>

  <div class="help">
    CLICK TO ENTER FACILITY
  </div>
`;

app.appendChild(
  hud
);

// ======================================================
// HUD ELEMENT REFERENCES
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
  hud.querySelector<HTMLDivElement>(
    ".help"
  );

const crosshair =
  hud.querySelector<HTMLDivElement>(
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
// LIVE HUD
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
// SHOP KEY
//
// B = Hardware Market
// ======================================================

window.addEventListener(
  "keydown",
  (event) => {
    if (
      event.code !==
      "KeyB"
    ) {
      return;
    }

    if (
      event.repeat
    ) {
      return;
    }

    shop.toggle();
  }
);

// ======================================================
// POINTER LOCK UI
// ======================================================

document.addEventListener(
  "pointerlockchange",
  () => {
    if (!help) {
      return;
    }

    if (
      player.isPointerLocked()
    ) {
      help.textContent =
        "WASD MOVE  •  B SHOP  •  ESC RELEASE";
    } else {
      if (
        shop.isOpen()
      ) {
        help.textContent =
          "HARDWARE MARKET";
      } else {
        help.textContent =
          "CLICK TO ENTER  •  B HARDWARE MARKET";
      }
    }
  }
);

// ======================================================
// SHOP UI VISUAL STATE
// ======================================================

window.addEventListener(
  "keydown",
  (event) => {
    if (
      event.code ===
      "KeyB"
    ) {
      setTimeout(
        () => {
          if (
            crosshair
          ) {
            crosshair.style.display =
              shop.isOpen()
                ? "none"
                : "";
          }

          if (
            help
          ) {
            help.textContent =
              shop.isOpen()
                ? "HARDWARE MARKET"
                : "CLICK TO ENTER  •  B HARDWARE MARKET";
          }
        },
        0
      );
    }
  }
);

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
// GAME CLOCK
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

  // Stop player movement while
  // interacting with shop.

  if (
    !shop.isOpen()
  ) {
    player.update(
      delta
    );
  }

  // Mining economy simulation.

  gameState.update(
    delta
  );

  renderer.render(
    scene,
    camera
  );
}

animate();
