/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Universal High-Fidelity Printing Utility
 * Ensures that printed documents and PDFs in hardcopy look exactly like on-screen layouts.
 * Automatically bundles all stylesheets, Tailwind styles, Google Fonts, and exact color reproduction.
 */

export interface PrintOptions {
  title?: string;
  orientation?: 'portrait' | 'landscape';
  pageMargin?: string;
  bodyClass?: string;
  customStyles?: string;
}

export function printElementById(elementId: string, options: PrintOptions = {}): Promise<boolean> {
  const element = document.getElementById(elementId);
  if (!element) {
    console.warn(`[PrintUtils] Target element #${elementId} not found in DOM.`);
    window.print();
    return Promise.resolve(false);
  }
  return printElementNode(element, options);
}

export function printElementNode(element: HTMLElement, options: PrintOptions = {}): Promise<boolean> {
  return new Promise((resolve) => {
    const {
      title = 'Saako Holy Child Academy - Document Print',
      orientation = 'portrait',
      pageMargin = orientation === 'landscape' ? '6mm' : '8mm',
      bodyClass = 'bg-white text-slate-900',
      customStyles = ''
    } = options;

    // Collect all head stylesheets and style tags, filtering out any destructive body hiding rules
    let stylesHtml = '';
    const styleTags = document.querySelectorAll('style, link[rel="stylesheet"]');
    styleTags.forEach(tag => {
      if (tag.tagName.toLowerCase() === 'link') {
        stylesHtml += tag.outerHTML + '\n';
      } else if (tag.tagName.toLowerCase() === 'style') {
        let cssText = tag.textContent || '';
        // Sanitize any destructive global hide or position rules
        cssText = cssText.replace(/body\s*\*\s*\{\s*visibility:\s*hidden[^}]*\}/gi, '');
        cssText = cssText.replace(/visibility:\s*hidden\s*!important/gi, '');
        stylesHtml += `<style>${cssText}</style>\n`;
      }
    });

    // Create or reuse hidden printing iframe
    let iframe = document.getElementById('saako-universal-print-frame') as HTMLIFrameElement;
    if (iframe) {
      iframe.remove();
    }

    iframe = document.createElement('iframe');
    iframe.id = 'saako-universal-print-frame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    iframe.style.pointerEvents = 'none';
    iframe.setAttribute('aria-hidden', 'true');
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!iframeDoc) {
      // Fallback to native window print
      window.print();
      resolve(false);
      return;
    }

    const htmlContent = element.outerHTML;

    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>${title}</title>
          ${stylesHtml}
          <style>
            @page {
              size: A4 ${orientation};
              margin: ${pageMargin};
            }
            *, *::before, *::after {
              box-sizing: border-box !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background-color: #ffffff !important;
              color: #0f172a !important;
              font-family: "Space Grotesk", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
              -webkit-font-smoothing: antialiased;
            }
            .no-print, [data-no-print="true"], button, input, select, textarea {
              display: none !important;
              visibility: hidden !important;
            }
            .page-break-before, .break-before-page {
              page-break-before: always !important;
              break-before: page !important;
            }
            .page-break-after, .break-after-page {
              page-break-after: always !important;
              break-after: page !important;
            }
            .page-break-avoid, .break-inside-avoid, tr, table thead, .avoid-break {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            /* Table formatting clarity */
            table {
              border-collapse: collapse !important;
              width: 100% !important;
            }
            /* Custom overrides */
            ${customStyles}
          </style>
        </head>
        <body class="${bodyClass}">
          <div class="print-container w-full">
            ${htmlContent}
          </div>
        </body>
      </html>
    `);
    iframeDoc.close();

    // Ensure all fonts and images are ready before triggering print dialog
    const triggerIframePrint = () => {
      try {
        if (iframe.contentWindow) {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
          resolve(true);
        } else {
          window.print();
          resolve(false);
        }
      } catch (err) {
        console.warn('[PrintUtils] Iframe print failed, falling back to window.print():', err);
        window.print();
        resolve(false);
      } finally {
        // Clean up iframe after print dialog finishes
        setTimeout(() => {
          if (iframe && iframe.parentNode) {
            iframe.parentNode.removeChild(iframe);
          }
        }, 3000);
      }
    };

    // Wait for fonts & images or fallback timeout
    if (iframeDoc.fonts && typeof iframeDoc.fonts.ready?.then === 'function') {
      iframeDoc.fonts.ready
        .then(() => setTimeout(triggerIframePrint, 200))
        .catch(() => setTimeout(triggerIframePrint, 350));
    } else {
      setTimeout(triggerIframePrint, 350);
    }
  });
}
