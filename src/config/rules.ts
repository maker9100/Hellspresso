// SPEC 확정 규칙. 밸런스 조정용 tunables와 분리한다.
export const RULES = {
  resources: {
    hpBase: 100,
    hpMax: 150,
    caffeineBase: 100,
    caffeineMax: 300,
    caffeineDrainPerSecond: 2,
    staminaMax: 100,
    staminaRegenPerSecond: 1,
    dashStaminaCost: 10,
    slideStaminaCost: 15,
  },
  maxJumps: 2,
  extraction: {
    essence: { input: 25, caffeine: 5 },
    heart: { input: 1, caffeine: 20 },
    brain: { input: 1, caffeine: 250 },
  },
  healing: {
    coffeeCandy: 10,
    espresso: 20,
    latte: 30,
    coffeeVodka: 50,
  },
  doubleBarrelRecipe: {
    mechanicalPencil: 2,
    leadTube: 1,
    heart: 3,
  },
  pureSoul: {
    unarmedDamage: 1,
    weaponsAllowed: false,
    resurrectionAllowed: false,
    extractorAllowed: true,
  },
  hellInHellResurrectionAllowed: false,
  quickHealKey: 'KeyH',
  saveSlotIds: ['1', '2', '3'],
  playableStages: ['office', 'demonCity', 'subway'],
  difficulties: ['baby', 'easy', 'normal', 'hard', 'hellInHell', 'pureSoul'],
  endingLines: [
    'HELLSPRESSO — DEMO COMPLETE',
    'THANK YOU FOR PLAYING',
  ],
} as const;
