import { createFamilyTreeLayout } from "@/lib/tree-layout";
import type { Profile, Relationship } from "@/lib/types";

type ExportScope = "entire" | "related";

interface ExportFamilyTreeImageOptions {
  familyName: string;
  members: Profile[];
  relationships: Relationship[];
  rootId: string;
  scope: ExportScope;
  scopeLabel: string;
  /** Use oldest ancestor as root for classic top-down pedigree layout. */
  preferAncestorRoot?: boolean;
}

function formatFullName(member: Profile): string {
  return `${member.first_name} ${member.last_name}`.trim();
}

function formatBirthYear(member: Profile): string {
  if (!member.date_of_birth) return "Year unknown";
  const year = new Date(member.date_of_birth).getFullYear();
  return Number.isFinite(year) ? `b. ${year}` : "Year unknown";
}

function sanitizeFileName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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

export async function exportFamilyTreeAsImage({
  familyName,
  members,
  relationships,
  rootId,
  scope,
  scopeLabel,
  preferAncestorRoot,
}: ExportFamilyTreeImageOptions): Promise<void> {
  if (members.length === 0) {
    throw new Error("No family members available for export.");
  }

  const tree = createFamilyTreeLayout(members, relationships, rootId, {
    preferAncestorRoot: preferAncestorRoot ?? scope === "entire",
  });

  const canvas = document.createElement("canvas");
  const width = 5400;
  const height = 3400;
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
  ctx.fillText(`The ${familyName} Family`, width / 2, hdrY + 84);

  // Subtitle
  ctx.font = "italic 400 34px Georgia, 'Times New Roman', serif";
  ctx.fillStyle = "#6b5840";
  ctx.fillText(scopeLabel, width / 2, hdrY + 132);

  // Bottom ornamental line
  ctx.strokeStyle = "#c4a97d";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(width / 2 - ornW, hdrY + 155);
  ctx.lineTo(width / 2 + ornW, hdrY + 155);
  ctx.stroke();

  // Layout metrics
  const horizontalPadding = 200;
  const topPadding = 380;
  const bottomPadding = 160;
  const drawAreaWidth = width - horizontalPadding * 2;
  const drawAreaHeight = height - topPadding - bottomPadding;

  const scaleX = drawAreaWidth / Math.max(tree.width, 1);
  const scaleY = drawAreaHeight / Math.max(tree.height, 1);
  const scale = Math.min(scaleX, scaleY);
  const treeOffsetX = horizontalPadding + (drawAreaWidth - tree.width * scale) / 2;
  const treeOffsetY = topPadding + (drawAreaHeight - tree.height * scale) / 2;

  const nodesById = new Map(tree.nodes.map((n) => [n.profile.id, n]));
  const mapX = (x: number) => treeOffsetX + x * scale;
  const mapY = (y: number) => treeOffsetY + y * scale;

  const circleR = Math.max(38, Math.min(52, 36 * scale));

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
    if (pNodes.length === 0 || cNodes.length === 0) continue;

    const sortedP = [...pNodes].sort((a, b) => mapX(a.x) - mapX(b.x));
    const sortedC = [...cNodes].sort((a, b) => mapX(a.x) - mapX(b.x));
    const pY = sortedP.reduce((s, p) => s + mapY(p.y), 0) / sortedP.length;
    const cY = sortedC.reduce((s, c) => s + mapY(c.y), 0) / sortedC.length;

    const hasCouple = sortedP.length >= 2;
    const lx = mapX(sortedP[0].x);
    const rx = mapX(sortedP[sortedP.length - 1].x);
    const ux = hasCouple ? (lx + rx) / 2 : lx;
    const dropStart = hasCouple ? pY : pY + circleR;
    const childTop = cY - circleR;
    const railY = dropStart + (childTop - dropStart) * 0.5;

    ctx.strokeStyle = "#b8a080";
    ctx.lineWidth = 2;
    ctx.beginPath();

    if (hasCouple) {
      ctx.moveTo(lx + circleR, pY);
      ctx.lineTo(rx - circleR, pY);
    }

    ctx.moveTo(ux, dropStart);
    ctx.lineTo(ux, railY);

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

    // Inner fill
    const nFill = ctx.createRadialGradient(cx - circleR * 0.15, cy - circleR * 0.15, 0, cx, cy, circleR);
    nFill.addColorStop(0, "#ffffff");
    nFill.addColorStop(1, "#f0ebe3");
    ctx.beginPath();
    ctx.arc(cx, cy, circleR - 2, 0, Math.PI * 2);
    ctx.fillStyle = nFill;
    ctx.fill();

    // Initials
    const initials = `${node.profile.first_name[0] || ""}${node.profile.last_name[0] || ""}`.toUpperCase();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `600 ${Math.round(circleR * 0.62)}px Georgia, serif`;
    ctx.fillStyle = "#3b2a1a";
    ctx.fillText(initials, cx, cy + 1);

    // Name
    ctx.textBaseline = "top";
    const fontSize = Math.round(Math.max(19, 17 * scale));
    ctx.font = `600 ${fontSize}px Georgia, serif`;
    ctx.fillStyle = "#2c1810";
    const maxW = Math.max(140, circleR * 4.5);
    let renderedName = formatFullName(node.profile);
    while (ctx.measureText(renderedName).width > maxW && renderedName.length > 5) {
      renderedName = `${renderedName.slice(0, -2)}…`;
    }
    ctx.fillText(renderedName, cx, cy + circleR + 12);

    let labelY = cy + circleR + 12 + fontSize + 4;

    // Display name
    if (node.profile.display_name) {
      const aliasSize = Math.round(Math.max(15, 14 * scale));
      ctx.font = `italic 400 ${aliasSize}px Georgia, serif`;
      ctx.fillStyle = "#6b5840";
      ctx.fillText(`"${node.profile.display_name}"`, cx, labelY);
      labelY += aliasSize + 3;
    }

    // Birth year
    const yearSize = Math.round(Math.max(15, 14 * scale));
    ctx.font = `400 ${yearSize}px Georgia, serif`;
    ctx.fillStyle = "#8a7a65";
    ctx.fillText(formatBirthYear(node.profile), cx, labelY);
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
    `${members.length} members · ${genValues.length} generations · Exported ${exportedAt}`,
    width / 2,
    height - bi - 22
  );
  ctx.font = "italic 400 18px Georgia, serif";
  ctx.fillStyle = "#b0a090";
  ctx.fillText("Generated by Legacy", width / 2, height - bi - 50);

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
}
