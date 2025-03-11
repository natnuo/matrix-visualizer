import { useCallback } from "react";
import styles from "../css/index.module.css";

const RGB_MAX = 255;

export const DEFAULT_TILE_COLOR = 0.0;

export const Tile = (
        {color, onColorChange, width}:
        {color: number, onColorChange: (newColor: number) => void, width: string}
) => {
        const colorInputOnChange = useCallback((e: React.FormEvent<HTMLInputElement>) => {
                onColorChange(parseFloat((e.target as HTMLInputElement).value));
        }, [onColorChange]);

        return (<div
                className={`${styles["aspect-square"]} ${styles["flex"]} ${styles["items-center"]}
                ${styles["content-center"]}`}
                style={{
                        width: width,
                        backgroundColor: cToDC(color)
                }}
        >
                <input
                        type="number"
                        step="0.01"
                        defaultValue={DEFAULT_TILE_COLOR}
                        className={`${styles["w-full"]} ${styles["h-full"]}
                        ${styles["outline-none"]} ${styles["bg-transparent"]}
                        ${(isNaN(color) || color < 0.6) ? styles["text-white"] : styles["text-black"]} ${styles["text-center"]}`}
                        onInput={colorInputOnChange}
                ></input>
        </div>);
};

export const cToDC = (color: number) => {
        const sp = isNaN(color) ? 0 : RGB_MAX*Math.max(Math.min(color, 1), 0);
        return `rgb(${sp}, ${sp}, ${sp})`
};
