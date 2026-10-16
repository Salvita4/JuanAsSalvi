import * as THREE from "three";
import portfolio from "@/data/portfolio.json";

const colors = {
  blood: "#6f0004",
  crimson: "#a50413",
  red: "#db0821",
  mustard: "#e5ac11",
  silver: "#bfbfbf",
  ink: "#1a1919",
  black: "#000000",
} as const;

type ColorName = keyof typeof colors;

function resolveColor(name: string) {
  return colors[name as ColorName] ?? colors.black;
}

const projects = portfolio.projects.map((project) => ({
  ...project,
  bg: resolveColor(project.theme.background),
  ink: resolveColor(project.theme.ink),
}));

export const PAGE_WIDTH = 1000;
export const PAGE_HEIGHT = 1350;

type CanvasContext = CanvasRenderingContext2D;
export type PagePainter = (context: CanvasContext) => void;

const localImages = import.meta.glob<string>("../img/*.{jpg,jpeg,png,webp,avif}", {
  eager: true,
  query: "?url",
  import: "default",
});
const imageCache = new Map<string, HTMLImageElement>();

function resolveImageSource(source: string) {
  if (/^(https?:|data:|blob:|\/)/.test(source)) return source;
  return localImages[`../img/${source}`] ?? source;
}

function loadImage(source: string) {
  const resolvedSource = resolveImageSource(source);
  const cached = imageCache.get(resolvedSource);
  if (cached) return cached;

  const image = new Image();
  image.crossOrigin = "anonymous";
  image.src = resolvedSource;
  imageCache.set(resolvedSource, image);
  return image;
}

interface ImageTreatment {
  tint?: string;
  tintOpacity?: number;
  grayscale?: number;
  contrast?: number;
}

function drawCoverImage(
  context: CanvasContext,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
  treatment: ImageTreatment = {},
) {
  context.save();
  context.beginPath();
  context.rect(x, y, width, height);
  context.clip();
  context.fillStyle = colors.ink;
  context.fillRect(x, y, width, height);

  if (image.complete && image.naturalWidth) {
    const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
    const imageWidth = image.naturalWidth * scale;
    const imageHeight = image.naturalHeight * scale;
    context.filter = `grayscale(${treatment.grayscale ?? 1}) contrast(${treatment.contrast ?? 1.25})`;
    context.drawImage(
      image,
      x + (width - imageWidth) / 2,
      y + (height - imageHeight) / 2,
      imageWidth,
      imageHeight,
    );
    context.filter = "none";
  }

  if (treatment.tint && (treatment.tintOpacity ?? 1) > 0) {
    context.globalCompositeOperation = "multiply";
    context.globalAlpha = Math.min(1, Math.max(0, treatment.tintOpacity ?? 1));
    context.fillStyle = treatment.tint;
    context.fillRect(x, y, width, height);
    context.globalAlpha = 1;
    context.globalCompositeOperation = "source-over";
  }
  context.restore();
}

function setFont(
  context: CanvasContext,
  size: number,
  display: boolean | string = false,
  weight = 500,
) {
  if (!display) {
    context.font = `${weight} ${size}px "Inter Tight", sans-serif`;
    return;
  }

  const family = typeof display === "string" ? `"${display}"` : "Anton";
  context.font = `${size}px ${family}, Impact, sans-serif`;
}

function drawFittedDisplayText(
  context: CanvasContext,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  preferredSize: number,
  displayFont: string,
  minimumSize = 80,
) {
  setFont(context, preferredSize, displayFont);
  const measuredWidth = context.measureText(text).width;
  const fittedSize =
    measuredWidth > maxWidth
      ? Math.max(minimumSize, Math.floor(preferredSize * (maxWidth / measuredWidth)))
      : preferredSize;
  setFont(context, fittedSize, displayFont);
  context.fillText(text, x, y);
}

function wrapText(
  context: CanvasContext,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  let line = "";
  for (const word of text.split(" ")) {
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width > maxWidth && line) {
      context.fillText(line, x, y);
      y += lineHeight;
      line = word;
    } else {
      line = candidate;
    }
  }
  context.fillText(line, x, y);
  return y + lineHeight;
}

function drawSpacedText(
  context: CanvasContext,
  text: string,
  x: number,
  y: number,
  spacing = 4,
) {
  context.letterSpacing = `${spacing}px`;
  context.fillText(text, x, y);
  context.letterSpacing = "0px";
}

function drawGrain(context: CanvasContext, color: string) {
  context.fillStyle = color;
  context.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);
  for (let index = 0; index < 2600; index += 1) {
    context.fillStyle = `rgba(0,0,0,${Math.random() * 0.08})`;
    context.fillRect(
      Math.random() * PAGE_WIDTH,
      Math.random() * PAGE_HEIGHT,
      2,
      2,
    );
  }
}

