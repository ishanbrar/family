import { findCityByInput, getCityCoordinates } from "@/lib/cities";
import { createFamilyTreeLayout } from "@/lib/tree-layout";
import { formatDateOnly, formatGenderLabel } from "@/lib/display-format";
import type { Profile, Relationship } from "@/lib/types";

type ExportScope = "entire" | "related";
export type ExportNameMode = "full" | "display";
export type ExportAvatarMode = "headshot" | "initials";
export type ExportSideContent = "worldMap" | "countries" | "profile";

export interface FamilyTreeExportOptions {
  showBirthDates: boolean;
  showDeathDates: boolean;
  nameMode: ExportNameMode;
  avatarMode: ExportAvatarMode;
  sideContent: ExportSideContent[];
  profileMemberId?: string | null;
}

interface ExportFamilyTreeImageOptions {
  familyName: string;
  members: Profile[];
  relationships: Relationship[];
  rootId: string;
  scope: ExportScope;
  scopeLabel: string;
  /** Use oldest ancestor as root for classic top-down pedigree layout. */
  preferAncestorRoot?: boolean;
  exportOptions?: Partial<FamilyTreeExportOptions>;
}

function formatFullName(member: Profile): string {
  return `${member.first_name} ${member.last_name}`.trim();
}

function formatExportName(member: Profile, mode: ExportNameMode): string {
  if (mode === "display" && member.display_name?.trim()) return member.display_name.trim();
  return formatFullName(member);
}

function formatBirthDateLabel(member: Profile): string {
  return member.date_of_birth ? `b. ${formatDateOnly(member.date_of_birth) ?? "unknown"}` : "Birth date unknown";
}

function formatDeathDateLabel(member: Profile): string | null {
  if (member.is_alive) return null;
  if (!member.date_of_death) return "d. unknown";
  return `d. ${formatDateOnly(member.date_of_death) ?? "unknown"}`;
}

function sanitizeFileName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function titleFamilyName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "Family";
  return /family$/i.test(trimmed) ? trimmed : `${trimmed} Family`;
}

function fallbackCountryLabel(value: string): string | null {
  const parts = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;
  return parts[parts.length - 1] || null;
}

function collectResidenceCountries(members: Profile[]): Array<{ country: string; count: number }> {
  const counts = new Map<string, number>();

  const addResidence = (location: string | null | undefined) => {
    const trimmed = location?.trim();
    if (!trimmed) return;
    const matchedCity = findCityByInput(trimmed);
    const country = matchedCity?.country || fallbackCountryLabel(trimmed);
    if (!country) return;
    counts.set(country, (counts.get(country) || 0) + 1);
  };

  for (const member of members) {
    addResidence(member.location_city);
    addResidence(member.secondary_location_city);
  }

  return [...counts.entries()]
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count || a.country.localeCompare(b.country));
}

function collectResidencePins(members: Profile[]): Array<{ lat: number; lng: number; count: number }> {
  const counts = new Map<string, { lat: number; lng: number; count: number }>();
  const addResidence = (location: string | null | undefined) => {
    const trimmed = location?.trim();
    if (!trimmed) return;
    const coords = getCityCoordinates(trimmed);
    if (!coords) return;
    const [lat, lng] = coords;
    const key = `${lat.toFixed(3)}:${lng.toFixed(3)}`;
    const existing = counts.get(key);
    if (existing) existing.count += 1;
    else counts.set(key, { lat, lng, count: 1 });
  };

  for (const member of members) {
    addResidence(member.location_city);
    addResidence(member.secondary_location_city);
  }

  return [...counts.values()].sort((a, b) => b.count - a.count);
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

async function loadAvatarBitmap(src: string): Promise<ImageBitmap | null> {
  try {
    if (src.startsWith("data:") || src.startsWith("blob:")) {
      const response = await fetch(src);
      if (!response.ok) return null;
      return await createImageBitmap(await response.blob());
    }
  } catch {
    // Continue to other strategies.
  }

  try {
    const response = await fetch(src, {
      mode: "cors",
      credentials: "omit",
      cache: "force-cache",
    });
    if (response.ok) {
      const blob = await response.blob();
      return await createImageBitmap(blob);
    }
  } catch {
    // Fall back to HTML image decode below.
  }

  try {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.referrerPolicy = "no-referrer";
    const loaded = await new Promise<HTMLImageElement>((resolve, reject) => {
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Avatar image failed to load"));
      image.src = src;
    });
    return await createImageBitmap(loaded);
  } catch {
    return null;
  }
}

function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const lines: string[] = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i += 1) {
    const candidate = `${currentLine} ${words[i]}`;
    if (ctx.measureText(candidate).width <= maxWidth) {
      currentLine = candidate;
    } else {
      lines.push(currentLine);
      currentLine = words[i];
    }
  }

  lines.push(currentLine);
  return lines;
}

