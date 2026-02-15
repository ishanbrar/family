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
}: ExportFamilyTreeImageOptions): Promise<void> {
  if (members.length === 0) {
    throw new Error("No family members available for export.");
  }

  const tree = createFamilyTreeLayout(members, relationships, rootId);

  const canvas = document.createElement("canvas");
  const width = 4800;
  const height = 3000;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not initialize export canvas.");

  // Parchment-like backdrop
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, "#efe2c8");
  bg.addColorStop(0.5, "#f4ead4");
  bg.addColorStop(1, "#e5d3b1");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // Subtle paper grain
  for (let i = 0; i < 2600; i += 1) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const alpha = 0.02 + Math.random() * 0.04;
    ctx.fillStyle = `rgba(62, 43, 25, ${alpha.toFixed(3)})`;
    ctx.fillRect(x, y, 2, 2);
  }

  // Border
  ctx.strokeStyle = "#6f5537";
  ctx.lineWidth = 8;
  ctx.strokeRect(54, 54, width - 108, height - 108);
  ctx.lineWidth = 2;
  ctx.strokeRect(78, 78, width - 156, height - 156);

  // Header
  ctx.textAlign = "center";
  ctx.fillStyle = "#3b2a1a";
  ctx.font = "700 78px 'Times New Roman', Georgia, serif";
  ctx.fillText(`${familyName} Family Tree`, width / 2, 180);

  ctx.font = "500 36px 'Times New Roman', Georgia, serif";
  ctx.fillStyle = "#58412a";
  ctx.fillText("Genealogical Print Edition", width / 2, 234);

  ctx.font = "500 30px 'Times New Roman', Georgia, serif";
  ctx.fillStyle = "#6c5335";
  ctx.fillText(scopeLabel, width / 2, 282);

  ctx.font = "400 24px 'Times New Roman', Georgia, serif";
  ctx.fillStyle = "#6f604f";
  const exportedAt = new Date().toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  ctx.fillText(`Exported ${exportedAt}`, width / 2, 322);

  const horizontalPadding = 220;
  const topPadding = 430;
  const bottomPadding = 180;
  const drawAreaWidth = width - horizontalPadding * 2;
  const drawAreaHeight = height - topPadding - bottomPadding;

  const scaleX = drawAreaWidth / Math.max(tree.width, 1);
  const scaleY = drawAreaHeight / Math.max(tree.height, 1);
  const scale = Math.min(scaleX, scaleY);

  const treeOffsetX = horizontalPadding + (drawAreaWidth - tree.width * scale) / 2;
  const treeOffsetY = topPadding + (drawAreaHeight - tree.height * scale) / 2;

  const nodesById = new Map(tree.nodes.map((node) => [node.profile.id, node]));

  const nodeWidth = Math.max(170, Math.min(220, 155 * scale));
  const nodeHeight = Math.max(82, Math.min(104, 66 * scale));
  const nodeRadius = 12;

  const mapX = (x: number) => treeOffsetX + x * scale;
  const mapY = (y: number) => treeOffsetY + y * scale;

  // Connections
  for (const connection of tree.connections) {
    const fromNode = nodesById.get(connection.from);
    const toNode = nodesById.get(connection.to);
    if (!fromNode || !toNode) continue;

    const x1 = mapX(fromNode.x);
    const y1 = mapY(fromNode.y);
    const x2 = mapX(toNode.x);
    const y2 = mapY(toNode.y);

    if (connection.type === "spouse") {
      ctx.save();
      ctx.setLineDash([18, 10]);
      ctx.strokeStyle = "#7a5f3d";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(Math.min(x1, x2) + nodeWidth * 0.55, y1);
      ctx.lineTo(Math.max(x1, x2) - nodeWidth * 0.55, y2);
      ctx.stroke();
      ctx.restore();
      continue;
    }

    if (connection.type === "sibling" || connection.type === "half_sibling") {
      const leftX = Math.min(x1, x2) + nodeWidth * 0.5;
      const rightX = Math.max(x1, x2) - nodeWidth * 0.5;
      const y = (y1 + y2) / 2 - 20;
      const controlY = y - 46;

      ctx.save();
      if (connection.type === "half_sibling") {
        ctx.setLineDash([12, 8]);
      }
      ctx.strokeStyle = "#7a5f3d";
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(leftX, y);
      ctx.quadraticCurveTo((leftX + rightX) / 2, controlY, rightX, y);
      ctx.stroke();
      ctx.restore();
      continue;
    }

    const startX = x1;
    const startY = y1 + nodeHeight * 0.46;
    const endX = x2;
    const endY = y2 - nodeHeight * 0.46;
    const midY = (startY + endY) / 2;

    ctx.strokeStyle = "#5f4932";
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.bezierCurveTo(startX, midY, endX, midY, endX, endY);
    ctx.stroke();
  }

  // Nodes
  for (const node of tree.nodes) {
    const centerX = mapX(node.x);
    const centerY = mapY(node.y);
    const x = centerX - nodeWidth / 2;
    const y = centerY - nodeHeight / 2;

    const fill = ctx.createLinearGradient(x, y, x, y + nodeHeight);
    fill.addColorStop(0, "#fff9ec");
    fill.addColorStop(1, "#efe1c6");
    ctx.fillStyle = fill;
    drawRoundedRect(ctx, x, y, nodeWidth, nodeHeight, nodeRadius);
    ctx.fill();

    ctx.strokeStyle = "#7a5f3d";
    ctx.lineWidth = 2.5;
    drawRoundedRect(ctx, x, y, nodeWidth, nodeHeight, nodeRadius);
    ctx.stroke();

    const name = formatFullName(node.profile);
    const year = formatBirthYear(node.profile);

    ctx.textAlign = "center";
    ctx.fillStyle = "#332312";
    ctx.font = "600 24px 'Times New Roman', Georgia, serif";

    const maxNameWidth = nodeWidth - 18;
    let renderedName = name;
    while (ctx.measureText(renderedName).width > maxNameWidth && renderedName.length > 5) {
      renderedName = `${renderedName.slice(0, -2)}…`;
    }
    ctx.fillText(renderedName, centerX, y + 34);

    if (node.profile.display_name) {
      ctx.font = "italic 500 18px 'Times New Roman', Georgia, serif";
      ctx.fillStyle = "#6c5335";
      let alias = `"${node.profile.display_name}"`;
      while (ctx.measureText(alias).width > maxNameWidth && alias.length > 4) {
        alias = `${alias.slice(0, -2)}…`;
      }
      ctx.fillText(alias, centerX, y + 55);
    }

    ctx.font = "500 18px 'Times New Roman', Georgia, serif";
    ctx.fillStyle = "#5f4932";
    ctx.fillText(year, centerX, y + nodeHeight - 14);
  }

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
