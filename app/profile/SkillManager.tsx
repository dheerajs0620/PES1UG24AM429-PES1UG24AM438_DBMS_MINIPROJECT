
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Bodies,
  Body,
  Composite,
  Engine,
  Mouse,
  MouseConstraint,
} from "matter-js";

type Skill = {
  skill_id: number;
  skill_name: string;
  skill_category: string;
  proficiency: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  source: "RESUME" | "MANUAL" | "ASSESSMENT";
  confidence_score: number | null;
  updated_at?: string;
};

type AvailableSkill = {
  skill_id: number;
  skill_name: string;
  skill_category: string;
};

const COLORS = [
  "#A78BFA",
  "#60A5FA",
  "#5EEAD4",
  "#FB7185",
  "#FBBF24",
  "#22D3EE",
  "#C4B5FD",
  "#34D399",
  "#FB923C",
  "#F0ABFC",
  "#818CF8",
  "#2DD4BF",
];

const PROFICIENCY_OPTIONS = [
  { value: "BEGINNER", label: "Beginner" },
  { value: "INTERMEDIATE", label: "Intermediate" },
  { value: "ADVANCED", label: "Advanced" },
] as const;

const inputClass =
  "w-full rounded-xl border border-white/10 bg-[#10162a] px-4 py-3 text-sm text-white outline-none transition focus:border-fuchsia-400/60";