function drawPanelShell(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number
) {
  drawRoundedRect(ctx, x, y, width, height, 18);
  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.fill();
  ctx.strokeStyle = "#d9c5a5";
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawWorldMapPanel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  pins: Array<{ lat: number; lng: number; count: number }>
) {
  drawPanelShell(ctx, x, y, width, height);

  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = "#2c1810";
  ctx.font = "700 30px Georgia, 'Times New Roman', serif";
  ctx.fillText("Family Map", x + 24, y + 22);
  ctx.font = "400 18px Georgia, 'Times New Roman', serif";
  ctx.fillStyle = "#7a6b58";
  ctx.fillText("Current homes and secondary residences.", x + 24, y + 60);

  const mapX = x + 24;
  const mapY = y + 106;
  const mapW = width - 48;
  const mapH = height - 136;
  drawRoundedRect(ctx, mapX, mapY, mapW, mapH, 14);
  ctx.fillStyle = "#f2eee7";
  ctx.fill();
  ctx.save();
  drawRoundedRect(ctx, mapX, mapY, mapW, mapH, 14);
  ctx.clip();

  ctx.strokeStyle = "rgba(184,160,128,0.18)";
  ctx.lineWidth = 1;
  for (let i = 1; i < 6; i += 1) {
    const gx = mapX + (mapW * i) / 6;
    ctx.beginPath();
    ctx.moveTo(gx, mapY);
    ctx.lineTo(gx, mapY + mapH);
    ctx.stroke();
  }
  for (let i = 1; i < 4; i += 1) {
    const gy = mapY + (mapH * i) / 4;
    ctx.beginPath();
    ctx.moveTo(mapX, gy);
    ctx.lineTo(mapX + mapW, gy);
    ctx.stroke();
  }

  const project = (lat: number, lng: number) => ({
    x: mapX + ((lng + 180) / 360) * mapW,
    y: mapY + ((90 - lat) / 180) * mapH,
  });

  const drawLand = (points: Array<[number, number]>) => {
    if (points.length === 0) return;
    ctx.beginPath();
    const first = project(points[0][0], points[0][1]);
    ctx.moveTo(first.x, first.y);
    for (const [lat, lng] of points.slice(1)) {
      const p = project(lat, lng);
      ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    ctx.fill();
  };

  ctx.fillStyle = "rgba(196,169,125,0.28)";
  drawLand([[72, -168], [72, -52], [18, -48], [8, -86], [18, -124], [52, -132]]);
  drawLand([[13, -82], [12, -35], [-55, -66], [-20, -82]]);
  drawLand([[72, -10], [70, 158], [8, 146], [-10, 44], [32, 28], [34, -12]]);
  drawLand([[35, -18], [30, 52], [-35, 46], [-35, 12], [0, -16]]);
  drawLand([[-11, 112], [-10, 154], [-45, 154], [-39, 113]]);

  for (const pin of pins) {
    const p = project(pin.lat, pin.lng);
    ctx.beginPath();
    ctx.arc(p.x, p.y, pin.count > 1 ? 13 : 10, 0, Math.PI * 2);
    ctx.fillStyle = "#8b3f2f";
    ctx.fill();
    ctx.strokeStyle = "#fff8ee";
    ctx.lineWidth = 3;
    ctx.stroke();
    if (pin.count > 1) {
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "700 14px Georgia, serif";
      ctx.fillStyle = "#fff8ee";
      ctx.fillText(String(pin.count), p.x, p.y + 0.5);
    }
  }

  ctx.restore();
}

function drawCountriesPanel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  countries: Array<{ country: string; count: number }>
): number {
  const panelHeight = Math.max(240, 112 + countries.length * 40);
  drawPanelShell(ctx, x, y, width, panelHeight);

  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = "#2c1810";
  ctx.font = "700 30px Georgia, 'Times New Roman', serif";
  ctx.fillText("Residences", x + 24, y + 22);
  ctx.font = "400 18px Georgia, 'Times New Roman', serif";
  ctx.fillStyle = "#7a6b58";
  ctx.fillText("Countries where the family currently lives.", x + 24, y + 60);

  const tableTop = y + 102;
  ctx.strokeStyle = "#d8c4a4";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 24, tableTop);
  ctx.lineTo(x + width - 24, tableTop);
  ctx.stroke();

  ctx.font = "600 16px Georgia, 'Times New Roman', serif";
  ctx.fillStyle = "#7a6b58";
  ctx.fillText("Country", x + 24, tableTop + 12);
  ctx.textAlign = "right";
  ctx.fillText("Members", x + width - 24, tableTop + 12);

  let rowY = tableTop + 38;
  for (const entry of countries) {
    ctx.strokeStyle = "rgba(196,169,125,0.28)";
    ctx.beginPath();
    ctx.moveTo(x + 24, rowY - 10);
    ctx.lineTo(x + width - 24, rowY - 10);
    ctx.stroke();

    ctx.textAlign = "left";
    ctx.font = "500 18px Georgia, 'Times New Roman', serif";
    ctx.fillStyle = "#3b2a1a";
    ctx.fillText(entry.country, x + 24, rowY);

    ctx.textAlign = "right";
    ctx.font = "600 18px Georgia, 'Times New Roman', serif";
    ctx.fillStyle = "#6b5a4a";
    ctx.fillText(String(entry.count), x + width - 24, rowY);
    rowY += 40;
  }

  return panelHeight;
}

