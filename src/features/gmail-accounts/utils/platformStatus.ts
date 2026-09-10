import {colors} from '../../../core/theme';
import type {PlatformStatus} from '../../../core/types';

interface PlatformStatusMeta {
  label: string;
  singular: string;
  plural: string;
  hint: string;
  color: string;
  icon: string;
}

/** Display order: what is still to do comes first, what is gone comes last. */
export const PLATFORM_STATUSES: PlatformStatus[] = [
  'pending',
  'created',
  'finished',
];

export const PLATFORM_STATUS_META: Record<PlatformStatus, PlatformStatusMeta> = {
  pending: {
    label: 'Pendiente',
    singular: 'pendiente',
    plural: 'pendientes',
    hint: 'Todavía no la creaste con este mail',
    color: colors.primary,
    icon: 'radio-button-unchecked',
  },
  created: {
    label: 'Creada',
    singular: 'creada',
    plural: 'creadas',
    hint: 'La cuenta existe y está activa',
    color: colors.successGreen,
    icon: 'check-circle',
  },
  finished: {
    label: 'Finalizada',
    singular: 'finalizada',
    plural: 'finalizadas',
    hint: 'Ya no existe más con este mail',
    color: colors.textMuted,
    icon: 'do-not-disturb-on',
  },
};

export function nextPlatformStatus(status: PlatformStatus): PlatformStatus {
  const index = PLATFORM_STATUSES.indexOf(status);
  return PLATFORM_STATUSES[(index + 1) % PLATFORM_STATUSES.length];
}

export function platformStatusRank(status: PlatformStatus): number {
  return PLATFORM_STATUSES.indexOf(status);
}

export function statusCountLabel(status: PlatformStatus, count: number): string {
  const {singular, plural} = PLATFORM_STATUS_META[status];
  return `${count} ${count === 1 ? singular : plural}`;
}

/** Shared shape of anything that counts platforms per status. */
export interface StatusCounts {
  pendingCount: number;
  createdCount: number;
  finishedCount: number;
}

export interface StatusCountSegment {
  status: PlatformStatus;
  text: string;
  color: string;
}

const COUNT_FIELDS: Record<PlatformStatus, keyof StatusCounts> = {
  pending: 'pendingCount',
  created: 'createdCount',
  finished: 'finishedCount',
};

/** Non-empty counts in display order, each with its label and color. */
export function statusCountSegments(counts: StatusCounts): StatusCountSegment[] {
  const segments: StatusCountSegment[] = [];
  for (const status of PLATFORM_STATUSES) {
    const count = counts[COUNT_FIELDS[status]];
    if (count > 0) {
      segments.push({
        status,
        text: statusCountLabel(status, count),
        color: PLATFORM_STATUS_META[status].color,
      });
    }
  }
  return segments;
}
