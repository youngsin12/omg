/**
 * Client-side print sheet generator.
 * Tiles an ID photo onto a standard 4x6 inch (102x152mm) photo print sheet
 * at 300dpi with cut guides, ready to print at any photo kiosk.
 */

export interface PrintSize {
  id: string;
  label: string;
  /** physical size in cm */
  widthCm: number;
  heightCm: number;
  note: string;
}

export const PRINT_SIZES: PrintSize[] = [
  { id: "banmyeongham", label: "반명함 (3×4cm)", widthCm: 3, heightCm: 4, note: "이력서·원서 제출용" },
  { id: "jeungmyeong", label: "증명사진 (3.5×4.5cm)", widthCm: 3.5, heightCm: 4.5, note: "제출 전 기관 규격 확인" },
  { id: "myeongham", label: "명함판 (5×7cm)", widthCm: 5, heightCm: 7, note: "명함판 대형" },
];

const DPI = 300;
const CM_PER_INCH = 2.54;
const SHEET_W_IN = 4; // 4x6" photo paper
const SHEET_H_IN = 6;

const cmToPx = (cm: number) => Math.round((cm / CM_PER_INCH) * DPI);

/**
 * Draws the image (cover-cropped to the target ratio) tiled on a white
 * 4x6" 300dpi sheet with light-gray cut guides.
 * Resolves to a PNG data URL.
 */
export function generatePhotoSheet(
  imageUrl: string,
  size: PrintSize
): Promise<{ dataUrl: string; count: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const sheetW = SHEET_W_IN * DPI;
        const sheetH = SHEET_H_IN * DPI;
        const cellW = cmToPx(size.widthCm);
        const cellH = cmToPx(size.heightCm);
        const gap = Math.round(0.2 / CM_PER_INCH * DPI); // 2mm cut gap

        const cols = Math.max(1, Math.floor((sheetW + gap) / (cellW + gap)));
        const rows = Math.max(1, Math.floor((sheetH + gap) / (cellH + gap)));
        const gridW = cols * cellW + (cols - 1) * gap;
        const gridH = rows * cellH + (rows - 1) * gap;
        const offsetX = Math.round((sheetW - gridW) / 2);
        const offsetY = Math.round((sheetH - gridH) / 2);

        const canvas = document.createElement("canvas");
        canvas.width = sheetW;
        canvas.height = sheetH;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("캔버스 컨텍스트를 생성할 수 없습니다.");

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, sheetW, sheetH);

        // cover-crop source rect to cell ratio
        const cellRatio = cellW / cellH;
        const imgRatio = img.width / img.height;
        let sx = 0, sy = 0, sw = img.width, sh = img.height;
        if (imgRatio > cellRatio) {
          sw = img.height * cellRatio;
          sx = (img.width - sw) / 2;
        } else {
          sh = img.width / cellRatio;
          sy = (img.height - sh) / 8; // bias crop upward — keep the head in frame
        }

        ctx.imageSmoothingQuality = "high";
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const x = offsetX + c * (cellW + gap);
            const y = offsetY + r * (cellH + gap);
            ctx.drawImage(img, sx, sy, sw, sh, x, y, cellW, cellH);
            ctx.strokeStyle = "#d4d4d8";
            ctx.lineWidth = 2;
            ctx.strokeRect(x - 1, y - 1, cellW + 2, cellH + 2);
          }
        }

        resolve({ dataUrl: canvas.toDataURL("image/png"), count: cols * rows });
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error("이미지를 불러오지 못했습니다."));
    img.src = imageUrl;
  });
}
