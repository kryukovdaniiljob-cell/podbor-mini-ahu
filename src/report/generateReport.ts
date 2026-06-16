// Генерация PDF-отчёта: рендерит ReportSheet офскрин, ждёт загрузки изображений,
// снимает html2canvas → раскладывает по страницам A4 в jsPDF → скачивает файл.
import React from 'react';
import { createRoot } from 'react-dom/client';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import type { SelectorResult, SelectorInput } from '../engine/types';
import { chartToPng } from './chartImage';
import ReportSheet from './ReportSheet';

function pad(n: number) { return String(n).padStart(2, '0'); }

function translit(s: string): string {
  return s.replace(/[^A-Za-z0-9_-]+/g, '_');
}

/** Дождаться загрузки всех <img> внутри контейнера. */
async function waitImages(el: HTMLElement): Promise<void> {
  const imgs = Array.from(el.querySelectorAll('img'));
  await Promise.all(
    imgs.map((img) =>
      img.complete && img.naturalWidth > 0
        ? Promise.resolve()
        : new Promise<void>((res) => {
            img.onload = () => res();
            img.onerror = () => res();
          }),
    ),
  );
}

export async function generateReport(result: SelectorResult, input: SelectorInput): Promise<void> {
  if (!result.ok || !result.m61) return;

  const now = new Date();
  const dateStr = `${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const reportNo = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
  const chartPng = chartToPng(result, input);

  // офскрин-контейнер
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:-10000px;top:0;width:794px;background:#fff;z-index:-1;';
  document.body.appendChild(host);
  const root = createRoot(host);

  try {
    root.render(
      React.createElement(ReportSheet, { result, input, chartPng, reportNo, dateStr }),
    );
    // дать React смонтировать DOM (setTimeout надёжнее rAF в фоновой вкладке)
    await new Promise<void>((resolve) => setTimeout(resolve, 80));

    await waitImages(host);

    const rootEl = host.firstElementChild as HTMLElement;
    const canvas = await html2canvas(rootEl, {
      scale: 1.6,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    // границы логических блоков (data-block) в координатах canvas — страницы режем
    // только по ним, чтобы блок (например график) не разрывался между страницами
    const rootRect = rootEl.getBoundingClientRect();
    const ratio = canvas.height / rootRect.height;
    const blockTops = Array.from(rootEl.querySelectorAll('[data-block]')).map(
      (el) => (el.getBoundingClientRect().top - rootRect.top) * ratio,
    );
    const cuts = Array.from(new Set([0, ...blockTops, canvas.height]))
      .filter((y) => y >= 0 && y <= canvas.height)
      .sort((a, b) => a - b);

    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const pxPerMm = canvas.width / pageW;
    const pageHpx = pageH * pxPerMm;

    let start = 0;
    let first = true;
    while (start < canvas.height - 1) {
      let end = start + pageHpx;
      if (end >= canvas.height) {
        end = canvas.height;
      } else {
        // последняя граница блока, помещающаяся на текущую страницу
        const candidate = cuts.filter((c) => c > start + 1 && c <= end).pop();
        if (candidate) end = candidate;
        // иначе блок выше страницы — режем жёстко (фолбэк)
      }
      const sliceH = Math.round(end - start);
      const slice = document.createElement('canvas');
      slice.width = canvas.width;
      slice.height = sliceH;
      const sctx = slice.getContext('2d')!;
      sctx.fillStyle = '#ffffff';
      sctx.fillRect(0, 0, slice.width, slice.height);
      sctx.drawImage(canvas, 0, start, canvas.width, sliceH, 0, 0, canvas.width, sliceH);

      if (!first) pdf.addPage();
      first = false;
      pdf.addImage(slice.toDataURL('image/jpeg', 0.85), 'JPEG', 0, 0, pageW, sliceH / pxPerMm);
      start = end;
    }

    const fileName = `Podbor_${translit(result.modelName)}_${reportNo}.pdf`;
    pdf.save(fileName);
  } finally {
    root.unmount();
    host.remove();
  }
}