function getSkillIcon(name: string) {
  const icons: Record<string, string> = {
    python: "Py",
    javascript: "JS",
    typescript: "TS",
    react: "⚛",
    "next.js": "▲",
    nodejs: "⬡",
    "node.js": "⬡",
    java: "J",
    "c++": "C++",
    cpp: "C++",
    c: "C",
    sql: "SQL",
    mysql: "DB",
    postgresql: "PG",
    mongodb: "DB",
    redis: "◆",
    docker: "DK",
    kubernetes: "K8",
    git: "Git",
    github: "GH",
    tensorflow: "TF",
    pytorch: "Py",
    opencv: "CV",
    "machine learning": "ML",
    "natural language processing": "NLP",
    fastapi: "⚡",
    security: "⬡",
    linux: "LX",
  };

  return icons[name.toLowerCase()] || name.slice(0, 3).toUpperCase();
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const r = Math.min(radius, width / 2, height / 2);

  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(
    x + width,
    y,
    x + width,
    y + r
  );
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(
    x + width,
    y + height,
    x + width - r,
    y + height
  );
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(
    x,
    y + height,
    x,
    y + height - r
  );
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawSkillBlock(
  ctx: CanvasRenderingContext2D,
  skill: Skill,
  body: Body,
  size: number,
  color: string,
  selected: boolean
) {
  ctx.save();

  ctx.translate(body.position.x, body.position.y);
  ctx.rotate(body.angle);

  const x = -size / 2;
  const y = -size / 2;

  // Outer ambient glow
  ctx.shadowColor = color;
  ctx.shadowBlur = selected ? 32 : 20;
  ctx.shadowOffsetY = 6;

  // Rich jewel-tone gradient
  const gradient = ctx.createLinearGradient(
    x,
    y,
    -x,
    -y
  );

  gradient.addColorStop(0, color);
  gradient.addColorStop(0.55, color);
  gradient.addColorStop(1, "#17152D");

  roundedRect(ctx, x, y, size, size, 17);

  ctx.fillStyle = gradient;
  ctx.fill();

  // Reset shadow for crisp details
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // Glowing outline
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.9;
  ctx.lineWidth = selected ? 2.5 : 1.5;
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Glossy upper highlight
  ctx.save();

  roundedRect(ctx, x + 1, y + 1, size - 2, size * 0.46, 15);
  ctx.clip();

  const highlight = ctx.createLinearGradient(
    0,
    y,
    0,
    0
  );

  highlight.addColorStop(0, "rgba(255,255,255,0)");
  highlight.addColorStop(1, "rgba(255,255,255,0.18)");

  ctx.fillStyle = highlight;
  ctx.fillRect(x, y, size, size * 0.46);

  ctx.restore();

  // Icon
  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `900 ${size * 0.29}px Arial`;

  ctx.fillText(
    getSkillIcon(skill.skill_name),
    0,
    -size * 0.09
  );

  // Skill name
  ctx.fillStyle = "rgba(255,255,255,0.96)";
  ctx.font = `bold ${Math.max(9, size * 0.105)}px Arial`;

  const displayName =
    skill.skill_name.length > 16
      ? skill.skill_name.slice(0, 15) + "…"
      : skill.skill_name;

  ctx.fillText(displayName, 0, size * 0.29);

  // Selection indicator
  if (selected) {
    ctx.strokeStyle = "#FFFFFF";
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = 2;
    roundedRect(ctx, x - 3, y - 3, size + 6, size + 6, 19);
    ctx.stroke();
  }

  ctx.restore();
}

export default function SkillManager() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [availableSkills, setAvailableSkills] = useState<
    AvailableSkill[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [updatingSkill, setUpdatingSkill] = useState<number | null>(
    null
  );
  const [removingSkill, setRemovingSkill] = useState<number | null>(
    null
  );

  const [selectedSkill, setSelectedSkill] = useState("");
  const [selectedProficiency, setSelectedProficiency] =
    useState<Skill["proficiency"]>("BEGINNER");

  const [selectedTile, setSelectedTile] = useState<Skill | null>(
    null
  );

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [gravityEnabled, setGravityEnabled] = useState(true);
  const [resetVersion, setResetVersion] = useState(0);

  const [stageSize, setStageSize] = useState({
    width: 800,
    height: 490,
  });

  const [physicsReady, setPhysicsReady] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const engineRef = useRef<Engine | null>(null);
  const bodiesRef = useRef<
    { id: number; body: Body; size: number }[]
  >([]);

  const animationRef = useRef<number | null>(null);

  const panelClass =
    "rounded-3xl border border-white/[0.09] bg-gradient-to-br from-[#14182d] to-[#0c1122] p-5 sm:p-7 lg:p-8";

  // --------------------------------------------------
  // LOAD SKILLS
  // --------------------------------------------------

  const loadSkills = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/profile/skills", {
        credentials: "include",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to load skills.");
      }

      setSkills(Array.isArray(data.skills) ? data.skills : []);

      setAvailableSkills(
        Array.isArray(data.availableSkills)
          ? data.availableSkills
          : []
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load skills."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSkills();
  }, [loadSkills]);

  // --------------------------------------------------
  // PLAYGROUND DIMENSIONS
  // --------------------------------------------------

  useEffect(() => {
    const element = stageRef.current;

    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;

      if (!rect) return;

      setStageSize({
        width: rect.width,
        height: rect.height,
      });
    });

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  // --------------------------------------------------
  // GROUP SKILLS
  // --------------------------------------------------

  const groupedSkills = useMemo(() => {
    const groups: Record<string, Skill[]> = {};

    skills.forEach((skill) => {
      const category = skill.skill_category || "General";

      if (!groups[category]) {
        groups[category] = [];
      }

      groups[category].push(skill);
    });

    return Object.entries(groups).sort(([a], [b]) =>
      a.localeCompare(b)
    );
  }, [skills]);

  const skillsAvailableToAdd = useMemo(() => {
    const existing = new Set(
      skills.map((skill) => skill.skill_id)
    );

    return availableSkills.filter(
      (skill) => !existing.has(skill.skill_id)
    );
  }, [skills, availableSkills]);

  // --------------------------------------------------
  // MATTER.JS PHYSICS
  // --------------------------------------------------

  useEffect(() => {
    const canvas = canvasRef.current;

    if (
      !canvas ||
      !stageSize.width ||
      !stageSize.height ||
      loading
    ) {
      return;
    }

    const width = stageSize.width;
    const height = stageSize.height;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);

    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    const engine = Engine.create({
      enableSleeping: false,
    });

    engine.gravity.x = 0;
    engine.gravity.y = gravityEnabled ? 1 : 0;
    engine.gravity.scale = 0.001;

    engine.positionIterations = 8;
    engine.velocityIterations = 8;

    engineRef.current = engine;

    const wall = 100;

    const boundaries = [
      Bodies.rectangle(
        width / 2,
        -wall / 2,
        width + wall * 2,
        wall,
        { isStatic: true }
      ),

      Bodies.rectangle(
        width / 2,
        height + wall / 2,
        width + wall * 2,
        wall,
        { isStatic: true }
      ),

      Bodies.rectangle(
        -wall / 2,
        height / 2,
        wall,
        height + wall * 2,
        { isStatic: true }
      ),

      Bodies.rectangle(
        width + wall / 2,
        height / 2,
        wall,
        height + wall * 2,
        { isStatic: true }
      ),
    ];

    Composite.add(engine.world, boundaries);

    const tileSize =
      width < 480 ? 78 : width < 760 ? 88 : 100;

    const columns = Math.max(
      2,
      Math.floor(width / (tileSize + 15))
    );

    const bodies = skills.map((skill, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);

      const x = Math.min(
        width - tileSize / 2 - 5,
        Math.max(
          tileSize / 2 + 5,
          tileSize / 2 + column * (tileSize + 12) + 8
        )
      );

      const y =
        35 +
        row * (tileSize + 15) +
        Math.random() * 35;

      const body = Bodies.rectangle(
        x,
        Math.min(y, Math.max(35, height - tileSize - 30)),
        tileSize,
        tileSize,
        {
          restitution: 0.78,
          friction: 0.08,
          frictionAir: 0.002,
          density: 0.0012,
          chamfer: { radius: 17 },
          label: String(skill.skill_id),
        }
      );

      Body.setAngle(body, (Math.random() - 0.5) * 0.5);

      Body.setVelocity(body, {
        x: (Math.random() - 0.5) * 2,
        y: Math.random() * 1.5,
      });

      Body.setAngularVelocity(
        body,
        (Math.random() - 0.5) * 0.025
      );

      return {
        id: skill.skill_id,
        body,
        size: tileSize,
      };
    });

    Composite.add(
      engine.world,
      bodies.map((item) => item.body)
    );

    bodiesRef.current = bodies;

    // Matter.js mouse interaction
    const mouse = Mouse.create(canvas);

    const mouseConstraint = MouseConstraint.create(engine, {
      mouse,
      constraint: {
        stiffness: 0.18,
        damping: 0.12,
        render: { visible: false },
      },
    });

    Composite.add(engine.world, mouseConstraint);

    // Draw all blocks
    const draw = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      ctx.clearRect(0, 0, width, height);

      ctx.fillStyle = "#03040A";
      ctx.fillRect(0, 0, width, height);

      // Subtle atmospheric lighting
      const atmosphere = ctx.createRadialGradient(
        width * 0.5,
        height * 0.4,
        20,
        width * 0.5,
        height * 0.4,
        width * 0.8
      );

      atmosphere.addColorStop(0, "rgba(88,60,160,0.09)");
      atmosphere.addColorStop(1, "rgba(0,0,0,0)");

      ctx.fillStyle = atmosphere;
      ctx.fillRect(0, 0, width, height);

      bodies.forEach(({ id, body, size }, index) => {
        const skill = skills.find(
          (item) => item.skill_id === id
        );

        if (!skill) return;

        const color = COLORS[index % COLORS.length];

        drawSkillBlock(
          ctx,
          skill,
          body,
          size,
          color,
          selectedTile?.skill_id === id
        );
      });
    };

    draw();

    setPhysicsReady(true);

    let lastTime = 0;

    const animate = (time: number) => {
      if (time - lastTime >= 1000 / 60) {
        Engine.update(engine, 1000 / 60);
        draw();
        lastTime = time;
      }

      animationRef.current =
        requestAnimationFrame(animate);
    };

    animationRef.current =
      requestAnimationFrame(animate);

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }

      Composite.clear(engine.world, false);
      Engine.clear(engine);
      Mouse.clearSourceEvents(mouse);

      bodiesRef.current = [];
      engineRef.current = null;

      setPhysicsReady(false);
    };
  }, [
    skills,
    stageSize.width,
    stageSize.height,
    resetVersion,
    loading,
    selectedTile?.skill_id,
  ]);

  // Gravity toggle
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.gravity.y = gravityEnabled ? 1 : 0;
    }
  }, [gravityEnabled]);

  // --------------------------------------------------
  // SELECT SKILL
  // --------------------------------------------------

  const handleCanvasClick = (
    event: React.MouseEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;

    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const clicked = [...bodiesRef.current]
      .reverse()
      .find(({ body, size }) => {
        const dx = Math.abs(x - body.position.x);
        const dy = Math.abs(y - body.position.y);

        return dx < size / 2 && dy < size / 2;
      });

    if (clicked) {
      const skill = skills.find(
        (item) => item.skill_id === clicked.id
      );

      if (skill) setSelectedTile(skill);
    }
  };

  // --------------------------------------------------
  // RESET
  // --------------------------------------------------

  const resetPlayground = () => {
    setSelectedTile(null);
    setResetVersion((value) => value + 1);
  };

  // --------------------------------------------------
  // ADD SKILL
  // --------------------------------------------------

  async function addSkill() {
    if (!selectedSkill) {
      setError("Please select a skill first.");
      return;
    }

    setAdding(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/profile/skills", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          skill_id: Number(selectedSkill),
          proficiency: selectedProficiency,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to add skill.");
      }

      setSelectedSkill("");
      setSelectedProficiency("BEGINNER");
      setSuccess("Skill added successfully.");

      await loadSkills();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to add skill."
      );
    } finally {
      setAdding(false);
    }
  }

  // --------------------------------------------------
  // UPDATE PROFICIENCY
  // --------------------------------------------------

  async function updateProficiency(
    skillId: number,
    proficiency: Skill["proficiency"]
  ) {
    setUpdatingSkill(skillId);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/profile/skills", {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          skill_id: skillId,
          proficiency,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to update proficiency."
        );
      }

      setSkills((current) =>
        current.map((skill) =>
          skill.skill_id === skillId
            ? { ...skill, proficiency }
            : skill
        )
      );

      setSelectedTile((current) =>
        current?.skill_id === skillId
          ? { ...current, proficiency }
          : current
      );

      setSuccess("Proficiency updated.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update proficiency."
      );
    } finally {
      setUpdatingSkill(null);
    }
  }

  // --------------------------------------------------
  // REMOVE MANUAL SKILL
  // --------------------------------------------------

  async function removeSkill(skill: Skill) {
    if (skill.source !== "MANUAL") {
      setError(
        "Only manually added skills can be removed here."
      );
      return;
    }

    if (
      !window.confirm(
        `Remove ${skill.skill_name} from your profile?`
      )
    ) {
      return;
    }

    setRemovingSkill(skill.skill_id);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/profile/skills", {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          skill_id: skill.skill_id,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to remove skill."
        );
      }

      setSkills((current) =>
        current.filter(
          (item) => item.skill_id !== skill.skill_id
        )
      );

      setSelectedTile((current) =>
        current?.skill_id === skill.skill_id
          ? null
          : current
      );

      setSuccess("Skill removed successfully.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to remove skill."
      );
    } finally {
      setRemovingSkill(null);
    }
  }

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <section className={panelClass}>
      {/* Header */}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-fuchsia-400/30 bg-fuchsia-500/10 text-xl text-fuchsia-300">
            ✦
          </div>

          <div>
            <h2 className="text-xl font-bold text-white">
              Skills & Expertise
            </h2>

            <p className="mt-1 text-xs text-slate-400">
              Your technical identity, visualized.
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <div className="rounded-xl border border-purple-400/20 bg-purple-500/10 px-4 py-2 text-center">
            <p className="text-xl font-extrabold text-fuchsia-300">
              {skills.length}
            </p>
            <p className="text-[10px] text-slate-400">
              Skills
            </p>
          </div>

          <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-2 text-center">
            <p className="text-xl font-extrabold text-cyan-300">
              {groupedSkills.length}
            </p>
            <p className="text-[10px] text-slate-400">
              Categories
            </p>
          </div>
        </div>
      </div>

      {/* Feedback */}

      {error && (
        <div className="mt-5 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-5 rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-300">
          {success}
        </div>
      )}

      {/* Playground */}

      <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_20px_65px_rgba(0,0,0,0.45)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] bg-[#08090D] px-4 py-4 sm:px-5">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${
                  physicsReady
                    ? "animate-pulse bg-emerald-400"
                    : "bg-amber-400"
                }`}
              />

              <h3 className="text-sm font-bold text-white">
                Interactive Skills Playground
              </h3>
            </div>

            <p className="mt-1 text-[11px] text-slate-500">
              Drag, throw and interact with your skill blocks.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                setGravityEnabled((value) => !value)
              }
              className="rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
            >
              {gravityEnabled
                ? "↓ Gravity ON"
                : "◉ Gravity OFF"}
            </button>

            <button
              type="button"
              onClick={resetPlayground}
              className="rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
            >
              ↻ Reset
            </button>
          </div>
        </div>

        <div
          ref={stageRef}
          className="relative h-[390px] overflow-hidden bg-[#03040A] sm:h-[440px] lg:h-[490px]"
        >
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-500">
              Loading your skills...
            </div>
          ) : skills.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-4xl text-slate-600">
                ✦
              </span>

              <p className="mt-3 text-sm font-semibold text-white">
                Your playground is waiting
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Add your first skill below.
              </p>
            </div>
          ) : (
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              className="absolute inset-0 block h-full w-full cursor-grab active:cursor-grabbing"
              style={{ touchAction: "none" }}
            />
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.08] bg-[#08090D] px-4 py-3">
          <p className="text-[10px] text-slate-500">
            <span className="text-emerald-400">●</span>{" "}
            {physicsReady
              ? "Physics simulation active"
              : "Preparing simulation"}
          </p>

          <p className="text-[10px] text-slate-500">
            {skills.length} interactive blocks
          </p>
        </div>
      </div>

      {/* Selected skill */}

      {selectedTile && (
        <div className="mt-4 rounded-2xl border border-fuchsia-400/20 bg-gradient-to-r from-purple-500/[0.09] to-cyan-500/[0.04] p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-fuchsia-300">
                Selected skill
              </p>

              <h3 className="mt-1 text-lg font-bold text-white">
                {selectedTile.skill_name}
              </h3>

              <p className="mt-1 text-xs text-slate-400">
                {selectedTile.skill_category} ·{" "}
                {selectedTile.source}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSelectedTile(null)}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-400 hover:text-white"
            >
              Close
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="text-xs text-slate-400">
              Proficiency
            </label>

            <select
              className="max-w-48 rounded-lg border border-white/10 bg-[#11162b] px-3 py-2 text-xs text-white outline-none focus:border-fuchsia-400"
              value={selectedTile.proficiency}
              disabled={
                updatingSkill === selectedTile.skill_id
              }
              onChange={(event) =>
                updateProficiency(
                  selectedTile.skill_id,
                  event.target.value as Skill["proficiency"]
                )
              }
            >
              {PROFICIENCY_OPTIONS.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              ))}
            </select>

            {selectedTile.source === "MANUAL" && (
              <button
                type="button"
                onClick={() => removeSkill(selectedTile)}
                disabled={
                  removingSkill === selectedTile.skill_id
                }
                className="rounded-lg border border-red-400/20 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/10 disabled:opacity-50"
              >
                {removingSkill === selectedTile.skill_id
                  ? "Removing..."
                  : "Remove skill"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Add skill */}

      <div className="mt-7 rounded-2xl border border-purple-400/20 bg-[#0b1022]/80 p-5 sm:p-6">
        <h3 className="font-bold text-white">
          Add a new skill
        </h3>

        <p className="mt-1 text-xs text-slate-500">
          Add another capability from the InternHub skill catalogue.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_180px_auto]">
          <select
            className={inputClass}
            value={selectedSkill}
            onChange={(event) =>
              setSelectedSkill(event.target.value)
            }
          >
            <option value="">Select a skill</option>

            {skillsAvailableToAdd.map((skill) => (
              <option
                key={skill.skill_id}
                value={skill.skill_id}
              >
                {skill.skill_name} — {skill.skill_category}
              </option>
            ))}
          </select>

          <select
            className={inputClass}
            value={selectedProficiency}
            onChange={(event) =>
              setSelectedProficiency(
                event.target.value as Skill["proficiency"]
              )
            }
          >
            {PROFICIENCY_OPTIONS.map((option) => (
              <option
                key={option.value}
                value={option.value}
              >
                {option.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={addSkill}
            disabled={adding || !selectedSkill}
            className="rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-5 py-3 text-sm font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {adding ? "Adding..." : "+ Add Skill"}
          </button>
        </div>

        {skillsAvailableToAdd.length === 0 && (
          <p className="mt-3 text-xs text-slate-500">
            All available catalogue skills have already been added.
          </p>
        )}
      </div>

      {/* Skill inventory */}

      <div className="mt-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-white">
              Skill Inventory
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              Browse and manage skills by category.
            </p>
          </div>

          <button
            type="button"
            onClick={loadSkills}
            disabled={loading}
            className="text-xs font-semibold text-fuchsia-300 hover:text-white disabled:opacity-50"
          >
            ↻ Refresh
          </button>
        </div>

        {loading ? (
          <div className="py-10 text-center text-sm text-slate-400">
            Loading your skills...
          </div>
        ) : skills.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 py-12 text-center">
            <p className="text-3xl text-fuchsia-300">✧</p>

            <p className="mt-3 text-sm font-semibold text-slate-300">
              No skills added yet
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Add your first skill using the form above.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {groupedSkills.map(([category, categorySkills]) => (
              <div
                key={category}
                className="rounded-2xl border border-white/[0.07] bg-gradient-to-br from-[#11172c] to-[#0b1020] p-4 sm:p-5"
              >
                <div className="mb-4 flex items-center justify-between">
                  <h4 className="text-sm font-bold text-purple-200">
                    {category}
                  </h4>

                  <span className="rounded-full border border-purple-400/20 bg-purple-500/10 px-2.5 py-1 text-[10px] text-purple-200">
                    {categorySkills.length} skills
                  </span>
                </div>

                <div className="space-y-3">
                  {categorySkills.map((skill) => (
                    <div
                      key={skill.skill_id}
                      className="flex flex-col gap-3 rounded-xl border border-white/[0.06] bg-[#090e1d]/80 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="break-words text-sm font-semibold text-white">
                          {skill.skill_name}
                        </p>

                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] text-slate-400">
                            {skill.source}
                          </span>

                          <span
                            className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                              skill.proficiency === "ADVANCED"
                                ? "bg-emerald-500/10 text-emerald-300"
                                : skill.proficiency === "INTERMEDIATE"
                                  ? "bg-blue-500/10 text-blue-300"
                                  : "bg-amber-500/10 text-amber-300"
                            }`}
                          >
                            {skill.proficiency}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          aria-label={`Proficiency for ${skill.skill_name}`}
                          className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#151a30] px-2 py-2 text-xs text-slate-200 outline-none focus:border-fuchsia-400 sm:flex-none"
                          value={skill.proficiency}
                          disabled={
                            updatingSkill === skill.skill_id
                          }
                          onChange={(event) =>
                            updateProficiency(
                              skill.skill_id,
                              event.target.value as Skill["proficiency"]
                            )
                          }
                        >
                          {PROFICIENCY_OPTIONS.map((option) => (
                            <option
                              key={option.value}
                              value={option.value}
                            >
                              {option.label}
                            </option>
                          ))}
                        </select>

                        {skill.source === "MANUAL" && (
                          <button
                            type="button"
                            onClick={() => removeSkill(skill)}
                            disabled={
                              removingSkill === skill.skill_id
                            }
                            className="rounded-lg border border-red-400/20 px-3 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/10 disabled:opacity-50"
                          >
                            {removingSkill === skill.skill_id
                              ? "..."
                              : "Remove"}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
