import { createArena, createCutter } from './procedural';

// GLB/오디오 에셋을 도입할 때 호출부 대신 이 팩터리 경계를 교체한다.
export const assets = { arena:createArena, cutter:createCutter } as const;
