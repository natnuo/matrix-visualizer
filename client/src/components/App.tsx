import React, { useCallback, useState } from "react";
import styles from "../css/index.module.css";
import { cToDC, DEFAULT_TILE_COLOR, Tile } from "./Tile";

const ROWS = 5, COLS = 5;

const PNG_TILE_LENGTH = 200;
const UNEXPECTED_ERROR_MESSAGE = "Unexpected error. Please try again!";

const reportUnexpectedError = () => { alert(UNEXPECTED_ERROR_MESSAGE); };

type TileData = [number, React.Dispatch<React.SetStateAction<number>>];

const App = () => {
  const tileData = Array<Array<TileData>>(ROWS);
  for (let i=0;i<tileData.length;i++) tileData[i] = Array<TileData>(COLS);

  for (let y=0;y<ROWS;y++) {
    for (let x=0;x<COLS;x++) {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      tileData[y][x] = useState<number>(DEFAULT_TILE_COLOR);
    }
  }

  const makeImage = useCallback(() => {
    const canvas = document.createElement("canvas");
    canvas.width = COLS * PNG_TILE_LENGTH;
    canvas.height = ROWS * PNG_TILE_LENGTH;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      alert(UNEXPECTED_ERROR_MESSAGE);
      console.error("ctx undefined in makeImage");
      return;
    }

    for (let y=0;y<ROWS;y++) {
      for (let x=0;x<COLS;x++) {
        const [color, ] = tileData[y][x];
        ctx.fillStyle = cToDC(color);
        ctx.fillRect(x*PNG_TILE_LENGTH, y*PNG_TILE_LENGTH, PNG_TILE_LENGTH, PNG_TILE_LENGTH);
      }
    }

    return canvas;
  }, [tileData]);

  const exportPNG = useCallback(() => {
    const canvas = makeImage();
    if (!canvas) return;  // error already reported at this point by makeImage()

    const downloadElement = document.createElement("a");
    downloadElement.download = "matrix-image.png";
    downloadElement.href = canvas.toDataURL("image/png");
    downloadElement.click();
  }, [makeImage]);

  const exportClipboard = useCallback(async () => {
    try {
      const canvas = makeImage();
      if (!canvas) return;

      const toBlobPromise = (canvas: HTMLCanvasElement, type?: string) => {
        return new Promise<Blob | null>(
          (resolve, reject) => { canvas.toBlob((blob) => { resolve(blob); }, type); }
        );
      };
      const blob = await toBlobPromise(canvas, "image/png");
      if (!blob) {
        reportUnexpectedError();
        console.error("attempted to create blob resulted in null within exportClipboard");
        return;
      }

      navigator.clipboard.write([
        new ClipboardItem({
          "image/png": blob,
        })
      ]);
    } catch (err) {
      reportUnexpectedError();
      console.error(err);
    }
  }, [makeImage]);
  
  return (
    <div className={`${styles["flex"]} ${styles["bg-white"]}
    ${styles["p-6"]} ${styles["gap-3"]} ${styles["flex-col"]} ${styles["h-svh"]} ${styles["w-svw"]}`}>
      {/* Header */}
      <div className={`${styles["flex"]} ${styles["flex-col"]} ${styles["justify-center"]} ${styles["items-center"]}`}>
        <h1 className={`${styles["text-3xl"]}`}>5x5 Matrix Visualizer</h1>
        <span>Click each number to edit</span>
      </div>
      {/* Edit */}
      <div className={`${styles["flex"]} ${styles["w-full"]} ${styles["items-center"]}
      ${styles["justify-center"]} ${styles["relative"]}`} style={{height: `calc(100% - 150px)`}}>
        <div className={`${styles["max-w-full"]} ${styles["max-h-full"]} ${styles["aspect-square"]}`}>
          {
            tileData.map((row, y) => {
              return (<div className={`${styles["flex"]}`} style={{height: `${1/ROWS*100}%`}} key={`epRow${y}`}>
                {row.map(([tileColor, setTileColor], x) => {
                  return (<Tile color={tileColor} onColorChange={setTileColor} width={`${1/COLS*100}%`} key={`tile${y}x${x}`}></Tile>)
                })}
              </div>);
            })
          }
        </div>
      </div>

      {/* Export */}
      <div className={`${styles["items-center"]} ${styles["justify-center"]}
      ${styles["flex"]} ${styles["gap-3"]}`}>
        <button className={`${styles["btn"]}`} onClick={exportPNG}>Export as PNG</button>
        <button className={`${styles["btn"]}`} onClick={exportClipboard}>Copy Image</button>
      </div>
    </div>
  );
};

export default App;