function drawFolio(
  context: CanvasContext,
  number: string,
  color: string,
  leftAligned: boolean,
) {
  setFont(context, 18, false, 700);
  context.fillStyle = color;
  context.textAlign = leftAligned ? "left" : "right";
  drawSpacedText(
    context,
    `${number}  —  ${portfolio.site.owner.toUpperCase()} · ${portfolio.site.manifesto}`,
    leftAligned ? 60 : PAGE_WIDTH - 60,
    PAGE_HEIGHT - 50,
    3,
  );
  context.textAlign = "left";
}

export const pagePainters: PagePainter[] = [
  (context) => {
    drawGrain(context, colors.crimson);
    drawCoverImage(
      context,
      loadImage(portfolio.cover.portrait),
      0,
      230,
      PAGE_WIDTH,
      PAGE_HEIGHT - 230,
      {
        ...portfolio.cover.imageTreatment,
        tint: resolveColor(portfolio.cover.imageTreatment.tint),
      },
    );
    const gradient = context.createLinearGradient(0, PAGE_HEIGHT - 520, 0, PAGE_HEIGHT);
    gradient.addColorStop(0, "rgba(0,0,0,0)");
    gradient.addColorStop(1, "rgba(26,0,2,.92)");
    context.fillStyle = gradient;
    context.fillRect(0, PAGE_HEIGHT - 520, PAGE_WIDTH, 520);
    context.fillStyle = colors.black;
    context.fillRect(0, 0, PAGE_WIDTH, 230);
    setFont(context, 20, false, 700);
    context.fillStyle = colors.mustard;
    drawSpacedText(context, portfolio.cover.kicker, 60, 70, 8);
    setFont(context, 150, portfolio.cover.displayFont);
    context.fillStyle = colors.red;
    context.fillText(portfolio.cover.title, 54, 205);
    setFont(context, 20, false, 700);
    context.fillStyle = colors.silver;
    context.textAlign = "right";
    drawSpacedText(
      context,
      `${portfolio.site.volume} · ${portfolio.site.editionYear}`,
      PAGE_WIDTH - 60,
      70,
      5,
    );
    context.textAlign = "left";
    setFont(context, 46, portfolio.cover.displayFont);
    context.fillStyle = colors.mustard;
    context.fillText(portfolio.cover.subtitle, 60, 300);
    const nameLines = portfolio.site.owner.trim().toUpperCase().split(/\s+/);
    const nameAreaTop = PAGE_HEIGHT - 470;
    const nameAreaBottom = PAGE_HEIGHT - 150;
    const lineStep =
      nameLines.length > 1
        ? (nameAreaBottom - nameAreaTop) / (nameLines.length - 1)
        : 0;
    const preferredNameSize = nameLines.length > 2 ? 175 : 220;
    nameLines.forEach((line, index) => {
      context.fillStyle = index % 2 === 0 ? colors.mustard : colors.red;
      drawFittedDisplayText(
        context,
        line,
        50,
        nameAreaTop + index * lineStep,
        PAGE_WIDTH - 110,
        preferredNameSize,
        portfolio.cover.displayFont,
      );
    });
    setFont(context, 28);
    context.fillStyle = colors.silver;
    wrapText(
      context,
      portfolio.cover.description,
      60,
      PAGE_HEIGHT - 70,
      640,
      36,
    );
    const barcode = portfolio.cover.barcode;
    const barcodeX = PAGE_WIDTH - barcode.right - barcode.width;
    const barcodeY = PAGE_HEIGHT - barcode.bottom - barcode.height;
    context.fillStyle = colors.silver;
    context.fillRect(barcodeX, barcodeY, barcode.width, barcode.height);
    context.fillStyle = colors.black;
    for (
      let index = 0, x = barcodeX + 10;
      x < barcodeX + barcode.width - 12;
      index += 1
    ) {
      const width = [3, 6, 2, 8, 3, 4][index % 6];
      context.fillRect(x, barcodeY + 10, width, barcode.height - 30);
      x += width + 4;
    }
    context.save();
    context.translate(PAGE_WIDTH - 70, 360);
    context.rotate(Math.PI / 2);
    setFont(context, 20, false, 800);
    context.fillStyle = colors.mustard;
    drawSpacedText(context, portfolio.cover.pageHint, 0, 0, 8);
    context.restore();
  },
  (context) => {
    drawGrain(context, colors.blood);
    setFont(context, 20, false, 700);
    context.fillStyle = colors.mustard;
    drawSpacedText(context, portfolio.about.eyebrow, 60, 90, 6);
    drawCoverImage(
      context,
      loadImage(portfolio.about.portrait),
      60,
      140,
      420,
      560,
      {
        ...portfolio.about.imageTreatment,
        tint: resolveColor(portfolio.about.imageTreatment.tint),
      },
    );
    setFont(context, 150, portfolio.about.displayFont);
    context.fillStyle = colors.red;
    context.fillText(portfolio.about.greeting, 520, 290);
    setFont(context, 54, portfolio.about.displayFont);
    context.fillStyle = colors.silver;
    wrapText(
      context,
      portfolio.about.headline,
      520,
      380,
      420,
      62,
    );
    context.fillStyle = colors.mustard;
    context.fillRect(60, 760, PAGE_WIDTH - 120, 4);
    setFont(context, 30);
    context.fillStyle = colors.silver;
    const nextY = wrapText(
      context,
      portfolio.about.body,
      60,
      830,
      PAGE_WIDTH - 120,
      44,
    );
    setFont(context, 30, false, 800);
    context.fillStyle = colors.mustard;
    wrapText(
      context,
      portfolio.about.highlight,
      60,
      nextY + 20,
      PAGE_WIDTH - 120,
      44,
    );
    drawFolio(context, "02", colors.red, true);
  },
  (context) => {
    drawGrain(context, colors.red);
    setFont(context, 20, false, 700);
    context.fillStyle = colors.black;
    drawSpacedText(context, portfolio.contents.eyebrow, 60, 90, 8);
    setFont(context, 190, portfolio.contents.displayFont);
    context.fillText(portfolio.contents.titleLines[0], 50, 300);
    context.fillStyle = colors.blood;
    context.fillText(portfolio.contents.titleLines[1], 50, 480);
    portfolio.contents.items.forEach((item, index) => {
      const y = 620 + index * 150;
      context.fillStyle = colors.black;
      context.fillRect(60, y, PAGE_WIDTH - 120, 3);
      setFont(context, 30, false, 800);
      context.fillText(item.page, 60, y + 95);
      setFont(context, 96, portfolio.contents.displayFont);
      context.fillText(item.title, 170, y + 115);
      setFont(context, 24, false, 700);
      context.fillStyle = colors.mustard;
      context.textAlign = "right";
      drawSpacedText(
        context,
        item.category.toUpperCase(),
        PAGE_WIDTH - 60,
        y + 95,
        4,
      );
      context.textAlign = "left";
    });
    drawFolio(context, "03", colors.black, false);
  },
  ...projects.flatMap((project, index): PagePainter[] => [
    (context) => {
      drawGrain(context, colors.ink);
      drawCoverImage(
        context,
        loadImage(project.image),
        0,
        0,
        PAGE_WIDTH,
        PAGE_HEIGHT,
        { tint: project.bg },
      );
      context.fillStyle = "rgba(0,0,0,.25)";
      context.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);
      setFont(context, 520, project.displayFont);
      context.fillStyle = project.bg;
      context.globalAlpha = 0.92;
      context.fillText(project.number, 40, PAGE_HEIGHT - 110);
      context.globalAlpha = 1;
      setFont(context, 20, false, 700);
      context.fillStyle = colors.silver;
      drawSpacedText(context, `PROYECTO ${project.number} / ${project.year}`, 60, 90, 6);
      drawFolio(
        context,
        String(4 + index * 2).padStart(2, "0"),
        colors.silver,
        true,
      );
    },
    (context) => {
      drawGrain(context, project.bg);
      setFont(context, 20, false, 700);
      context.fillStyle = project.ink;
      drawSpacedText(context, project.year, 60, 90, 6);
      context.textAlign = "right";
      drawSpacedText(
        context,
        project.services.toUpperCase(),
        PAGE_WIDTH - 60,
        90,
        3,
      );
      context.textAlign = "left";
      context.fillRect(60, 120, PAGE_WIDTH - 120, 4);
      setFont(context, 30, false, 800);
      context.fillText(`PROYECTO ${project.number}`, 60, 230);
      setFont(
        context,
        project.title.length > 5 ? 230 : 300,
        project.displayFont,
      );
      context.fillStyle = colors.black;
      context.fillText(project.title, 46, 520);
      setFont(context, 60, project.displayFont);
      context.fillStyle = project.ink === colors.black ? colors.blood : project.ink;
      context.fillText(project.subtitle.toUpperCase(), 60, 610);
      setFont(context, 150, project.displayFont);
      context.fillStyle = colors.black;
      context.fillText(project.description[0], 60, 820);
      setFont(context, 32);
      wrapText(
        context,
        project.description.slice(1),
        170,
        720,
        PAGE_WIDTH - 230,
        46,
      );
      context.fillRect(60, 1040, PAGE_WIDTH - 120, 2);
      [
        ["ROL", project.role],
        ["DISCIPLINA", project.discipline],
      ].forEach(([key, value], detailIndex) => {
        setFont(context, 18, false, 800);
        context.fillStyle = project.ink === colors.black ? colors.blood : project.ink;
        drawSpacedText(context, key, 60 + detailIndex * 440, 1100, 4);
        setFont(context, 40, project.displayFont);
        context.fillStyle = colors.black;
        context.fillText(value.toUpperCase(), 60 + detailIndex * 440, 1160);
      });
      drawFolio(
        context,
        String(5 + index * 2).padStart(2, "0"),
        colors.black,
        false,
      );
    },
  ]),
  (context) => {
    drawGrain(context, colors.crimson);
    setFont(context, 20, false, 700);
    context.fillStyle = colors.mustard;
    drawSpacedText(context, portfolio.skills.eyebrow, 60, 90, 6);
    setFont(context, 190, portfolio.skills.displayFont);
    context.fillStyle = colors.black;
    context.fillText(portfolio.skills.title, 50, 300);
    portfolio.skills.items.forEach((skill, index) => {
      const y = 380 + index * 140;
      context.fillStyle = "rgba(0,0,0,.55)";
      context.fillRect(60, y, PAGE_WIDTH - 120, 2);
      setFont(context, 24, false, 800);
      context.fillStyle = colors.mustard;
      context.fillText(`0${index + 1}`, 60, y + 85);
      setFont(context, 78, portfolio.skills.displayFont);
      context.fillStyle = index % 2 ? colors.silver : colors.black;
      context.fillText(skill.toUpperCase(), 150, y + 105);
    });
    drawFolio(context, "10", colors.mustard, true);
  },
  (context) => {
    drawGrain(context, colors.blood);
    context.fillStyle = colors.red;
    context.beginPath();
    context.arc(PAGE_WIDTH - 230, 280, 160, 0, Math.PI * 2);
    context.fill();
    setFont(context, 60, portfolio.contact.displayFont);
    context.fillStyle = colors.black;
    context.textAlign = "center";
    context.fillText(portfolio.contact.badge, PAGE_WIDTH - 230, 302);
    context.textAlign = "left";
    setFont(context, 20, false, 700);
    context.fillStyle = colors.mustard;
    drawSpacedText(context, portfolio.contact.eyebrow, 60, 90, 8);
    setFont(context, 170, portfolio.contact.displayFont);
    context.fillStyle = colors.silver;
    context.fillText(portfolio.contact.headlineLines[0], 50, 640);
    context.fillStyle = colors.red;
    context.fillText(portfolio.contact.headlineLines[1], 50, 820);
    context.fillStyle = colors.mustard;
    context.fillText(portfolio.contact.headlineLines[2], 50, 1000);
    context.fillRect(60, 1070, PAGE_WIDTH - 120, 4);
    setFont(context, 54, portfolio.contact.displayFont);
    context.fillStyle = colors.silver;
    context.fillText(portfolio.contact.emailDisplay, 60, 1160);
    setFont(context, 24, false, 600);
    context.fillText(
      `${portfolio.contact.location} — ${portfolio.contact.availability}`,
      60,
      1215,
    );
    drawFolio(context, "11", colors.red, false);
  },
  (context) => {
    drawGrain(context, colors.ink);
    setFont(context, 300, portfolio.backCover.displayFont);
    context.fillStyle = colors.red;
    context.fillText(portfolio.backCover.mark, 60, 700);
    setFont(context, 22, false, 700);
    context.fillStyle = colors.mustard;
    drawSpacedText(context, portfolio.backCover.tagline, 60, 780, 6);
  },
];

export interface CanvasFace {
  texture: THREE.CanvasTexture;
  paint: () => void;
}

export function createCanvasFaces(): CanvasFace[] {
  return pagePainters.map((painter) => {
    const canvas = document.createElement("canvas");
    canvas.width = PAGE_WIDTH;
    canvas.height = PAGE_HEIGHT;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D no está disponible.");

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    const paint = () => {
      context.clearRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);
      painter(context);
      texture.needsUpdate = true;
    };
    paint();
    return { texture, paint };
  });
}

export function onPageImagesLoaded(callback: () => void) {
  const listeners: Array<() => void> = [];
  imageCache.forEach((image) => {
    const listener = () => callback();
    image.addEventListener("load", listener);
    listeners.push(() => image.removeEventListener("load", listener));
  });
  return () => listeners.forEach((remove) => remove());
}
