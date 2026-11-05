// TBD: 기획 미확정. 아래 값은 구현·계측을 위한 임시 기본값이다.
export const TUNABLES = {
  clock: { fixedHz: 60, maxStepsPerFrame: 8 }, // TBD: 기획 미확정
  focus: { pauseOnBlur: true, pauseWhenHidden: true }, // TBD: 기획 미확정
  movement: {
    initialStamina: 100, // TBD: 기획 미확정
    walkSpeed: 6, // TBD: 기획 미확정
    sprintSpeed: 9, // TBD: 기획 미확정
    sprintStaminaPerSecond: 0, // TBD: 기획 미확정
    jumpStaminaCost: 0, // TBD: 기획 미확정
    staminaRegenDelaySeconds: 0, // TBD: 기획 미확정
    gravity: 24, // TBD: 기획 미확정
    jumpSpeed: 8, // TBD: 기획 미확정
    secondJumpSpeed: 8, // TBD: 기획 미확정
    dashSpeed: 20, // TBD: 기획 미확정
    dashSeconds: 0.18, // TBD: 기획 미확정
    dashCooldownSeconds: 0.3, // TBD: 기획 미확정
    dashInAir: true, // TBD: 기획 미확정
    dashDirection: 'movementOrCameraForward', // TBD: 기획 미확정
    slideSpeed: 12, // TBD: 기획 미확정
    slideSeconds: 0.65, // TBD: 기획 미확정
    slideCooldownSeconds: 0.3, // TBD: 기획 미확정
    slideGroundOnly: true, // TBD: 기획 미확정
    radius: 0.35, // TBD: 기획 미확정
    standingHeight: 1.8, // TBD: 기획 미확정
    slidingHeight: 0.9, // TBD: 기획 미확정
    eyeHeight: 1.65, // TBD: 기획 미확정
    stepHeight: 0.3, // TBD: 기획 미확정
  },
  keys: {
    forward: ['KeyW'], // TBD: 기획 미확정
    backward: ['KeyS'], // TBD: 기획 미확정
    left: ['KeyA'], // TBD: 기획 미확정
    right: ['KeyD'], // TBD: 기획 미확정
    sprint: ['ShiftLeft', 'ShiftRight'], // TBD: 기획 미확정
    jump: ['Space'], // TBD: 기획 미확정
    dash: ['KeyF'], // TBD: 기획 미확정
    slide: ['KeyC', 'ControlLeft', 'ControlRight'], // TBD: 기획 미확정
    interact: ['KeyE'], // TBD: 기획 미확정
    extractor: ['KeyX'], // TBD: 기획 미확정
    reload: ['KeyR'], // TBD: 기획 미확정
    inventory: ['Tab'], // TBD: 기획 미확정
    weaponSlots: ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7'], // TBD: 기획 미확정
    pauseKey: 'Escape', // TBD: 기획 미확정
    reservedKeys: ['Escape', 'KeyH'], // TBD: 기획 미확정
  },
  camera: { fovDegrees: 90, sensitivity: 0.002, pitchLimitDegrees: 85 }, // TBD: 기획 미확정
  presentation: {
    renderScale: 1, maxPixelRatio: 1.5, shadows: 'medium', // TBD: 기획 미확정
    effectsVolume: 0.7, musicVolume: 0.25, screenShake: 0.5, // TBD: 기획 미확정
    showFps: false, subtitles: true, tutorial: true, // TBD: 기획 미확정
    palette: { background: 0x170d16, danger: 0xff513b, caffeine: 0xffa22a, holy: 0x9fe5ff }, // TBD: 기획 미확정
  },
  weapons: {
    cutter: { damage: 35, interval: 0.35, reach: 2 }, // TBD: 기획 미확정
    stapler: { damage: 18, interval: 0.22, magazine: 12, reserve: 72, reload: 1.15, range: 60 }, // TBD: 기획 미확정
    shuriken: { damage: 32, interval: 0.45, speed: 28, lifetime: 4, initialAmmo: 0 }, // TBD: 기획 미확정
    sharpener: { damage: 6, projectilesPerShot: 3, spreadDegrees: 5, interval: 0.12, magazine: 40, reserve: 160, reload: 1.4, speed: 40, range: 35 }, // TBD: 기획 미확정
    powerBank: { damage: 100, radius: 4, chargeSeconds: 0.6, fuseSeconds: 1.5, speed: 16, interval: 1, initialAmmo: 3 }, // TBD: 기획 미확정
    doubleBarrel: { damage: 8, projectilesPerShot: 2, interval: 0.09, magazine: 60, reserve: 180, reload: 1.8, speed: 60, range: 55 }, // TBD: 기획 미확정
    sniper: { damage: 100, interval: 1.1, magazine: 5, reserve: 20, reload: 1.9, range: 120 }, // TBD: 기획 미확정
    unarmed: { interval: 0.2, reach: 1.6 }, // TBD: 기획 미확정
  },
  enemies: {
    melee: { hp: 80, damage: 8, speed: 2.8, attackInterval: 1, attackRange: 1.6 }, // TBD: 기획 미확정
    ranged: { hp: 60, damage: 6, speed: 2.4, attackInterval: 1.4, attackRange: 18, projectileSpeed: 10 }, // TBD: 기획 미확정
    fast: { hp: 40, damage: 5, speed: 5.2, attackInterval: 0.6, attackRange: 1.4 }, // TBD: 기획 미확정
    armored: { hp: 200, damage: 16, speed: 1.8, attackInterval: 1.8, attackRange: 1.8 }, // TBD: 기획 미확정
  },
  spawning: { globalCap: 18, areaCap: 6, intervalSeconds: 10, batchSize: 1, minimumPlayerDistance: 8 }, // TBD: 기획 미확정
  ai: { nearbyHz: 10, distantHz: 2, detectionRange: 28, navigationCellSize: 1 }, // TBD: 기획 미확정
  drops: {
    essencePerKill: 300, heartsPerKill: 1, // TBD: 기획 미확정
    healingProbabilities: { coffeeCandy: 0.1, espresso: 0.06, latte: 0.04, coffeeVodka: 0.02 }, // TBD: 기획 미확정
    craftingProbabilities: { cutterBlade: 0.4, mechanicalPencil: 0.15, leadTube: 0.12 }, // TBD: 기획 미확정
    ammoBundle: { staples: 24, shavings: 40, pencilLeads: 40, sniperStaples: 2 }, // TBD: 기획 미확정
    ammoProbability: 0.5, ammoSelection: 'equippedFirstThenOwned', // TBD: 기획 미확정
    pickupRadius: 1.4, ordinaryLifetimeSeconds: 180, // TBD: 기획 미확정
  },
  inventory: { stackLimit: 9999, slotLimit: null }, // TBD: 기획 미확정
  extractor: {
    secondsPerUse: 0.8, maxEssenceBatches: 12, maxHeartBatches: 1, maxBrainBatches: 1, // TBD: 기획 미확정
    movementAllowed: true, attacksAllowed: false, initialMaterial: 'essence', // TBD: 기획 미확정
  },
  healing: { useSeconds: 0.25, cooldownSeconds: 0.5, priority: 'smallestCoveringToCapElseLargest' }, // TBD: 기획 미확정
  shurikenRecipe: { cutterBlade: 3, essence: 25, outputAmmo: 3 }, // TBD: 기획 미확정
  holyZone: {
    firstHpPolicy: 'atLeastBasePreserveOvercharge', // TBD: 기획 미확정
    firstCaffeinePolicy: 'atLeastBasePreserveOvercharge', // TBD: 기획 미확정
    enemiesMayEnter: false, hostileProjectilesMayEnter: false, // TBD: 기획 미확정
    manualProgressSaveAllowed: false, // TBD: 기획 미확정
  },
  progress: {
    respawn: 'checkpointSnapshotWithAtLeastBaseResources', // TBD: 기획 미확정
    pureSoulHealingAllowed: true, // TBD: 기획 미확정
    endedSlotPolicy: 'retainUntilExplicitNewRun', // TBD: 기획 미확정
    completedSlotPolicy: 'recordOnlyNewRunFromMenu', // TBD: 기획 미확정
  },
  difficulty: {
    baby: { enemyHp: 0.5, enemyDamage: 0.5, materialDrop: 1.5 }, // TBD: 기획 미확정
    easy: { enemyHp: 0.75, enemyDamage: 0.75, materialDrop: 1.25 }, // TBD: 기획 미확정
    normal: { enemyHp: 1, enemyDamage: 1, materialDrop: 1 }, // TBD: 기획 미확정
    hard: { enemyHp: 1.3, enemyDamage: 1.4, materialDrop: 1 }, // TBD: 기획 미확정
    hellInHell: { enemyHp: 1, enemyDamage: 1, materialDrop: 1 }, // TBD: 기획 미확정
    pureSoul: { enemyHp: 1, enemyDamage: 1, materialDrop: 1 }, // TBD: 기획 미확정
  },
  stages: {
    office: { areas: 3, areaWidth: 16, areaDepth: 14, corridorLength: 8, holyZones: 1, targetMinutes: 6 }, // TBD: 기획 미확정
    demonCity: { areas: 4, areaWidth: 36, areaDepth: 30, corridorLength: 12, holyZones: 2, targetMinutes: 12 }, // TBD: 기획 미확정
    subway: { areas: 3, areaWidth: 30, areaDepth: 18, corridorLength: 14, holyZones: 2, targetMinutes: 12 }, // TBD: 기획 미확정
    firstMaterialEncounterMaxTravelSeconds: 6, // TBD: 기획 미확정
  },
  boss: {
    hp: 1600, phases: 2, secondPhaseRatio: 0.5, arenaWidth: 48, arenaDepth: 32, brainDropCount: 1, // TBD: 기획 미확정
    meleeTargetHeight: 1.2, recoverySeconds: 2, // TBD: 기획 미확정
    railSweep: { damage: 20, warning: 1.2, cooldown: 8 }, // TBD: 기획 미확정
    paperVolley: { damage: 8, warning: 0.8, cooldown: 5, projectiles: 5, speed: 12 }, // TBD: 기획 미확정
    platformSlam: { damage: 25, warning: 1.4, cooldown: 10, radius: 3 }, // TBD: 기획 미확정
    reinforcements: { intervalSeconds: 18, count: 1, cap: 4 }, // TBD: 기획 미확정
  },
  ending: { vistaSeconds: 5 }, // TBD: 기획 미확정
  pools: { projectiles: 256, drops: 256, particles: 512, corpseSeconds: 2 }, // TBD: 기획 미확정
  debug: { caffeineWindowSeconds: 60, caffeineWarning: 25 }, // TBD: 기획 미확정
  save: { retrySeconds: [2, 5, 15, 30, 60], maxPlayerNameLength: 32, maxPlayTimeSeconds: 31536000 }, // TBD: 기획 미확정
  audio: { shotHz: 440, hitHz: 110, pickupHz: 660, warningHz: 1760, musicRootHz: 55 }, // TBD: 기획 미확정
  settings: { sensitivityMin: 0.0002, sensitivityMax: 0.01, scaleOptions: [1, 0.75, 0.5], shadowSizes: { off: 0, low: 512, medium: 1024 } }, // TBD: 기획 미확정
  prototype: {
    cameraNear: 0.05, cameraFar: 200, sunColor: 0xffddae, skyColor: 0xffdbbb, groundColor: 0x1d0d23, gridOffset: 0.002, bladeRoughness: 0.4, // TBD: 기획 미확정
    uiToastSeconds: 2.4, menuDriftSpeed: 0.08, menuDriftDistance: 1.5, // TBD: 기획 미확정
    spawn: [0, 0, 20], menuCamera: [22, 16, 28], menuTarget: [0, 1, -3], // TBD: 기획 미확정
    fogNear: 22, fogFar: 85, hemisphereIntensity: 2.2, sunlightIntensity: 3, // TBD: 기획 미확정
    sunPosition: [14, 30, 12], shadowExtent: 35, // TBD: 기획 미확정
    colors: { floor: 0x332b2c, wall: 0x554449, concrete: 0x726363, metal: 0x302b32, amber: 0xff8b23, paper: 0xc5b69f }, // TBD: 기획 미확정
    solids: [
      { center: [0,-0.5,0], size: [52,1,60], material: 'floor' }, // TBD: 기획 미확정
      { center: [-26,3,0], size: [1,6,60], material: 'wall' }, // TBD: 기획 미확정
      { center: [26,3,0], size: [1,6,60], material: 'wall' }, // TBD: 기획 미확정
      { center: [0,3,-30], size: [52,6,1], material: 'wall' }, // TBD: 기획 미확정
      { center: [0,3,30], size: [52,6,1], material: 'wall' }, // TBD: 기획 미확정
      { center: [-9,0.8,5], size: [6,1.6,3], material: 'metal' }, // TBD: 기획 미확정
      { center: [-9,0.8,-5], size: [6,1.6,3], material: 'metal' }, // TBD: 기획 미확정
      { center: [-18,1.5,-15], size: [3,3,10], material: 'concrete' }, // TBD: 기획 미확정
      { center: [18,1.5,-15], size: [3,3,10], material: 'concrete' }, // TBD: 기획 미확정
      { center: [0,0.5,-15], size: [10,1,6], material: 'concrete' }, // TBD: 기획 미확정
      { center: [0,0.125,-10], size: [6,0.25,1], material: 'concrete' }, // TBD: 기획 미확정
      { center: [0,0.25,-11], size: [6,0.5,1], material: 'concrete' }, // TBD: 기획 미확정
      { center: [0,0.375,-12], size: [6,0.75,1], material: 'concrete' }, // TBD: 기획 미확정
      { center: [7,1.1,5], size: [5,0.2,8], material: 'metal' }, // TBD: 기획 미확정
      { center: [4.5,0.55,5], size: [0.25,1.1,8], material: 'metal' }, // TBD: 기획 미확정
      { center: [9.5,0.55,5], size: [0.25,1.1,8], material: 'metal' }, // TBD: 기획 미확정
    ],
    grid: { extent: 50, divisions: 25, color: 0x766051 }, // TBD: 기획 미확정
    sign: { position: [0,6.8,-24], width: 19, height: 5.5, textureWidth: 1024, textureHeight: 320 }, // TBD: 기획 미확정
    pillars: { xs: [-20,-12,12,20], zs: [-24,16], radius: 0.5, height: 8 }, // TBD: 기획 미확정
    lamps: { xs: [-25,25], zs: [-20,-5,10,25], height: 4.5, width: 0.14, depth: 2.4 }, // TBD: 기획 미확정
    deskProps: { xs: [-10,-8], zs: [-5,5], height: 1.6, monitor: [1.3,0.8,0.15], screenColor: 0xf37732 }, // TBD: 기획 미확정
    cutterModel: { handle: [0.08,0.3,0.055], blade: [0.065,0.23,0.012], position: [0.32,-0.29,-0.6], rotation: [-0.5,0,-0.3], bobAmplitude: 0.007, bobFrequency: 8 }, // TBD: 기획 미확정
  },
} as const;
