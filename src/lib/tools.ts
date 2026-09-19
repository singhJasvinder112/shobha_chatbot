import { tool } from 'ai';
import { z } from 'zod';
import { db, daysBetween, towerLabel, TODAY } from './data';

const towerIdSchema = z
  .enum(['TWR-A', 'TWR-B', 'ALL'])
  .describe('Which tower to filter to. Use "ALL" (not a guess) when the user did not name a specific tower.');

function matchesTower<T extends { tower_id: string }>(row: T, towerId: string): boolean {
  return towerId === 'ALL' || row.tower_id === towerId;
}

function summarize<T>(rows: T[], limit = 15) {
  return { count: rows.length, sample: rows.slice(0, limit) };
}

function countBy<T>(rows: T[], key: (row: T) => string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const k = key(row);
    counts[k] = (counts[k] ?? 0) + 1;
  }
  return counts;
}

export const getProjectOverview = tool({
  description:
    'Get an overview of the project, its towers, floor counts, active modules (POD/MEP), and demand planning setup. Use this first when the user asks a general question about the project or towers.',
  inputSchema: z.object({}),
  execute: async () => ({
    today: TODAY,
    projects: db.projects,
    towers: db.towers.map(t => ({
      ...t,
      port_apartments: db.apartments.filter(a => a.tower_id === t.tower_id).length,
    })),
  }),
});

export const getPortDeliverySummary = tool({
  description:
    "Get total POD/board delivery counts (delivered vs pending) for the whole project and broken down per tower, with no filters. ALWAYS use this tool first for any question about overall/total delivery counts (e.g. 'how many pods delivered in total', 'across both towers', 'how many pending delivery') - never use queryPortDelivery with guessed filter values for these questions.",
  inputSchema: z.object({}),
  execute: async () => {
    const per_tower: Record<string, Record<string, number>> = {};
    for (const t of db.towers) {
      per_tower[t.tower_id] = countBy(
        db.portDelivery.filter(r => r.tower_id === t.tower_id),
        r => r.status,
      );
    }
    return { overall: countBy(db.portDelivery, r => r.status), per_tower };
  },
});

export const queryPortDelivery = tool({
  description:
    "Look up specific POD/board delivery records (planned, forecast and actual dates, dispatch dates, priority) filtered by tower and/or floor - use only when the user names a specific tower or floor. Do NOT use this if the user asks about a specific port type (SP/PP/MP) - use queryPortDeliveryByType for that. For overall/total counts use getPortDeliverySummary instead.",
  inputSchema: z.object({
    tower_id: towerIdSchema,
    floor_number: z.number().optional().describe('Filter by floor number. Omit for all floors.'),
    status: z
      .enum(['pending', 'delivered'])
      .optional()
      .describe('pending = not yet dispatched/delivered by factory; delivered = actual delivery recorded.'),
  }),
  execute: async ({ tower_id, floor_number, status }) => {
    const baseRows = db.portDelivery.filter(
      r => matchesTower(r, tower_id) && (!floor_number || r.floor_number === floor_number),
    );
    const rows = status ? baseRows.filter(r => r.status === status) : baseRows;
    return { count_by_status: countBy(baseRows, r => r.status), ...summarize(rows) };
  },
});

export const queryPortDeliveryByType = tool({
  description:
    "Look up POD/board delivery records filtered by port type/priority group (SP, PP or MP). Use ONLY when the user explicitly names a port type or priority group - never for general tower/floor/total questions.",
  inputSchema: z.object({
    port_type_prefix: z.enum(['SP', 'PP', 'MP']).describe('The port type/priority group the user asked about.'),
    tower_id: towerIdSchema,
    status: z.enum(['pending', 'delivered']).optional(),
  }),
  execute: async ({ port_type_prefix, tower_id, status }) => {
    const baseRows = db.portDelivery.filter(
      r => r.port_type.startsWith(port_type_prefix) && matchesTower(r, tower_id),
    );
    const rows = status ? baseRows.filter(r => r.status === status) : baseRows;
    return { count_by_status: countBy(baseRows, r => r.status), ...summarize(rows) };
  },
});

export const getInstallationSummary = tool({
  description:
    "Get total installation-status counts (installed / delivered_pending_installation / not_started) for the whole project and broken down per tower, with no filters. ALWAYS use this tool first for overall/total questions (e.g. 'how many pods yet to install in total', 'across both towers') - never use queryInstallation with guessed filter values for these questions.",
  inputSchema: z.object({}),
  execute: async () => {
    const per_tower: Record<string, Record<string, number>> = {};
    for (const t of db.towers) {
      per_tower[t.tower_id] = countBy(
        db.installation.filter(r => r.tower_id === t.tower_id),
        r => r.status,
      );
    }
    return { overall: countBy(db.installation, r => r.status), per_tower };
  },
});

