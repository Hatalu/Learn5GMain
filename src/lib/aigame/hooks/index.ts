/** โค้ดเกมแต่ละเกม (ฝังในไฟล์เกม HTML ต่อจาก ENGINE + ชุด 3D) */
import { BOWL } from './bowl';
import { BRIDGE } from './bridge';
import { FISH } from './fish';
import { PLANE } from './plane';
import { PLINKO } from './plinko';
import { TILT } from './tilt';
import { WORM } from './worm';
import { FROG } from './frog';
import { HOOP } from './hoop';
import { ROLL } from './roll';
import { RUNNER } from './runner';
import { SPACE } from './space';
import { STACK } from './stack';
import { TRUCK } from './truck';

export const HOOKS: Record<string, string> = {
  runner: RUNNER,
  space: SPACE,
  roll: ROLL,
  stack: STACK,
  bowl: BOWL,
  frog: FROG,
  hoop: HOOP,
  truck: TRUCK,
  bridge: BRIDGE,
  plinko: PLINKO,
  fish: FISH,
  plane: PLANE,
  worm: WORM,
  tilt: TILT,
};
