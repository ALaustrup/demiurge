"use client";

import { useEffect, useState, useCallback } from "react";

interface OverworldProps {
  onEncounter: () => void;
  disabled?: boolean;
}

const WIDTH = 12;
const HEIGHT = 8;

export function Overworld({ onEncounter, disabled }: OverworldProps) {
  const [x, setX] = useState(5);
  const [y, setY] = useState(4);

  const handleMove = useCallback(
    (dx: number, dy: number) => {
      if (disabled) return;

      const newX = Math.max(0, Math.min(WIDTH - 1, x + dx));
      const newY = Math.max(0, Math.min(HEIGHT - 1, y + dy));

      if (newX === x && newY === y) return; // No movement

      setX(newX);
      setY(newY);

      // Random encounter chance (12%)
      const roll = Math.random();
      if (roll < 0.12) {
        onEncounter();
      }
    },
    [onEncounter, disabled, x, y]
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (disabled) return;

      switch (e.key) {
        case "ArrowUp":
        case "w":
        case "W":
          e.preventDefault();
          handleMove(0, -1);
          break;
        case "ArrowDown":
        case "s":
        case "S":
          e.preventDefault();
          handleMove(0, 1);
          break;
        case "ArrowLeft":
        case "a":
        case "A":
          e.preventDefault();
          handleMove(-1, 0);
          break;
        case "ArrowRight":
        case "d":
        case "D":
          e.preventDefault();
          handleMove(1, 0);
          break;
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleMove, disabled]);

  const tiles = [];
  for (let row = 0; row < HEIGHT; row++) {
    for (let col = 0; col < WIDTH; col++) {
      const isPlayer = row === y && col === x;
      tiles.push(
        <div
          key={`${row}-${col}`}
          className={`border border-slate-700 relative ${
            isPlayer ? "bg-cyan-900" : "bg-slate-900"
          }`}
          style={{ aspectRatio: "1" }}
        >
          {isPlayer && (
            <div className="absolute inset-1 bg-cyan-400/80 rounded-sm shadow-lg shadow-cyan-500/50 flex items-center justify-center">
              <div className="w-2 h-2 bg-cyan-200 rounded-full" />
            </div>
          )}
        </div>
      );
    }
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div
        className="grid flex-1"
        style={{
          gridTemplateColumns: `repeat(${WIDTH}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${HEIGHT}, minmax(0, 1fr))`,
        }}
      >
        {tiles}
      </div>
      <p className="mt-2 text-xs text-slate-400 text-center">
        Use arrow keys or WASD to move. Walking might trigger wild encounters.
      </p>
    </div>
  );
}

