import { tool } from 'ai';
import { z } from 'zod';
import { db, daysBetween, holidaysBetween, towerLabel, TODAY } from './data';

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

function scheduleBreakdown<T extends { tower_id: string }>(
  rows: T[],
  towerId: string,
  asOfDate: string,
  getPlannedDate: (row: T) => string | null,
  isComplete: (row: T) => boolean,
) {
  const scoped = rows.filter(r => matchesTower(r, towerId));
  const due = scoped.filter(r => {
    const planned = getPlannedDate(r);
    return planned !== null && planned <= asOfDate;
  });
  const overdueRows = due.filter(r => !isComplete(r));
  return {
    total: scoped.length,
    due_by_date: due.length,
    completed_by_date: due.length - overdueRows.length,
    overdue: overdueRows.length,
    not_due_yet: scoped.length - due.length,
    overdue_sample: overdueRows.slice(0, 15),
  };
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

export const getPodStatus = tool({
  description:
    "Get the FULL end-to-end status of one specific pod by its exact port tag (e.g. 'PT-A-0017') in a single call: factory delivery status/dates AND site installation status/dates together. ALWAYS use this (not queryPortDelivery/queryInstallation) when the user asks about the status of one specific pod/port tag - it is the single-call answer, no need to guess a status filter or call multiple tools.",
  inputSchema: z.object({
    port_tag: z.string().describe('The exact port tag, e.g. "PT-A-0017".'),
  }),
  execute: async ({ port_tag }) => {
    const delivery = db.portDelivery.find(r => r.port_tag === port_tag);
    const installation = db.installation.find(r => r.port_tag === port_tag);
    if (!delivery) return { found: false, message: `No pod found with port tag "${port_tag}".` };

    const lag_days_since_delivery =
      installation?.status === 'delivered_pending_installation' && delivery.actual_delivery_date
        ? daysBetween(delivery.actual_delivery_date, TODAY)
        : null;

    return {
      found: true,
      port_tag,
      tower: towerLabel(delivery.tower_id),
      floor_number: delivery.floor_number,
      port_type: delivery.port_type,
      delivery: {
        status: delivery.status,
        planned_delivery_date: delivery.planned_delivery_date,
        dispatch_date: delivery.dispatch_date,
        actual_delivery_date: delivery.actual_delivery_date,
      },
      installation: installation
        ? {
            status: installation.status,
            planned_install_start_date: installation.planned_install_start_date,
            planned_install_finish_date: installation.planned_install_finish_date,
            actual_install_start_date: installation.actual_install_start_date,
            actual_install_finish_date: installation.actual_install_finish_date,
            lag_days_since_delivery,
          }
        : null,
    };
  },
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
    "Look up specific POD/board delivery records (planned, forecast and actual dates, dispatch dates, priority) filtered by tower, floor, and/or an exact port tag - use only when the user names a specific tower, floor, or quotes a specific port tag (e.g. 'PT-A-0017'). Do NOT use this if the user asks about a specific port type (SP/PP/MP) - use queryPortDeliveryByType for that. For overall/total counts use getPortDeliverySummary instead.",
  inputSchema: z.object({
    tower_id: towerIdSchema,
    floor_number: z.number().optional().describe('Filter by floor number. Omit for all floors.'),
    port_tag: z.string().optional().describe('Exact port tag to look up one specific pod, e.g. "PT-A-0017". Omit unless the user quotes one. When set, also omit `status` (leave it unset) so this returns that record in one call regardless of its status - do not call this tool repeatedly trying different status values.'),
    status: z
      .enum(['pending', 'delivered'])
      .optional()
      .describe('pending = not yet dispatched/delivered by factory; delivered = actual delivery recorded.'),
  }),
  execute: async ({ tower_id, floor_number, port_tag, status }) => {
    const baseRows = db.portDelivery.filter(
      r =>
        matchesTower(r, tower_id) &&
        (!floor_number || r.floor_number === floor_number) &&
        (!port_tag || r.port_tag === port_tag),
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
    "Look up specific POD/board installation records at site (including pods delivered but not yet installed, with lag days since delivery), filtered by tower, floor, and/or an exact port tag - use only when the user names a specific tower, floor, or quotes a specific port tag. For overall/total counts use getInstallationSummary instead.",
  inputSchema: z.object({
    tower_id: towerIdSchema,
    floor_number: z.number().optional().describe('Filter by floor number. Omit for all floors.'),
    port_tag: z.string().optional().describe('Exact port tag to look up one specific pod, e.g. "PT-A-0017". Omit unless the user quotes one. When set, also omit `status` (leave it unset) so this returns that record in one call regardless of its status - do not call this tool repeatedly trying different status values.'),
    status: z
      .enum(['installed', 'delivered_pending_installation', 'not_started'])
      .optional(),
  }),
  execute: async ({ tower_id, floor_number, port_tag, status }) => {
    const baseRows = db.installation.filter(
      r =>
        matchesTower(r, tower_id) &&
        (!floor_number || r.floor_number === floor_number) &&
        (!port_tag || r.port_tag === port_tag),
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
    "Look up specific MEP module records (HCM = level-wise corridor module, PFM = plumbing flat module, KFM = kitchen flat module) filtered by tower, floor, and/or an exact module tag - use only when the user names a specific tower, floor, or quotes a specific module tag. Do NOT use this if the user asks about a specific module type (HCM/PFM/KFM) - use queryMepModulesByType for that. For overall/total counts use getMepSummary instead.",
  inputSchema: z.object({
    tower_id: towerIdSchema,
    status: z.enum(['installed', 'pending']).optional(),
    floor_number: z.number().optional().describe('Filter by floor number. Omit for all floors.'),
    module_tag: z.string().optional().describe('Exact module tag to look up one specific module, e.g. "MT-PFM-0012". Omit unless the user quotes one. When set, also omit `status` (leave it unset) so this returns that record in one call regardless of its status - do not call this tool repeatedly trying different status values.'),
  }),
  execute: async ({ tower_id, status, floor_number, module_tag }) => {
    const baseRows = db.mepModules.filter(
      r =>
        matchesTower(r, tower_id) &&
        (!floor_number || r.floor_number === floor_number) &&
        (!module_tag || r.module_tag === module_tag),
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
    "Query and explain the structural tracker (slab casting) or floor clearance tracker for a tower/floor, including baseline, forecast and actual dates, the ACTUAL configured numeric values (durations/lags) driving the calculation, and how the finish date was calculated. Use when the user asks why a date shows a certain value or how it was calculated - always cite the real numbers from `config`, never describe the formula only in the abstract.",
  inputSchema: z.object({
    tracker: z.enum(['structural', 'floor_clearance']),
    tower_id: towerIdSchema,
    floor_number: z.number().optional().describe('Filter by floor number. Omit for all floors.'),
  }),
  execute: async ({ tracker, tower_id, floor_number }) => {
    const source = tracker === 'structural' ? db.structuralTracker : db.floorClearanceTracker;
    const rows = source.filter(r => matchesTower(r, tower_id) && (!floor_number || r.floor_number === floor_number));
    const enrichedRows = rows.map(r => {
      const start = r.actual_start_date ?? r.forecast_start_date ?? r.baseline_start_date;
      // holidays_skipped explains start -> baseline_finish_date only (what the formula itself predicts).
      // Any further gap between baseline_finish_date and actual_finish_date is a SEPARATE real-world
      // slip, unrelated to holidays - keeping these two effects apart avoids blaming a holiday for a delay.
      const slipDays =
        r.actual_finish_date && r.actual_finish_date !== r.baseline_finish_date
          ? daysBetween(r.baseline_finish_date, r.actual_finish_date)
          : 0;
      return {
        ...r,
        holidays_skipped: holidaysBetween(start, r.baseline_finish_date),
        actual_vs_baseline_slip_days: slipDays,
      };
    });

    const holidayNote =
      'IMPORTANT - two SEPARATE effects, do not merge them: (1) `holidays_skipped` lists calendar days (Sundays/public holidays) between the start date and baseline_finish_date - these explain why baseline_finish_date itself lands later than naive start+duration arithmetic; name them when non-empty (e.g. "July 26 is a Sunday, so it’s skipped, landing on July 31"). (2) `actual_vs_baseline_slip_days`, when non-zero, is a REAL-WORLD DELAY recorded on site/factory - it has NOTHING to do with holidays. If both are present for a row, explain them as two separate steps: first the holiday-adjusted baseline, then the additional real-world slip to reach the actual date. Never attribute the baseline-to-actual gap to a holiday.';

    if (tracker === 'structural') {
      const config = db.towers
        .filter(t => matchesTower(t, tower_id))
        .map(t => ({
          tower_id: t.tower_id,
          floor_duration_days: t.floor_duration_days,
          // Precomputed so you never have to subtract 1 yourself: the number of WORKING
          // days actually added to the start date to reach the finish date.
          additional_working_days_to_add: t.floor_duration_days - 1,
        }));
      return {
        tower: tower_id !== 'ALL' ? towerLabel(tower_id) : undefined,
        formula:
          'A floor’s start date = previous floor’s finish date + 1 day. Finish date = start date + config.additional_working_days_to_add WORKING days (skipping any holidays_skipped dates listed per row below - do NOT also subtract 1 yourself, additional_working_days_to_add is already the exact number of days to add). Once an actual finish date is recorded it overrides the forecast for cascading to the next floor. Always plug in the real numbers from `config` and the real dates from `rows` when explaining a specific floor. ' +
          holidayNote,
        config,
        rows: summarize(enrichedRows),
      };
    }

    const config = db.floorClearanceConfig.filter(c => matchesTower(c, tower_id)).map(c => ({
      ...c,
      // Precomputed so you never have to subtract 1 yourself.
      first_group_additional_working_days_to_add: c.first_group_duration_days - 1,
      subsequent_group_additional_working_days_to_add: c.subsequent_group_duration_days - 1,
    }));
    return {
      tower: tower_id !== 'ALL' ? towerLabel(tower_id) : undefined,
      formula:
        'The first floor/group’s clearance start date = the structural tracker’s finish date for that floor; its finish date = start + config.first_group_additional_working_days_to_add WORKING days. Every subsequent floor/group starts config.lag_between_groups_days after the previous group’s clearance finish date, and its finish date = that start + config.subsequent_group_additional_working_days_to_add WORKING days. Do NOT also subtract 1 yourself - the additional_working_days_to_add fields are already the exact number of days to add. Always plug in the real numbers from `config` and the real dates from `rows` when explaining a specific floor - do not describe the formula only in the abstract. ' +
        holidayNote,
      config,
      rows: summarize(enrichedRows),
    };
  },
});

export const getScheduleStatus = tool({
  description:
    'Compare PLANNED dates against ACTUAL completion for any milestone, as of a given date (defaults to today). Use this for any "how many must/should be finished by [date]", "how many are due by today", "how many are behind schedule / overdue / on track", or "how many were supposed to be done by now" question - for ANY milestone (pod delivery, pod installation, slab casting, floor clearance, or MEP installation). Always use this instead of just reporting a raw delivered/installed count when the user asks about a deadline, due date, or schedule adherence.',
  inputSchema: z.object({
    milestone: z
      .enum(['port_delivery', 'installation', 'structural', 'floor_clearance', 'mep'])
      .describe(
        'port_delivery = factory dispatches/delivers the pod to site. installation = the pod is physically installed on site (the final step of a pod’s lifecycle - default to this when the user just says "finished"/"done"/"completed" about pods without specifying which step). structural = slab casting. floor_clearance = floor clearance tracker. mep = HCM/PFM/KFM module installation.',
      ),
    tower_id: towerIdSchema,
    as_of_date: z
      .string()
      .optional()
      .describe(`Date in YYYY-MM-DD format to compare against. Omit to use today (${TODAY}).`),
  }),
  execute: async ({ milestone, tower_id, as_of_date }) => {
    const asOf = as_of_date ?? TODAY;
    const base = { as_of_date: asOf, tower: tower_id !== 'ALL' ? towerLabel(tower_id) : 'All towers' };

    switch (milestone) {
      case 'port_delivery':
        return {
          ...base,
          milestone_label: 'POD/board delivered from factory to site',
          ...scheduleBreakdown(db.portDelivery, tower_id, asOf, r => r.planned_delivery_date, r => r.status === 'delivered'),
        };
      case 'installation':
        return {
          ...base,
          milestone_label: 'POD/board installed on site (final lifecycle step)',
          ...scheduleBreakdown(
            db.installation,
            tower_id,
            asOf,
            r => r.planned_install_finish_date,
            r => r.status === 'installed',
          ),
        };
      case 'structural':
        return {
          ...base,
          milestone_label: 'slab casting (structural tracker)',
          ...scheduleBreakdown(db.structuralTracker, tower_id, asOf, r => r.baseline_finish_date, r => r.status === 'actual'),
        };
      case 'floor_clearance':
        return {
          ...base,
          milestone_label: 'floor clearance',
          ...scheduleBreakdown(db.floorClearanceTracker, tower_id, asOf, r => r.baseline_finish_date, r => r.status === 'actual'),
        };
      case 'mep':
        return {
          ...base,
          milestone_label: 'MEP module installation (HCM/PFM/KFM)',
          ...scheduleBreakdown(
            db.mepModules,
            tower_id,
            asOf,
            r => r.site_requirement_planned_finish_date,
            r => r.status === 'installed',
          ),
        };
    }
  },
});

export const tools = {
  getProjectOverview,
  getPodStatus,
  getPortDeliverySummary,
  queryPortDelivery,
  queryPortDeliveryByType,
  getInstallationSummary,
  queryInstallation,
  getMepSummary,
  queryMepModules,
  queryMepModulesByType,
  queryTracker,
  getScheduleStatus,
};
