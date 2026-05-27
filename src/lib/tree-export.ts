import { geoGraticule10, geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
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

type CountryFeature = {
  type: "Feature";
  id?: string | number;
  properties?: Record<string, unknown>;
  geometry: unknown;
};

const WORLD_TOPO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
let worldCountriesPromise: Promise<CountryFeature[]> | null = null;

function formatFullName(member: Profile): string {
  return `${member.first_name} ${member.last_name}`.trim();
}

function formatExportName(member: Profile, mode: ExportNameMode): string {
  if (mode === "display" && member.display_name?.trim()) return member.display_name.trim();
  return formatFullName(member);
}

function formatBirthDateLabel(member: Profile): string | null {
  const date = formatDateOnly(member.date_of_birth);
  return date ? `b. ${date}` : null;
}

function formatDeathDateLabel(member: Profile): string | null {
  if (member.is_alive) return null;
  const date = formatDateOnly(member.date_of_death || null);
  return date ? `d. ${date}` : null;
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

async function loadWorldCountries(): Promise<CountryFeature[]> {
  if (!worldCountriesPromise) {
    worldCountriesPromise = fetch(WORLD_TOPO_URL, { cache: "force-cache" })
      .then(async (response) => {
        if (!response.ok) return [];
        const topology = await response.json();
        const countriesObject = topology?.objects?.countries;
        if (!countriesObject) return [];
        const geo = feature(topology, countriesObject) as { features?: CountryFeature[] };
        return Array.isArray(geo.features) ? geo.features : [];
      })
      .catch(() => []);
  }
  return worldCountriesPromise;
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
  pins: Array<{ lat: number; lng: number; count: number }>,
  countries: CountryFeature[]
) {
  drawPanelShell(ctx, x, y, width, height);

  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = "#2c1810";
  ctx.font = "700 42px Georgia, 'Times New Roman', serif";
  ctx.fillText("Family Map", x + 34, y + 30);
  ctx.font = "400 22px Georgia, 'Times New Roman', serif";
  ctx.fillStyle = "#7a6b58";
  ctx.fillText("Current homes and secondary residences.", x + 34, y + 80);

  const mapX = x + 34;
  const mapW = width - 68;
  const mapH = Math.min(height - 168, Math.round(mapW * 0.56));
  const mapY = y + 128 + Math.max(0, (height - 168 - mapH) / 2);
  drawRoundedRect(ctx, mapX, mapY, mapW, mapH, 22);
  const ocean = ctx.createLinearGradient(mapX, mapY, mapX, mapY + mapH);
  ocean.addColorStop(0, "#eef5f1");
  ocean.addColorStop(1, "#dde9e1");
  ctx.fillStyle = ocean;
  ctx.fill();
  ctx.save();
  drawRoundedRect(ctx, mapX, mapY, mapW, mapH, 22);
  ctx.clip();

  const projection = geoNaturalEarth1().fitExtent(
    [
      [mapX + 24, mapY + 24],
      [mapX + mapW - 24, mapY + mapH - 24],
    ],
    { type: "Sphere" }
  );
  const path = geoPath(projection, ctx);

  ctx.beginPath();
  path(geoGraticule10());
  ctx.strokeStyle = "rgba(92,113,91,0.12)";
  ctx.lineWidth = 1.2;
  ctx.stroke();

  if (countries.length > 0) {
    for (const country of countries) {
      ctx.beginPath();
      path(country as never);
      ctx.fillStyle = "#d6c7ac";
      ctx.fill();
      ctx.strokeStyle = "rgba(91,76,50,0.28)";
      ctx.lineWidth = 0.9;
      ctx.stroke();
    }
  } else {
    const fallbackLand = [
      [[72, -168], [72, -50], [55, -58], [42, -80], [16, -82], [8, -104], [18, -130], [50, -142]],
      [[13, -82], [9, -42], [-54, -70], [-20, -80]],
      [[72, -12], [70, 158], [49, 150], [33, 78], [8, 45], [35, 18], [34, -10]],
      [[34, -18], [31, 50], [-34, 46], [-35, 13], [0, -17]],
      [[-10, 112], [-10, 154], [-45, 154], [-39, 113]],
    ];
    ctx.fillStyle = "#d9cdb7";
    for (const land of fallbackLand) {
      ctx.beginPath();
      const first = projection([land[0][1], land[0][0]]);
      if (!first) continue;
      ctx.moveTo(first[0], first[1]);
      for (const [lat, lng] of land.slice(1)) {
        const p = projection([lng, lat]);
        if (p) ctx.lineTo(p[0], p[1]);
      }
      ctx.closePath();
      ctx.fill();
    }
  }

  ctx.beginPath();
  path({ type: "Sphere" });
  ctx.strokeStyle = "rgba(96,82,58,0.26)";
  ctx.lineWidth = 2;
  ctx.stroke();

  for (const pin of pins) {
    const projected = projection([pin.lng, pin.lat]);
    if (!projected) continue;
    const [pinX, pinY] = projected;
    const radius = pin.count > 1 ? 20 : 15;
    ctx.beginPath();
    ctx.arc(pinX, pinY, radius + 8, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(139,63,47,0.16)";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(pinX, pinY, radius, 0, Math.PI * 2);
    ctx.fillStyle = "#8b3f2f";
    ctx.fill();
    ctx.strokeStyle = "#fff8ee";
    ctx.lineWidth = 4;
    ctx.stroke();
    if (pin.count > 1) {
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "700 18px Georgia, serif";
      ctx.fillStyle = "#fff8ee";
      ctx.fillText(String(pin.count), pinX, pinY + 0.5);
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
  const panelHeight = Math.max(300, 138 + countries.length * 48);
  drawPanelShell(ctx, x, y, width, panelHeight);

  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = "#2c1810";
  ctx.font = "700 40px Georgia, 'Times New Roman', serif";
  ctx.fillText("Residences", x + 32, y + 28);
  ctx.font = "400 22px Georgia, 'Times New Roman', serif";
  ctx.fillStyle = "#7a6b58";
  ctx.fillText("Countries where the family currently lives.", x + 32, y + 78);

  const tableTop = y + 128;
  ctx.strokeStyle = "#d8c4a4";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 32, tableTop);
  ctx.lineTo(x + width - 32, tableTop);
  ctx.stroke();

  ctx.font = "600 18px Georgia, 'Times New Roman', serif";
  ctx.fillStyle = "#7a6b58";
  ctx.fillText("Country", x + 32, tableTop + 14);
  ctx.textAlign = "right";
  ctx.fillText("Members", x + width - 32, tableTop + 14);

  let rowY = tableTop + 46;
  for (const entry of countries) {
    ctx.strokeStyle = "rgba(196,169,125,0.28)";
    ctx.beginPath();
    ctx.moveTo(x + 32, rowY - 12);
    ctx.lineTo(x + width - 32, rowY - 12);
    ctx.stroke();

    ctx.textAlign = "left";
    ctx.font = "500 23px Georgia, 'Times New Roman', serif";
    ctx.fillStyle = "#3b2a1a";
    ctx.fillText(entry.country, x + 32, rowY);

    ctx.textAlign = "right";
    ctx.font = "600 23px Georgia, 'Times New Roman', serif";
    ctx.fillStyle = "#6b5a4a";
    ctx.fillText(String(entry.count), x + width - 32, rowY);
    rowY += 48;
  }

  return panelHeight;
}

function drawProfilePanel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  member: Profile,
  avatarBitmap: ImageBitmap | null
): number {
  const panelHeight = height;
  drawPanelShell(ctx, x, y, width, panelHeight);

  const cx = x + width / 2;
  const avatarR = 92;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = "#9a8465";
  ctx.font = "600 18px Georgia, serif";
  ctx.fillText("PROFILE", x + 34, y + 30);

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, y + 148, avatarR, 0, Math.PI * 2);
  ctx.clip();
  if (avatarBitmap) {
    ctx.drawImage(avatarBitmap, cx - avatarR, y + 148 - avatarR, avatarR * 2, avatarR * 2);
  } else {
    ctx.fillStyle = "#f0ebe3";
    ctx.fillRect(cx - avatarR, y + 148 - avatarR, avatarR * 2, avatarR * 2);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "700 58px Georgia, serif";
    ctx.fillStyle = "#3b2a1a";
    ctx.fillText(`${member.first_name[0] || ""}${member.last_name[0] || ""}`.toUpperCase(), cx, y + 150);
  }
  ctx.restore();
  ctx.beginPath();
  ctx.arc(cx, y + 148, avatarR + 4, 0, Math.PI * 2);
  ctx.strokeStyle = "#d8c4a4";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillStyle = "#2c1810";
  ctx.font = "700 40px Georgia, 'Times New Roman', serif";
  wrapTextLines(ctx, formatFullName(member), width - 48).slice(0, 2).forEach((line, index) => {
    ctx.fillText(line, cx, y + 264 + index * 46);
  });
  let nextY = y + 356;
  if (member.display_name) {
    ctx.font = "italic 400 24px Georgia, serif";
    ctx.fillStyle = "#7a6b58";
    ctx.fillText(`"${member.display_name}"`, cx, nextY);
    nextY += 46;
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
    ctx.font = "600 17px Georgia, serif";
    ctx.fillStyle = "#9a8465";
    ctx.fillText(label.toUpperCase(), x + 34, nextY);
    ctx.font = "500 23px Georgia, serif";
    ctx.fillStyle = "#3b2a1a";
    const rowLines = wrapTextLines(ctx, value, width - 68).slice(0, 2);
    rowLines.forEach((line, index) => {
      ctx.fillText(line, x + 34, nextY + 26 + index * 28);
    });
    nextY += 58 + rowLines.length * 24;
  }

  if (member.about_me && nextY < y + panelHeight - 120) {
    ctx.font = "600 17px Georgia, serif";
    ctx.fillStyle = "#9a8465";
    ctx.fillText("ABOUT", x + 34, nextY);
    ctx.font = "400 22px Georgia, serif";
    ctx.fillStyle = "#4c3b2a";
    wrapTextLines(ctx, member.about_me, width - 68).slice(0, 9).forEach((line, index) => {
      ctx.fillText(line, x + 34, nextY + 28 + index * 28);
    });
  }

  return panelHeight;
}

type ExportRenderNode = {
  profile: Profile;
  generation: number;
  x: number;
  y: number;
  labelWidth: number;
};

function measureNodeLabelWidth(
  ctx: CanvasRenderingContext2D,
  member: Profile,
  options: FamilyTreeExportOptions,
  scale: number,
  circleR: number
): number {
  const nameFontSize = Math.round(Math.max(24, 17 * scale));
  const maxTextWidth = Math.max(260, circleR * 6.4);
  ctx.font = `600 ${nameFontSize}px Georgia, serif`;
  const nameLines = wrapTextLines(ctx, formatExportName(member, options.nameMode), maxTextWidth).slice(0, 2);
  const measured = nameLines.reduce((max, line) => Math.max(max, ctx.measureText(line).width), 0);
  let width = Math.max(circleR * 2.5, measured);

  if (options.nameMode === "full" && member.display_name) {
    const aliasSize = Math.round(Math.max(17, 13 * scale));
    ctx.font = `italic 400 ${aliasSize}px Georgia, serif`;
    width = Math.max(width, ctx.measureText(`"${member.display_name}"`).width);
  }

  const dateSize = Math.round(Math.max(17, 13 * scale));
  ctx.font = `400 ${dateSize}px Georgia, serif`;
  const birthDate = options.showBirthDates ? formatBirthDateLabel(member) : null;
  const deathDate = options.showDeathDates ? formatDeathDateLabel(member) : null;
  if (birthDate) width = Math.max(width, ctx.measureText(birthDate).width);
  if (deathDate) width = Math.max(width, ctx.measureText(deathDate).width);

  return width + 56;
}

function buildExportRenderNodes(
  ctx: CanvasRenderingContext2D,
  nodes: Array<{ profile: Profile; x: number; y: number; generation: number }>,
  scale: number,
  circleR: number,
  options: FamilyTreeExportOptions
): ExportRenderNode[] {
  const renderNodes = nodes.map((node) => ({
    profile: node.profile,
    generation: node.generation,
    x: node.x * scale,
    y: node.y * scale,
    labelWidth: measureNodeLabelWidth(ctx, node.profile, options, scale, circleR),
  }));

  const rows = new Map<number, ExportRenderNode[]>();
  for (const node of renderNodes) {
    const rowKey = Math.round(node.y);
    if (!rows.has(rowKey)) rows.set(rowKey, []);
    rows.get(rowKey)!.push(node);
  }

  for (const rowNodes of rows.values()) {
    rowNodes.sort((a, b) => a.x - b.x);
    const originalCenter = (rowNodes[0].x + rowNodes[rowNodes.length - 1].x) / 2;
    for (let index = 1; index < rowNodes.length; index += 1) {
      const previous = rowNodes[index - 1];
      const current = rowNodes[index];
      const minGap = previous.labelWidth / 2 + current.labelWidth / 2 + 56;
      if (current.x - previous.x < minGap) {
        current.x = previous.x + minGap;
      }
    }
    const adjustedCenter = (rowNodes[0].x + rowNodes[rowNodes.length - 1].x) / 2;
    const centerShift = originalCenter - adjustedCenter;
    for (const node of rowNodes) node.x += centerShift;
  }

  return renderNodes;
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

  const residenceCountries = collectResidenceCountries(members);
  const residencePins = collectResidencePins(members);
  const countryPanelHeight = sideContent.has("countries")
    ? Math.max(300, 138 + residenceCountries.length * 48)
    : 0;

  const horizontalPadding = 150;
  const panelWidth = 1350;
  const sidePanelGap = 80;
  const hasLeftPanel = sideContent.has("worldMap");
  const hasRightPanel = sideContent.has("countries") || sideContent.has("profile");
  const leftClearance = horizontalPadding + (hasLeftPanel ? panelWidth + sidePanelGap : 0);
  const rightClearance = horizontalPadding + (hasRightPanel ? panelWidth + sidePanelGap : 0);
  const topPadding = 300;
  const bottomPadding = 160;
  const maxCanvasWidth = 8200;
  const minCanvasWidth = 6400;
  const targetScale = 3.05;
  const width = Math.max(
    minCanvasWidth,
    Math.min(
      maxCanvasWidth,
      Math.ceil(tree.width * targetScale + leftClearance + rightClearance)
    )
  );
  const scale = Math.min(
    targetScale,
    (width - leftClearance - rightClearance) / Math.max(tree.width, 1)
  );
  const sidebarY = topPadding + 12;
  const mapPanelHeight = sideContent.has("worldMap") ? Math.round(panelWidth * 0.74) : 0;
  const profilePanelHeight = sideContent.has("profile")
    ? Math.max(1380, sideContent.has("countries") ? Math.round(panelWidth * 1.04) : Math.round(panelWidth * 1.2))
    : 0;
  const rightStackHeight =
    profilePanelHeight +
    (profilePanelHeight && countryPanelHeight ? 34 : 0) +
    countryPanelHeight;
  const sideStackHeight = Math.max(mapPanelHeight, rightStackHeight);
  const height = Math.max(
    2280,
    Math.ceil(topPadding + tree.height * scale + bottomPadding),
    Math.ceil(sidebarY + sideStackHeight + bottomPadding + 24)
  );

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
  const circleR = Math.max(46, Math.min(66, 36 * scale));
  const renderNodes = buildExportRenderNodes(ctx, tree.nodes, scale, circleR, resolvedOptions);
  const renderNodeById = new Map(renderNodes.map((node) => [node.profile.id, node]));
  const renderMinX = Math.min(...renderNodes.map((node) => node.x - node.labelWidth / 2));
  const renderMaxX = Math.max(...renderNodes.map((node) => node.x + node.labelWidth / 2));
  const renderVisualWidth = renderMaxX - renderMinX;
  let treeOffsetX = width / 2 - renderVisualWidth / 2 - renderMinX;
  treeOffsetX = Math.max(leftClearance, Math.min(treeOffsetX, width - rightClearance - renderVisualWidth - renderMinX));
  const treeOffsetY = topPadding;
  const leftSidebarX = horizontalPadding;
  const sidebarX = width - horizontalPadding - panelWidth;
  const worldCountries = sideContent.has("worldMap") ? await loadWorldCountries() : [];

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
  const mapX = (node: ExportRenderNode) => treeOffsetX + node.x;
  const mapY = (node: ExportRenderNode) => treeOffsetY + node.y;

  // Generation color palette
  const genPalette = ["#6b4226", "#5b21b6", "#15803d", "#1d4ed8"];
  const genValues = [...new Set(tree.nodes.map((n) => n.generation))].sort((a, b) => b - a);
  const genColor = new Map<number, string>();
  genValues.forEach((g, i) => genColor.set(g, genPalette[Math.min(i, genPalette.length - 1)]));

  // ── Connections ──
  ctx.lineCap = "round";

  // Sibship brackets
  for (const sib of tree.sibships) {
    const pNodes = sib.parents.map((id) => renderNodeById.get(id)).filter(Boolean) as ExportRenderNode[];
    const cNodes = sib.children.map((id) => renderNodeById.get(id)).filter(Boolean) as ExportRenderNode[];
    if (cNodes.length === 0) continue;
    if (pNodes.length === 0 && cNodes.length < 2) continue;

    const sortedP = [...pNodes].sort((a, b) => mapX(a) - mapX(b));
    const sortedC = [...cNodes].sort((a, b) => mapX(a) - mapX(b));
    const cY = sortedC.reduce((s, c) => s + mapY(c), 0) / sortedC.length;

    const hasCouple = sortedP.length >= 2;
    const hasParents = sortedP.length > 0;
    const pY = hasParents ? sortedP.reduce((s, p) => s + mapY(p), 0) / sortedP.length : cY;
    const lx = hasParents ? mapX(sortedP[0]) : mapX(sortedC[0]);
    const rx = hasParents ? mapX(sortedP[sortedP.length - 1]) : mapX(sortedC[sortedC.length - 1]);
    const ux = hasCouple ? (lx + rx) / 2 : hasParents ? lx : sortedC.reduce((s, c) => s + mapX(c), 0) / sortedC.length;
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

    const railL = Math.min(ux, ...sortedC.map((c) => mapX(c)));
    const railR = Math.max(ux, ...sortedC.map((c) => mapX(c)));
    if (railR - railL > 0.5) {
      ctx.moveTo(railL, railY);
      ctx.lineTo(railR, railY);
    }
    for (const c of sortedC) {
      ctx.moveTo(mapX(c), railY);
      ctx.lineTo(mapX(c), childTop);
    }
    ctx.stroke();
  }

  // Spouse-only connections
  ctx.strokeStyle = "#b8a080";
  ctx.lineWidth = 2.5;
  for (const conn of tree.connections) {
    if (conn.type !== "spouse") continue;
    const a = renderNodeById.get(conn.from);
    const b = renderNodeById.get(conn.to);
    if (!a || !b) continue;
    const ax = mapX(a), ay = mapY(a), bx = mapX(b), by = mapY(b);
    ctx.beginPath();
    ctx.moveTo(Math.min(ax, bx) + circleR, (ay + by) / 2);
    ctx.lineTo(Math.max(ax, bx) - circleR, (ay + by) / 2);
    ctx.stroke();
  }

  // ── Nodes ──
  for (const node of renderNodes) {
    const cx = mapX(node);
    const cy = mapY(node);

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
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const fontSize = Math.round(Math.max(24, 17 * scale));
    ctx.font = `600 ${fontSize}px Georgia, serif`;
    ctx.fillStyle = "#2c1810";
    const maxW = Math.max(260, circleR * 6.4);
    const nameLines = wrapTextLines(ctx, formatExportName(node.profile, resolvedOptions.nameMode), maxW).slice(0, 2);
    const nameStartY = cy + circleR + 20;
    nameLines.forEach((line, index) => {
      ctx.fillText(line, cx, nameStartY + index * (fontSize + 4));
    });

    let labelY = nameStartY + nameLines.length * (fontSize + 4) + 2;

    // Display name
    if (resolvedOptions.nameMode === "full" && node.profile.display_name) {
      const aliasSize = Math.round(Math.max(17, 13 * scale));
      ctx.font = `italic 400 ${aliasSize}px Georgia, serif`;
      ctx.fillStyle = "#6b5840";
      ctx.fillText(`"${node.profile.display_name}"`, cx, labelY);
      labelY += aliasSize + 6;
    }

    const dateSize = Math.round(Math.max(17, 13 * scale));
    ctx.font = `400 ${dateSize}px Georgia, serif`;
    ctx.fillStyle = "#8a7a65";
    const birthDate = resolvedOptions.showBirthDates ? formatBirthDateLabel(node.profile) : null;
    if (birthDate) {
      ctx.fillText(birthDate, cx, labelY);
      labelY += dateSize + 6;
    }

    const deathDate = resolvedOptions.showDeathDates ? formatDeathDateLabel(node.profile) : null;
    if (deathDate) {
      ctx.fillText(deathDate, cx, labelY);
    }
  }

  // ── Side panels ──
  if (sideContent.has("worldMap")) {
    drawWorldMapPanel(ctx, leftSidebarX, sidebarY, panelWidth, mapPanelHeight, residencePins, worldCountries);
  }

  let rightPanelY = sidebarY;
  const rightPanelWidth = panelWidth;
  if (sideContent.has("profile") && profilePanelMember) {
    rightPanelY += drawProfilePanel(
      ctx,
      sidebarX,
      rightPanelY,
      rightPanelWidth,
      profilePanelHeight,
      profilePanelMember,
      profilePanelAvatar
    ) + 34;
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
