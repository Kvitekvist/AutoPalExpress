import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Award, Check, Circle, GraduationCap, LockKeyhole, Play, ShieldCheck, UserRoundX } from "lucide-react";
import { universityApi } from "@/api";
import { RuneButton } from "@/components/fantasy/RuneButton";
import { ScrollPanel } from "@/components/fantasy/ScrollPanel";
import { UNIVERSITY_UPDATED } from "@/components/university/UniversityQuestTracker";
import { useNotifications } from "@/hooks/useNotifications";
import type { UniversityCatalog, UniversityCourse } from "@/types/models";

function Confetti() {
  const colors = ["#dfb15a", "#7dd3fc", "#86efac", "#c084fc"];
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {Array.from({ length: 48 }, (_, i) => (
        <span
          key={i}
          className="absolute top-[-5%] h-3 w-2 animate-[fall_2.8s_ease-in_forwards]"
          style={{
            left: `${(i * 37) % 100}%`,
            backgroundColor: colors[i % colors.length],
            animationDelay: `${(i % 12) * 0.08}s`,
            transform: `rotate(${i * 29}deg)`,
          }}
        />
      ))}
    </div>
  );
}

function Diploma({ course }: { course: UniversityCourse }) {
  return (
    <div className="rounded-lg border-2 border-gold-500/60 bg-gold-950/20 p-5 text-center shadow-rune-gold">
      <Award className="mx-auto h-10 w-10 text-gold-300" />
      <p className="mt-2 text-xs uppercase tracking-[0.25em] text-gold-400/70">Diploma awarded</p>
      <h3 className="mt-1 font-display text-xl text-gold-200">{course.title}</h3>
      <p className="mt-1 text-xs text-parchment-300/50">
        Completed {new Date((course.graduatedAt ?? 0) * 1000).toLocaleDateString()}
      </p>
    </div>
  );
}

export default function University() {
  const navigate = useNavigate();
  const notifications = useNotifications();
  const [catalog, setCatalog] = React.useState<UniversityCatalog | null>(null);
  const [celebrate, setCelebrate] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    universityApi
      .getCatalog()
      .then(setCatalog)
      .catch((e) => notifications.error({ title: "Could not open APE University", message: e.message }));
  }, [notifications]);

  async function apply(action: () => Promise<UniversityCatalog>, wasGraduated = false) {
    setBusy(true);
    try {
      const next = await action();
      setCatalog(next);
      window.dispatchEvent(new Event(UNIVERSITY_UPDATED));
      if (!wasGraduated && next.activeCourse === null) {
        setCelebrate(true);
        setTimeout(() => setCelebrate(false), 3200);
        notifications.success({
          title: "Degree earned!",
          message: "Congratulations — your APE University diploma has been awarded.",
        });
      }
    } catch (e) {
      notifications.error({ title: "Lesson not completed", message: e instanceof Error ? e.message : "Try again." });
    } finally {
      setBusy(false);
    }
  }

  if (!catalog) return <p className="text-parchment-300/60">Opening the academy...</p>;
  const active = catalog.courses.find((course) => course.id === catalog.activeCourse);

  return (
    <div className="space-y-6">
      {celebrate && <Confetti />}
      <header>
        <div className="flex items-center gap-3">
          <GraduationCap className="h-9 w-9 text-gold-400" />
          <div>
            <h1 className="font-display text-3xl text-gradient-gold">APE University</h1>
            <p className="text-sm text-parchment-300/60">
              Learn the realm in a safe, logical order. Earn diplomas as you graduate.
            </p>
          </div>
        </div>
      </header>

      {active && (
        <ScrollPanel title={`Active quest: ${active.shortTitle}`} icon={<ShieldCheck />}>
          <div className="space-y-3">
            {active.steps.map((step, index) => {
              const isNext = !step.completed && !step.locked;
              return (
                <div
                  key={step.id}
                  className={`rounded-md border p-4 ${isNext ? "border-gold-500/50 bg-gold-950/20" : "border-stone-700 bg-abyss-950/30"}`}
                >
                  <div className="flex gap-3">
                    {step.completed ? (
                      <Check className="mt-0.5 h-5 w-5 text-life-400" />
                    ) : step.locked ? (
                      <LockKeyhole className="mt-0.5 h-5 w-5 text-stone-500" />
                    ) : (
                      <Circle className="mt-0.5 h-5 w-5 text-gold-400" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-parchment-100">
                        {index + 1}. {step.title}
                      </p>
                      <p className="mt-1 text-sm text-parchment-300/60">{step.description}</p>
                      {isNext && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {step.id === "kick_training" ? (
                            <RuneButton
                              size="sm"
                              variant="danger"
                              icon={<UserRoundX />}
                              onClick={() => apply(() => universityApi.completeStep(active.id, step.id))}
                            >
                              Kick Captain Lamball
                            </RuneButton>
                          ) : (
                            <>
                              <RuneButton size="sm" variant="ghost" onClick={() => navigate(step.route)}>
                                Open the right page
                              </RuneButton>
                              <RuneButton
                                size="sm"
                                icon={<Check />}
                                disabled={busy}
                                onClick={() =>
                                  apply(
                                    () => universityApi.completeStep(active.id, step.id),
                                    Boolean(active.graduatedAt)
                                  )
                                }
                              >
                                I completed this
                              </RuneButton>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollPanel>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <ScrollPanel title="Available training" icon={<Play />}>
          <div className="space-y-3">
            {catalog.courses.map((course) => {
              const prerequisite =
                course.requires && !catalog.courses.find((item) => item.id === course.requires)?.graduatedAt;
              return (
                <div key={course.id} className="rounded-md border border-stone-700 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-display text-gold-200">{course.shortTitle}</h3>
                      <p className="mt-1 text-sm text-parchment-300/60">{course.steps.length} ordered lessons</p>
                    </div>
                    {course.graduatedAt ? (
                      <Award className="text-gold-300" />
                    ) : course.active ? (
                      <span className="text-xs text-life-400">Active</span>
                    ) : (
                      <RuneButton
                        size="sm"
                        disabled={Boolean(prerequisite) || busy}
                        onClick={() => apply(() => universityApi.activate(course.id))}
                      >
                        {prerequisite ? "Locked" : "Activate"}
                      </RuneButton>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollPanel>
        <ScrollPanel title="My diplomas" icon={<Award />}>
          <div className="space-y-3">
            {catalog.courses
              .filter((course) => course.graduatedAt)
              .map((course) => (
                <Diploma key={course.id} course={course} />
              ))}
            {!catalog.courses.some((course) => course.graduatedAt) && (
              <p className="text-sm text-parchment-300/50">Your earned diplomas will be displayed here.</p>
            )}
          </div>
        </ScrollPanel>
      </div>
    </div>
  );
}