export const queryInstallation = tool({
  description:
    "Look up specific POD/board installation records at site (including pods delivered but not yet installed, with lag days since delivery), filtered by tower/floor/status - use only when the user names a specific tower or floor, or wants the individual port tags. For overall/total counts use getInstallationSummary instead.",
  inputSchema: z.object({
    tower_id: towerIdSchema,
    floor_number: z.number().optional().describe('Filter by floor number. Omit for all floors.'),
    status: z
      .enum(['installed', 'delivered_pending_installation', 'not_started'])
      .optional(),
  }),
  execute: async ({ tower_id, floor_number, status }) => {
    const baseRows = db.installation.filter(
      r => matchesTower(r, tower_id) && (!floor_number || r.floor_number === floor_number),
    );
    const rows = status ? baseRows.filter(r => r.status === status) : baseRows;
    const enriched = rows.map(r => {
      const delivery = db.portDelivery.find(p => p.port_tag === r.port_tag);
      const lag_days_since_delivery =
        r.status === 'delivered_pending_installation' && delivery?.actual_delivery_date
          ? daysBetween(delivery.actual_delivery_date, TODAY)
          : null;
      return { ...r, actual_delivery_date: delivery?.actual_delivery_date ?? null, lag_days_since_delivery };
    });
    return { count_by_status: countBy(baseRows, r => r.status), ...summarize(enriched) };
  },
});

export const getMepSummary = tool({
  description:
    "Get total MEP module counts (installed vs pending) for the whole project, broken down per tower and per module type (HCM/PFM/KFM), with no filters. ALWAYS use this tool first for overall/total MEP questions - never use queryMepModules with guessed filter values for these questions.",
  inputSchema: z.object({}),
  execute: async () => {
    const per_tower: Record<string, Record<string, number>> = {};
    const per_module_type: Record<string, Record<string, number>> = {};
    for (const t of db.towers) {
      per_tower[t.tower_id] = countBy(
        db.mepModules.filter(r => r.tower_id === t.tower_id),
        r => r.status,
      );
    }
    for (const type of ['HCM', 'PFM', 'KFM']) {
      per_module_type[type] = countBy(
        db.mepModules.filter(r => r.module_type === type),
        r => r.status,
      );
    }
    return { overall: countBy(db.mepModules, r => r.status), per_tower, per_module_type };
  },
});

export const queryMepModules = tool({
  description:
    "Look up specific MEP module records (HCM = level-wise corridor module, PFM = plumbing flat module, KFM = kitchen flat module) filtered by tower and/or floor - use only when the user names a specific tower or floor. Do NOT use this if the user asks about a specific module type (HCM/PFM/KFM) - use queryMepModulesByType for that. For overall/total counts use getMepSummary instead.",
  inputSchema: z.object({
    tower_id: towerIdSchema,
    status: z.enum(['installed', 'pending']).optional(),
    floor_number: z.number().optional().describe('Filter by floor number. Omit for all floors.'),
  }),
  execute: async ({ tower_id, status, floor_number }) => {
    const baseRows = db.mepModules.filter(
      r => matchesTower(r, tower_id) && (!floor_number || r.floor_number === floor_number),
    );
    const rows = status ? baseRows.filter(r => r.status === status) : baseRows;
    return { count_by_status: countBy(baseRows, r => r.status), ...summarize(rows) };
  },
});

export const queryMepModulesByType = tool({
  description:
    'Look up MEP module records filtered by module type (HCM = level-wise corridor module, PFM = plumbing flat module, KFM = kitchen flat module). Use ONLY when the user explicitly names a module type - never for general tower/floor/total questions.',
  inputSchema: z.object({
    module_type: z.enum(['HCM', 'PFM', 'KFM']).describe('The module type the user asked about.'),
    tower_id: towerIdSchema,
    status: z.enum(['installed', 'pending']).optional(),
  }),
  execute: async ({ module_type, tower_id, status }) => {
    const baseRows = db.mepModules.filter(r => r.module_type === module_type && matchesTower(r, tower_id));
    const rows = status ? baseRows.filter(r => r.status === status) : baseRows;
    return { count_by_status: countBy(baseRows, r => r.status), ...summarize(rows) };
  },
});

export const queryTracker = tool({
  description:
    "Query and explain the structural tracker (slab casting) or floor clearance tracker for a tower/floor, including baseline, forecast and actual dates and how the finish date was calculated. Use when the user asks why a date shows a certain value or how it was calculated.",
  inputSchema: z.object({
    tracker: z.enum(['structural', 'floor_clearance']),
    tower_id: towerIdSchema,
    floor_number: z.number().optional().describe('Filter by floor number. Omit for all floors.'),
  }),
  execute: async ({ tracker, tower_id, floor_number }) => {
    const source = tracker === 'structural' ? db.structuralTracker : db.floorClearanceTracker;
    const rows = source.filter(r => matchesTower(r, tower_id) && (!floor_number || r.floor_number === floor_number));
    const formulaNote =
      tracker === 'structural'
        ? 'Formula: a floor’s start date = previous floor’s finish date + 1 day (holidays skipped); finish date = start date + configured floor duration (from the tower’s port configuration), minus one day. Once an actual finish date is recorded it overrides the forecast for cascading to the next floor.'
        : 'Formula: floor clearance for the first group starts on the structural tracker’s finish date for that floor and runs for the tower’s "first group duration"; subsequent floors start after the configured lag and run for the "subsequent group duration" (see floor_clearance_config).';
    return {
      tower: tower_id !== 'ALL' ? towerLabel(tower_id) : undefined,
      formula: formulaNote,
      rows: summarize(rows),
    };
  },
});

export const tools = {
  getProjectOverview,
  getPortDeliverySummary,
  queryPortDelivery,
  queryPortDeliveryByType,
  getInstallationSummary,
  queryInstallation,
  getMepSummary,
  queryMepModules,
  queryMepModulesByType,
  queryTracker,
};
