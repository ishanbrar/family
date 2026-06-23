export interface LargeLayoutProfile {
  id: string;
  gender?: "female" | "male" | null;
}

export interface LargeLayoutMember {
  profile: LargeLayoutProfile;
  x: number;
  y: number;
  generation?: number;
}

export interface LargeLayoutConnection {
  from: string;
  to: string;
  type: "parent" | "spouse" | "sibling" | "half_sibling";
}

export interface LargeFamilyLayoutResult<TMember extends LargeLayoutMember> {
  members: TMember[];
  width: number;
  height: number;
  maxRowCount: number;
}

const DEFAULT_MAX_LINE_WIDTH = 1840;
const MIN_WIDTH = 1120;
const OUTER_PADDING_X = 120;
const START_Y = 112;
const UNIT_GAP = 92;
const MEMBER_GAP = 148;
const LANE_GAP = 156;
const GENERATION_GAP = 136;

function rowKeyFor(member: LargeLayoutMember): string {
  if (typeof member.generation === "number") return `generation:${member.generation}`;
  return `y:${Math.round(member.y / 8) * 8}`;
}

function buildSpouseUnits<TMember extends LargeLayoutMember>(
  rowMembers: TMember[],
  spouseAdj: Map<string, Set<string>>
): TMember[][] {
  const rowIds = new Set(rowMembers.map((member) => member.profile.id));
  const byId = new Map(rowMembers.map((member) => [member.profile.id, member]));
  const visited = new Set<string>();
  const units: TMember[][] = [];

  for (const member of rowMembers) {
    const id = member.profile.id;
    if (visited.has(id)) continue;

    const stack = [id];
    const unit: TMember[] = [];
    visited.add(id);

    while (stack.length > 0) {
      const current = stack.pop()!;
      const currentMember = byId.get(current);
      if (currentMember) unit.push(currentMember);

      for (const next of spouseAdj.get(current) ?? []) {
        if (!rowIds.has(next) || visited.has(next)) continue;
        visited.add(next);
        stack.push(next);
      }
    }

    unit.sort((a, b) => {
      if (a.profile.gender === "male" && b.profile.gender === "female") return -1;
      if (a.profile.gender === "female" && b.profile.gender === "male") return 1;
      return a.x - b.x;
    });
    units.push(unit);
  }

  return units.sort((a, b) => {
    const ax = a.reduce((sum, member) => sum + member.x, 0) / a.length;
    const bx = b.reduce((sum, member) => sum + member.x, 0) / b.length;
    return ax - bx;
  });
}

function unitWidth(unit: LargeLayoutMember[]): number {
  return Math.max(118, (unit.length - 1) * MEMBER_GAP + 86);
}

export function getLargeFamilyRowStats(members: LargeLayoutMember[]) {
  const rowCounts = new Map<string, number>();
  for (const member of members) {
    const key = rowKeyFor(member);
    rowCounts.set(key, (rowCounts.get(key) ?? 0) + 1);
  }

  const maxRowCount = Math.max(0, ...rowCounts.values());
  return { maxRowCount, rowCount: rowCounts.size };
}

export function shouldUseLargeFamilyMode({
  members,
  canvasWidth,
  viewportWidth,
}: {
  members: LargeLayoutMember[];
  canvasWidth: number;
  viewportWidth?: number;
}): boolean {
  const { maxRowCount } = getLargeFamilyRowStats(members);
  const viewportRatio = viewportWidth && viewportWidth > 0 ? canvasWidth / viewportWidth : 0;
  return members.length >= 40 || maxRowCount >= 14 || viewportRatio >= 4;
}

export function createLargeFamilyTreeLayout<TMember extends LargeLayoutMember>(
  members: TMember[],
  connections: LargeLayoutConnection[],
  options: { maxLineWidth?: number; minWidth?: number } = {}
): LargeFamilyLayoutResult<TMember> {
  if (members.length === 0) {
    return { members: [], width: options.minWidth ?? MIN_WIDTH, height: 560, maxRowCount: 0 };
  }

  const maxLineWidth = options.maxLineWidth ?? DEFAULT_MAX_LINE_WIDTH;
  const minWidth = options.minWidth ?? MIN_WIDTH;
  const spouseAdj = new Map<string, Set<string>>();

  for (const connection of connections) {
    if (connection.type !== "spouse") continue;
    if (!spouseAdj.has(connection.from)) spouseAdj.set(connection.from, new Set());
    if (!spouseAdj.has(connection.to)) spouseAdj.set(connection.to, new Set());
    spouseAdj.get(connection.from)!.add(connection.to);
    spouseAdj.get(connection.to)!.add(connection.from);
  }

  const rows = new Map<string, TMember[]>();
  for (const member of members) {
    const key = rowKeyFor(member);
    if (!rows.has(key)) rows.set(key, []);
    rows.get(key)!.push(member);
  }

  const orderedRows = [...rows.values()].sort((a, b) => {
    const ay = a.reduce((sum, member) => sum + member.y, 0) / a.length;
    const by = b.reduce((sum, member) => sum + member.y, 0) / b.length;
    return ay - by;
  });

  const positioned = new Map<string, { x: number; y: number }>();
  const maxRowCount = Math.max(...orderedRows.map((row) => row.length), 1);
  let cursorY = START_Y;
  let contentWidth = minWidth;

  for (const rowMembers of orderedRows) {
    const units = buildSpouseUnits(rowMembers, spouseAdj);
    const lanes: TMember[][][] = [[]];
    let laneWidth = 0;

    for (const unit of units) {
      const width = unitWidth(unit);
      const nextWidth = lanes[lanes.length - 1].length === 0 ? width : laneWidth + UNIT_GAP + width;
      if (nextWidth > maxLineWidth && lanes[lanes.length - 1].length > 0) {
        lanes.push([unit]);
        laneWidth = width;
      } else {
        lanes[lanes.length - 1].push(unit);
        laneWidth = nextWidth;
      }
    }

    for (let laneIndex = 0; laneIndex < lanes.length; laneIndex++) {
      const lane = lanes[laneIndex];
      const widths = lane.map(unitWidth);
      const totalWidth =
        widths.reduce((sum, width) => sum + width, 0) + Math.max(0, lane.length - 1) * UNIT_GAP;
      const layoutWidth = Math.max(minWidth, Math.min(maxLineWidth + OUTER_PADDING_X * 2, totalWidth + OUTER_PADDING_X * 2));
      contentWidth = Math.max(contentWidth, layoutWidth);
      let cursorX = (layoutWidth - totalWidth) / 2;
      const y = cursorY + laneIndex * LANE_GAP;

      lane.forEach((unit, unitIndex) => {
        const width = widths[unitIndex];
        const centerX = cursorX + width / 2;
        const startX = centerX - ((unit.length - 1) * MEMBER_GAP) / 2;

        unit.forEach((member, memberIndex) => {
          positioned.set(member.profile.id, {
            x: startX + memberIndex * MEMBER_GAP,
            y,
          });
        });

        cursorX += width + UNIT_GAP;
      });
    }

    cursorY += lanes.length * LANE_GAP + GENERATION_GAP;
  }

  const nextMembers = members.map((member) => {
    const pos = positioned.get(member.profile.id);
    if (!pos) return member;
    return { ...member, x: pos.x, y: pos.y };
  }) as TMember[];

  return {
    members: nextMembers,
    width: Math.ceil(contentWidth),
    height: Math.max(560, Math.ceil(cursorY - GENERATION_GAP + 150)),
    maxRowCount,
  };
}