function drawProfilePanel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  member: Profile,
  avatarBitmap: ImageBitmap | null
): number {
  const panelHeight = 640;
  drawPanelShell(ctx, x, y, width, panelHeight);

  const cx = x + width / 2;
  const avatarR = 66;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, y + 92, avatarR, 0, Math.PI * 2);
  ctx.clip();
  if (avatarBitmap) {
    ctx.drawImage(avatarBitmap, cx - avatarR, y + 92 - avatarR, avatarR * 2, avatarR * 2);
  } else {
    ctx.fillStyle = "#f0ebe3";
    ctx.fillRect(cx - avatarR, y + 92 - avatarR, avatarR * 2, avatarR * 2);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "700 44px Georgia, serif";
    ctx.fillStyle = "#3b2a1a";
    ctx.fillText(`${member.first_name[0] || ""}${member.last_name[0] || ""}`.toUpperCase(), cx, y + 94);
  }
  ctx.restore();

  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillStyle = "#2c1810";
  ctx.font = "700 30px Georgia, 'Times New Roman', serif";
  wrapTextLines(ctx, formatFullName(member), width - 48).slice(0, 2).forEach((line, index) => {
    ctx.fillText(line, cx, y + 178 + index * 34);
  });
  let nextY = y + 248;
  if (member.display_name) {
    ctx.font = "italic 400 18px Georgia, serif";
    ctx.fillStyle = "#7a6b58";
    ctx.fillText(`"${member.display_name}"`, cx, nextY);
    nextY += 34;
  }

  const rows = [
    ["Gender", formatGenderLabel(member.gender) || null],
    ["Birth", formatDateOnly(member.date_of_birth)],
    ["Death", member.is_alive ? null : formatDateOnly(member.date_of_death || null) || "Unknown"],
    ["City", member.location_city],
    ["Secondary Home", member.secondary_location_city || null],
    ["Profession", member.profession],
    ["Pets", member.pets.length ? member.pets.join(", ") : null],
  ].filter((row): row is [string, string] => !!row[1]);

  ctx.textAlign = "left";
  for (const [label, value] of rows.slice(0, 7)) {
    ctx.font = "600 15px Georgia, serif";
    ctx.fillStyle = "#9a8465";
    ctx.fillText(label.toUpperCase(), x + 28, nextY);
    ctx.font = "500 19px Georgia, serif";
    ctx.fillStyle = "#3b2a1a";
    wrapTextLines(ctx, value, width - 56).slice(0, 2).forEach((line, index) => {
      ctx.fillText(line, x + 28, nextY + 22 + index * 23);
    });
    nextY += 70;
  }

  if (member.about_me && nextY < y + panelHeight - 92) {
    ctx.font = "600 15px Georgia, serif";
    ctx.fillStyle = "#9a8465";
    ctx.fillText("ABOUT", x + 28, nextY);
    ctx.font = "400 18px Georgia, serif";
    ctx.fillStyle = "#4c3b2a";
    wrapTextLines(ctx, member.about_me, width - 56).slice(0, 6).forEach((line, index) => {
      ctx.fillText(line, x + 28, nextY + 24 + index * 24);
    });
  }

  return panelHeight;
}

