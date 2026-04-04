import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType } from 'docx';
import { readFileSync, writeFileSync } from 'fs';

function parseMarkdownToDocx(mdContent, title) {
  const lines = mdContent.split('\n');
  const children = [];

  let inTable = false;
  let tableRows = [];
  let inCodeBlock = false;
  let codeLines = [];

  function flushTable() {
    if (tableRows.length > 0) {
      const colCount = tableRows[0].length;
      const rows = tableRows.map((cells, rowIdx) =>
        new TableRow({
          children: cells.map(cell =>
            new TableCell({
              children: [new Paragraph({
                children: [new TextRun({
                  text: cell.trim(),
                  bold: rowIdx === 0,
                  size: 20,
                  font: 'Calibri',
                })],
                spacing: { before: 40, after: 40 },
              })],
              width: { size: Math.floor(9000 / colCount), type: WidthType.DXA },
            })
          ),
        })
      );
      children.push(new Table({
        rows,
        width: { size: 9000, type: WidthType.DXA },
      }));
      children.push(new Paragraph({ spacing: { after: 120 } }));
    }
    tableRows = [];
    inTable = false;
  }

  function flushCode() {
    if (codeLines.length > 0) {
      for (const cl of codeLines) {
        children.push(new Paragraph({
          children: [new TextRun({
            text: cl,
            font: 'Consolas',
            size: 18,
          })],
          spacing: { before: 20, after: 20 },
          indent: { left: 360 },
        }));
      }
      children.push(new Paragraph({ spacing: { after: 120 } }));
    }
    codeLines = [];
    inCodeBlock = false;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('```')) {
      if (inCodeBlock) {
        flushCode();
      } else {
        if (inTable) flushTable();
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    if (line.startsWith('|') && line.includes('|')) {
      const cells = line.split('|').filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);

      if (cells.every(c => /^[\s\-:]+$/.test(c))) {
        continue;
      }

      if (!inTable) inTable = true;
      tableRows.push(cells);
      continue;
    } else if (inTable) {
      flushTable();
    }

    if (line.trim() === '' || line.trim() === '---') {
      continue;
    }

    const h1Match = line.match(/^# (.+)/);
    const h2Match = line.match(/^## (.+)/);
    const h3Match = line.match(/^### (.+)/);
    const h4Match = line.match(/^#### (.+)/);
    const bulletMatch = line.match(/^[-*] (.+)/);
    const boldLineMatch = line.match(/^\*\*(.+)\*\*$/);

    if (h1Match) {
      children.push(new Paragraph({
        children: [new TextRun({ text: h1Match[1], bold: true, size: 36, font: 'Calibri', color: '1F3864' })],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 360, after: 200 },
      }));
    } else if (h2Match) {
      children.push(new Paragraph({
        children: [new TextRun({ text: h2Match[1], bold: true, size: 30, font: 'Calibri', color: '2E75B6' })],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 160 },
      }));
    } else if (h3Match) {
      children.push(new Paragraph({
        children: [new TextRun({ text: h3Match[1], bold: true, size: 26, font: 'Calibri', color: '404040' })],
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 240, after: 120 },
      }));
    } else if (h4Match) {
      children.push(new Paragraph({
        children: [new TextRun({ text: h4Match[1], bold: true, size: 24, font: 'Calibri' })],
        heading: HeadingLevel.HEADING_4,
        spacing: { before: 200, after: 100 },
      }));
    } else if (bulletMatch) {
      const textContent = bulletMatch[1];
      const runs = parseInlineFormatting(textContent);
      children.push(new Paragraph({
        children: runs,
        bullet: { level: 0 },
        spacing: { before: 40, after: 40 },
      }));
    } else {
      const runs = parseInlineFormatting(line);
      children.push(new Paragraph({
        children: runs,
        spacing: { before: 60, after: 60 },
      }));
    }
  }

  if (inTable) flushTable();
  if (inCodeBlock) flushCode();

  return new Document({
    title: title,
    sections: [{
      properties: {
        page: {
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      children,
    }],
  });
}

function parseInlineFormatting(text) {
  const runs = [];
  const regex = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|([^*`]+))/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match[2]) {
      runs.push(new TextRun({ text: match[2], bold: true, italics: true, size: 22, font: 'Calibri' }));
    } else if (match[3]) {
      runs.push(new TextRun({ text: match[3], bold: true, size: 22, font: 'Calibri' }));
    } else if (match[4]) {
      runs.push(new TextRun({ text: match[4], italics: true, size: 22, font: 'Calibri' }));
    } else if (match[5]) {
      runs.push(new TextRun({ text: match[5], font: 'Consolas', size: 20 }));
    } else if (match[6]) {
      runs.push(new TextRun({ text: match[6], size: 22, font: 'Calibri' }));
    }
  }

  if (runs.length === 0) {
    runs.push(new TextRun({ text: text, size: 22, font: 'Calibri' }));
  }

  return runs;
}

async function main() {
  const srsContent = readFileSync('docs/SRS.md', 'utf-8');
  const devContent = readFileSync('docs/DEVELOPER_GUIDE.md', 'utf-8');

  const srsDoc = parseMarkdownToDocx(srsContent, 'SRS - Epic Poetry Cafe');
  const devDoc = parseMarkdownToDocx(devContent, 'Developer Guide - Epic Poetry Cafe');

  const srsBuffer = await Packer.toBuffer(srsDoc);
  writeFileSync('docs/SRS.docx', srsBuffer);
  console.log('Generated docs/SRS.docx');

  const devBuffer = await Packer.toBuffer(devDoc);
  writeFileSync('docs/DEVELOPER_GUIDE.docx', devBuffer);
  console.log('Generated docs/DEVELOPER_GUIDE.docx');
}

main().catch(console.error);
