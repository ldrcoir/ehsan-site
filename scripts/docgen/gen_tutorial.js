// ============================================================================
// gen_tutorial.js — ساخت TUTORIAL_FA_v1.docx (فارسی RTL) — v1.0
// ============================================================================
// معماری سه‌سکشنی طبق toc.md: جلد (بدون شماره) → فهرست (اعداد رومی) → بدنه
// (اعداد عربی از ۱). بعد از تولید، add_toc_placeholders.py و postcheck.py.
// ============================================================================

const {
  Document, Packer, Paragraph, TextRun, Header, Footer, PageBreak,
  AlignmentType, PageNumber, NumberFormat, SectionType, TableOfContents,
  BorderStyle,
} = require("docx");
const fs = require("fs");
const { PALETTE, rtlRun } = require("./rtl");
const { buildCoverR1RTL } = require("./cover");
const { chapters } = require("./content_tutorial");

const FA = { ascii: "Tahoma", hAnsi: "Tahoma", eastAsia: "Tahoma", cs: "Tahoma" };
const pgSize = { width: 11906, height: 16838 };
const pgMargin = { top: 1440, bottom: 1440, left: 1417, right: 1701 }; // RTL: margin راست بزرگ‌تر

function faFooter() {
  return new Footer({
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, font: FA, color: "666666" })],
    })],
  });
}

function faHeader() {
  return new Header({
    children: [new Paragraph({
      bidirectional: true,
      alignment: AlignmentType.START,
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: PALETTE.accent, space: 4 } },
      spacing: { after: 60 },
      children: [rtlRun("راهنمای نصب و مدیریت سایت — نسخه‌ی یک (v1.0)", { size: 16, color: "888888" })],
    })],
  });
}

const cover = buildCoverR1RTL({
  palette: PALETTE.cover,
  englishLabel: "EHSANMORAD.IR  //  PERSONAL SITE  //  v1.0",
  titleLines: ["راهنمای نصب و مدیریت", "وب‌سایت شخصی"],
  titlePt: 34,
  subtitle: "نصب روی VPS، پنل ادمین، سطوح دسترسی، کانال نگهداری امن، بک‌آپ و عیب‌یابی",
  metaLines: [
    "نسخه: ۱ (v1.0) — خروجی نهایی ممیزی کامل",
    "دامنه‌ها: ehsanmorad.ir · ehsan-morad.ir · ehsanmorad.id.ir",
    "سرور: Ubuntu VPS — Next.js 16 + SQLite + nginx",
    "تاریخ شمسی انتشار: در نام فایل zip",
  ],
  footerRight: "سند آموزشی رسمی — فارسی",
  footerLeft: "personal-site v1.0",
  topSpacing: 3400,
  bottomSpacing: 2600,
});

const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: FA, size: 24, color: PALETTE.body },
        paragraph: { spacing: { line: 312 } },
      },
    },
  },
  features: { updateFields: true },
  sections: [
    // --- سکشن ۱: جلد — بدون شماره و بدون footer ---
    {
      properties: { page: { size: pgSize, margin: { top: 0, bottom: 0, left: 0, right: 0 } } },
      children: cover,
    },
    // --- سکشن ۲: فهرست — رومی ---
    {
      properties: {
        type: SectionType.NEXT_PAGE,
        page: { size: pgSize, margin: pgMargin, pageNumbers: { start: 1, formatType: NumberFormat.UPPER_ROMAN } },
      },
      footers: { default: faFooter() },
      children: [
        new Paragraph({
          bidirectional: true,
          alignment: AlignmentType.CENTER,
          spacing: { before: 480, after: 360, line: 380, lineRule: "atLeast" },
          children: [rtlRun("فهرست مطالب", { bold: true, size: 32, color: PALETTE.primary })],
        }),
        new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-2" }),
        new Paragraph({
          bidirectional: true,
          spacing: { before: 200 },
          children: [rtlRun("یادآوری: این فهرست با کد فیلد ساخته شده است. بعد از هر تغییر، روی فهرست راست‌کلیک کن و «Update Field» را بزن تا شماره صفحات تازه شود.", { italics: true, size: 18, color: "888888" })],
        }),
        new Paragraph({ children: [new PageBreak()] }),
      ],
    },
    // --- سکشن ۳: بدنه — اعداد عربی از ۱ ---
    {
      properties: {
        type: SectionType.NEXT_PAGE,
        page: { size: pgSize, margin: pgMargin, pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL } },
      },
      headers: { default: faHeader() },
      footers: { default: faFooter() },
      children: chapters,
    },
  ],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync("/home/z/my-project/download/TUTORIAL_FA_v1.docx", buf);
  console.log("OK TUTORIAL_FA_v1.docx", buf.length, "bytes");
});
