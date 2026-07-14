import * as React from "react";

const WIDTH = 320;
const HEIGHT = 220;
const PLAYER_WIDTH = 24;
const PLAYER_HEIGHT = 10;
const PLAYER_SPEED = 4;
const BULLET_SPEED = 6;
const SHOT_COOLDOWN_MS = 280;
const INVADER_COLS = 8;
const INVADER_ROWS = 3;
const INVADER_SIZE = 16;
const INVADER_GAP = 10;
const INVADER_SPEED = 0.5;
const INVADER_DROP = 8;

interface Bullet {
  x: number;
  y: number;
}

interface Invader {
  x: number;
  y: number;
  alive: boolean;
}

function makeInvaders(): Invader[] {
  const invaders: Invader[] = [];
  for (let row = 0; row < INVADER_ROWS; row++) {
    for (let col = 0; col < INVADER_COLS; col++) {
      invaders.push({
        x: col * (INVADER_SIZE + INVADER_GAP) + 24,
        y: row * (INVADER_SIZE + INVADER_GAP) + 20,
        alive: true,
      });
    }
  }
  return invaders;
}

function drawBlockShip(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = "#e8c874";
  ctx.fillRect(x, y, PLAYER_WIDTH, PLAYER_HEIGHT);
}

// A simple, original squid-pal-inspired ship (round mantle + trailing
// tentacles) - not a reproduction of any specific game's artwork, just a
// small homage since the user wanted something squid-like here.
function drawSquidShip(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const centerX = x + PLAYER_WIDTH / 2;
  const mantleY = y + 3;

  ctx.fillStyle = "#b48ce6";
  ctx.beginPath();
  ctx.ellipse(centerX, mantleY, PLAYER_WIDTH / 2, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#2b1a40";
  ctx.fillRect(centerX - 6, mantleY - 1, 2, 2);
  ctx.fillRect(centerX + 4, mantleY - 1, 2, 2);

  ctx.fillStyle = "#9668cc";
  const tentacleCount = 4;
  const spacing = (PLAYER_WIDTH - 6) / (tentacleCount - 1);
  for (let i = 0; i < tentacleCount; i++) {
    const tx = x + 3 + i * spacing;
    ctx.fillRect(tx, y + 6, 2, 6);
  }
}

export type ShipStyle = "block" | "squid";

interface SpaceInvadersGameProps {
  shipStyle?: ShipStyle;
  caption?: string;
}

/**
 * A tiny, self-contained Space Invaders game - originally shown while the
 * app checks auth status on startup, now also reused during a server
 * deploy's wait (TICKET-0138). It just unmounts (per React's normal
 * behavior) whenever its parent stops rendering it, so there's no separate
 * "disappear" logic needed at either call site.
 */
export function SpaceInvadersGame({ shipStyle = "block", caption }: SpaceInvadersGameProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const ctx: CanvasRenderingContext2D = context;

    const drawShip = shipStyle === "squid" ? drawSquidShip : drawBlockShip;

    const keys: Record<string, boolean> = {};
    let playerX = WIDTH / 2 - PLAYER_WIDTH / 2;
    let bullets: Bullet[] = [];
    let invaders = makeInvaders();
    let invaderDir = 1;
    let lastShot = 0;
    let running = true;
    let frameId = 0;

    function handleKeyDown(e: KeyboardEvent) {
      keys[e.key] = true;
      if (e.key === " " || e.key.startsWith("Arrow")) e.preventDefault();
    }
    function handleKeyUp(e: KeyboardEvent) {
      keys[e.key] = false;
    }
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    function tick(time: number) {
      if (!running) return;

      if (keys["ArrowLeft"]) playerX = Math.max(0, playerX - PLAYER_SPEED);
      if (keys["ArrowRight"]) playerX = Math.min(WIDTH - PLAYER_WIDTH, playerX + PLAYER_SPEED);
      if (keys[" "] && time - lastShot > SHOT_COOLDOWN_MS) {
        bullets.push({ x: playerX + PLAYER_WIDTH / 2, y: HEIGHT - PLAYER_HEIGHT - 12 });
        lastShot = time;
      }

      bullets = bullets.filter((b) => b.y > 0);
      bullets.forEach((b) => (b.y -= BULLET_SPEED));

      let hitEdge = false;
      for (const inv of invaders) {
        if (!inv.alive) continue;
        inv.x += invaderDir * INVADER_SPEED;
        if (inv.x <= 0 || inv.x >= WIDTH - INVADER_SIZE) hitEdge = true;
      }
      if (hitEdge) {
        invaderDir *= -1;
        invaders.forEach((inv) => (inv.y += INVADER_DROP));
      }

      for (const b of bullets) {
        for (const inv of invaders) {
          if (inv.alive && b.x > inv.x && b.x < inv.x + INVADER_SIZE && b.y > inv.y && b.y < inv.y + INVADER_SIZE) {
            inv.alive = false;
            b.y = -100;
          }
        }
      }

      const anyAlive = invaders.some((inv) => inv.alive);
      const reachedBottom = invaders.some((inv) => inv.alive && inv.y > HEIGHT - 40);
      if (!anyAlive || reachedBottom) {
        invaders = makeInvaders();
        invaderDir = 1;
      }

      ctx.fillStyle = "#0b0e14";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      drawShip(ctx, playerX, HEIGHT - PLAYER_HEIGHT - 6);

      ctx.fillStyle = "#7fd4ff";
      for (const b of bullets) ctx.fillRect(b.x - 1, b.y, 2, 6);

      ctx.fillStyle = "#c65b5b";
      for (const inv of invaders) {
        if (inv.alive) ctx.fillRect(inv.x, inv.y, INVADER_SIZE, INVADER_SIZE);
      }

      frameId = requestAnimationFrame(tick);
    }

    frameId = requestAnimationFrame(tick);

    return () => {
      running = false;
      cancelAnimationFrame(frameId);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [shipStyle]);

  return (
    <div className="flex flex-col items-center gap-3">
      <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} className="rounded-md border border-gold-600/30" />
      <p className="text-xs text-parchment-300/40">{caption ?? "Use ← → and Space while you wait..."}</p>
    </div>
  );
}
