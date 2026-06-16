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

    const canvas = await html2canvas(host.firstElementChild as HTMLElement, {
      scale: 1.6,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgW = pageW;
    const imgH = (canvas.height * imgW) / canvas.width;

    // JPEG вместо PNG — отчёт для пересылки получается в разы легче
    const imgData = canvas.toDataURL('image/jpeg', 0.85);
    let heightLeft = imgH;
    let position = 0;
    pdf.addImage(imgData, 'JPEG', 0, position, imgW, imgH);
    heightLeft -= pageH;
    while (heightLeft > 0) {
      position -= pageH;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgW, imgH);
      heightLeft -= pageH;
    }

    const fileName = `Podbor_${translit(result.modelName)}_${reportNo}.pdf`;
    pdf.save(fileName);
  } finally {
    root.unmount();
    host.remove();
  }
}
