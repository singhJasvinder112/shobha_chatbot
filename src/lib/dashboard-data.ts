import { db } from './data';

export type TowerFilter = 'ALL' | 'TWR-A' | 'TWR-B';

export type DashboardStats = {
  totalPods: number;
  planned: number;
  forecast: number;
  delivered: number;
  installed: number;
  pending: number;
  percentInstalled: number;
};

function computeStats(towerId: TowerFilter): DashboardStats {
  const delivery = db.portDelivery.filter(r => towerId === 'ALL' || r.tower_id === towerId);
  const installation = db.installation.filter(r => towerId === 'ALL' || r.tower_id === towerId);

  const totalPods = delivery.length;
  const delivered = delivery.filter(r => r.status === 'delivered').length;
  const pending = delivery.filter(r => r.status === 'pending').length;
  const installed = installation.filter(r => r.status === 'installed').length;

  return {
    totalPods,
    planned: totalPods,
    forecast: totalPods,
    delivered,
    installed,
    pending,
    percentInstalled: totalPods > 0 ? Math.round((installed / totalPods) * 1000) / 10 : 0,
  };
}

export function getDashboardStats(): Record<TowerFilter, DashboardStats> {
  return {
    ALL: computeStats('ALL'),
    'TWR-A': computeStats('TWR-A'),
    'TWR-B': computeStats('TWR-B'),
  };
}

export function getProjectSummary() {
  return {
    projectName: db.projects[0]?.project_name ?? 'Project',
    projectCode: db.projects[0]?.project_code ?? '',
    towers: db.towers.map(t => ({
      id: t.tower_id,
      name: t.tower_name,
      totalFloors: t.total_floors,
      floorDuration: t.floor_duration_days,
      floorStartDate: t.floor_start_date,
    })),
  };
}
