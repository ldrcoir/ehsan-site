// ============================================================================
// rtl.js — ابزارهای مشترک سند فارسی (RTL) برای docx-js — v1.0
// ============================================================================
// همه‌ی سندهای فارسی (آموزش/گزارش ممیزی) از همین توابع استفاده می‌کنند تا
// قواعد RTL، فونت، فاصله و رنگ یکسان بمانند.
// قواعد: bidirectional روی همه‌ی پاراگراف‌ها، rightToLeft روی همه‌ی TextRunها،
// Tahoma (دارای گلیف کامل فارسی در ویندوز/لینوکس)، فاصله خط ۱٫۳ برابر (312).
// ============================================================================

const {
  Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, HeadingLevel, WidthType, BorderStyle, ShadingType,
  TableLayoutType,
} = require("docx");

// --- پالت هویت سایت (سبز ترمینال روی زمینه‌ی تیره) ---------------------------
const PALETTE = {
  cover: {
    bg: "071108",
    titleColor: "E8FFE8",
    subtitleColor: "9CCF9C",
    metaColor: "BFD9BF",
    accent: "00FF41",
    footerColor: "6F8F6F",
  },
  primary: "0B3D0B",
  body: "1A1A1A",
  secondary: "4A6A4A",
  accent: "008F11",
  tableHead: "0E4D14",
  tableHeadText: "FFFFFF",
  zebra: "F2F8F2",
};

const FONT = { ascii: "Tahoma", hAnsi: "Tahoma", eastAsia: "Tahoma", cs: "Tahoma" };

// --- helpers ---------------------------------------------------------------
function rtlRun(text, opts = {}) {
  return new TextRun({
    text,
    rightToLeft: true,
    font: FONT,
    size: opts.size || 24,
    sizeComplexScript: opts.size || 24,
    bold: opts.bold || false,
    boldComplexScript: opts.bold || false,
    italics: opts.italics || false,
    color: opts.color || PALETTE.body,
  });
}

// پاراگراف بدنه — فارسی RTL، تراز justify، بدون تورفتگی اول خط (استاندارد فارسی)
function fa(text, opts = {}) {
  return new Paragraph({
    bidirectional: true,
    alignment: opts.align || AlignmentType.JUSTIFIED,
    spacing: { line: 312, after: opts.after === undefined ? 120 : opts.after, before: opts.before || 0 },
    children: Array.isArray(text) ? text : [rtlRun(text, opts)],
  });
}

// سرفصل‌ها — حتماً HeadingLevel تا TOC آن‌ها را ببیند
function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    bidirectional: true,
    alignment: AlignmentType.START,
    spacing: { before: 360, after: 160, line: 380, lineRule: "atLeast" },
    children: [rtlRun(text, { bold: true, size: 32, color: PALETTE.primary })],
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    bidirectional: true,
    alignment: AlignmentType.START,
    spacing: { before: 280, after: 120, line: 340, lineRule: "atLeast" },
    children: [rtlRun(text, { bold: true, size: 28, color: PALETTE.primary })],
  });
}

// خط فرمان / کد — LTR، چپ‌چین، monospace، جعبه‌ی کم‌رنگ
function codeLine(text) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { line: 276, after: 40 },
    indent: { left: 400, right: 400 },
    shading: { type: ShadingType.CLEAR, fill: "F4F4F4" },
    children: [new TextRun({
      text, size: 20, font: { ascii: "Courier New", hAnsi: "Courier New", eastAsia: "Courier New", cs: "Courier New" },
      color: "0B3D0B",
    })],
  });
}

// جدول ساده با سرستون — همیشه PERCENTAGE (سازگار با WPS)
function faTable(headers, rows, widths) {
  const mkCell = (content, opts = {}) => new TableCell({
    width: { size: opts.w || Math.floor(100 / headers.length), type: WidthType.PERCENTAGE },
    shading: { type: ShadingType.CLEAR, fill: opts.fill || "FFFFFF" },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({
      bidirectional: true,
      alignment: AlignmentType.START,
      spacing: { line: 276 },
      children: [rtlRun(String(content), { size: 22, bold: opts.bold || false, color: opts.color || PALETTE.body })],
    })],
  });
  const headRow = new TableRow({
    tableHeader: true,
    cantSplit: true,
    children: headers.map((htxt, i) => mkCell(htxt, { fill: PALETTE.tableHead, bold: true, color: PALETTE.tableHeadText, w: widths ? widths[i] : undefined })),
  });
  const bodyRows = rows.map((r, ri) => new TableRow({
    cantSplit: true,
    children: r.map((cell, ci) => mkCell(cell, { fill: ri % 2 === 1 ? PALETTE.zebra : "FFFFFF", w: widths ? widths[ci] : undefined })),
  }));
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: "BBBBBB" },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: "BBBBBB" },
      left: { style: BorderStyle.SINGLE, size: 4, color: "BBBBBB" },
      right: { style: BorderStyle.SINGLE, size: 4, color: "BBBBBB" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" },
      insideVertical: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" },
    },
    rows: [headRow, ...bodyRows],
  });
}

// عنوان جدول (keepNext تا از جدول جدا نشود)
function tableTitle(text) {
  return new Paragraph({
    bidirectional: true,
    alignment: AlignmentType.START,
    keepNext: true,
    spacing: { before: 200, after: 100 },
    children: [rtlRun(text, { bold: true, size: 22, color: PALETTE.secondary })],
  });
}

// یادداشت سبز (hint) — با نوار حاشیه‌ی راست
function note(text) {
  return new Paragraph({
    bidirectional: true,
    alignment: AlignmentType.JUSTIFIED,
    spacing: { line: 312, before: 120, after: 160 },
    indent: { right: 200 },
    border: { right: { style: BorderStyle.SINGLE, size: 12, color: PALETTE.accent, space: 8 } },
    children: [rtlRun(text, { size: 22, color: "0B3D0B" })],
  });
}

// لیست ساده فارسی — هر آیتم یک پاراگراف با بولت متنی «–» (بدون شماره‌گذاری خودکار)
function faList(items) {
  return items.map(t => new Paragraph({
    bidirectional: true,
    alignment: AlignmentType.JUSTIFIED,
    spacing: { line: 312, after: 80 },
    indent: { right: 300 },
    children: [rtlRun("–  ", { bold: true, color: PALETTE.accent }), rtlRun(t)],
  }));
}

module.exports = { PALETTE, FONT, rtlRun, fa, h1, h2, codeLine, faTable, tableTitle, note, faList };
