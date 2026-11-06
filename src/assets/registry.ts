import { createOffice } from './office';
import { createCutter } from './procedural';

export const assets = { arena:createOffice, cutter:createCutter } as const;