export async function exportFamilyTreeAsImage({
  familyName,
  members,
  relationships,
  rootId,
  scope,
  scopeLabel,
  preferAncestorRoot,
  exportOptions,
}: ExportFamilyTreeImageOptions): Promise<void> {
  if (members.length === 0) {
    throw new Error("No family members available for export.");
  }

  const resolvedOptions: FamilyTreeExportOptions = {
    showBirthDates: exportOptions?.showBirthDates ?? true,
    showDeathDates: exportOptions?.showDeathDates ?? true,
    nameMode: exportOptions?.nameMode ?? "full",
    avatarMode: exportOptions?.avatarMode ?? "headshot",
    sideContent: exportOptions?.sideContent ?? ["countries"],
    profileMemberId: exportOptions?.profileMemberId ?? null,
  };
  const sideContent = new Set(resolvedOptions.sideContent);

  const tree = createFamilyTreeLayout(members, relationships, rootId, {
    // Match the on-screen tree layout by default so exported branches line up
    // with what the user sees in the app.
    preferAncestorRoot: preferAncestorRoot ?? false,
  });

  const horizontalPadding = 180;
  const leftSidebarWidth = sideContent.has("worldMap") ? 640 : 0;
  const rightSidebarWidth = sideContent.has("countries") || sideContent.has("profile") ? 520 : 0;
  const topPadding = 245;
  const bottomPadding = 150;
  const maxCanvasWidth = 5600;
  const minCanvasWidth = 3880;
  const targetScale = 2.2;
  const width = Math.max(
    minCanvasWidth,
    Math.min(
      maxCanvasWidth,
      Math.ceil(tree.width * targetScale + horizontalPadding * 2 + leftSidebarWidth + rightSidebarWidth)
    )
  );
  const scale = Math.min(
    targetScale,
    (width - horizontalPadding * 2 - leftSidebarWidth - rightSidebarWidth) / Math.max(tree.width, 1)
  );
  const height = Math.max(2200, Math.ceil(topPadding + tree.height * scale + bottomPadding));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not initialize export canvas.");

  // Clean cream background
  ctx.fillStyle = "#faf7f2";
  ctx.fillRect(0, 0, width, height);

  // Minimal paper texture
  for (let i = 0; i < 500; i++) {
    ctx.fillStyle = `rgba(180, 165, 140, ${(0.012 + Math.random() * 0.018).toFixed(3)})`;
    ctx.fillRect(Math.random() * width, Math.random() * height, 1.5, 1.5);
  }

  // Elegant border
  const bi = 40;
  ctx.strokeStyle = "#c4a97d";
  ctx.lineWidth = 3;
  drawRoundedRect(ctx, bi, bi, width - bi * 2, height - bi * 2, 16);
  ctx.stroke();
  ctx.strokeStyle = "#d4c4a8";
  ctx.lineWidth = 1;
  drawRoundedRect(ctx, bi + 12, bi + 12, width - (bi + 12) * 2, height - (bi + 12) * 2, 12);
  ctx.stroke();

  // Header ornamental line
  const hdrY = 110;
  const ornW = 220;
  ctx.strokeStyle = "#c4a97d";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(width / 2 - ornW, hdrY);
  ctx.lineTo(width / 2 + ornW, hdrY);
  ctx.stroke();

  // Family name
  ctx.textAlign = "center";
  ctx.fillStyle = "#2c1810";
  ctx.font = "700 88px Georgia, 'Times New Roman', serif";
  ctx.fillText(`The ${titleFamilyName(familyName)}`, width / 2, hdrY + 84);

  // Bottom ornamental line
  ctx.strokeStyle = "#c4a97d";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(width / 2 - ornW, hdrY + 118);
  ctx.lineTo(width / 2 + ornW, hdrY + 118);
  ctx.stroke();
  const treeAreaX = horizontalPadding + leftSidebarWidth;
  const treeAreaWidth = width - horizontalPadding * 2 - leftSidebarWidth - rightSidebarWidth;
  const treeOffsetX = treeAreaX + Math.max(0, (treeAreaWidth - tree.width * scale) / 2);
  const treeOffsetY = topPadding;
  const leftSidebarX = horizontalPadding;
  const sidebarX = width - horizontalPadding - rightSidebarWidth + 18;
  const sidebarY = topPadding + 8;
  const residenceCountries = collectResidenceCountries(members);
  const residencePins = collectResidencePins(members);

  const nodesById = new Map(tree.nodes.map((n) => [n.profile.id, n]));
  const avatarBitmapById = new Map<string, ImageBitmap>();
  await Promise.all(
    tree.nodes.map(async (node) => {
      if (resolvedOptions.avatarMode !== "headshot" || !node.profile.avatar_url) return;
      const bitmap = await loadAvatarBitmap(node.profile.avatar_url);
      if (bitmap) {
        avatarBitmapById.set(node.profile.id, bitmap);
      }
    })
  );
  const profilePanelMember = resolvedOptions.profileMemberId
    ? members.find((member) => member.id === resolvedOptions.profileMemberId) || null
    : null;
  const profilePanelAvatar = profilePanelMember?.avatar_url
    ? await loadAvatarBitmap(profilePanelMember.avatar_url)
    : null;
  const mapX = (x: number) => treeOffsetX + x * scale;
  const mapY = (y: number) => treeOffsetY + y * scale;

  const circleR = Math.max(40, Math.min(58, 37 * scale));

  // Generation color palette
  const genPalette = ["#6b4226", "#5b21b6", "#15803d", "#1d4ed8"];
  const genValues = [...new Set(tree.nodes.map((n) => n.generation))].sort((a, b) => b - a);
  const genColor = new Map<number, string>();
  genValues.forEach((g, i) => genColor.set(g, genPalette[Math.min(i, genPalette.length - 1)]));

  // ── Connections ──
  ctx.lineCap = "round";

  // Sibship brackets
  for (const sib of tree.sibships) {
    const pNodes = sib.parents.map((id) => nodesById.get(id)).filter(Boolean) as typeof tree.nodes;
    const cNodes = sib.children.map((id) => nodesById.get(id)).filter(Boolean) as typeof tree.nodes;
    if (cNodes.length === 0) continue;
    if (pNodes.length === 0 && cNodes.length < 2) continue;

    const sortedP = [...pNodes].sort((a, b) => mapX(a.x) - mapX(b.x));
    const sortedC = [...cNodes].sort((a, b) => mapX(a.x) - mapX(b.x));
    const cY = sortedC.reduce((s, c) => s + mapY(c.y), 0) / sortedC.length;

    const hasCouple = sortedP.length >= 2;
    const hasParents = sortedP.length > 0;
    const pY = hasParents ? sortedP.reduce((s, p) => s + mapY(p.y), 0) / sortedP.length : cY;
    const lx = hasParents ? mapX(sortedP[0].x) : mapX(sortedC[0].x);
    const rx = hasParents ? mapX(sortedP[sortedP.length - 1].x) : mapX(sortedC[sortedC.length - 1].x);
    const ux = hasCouple ? (lx + rx) / 2 : hasParents ? lx : sortedC.reduce((s, c) => s + mapX(c.x), 0) / sortedC.length;
    const dropStart = hasCouple ? pY : pY + circleR;
    const childTop = cY - circleR;
    const railY = hasParents
      ? Math.min(
          childTop - 28,
          Math.max(dropStart + 28, dropStart + (childTop - dropStart) * 0.72)
        )
      : childTop - 28;

    ctx.strokeStyle = "#b8a080";
    ctx.lineWidth = 2;
    ctx.beginPath();

    if (hasCouple) {
      ctx.moveTo(lx + circleR, pY);
      ctx.lineTo(rx - circleR, pY);
    }

    if (hasParents) {
      ctx.moveTo(ux, dropStart);
      ctx.lineTo(ux, railY);
    }

    const railL = Math.min(ux, ...sortedC.map((c) => mapX(c.x)));
    const railR = Math.max(ux, ...sortedC.map((c) => mapX(c.x)));
    if (railR - railL > 0.5) {
      ctx.moveTo(railL, railY);
      ctx.lineTo(railR, railY);
    }
    for (const c of sortedC) {
      ctx.moveTo(mapX(c.x), railY);
      ctx.lineTo(mapX(c.x), childTop);
    }
    ctx.stroke();
  }

  // Spouse-only connections
  ctx.strokeStyle = "#b8a080";
  ctx.lineWidth = 2.5;
  for (const conn of tree.connections) {
    if (conn.type !== "spouse") continue;
    const a = nodesById.get(conn.from);
    const b = nodesById.get(conn.to);
    if (!a || !b) continue;
    const ax = mapX(a.x), ay = mapY(a.y), bx = mapX(b.x), by = mapY(b.y);
    ctx.beginPath();
    ctx.moveTo(Math.min(ax, bx) + circleR, (ay + by) / 2);
    ctx.lineTo(Math.max(ax, bx) - circleR, (ay + by) / 2);
    ctx.stroke();
  }

  // ── Nodes ──
  for (const node of tree.nodes) {
    const cx = mapX(node.x);
    const cy = mapY(node.y);

    // Background circle masks lines
    ctx.beginPath();
    ctx.arc(cx, cy, circleR + 4, 0, Math.PI * 2);
    ctx.fillStyle = "#faf7f2";
    ctx.fill();

    // Colored generation ring
    ctx.beginPath();
    ctx.arc(cx, cy, circleR, 0, Math.PI * 2);
    ctx.strokeStyle = genColor.get(node.generation) || "#6b4226";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Inner fill / avatar
    const avatarBitmap = resolvedOptions.avatarMode === "headshot" ? avatarBitmapById.get(node.profile.id) : null;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, circleR - 2, 0, Math.PI * 2);
    ctx.clip();
    if (avatarBitmap) {
      const size = circleR * 2 - 4;
      ctx.drawImage(avatarBitmap, cx - size / 2, cy - size / 2, size, size);
    } else {
      const nFill = ctx.createRadialGradient(cx - circleR * 0.15, cy - circleR * 0.15, 0, cx, cy, circleR);
      nFill.addColorStop(0, "#ffffff");
      nFill.addColorStop(1, "#f0ebe3");
      ctx.fillStyle = nFill;
      ctx.fill();

      const initials = `${node.profile.first_name[0] || ""}${node.profile.last_name[0] || ""}`.toUpperCase();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `600 ${Math.round(circleR * 0.62)}px Georgia, serif`;
      ctx.fillStyle = "#3b2a1a";
      ctx.fillText(initials, cx, cy + 1);
    }
    ctx.restore();

    // Name
    ctx.textBaseline = "top";
    const fontSize = Math.round(Math.max(22, 18 * scale));
    ctx.font = `600 ${fontSize}px Georgia, serif`;
    ctx.fillStyle = "#2c1810";
    const maxW = Math.max(220, circleR * 5.8);
    const nameLines = wrapTextLines(ctx, formatExportName(node.profile, resolvedOptions.nameMode), maxW);
    const nameStartY = cy + circleR + 16;
    nameLines.forEach((line, index) => {
      ctx.fillText(line, cx, nameStartY + index * (fontSize + 4));
    });

    let labelY = nameStartY + nameLines.length * (fontSize + 4) + 2;

    // Display name
    if (resolvedOptions.nameMode === "full" && node.profile.display_name) {
      const aliasSize = Math.round(Math.max(16, 14 * scale));
      ctx.font = `italic 400 ${aliasSize}px Georgia, serif`;
      ctx.fillStyle = "#6b5840";
      ctx.fillText(`"${node.profile.display_name}"`, cx, labelY);
      labelY += aliasSize + 6;
    }

    const dateSize = Math.round(Math.max(16, 14 * scale));
    ctx.font = `400 ${dateSize}px Georgia, serif`;
    ctx.fillStyle = "#8a7a65";
    if (resolvedOptions.showBirthDates) {
      ctx.fillText(formatBirthDateLabel(node.profile), cx, labelY);
      labelY += dateSize + 6;
    }

    const deathDate = resolvedOptions.showDeathDates ? formatDeathDateLabel(node.profile) : null;
    if (deathDate) {
      ctx.fillText(deathDate, cx, labelY);
    }
  }

  // ── Side panels ──
  if (sideContent.has("worldMap")) {
    drawWorldMapPanel(ctx, leftSidebarX, sidebarY, leftSidebarWidth - 36, 520, residencePins);
  }

  let rightPanelY = sidebarY;
  const rightPanelWidth = rightSidebarWidth - 36;
  if (sideContent.has("profile") && profilePanelMember) {
    rightPanelY += drawProfilePanel(ctx, sidebarX, rightPanelY, rightPanelWidth, profilePanelMember, profilePanelAvatar) + 28;
  }
  if (sideContent.has("countries")) {
    drawCountriesPanel(ctx, sidebarX, rightPanelY, rightPanelWidth, residenceCountries);
  }

  // ── Footer ──
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  const exportedAt = new Date().toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  ctx.font = "400 22px Georgia, serif";
  ctx.fillStyle = "#8a7a65";
  ctx.fillText(
    `${scopeLabel} · ${members.length} members · ${genValues.length} generations · Exported ${exportedAt}`,
    width / 2,
    height - bi - 22
  );
  ctx.font = "400 18px Georgia, serif";
  ctx.fillStyle = "#b0a090";
  ctx.fillText(
    "Produced with Legatree · Copyright © 2026 Ishan Brar. All rights reserved.",
    width / 2,
    height - bi - 50
  );

  // ── Download ──
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((nextBlob) => resolve(nextBlob), "image/png", 1);
  });
  if (!blob) throw new Error("Could not render export image.");

  const fileFamily = sanitizeFileName(familyName || "family");
  const suffix = scope === "related" ? "related-tree" : "entire-tree";
  const filename = `${fileFamily}-${suffix}.png`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1200);
  avatarBitmapById.forEach((bitmap) => bitmap.close());
  profilePanelAvatar?.close();
}
