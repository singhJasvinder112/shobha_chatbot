import projects from '../../data/projects.json';
import towers from '../../data/towers.json';
import floors from '../../data/floors.json';
import apartments from '../../data/apartments.json';
import platforms from '../../data/platforms.json';
import platformApartmentMapping from '../../data/platform_apartment_mapping.json';
import floorClearanceConfig from '../../data/floor_clearance_config.json';
import structuralTracker from '../../data/structural_tracker.json';
import floorClearanceTracker from '../../data/floor_clearance_tracker.json';
import factoryStageConfig from '../../data/factory_stage_config.json';
import portDelivery from '../../data/port_delivery.json';
import installation from '../../data/installation.json';
import factoryProduction from '../../data/factory_production.json';
import mepModules from '../../data/mep_modules.json';
import holidays from '../../data/holidays.json';

export const db = {
  projects,
  towers,
  floors,
  apartments,
  platforms,
  platformApartmentMapping,
  floorClearanceConfig,
  structuralTracker,
  floorClearanceTracker,
  factoryStageConfig,
  portDelivery,
  installation,
  factoryProduction,
  mepModules,
  holidays,
};

export type PortDelivery = (typeof portDelivery)[number];
export type Installation = (typeof installation)[number];
export type MepModule = (typeof mepModules)[number];
export type TrackerRow = (typeof structuralTracker)[number];

export function towerLabel(towerId: string): string {
  return db.towers.find(t => t.tower_id === towerId)?.tower_name ?? towerId;
}

export function daysBetween(a: string, b: string): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / msPerDay);
}

export const TODAY = '2026-09-19';
