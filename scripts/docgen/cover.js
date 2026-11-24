// ============================================================================
// cover.js — جلد سند (دستور R1 از design-system — وفق‌داده به RTL فارسی) — v1.0
// ============================================================================
// معماری طبق دستور کار: جدول واحد 16838 با rule exact و allNoBorders؛
// سکشن جلد margin صفر؛ فاصله‌گذاری با spacing قبل از محتوا (بدون پاراگراف خالی
// پیاپی)؛ هیچ خط تزئینی متنی — فقط border پاراگراف.
// تفاوت RTL: متن‌ها راست‌چین و border حاشیه به سمت راست.
// ============================================================================

const {
  Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, WidthType, BorderStyle, ShadingType, TableLayoutType,
} = require("docx");

const noBorders = {
  top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
};
const allNoBorders = { ...noBorders, insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" } };

// عنوان فارسی — دستی در دو خط معنایی (قانون جلوگیری از شکست وسط کلمه)
function buildCoverR1RTL(config) {
  const P = config.palette;
  const padR = 1200, padL = 800; // در RTL پدینگ اصلی سمت راست است
  const titleLines = config.titleLines; // آرایه‌ی خطوط معنایی
  const titlePt = config.titlePt || 34;
  const titleSize = titlePt * 2;
  const accentRight = { style: BorderStyle.SINGLE, size: 8, color: P.accent, space: 12 };

  const children = [];

  // 1) فاصله‌ی بالای جلد (dynamic — محاسبه‌شده نه ثابت)
  children.push(new Paragraph({ spacing: { before: config.topSpacing || 3800 } }));

  // 2) لیبل بالای عنوان با border پایین accent
  if (config.englishLabel) {
    children.push(new Paragraph({
      alignment: AlignmentType.RIGHT,
      indent: { right: padR, left: padL },
      spacing: { after: 500 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: P.accent, space: 8 } },
      children: [new TextRun({
        text: config.englishLabel,
        size: 18, color: P.accent,
        font: { ascii: "Courier New", hAnsi: "Courier New", eastAsia: "Courier New", cs: "Courier New" },
        characterSpacing: 40,
      })],
    }));
  }

  // 3) عنوان اصلی (خطوط معنایی از پیش شکسته — Rule 8: spacing.line صریح)
  for (let i = 0; i < titleLines.length; i++) {
    children.push(new Paragraph({
      bidirectional: true,
      alignment: AlignmentType.START,
      indent: { right: padR, left: padL },
      spacing: { after: i < titleLines.length - 1 ? 100 : 300, line: Math.ceil(titlePt * 23), lineRule: "atLeast" },
      children: [new TextRun({
        text: titleLines[i], size: titleSize, sizeComplexScript: titleSize,
        bold: true, boldComplexScript: true, rightToLeft: true,
        color: P.titleColor,
        font: { ascii: "Tahoma", hAnsi: "Tahoma", eastAsia: "Tahoma", cs: "Tahoma" },
      })],
    }));
  }

  // 4) زیرعنوان
  if (config.subtitle) {
    children.push(new Paragraph({
      bidirectional: true,
      alignment: AlignmentType.START,
      indent: { right: padR, left: padL },
      spacing: { after: 800, line: 340, lineRule: "atLeast" },
      children: [new TextRun({
        text: config.subtitle, size: 24, sizeComplexScript: 24, rightToLeft: true,
        color: P.subtitleColor,
        font: { ascii: "Tahoma", hAnsi: "Tahoma", eastAsia: "Tahoma", cs: "Tahoma" },
      })],
    }));
  }

  // 5) خطوط متا با نوار accent راست
  for (const line of (config.metaLines || [])) {
    children.push(new Paragraph({
      bidirectional: true,
      alignment: AlignmentType.START,
      indent: { right: padR + 200, left: padL },
      spacing: { after: 80, line: 300, lineRule: "atLeast" },
      border: { right: accentRight },
      children: [new TextRun({
        text: line, size: 24, sizeComplexScript: 24, rightToLeft: true,
        color: P.metaColor,
        font: { ascii: "Tahoma", hAnsi: "Tahoma", eastAsia: "Tahoma", cs: "Tahoma" },
      })],
    }));
  }

  // 6) فاصله‌ی پایین
  children.push(new Paragraph({ spacing: { before: config.bottomSpacing || 3200 } }));

  // 7) خط پایانی با border بالا
  children.push(new Paragraph({
    bidirectional: true,
    alignment: AlignmentType.RIGHT,
    indent: { right: padR, left: padL },
    border: { top: { style: BorderStyle.SINGLE, size: 2, color: P.accent, space: 8 } },
    spacing: { before: 200 },
    children: [
      new TextRun({
        text: config.footerRight || "", size: 16, sizeComplexScript: 16, rightToLeft: true,
        color: P.footerColor, font: { ascii: "Tahoma", hAnsi: "Tahoma", eastAsia: "Tahoma", cs: "Tahoma" },
      }),
      new TextRun({
        text: "   |   " + (config.footerLeft || ""), size: 16,
        color: P.footerColor, font: { ascii: "Courier New", hAnsi: "Courier New", eastAsia: "Courier New", cs: "Courier New" },
      }),
    ],
  }));

  // جدول واحد 16838 — تنها جدول جلد
  return [new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: allNoBorders,
    rows: [new TableRow({
      height: { value: 16838, rule: "exact" },
      children: [new TableCell({
        shading: { type: ShadingType.CLEAR, fill: P.bg },
        borders: noBorders,
        verticalAlign: "top",
        children,
      })],
    })],
  })];
}

module.exports = { buildCoverR1RTL };
