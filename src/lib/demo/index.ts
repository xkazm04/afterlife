// Demo-mode data source. Every screen reads the same illustrative fixture (data/belay-demo.json, a copy that
// lives inside src so the app has no dependency outside it). Accessors are typed; screens never touch the JSON.
import raw from './data/belay-demo.json';
import { DEMO_CYCLES } from './cycles';
import type { DemoData, FleetProject, Task } from './types';

export type * from './types';
export type * from './cycleTypes';
export { DEMO_CYCLES } from './cycles';

// The one place the JSON meets the types. demo.test.ts validates the shape (tier keys, ids, counts).
export const DEMO: DemoData = raw as unknown as DemoData;

/** The project the demo goes deep on (tracks, ledger, needs-you items all belong to it). */
export const LEDGERLINE_ID = 'ledgerline';

export const getFleet = () => DEMO.fleet;
export const getProjects = (): readonly FleetProject[] => DEMO.fleet.projects;
export const getProject = (id: string): FleetProject | undefined => DEMO.fleet.projects.find((p) => p.id === id);
export const getGroups = () => DEMO.fleet.groups;
export const getClassIds = () => DEMO.fleet.classes;
export const getPortfolio = () => DEMO.portfolio;
export const getStages = () => DEMO.stages;
export const getTiers = () => DEMO.tiers;
export const getTracks = () => DEMO.tracks;
export const getActionClasses = () => DEMO.actionClasses;
export const getMaturity = () => DEMO.maturity;
export const getLoop = () => DEMO.loop;
export const getTasks = (): readonly Task[] => DEMO.tasks;
export const getTask = (id: string): Task | undefined => DEMO.tasks.find((t) => t.id === id);
export const getNeedsYou = () => DEMO.needsYou;
export const getSetup = () => DEMO.setup;
export const getEvents = () => DEMO.events;
export const getCockpit = () => DEMO.cockpit;
export const getProduct = () => DEMO.product;
/** The deep project's closed cycles (a TS fixture beside the JSON: see cycles.ts). */
export const getCycles = () => DEMO_CYCLES;

/** Decisions waiting for the operator: the number on the Needs you sidebar badge. */
export const getNeedsYouCount = (): number => DEMO.needsYou.length;
