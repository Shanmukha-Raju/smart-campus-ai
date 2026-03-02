import { useState, useEffect, useCallback, useRef } from "react";
import { db, auth } from "../firebase/config";
import { collection, getDocs, query, where } from "firebase/firestore";

const API = process.env.REACT_APP_BACKEND_URL;

// ─── Colour helpers ────────────────────────────────────────────────────────────
const healthColor = { GOOD: "#22c55e", AVERAGE: "#3b82f6", AT_RISK: "#f59e0b", CRITICAL: "#ef4444" };
const urgencyColor = { HIGH: "#ef4444", MEDIUM: "#f59e0b", LOW: "#22c55e" };

// ─── Small reusable badge ──────────────────────────────────────────────────────
function Badge({ text, color }) {
  return (
    <span style={{
      background: color + "22", color, border: `1px solid ${color}44`,
      padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600
    }}>{text}</span>
  );
}

// ─── Section card ──────────────────────────────────────────────────────────────
function SCard({ title, emoji, children, accent = "#2563eb" }) {
  return (
    <div style={{
      background: "white", borderRadius: 14, padding: 20,
      boxShadow: "0 2px 12px rgba(0,0,0,0.07)", marginBottom: 20,
      borderTop: `4px solid ${accent}`
    }}>
      <h3 style={{ marginTop: 0, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
        <span>{emoji}</span>{title}
      </h3>
      {children}
    </div>
  );
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────
function Tabs({ tabs, active, onChange }) {
  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 24, flexWrap: "wrap" }}>
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          style={{
            background: active === t.id ? "#2563eb" : "#f1f5f9",
            color: active === t.id ? "white" : "#475569",
            border: "none", borderRadius: 8, padding: "9px 18px",
            fontWeight: 600, fontSize: 14, cursor: "pointer",
            transition: "all 0.15s"
          }}
        >{t.emoji} {t.label}</button>
      ))}
    </div>
  );
}

// ─── Roadmap visual ───────────────────────────────────────────────────────────
function RoadmapVisual({ phases }) {
  const [open, setOpen] = useState(null);
  if (!phases?.length) return null;
  return (
    <div>
      {phases.map((p, idx) => (
        <div key={idx} style={{ display: "flex", gap: 0, marginBottom: 4 }}>
          {/* Left connector */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 40 }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%", background: p.color || "#2563eb",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "white", fontWeight: 700, fontSize: 15, flexShrink: 0, zIndex: 1
            }}>{p.phase}</div>
            {idx < phases.length - 1 && (
              <div style={{ width: 3, flex: 1, background: "#e2e8f0", minHeight: 24 }} />
            )}
          </div>

          {/* Content */}
          <div
            onClick={() => setOpen(open === idx ? null : idx)}
            style={{
              flex: 1, marginLeft: 14, marginBottom: 12,
              background: open === idx ? "#f8fafc" : "white",
              border: `2px solid ${open === idx ? (p.color || "#2563eb") : "#e2e8f0"}`,
              borderRadius: 12, padding: "12px 16px", cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span style={{
                  fontWeight: 700, fontSize: 15,
                  color: p.color || "#2563eb"
                }}>Phase {p.phase}: {p.name}</span>
                <span style={{ marginLeft: 10, fontSize: 12, color: "#64748b" }}>⏱ {p.duration}</span>
              </div>
              <span style={{ fontSize: 18 }}>{open === idx ? "▲" : "▼"}</span>
            </div>

            {open === idx && (
              <div style={{ marginTop: 12 }}>
                <p style={{ color: "#475569", fontSize: 14, margin: "0 0 10px 0" }}>{p.description}</p>

                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <p style={{ fontWeight: 600, fontSize: 13, margin: "0 0 6px 0" }}>📚 Topics</p>
                    {p.topics?.map((t, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <span style={{ width: 6, height: 6, background: p.color || "#2563eb", borderRadius: "50%", flexShrink: 0 }} />
                        <span style={{ fontSize: 13 }}>{t}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <p style={{ fontWeight: 600, fontSize: 13, margin: "0 0 6px 0" }}>💡 Skills Gained</p>
                    {p.skills?.map((s, i) => (
                      <div key={i} style={{ fontSize: 13, marginBottom: 4 }}>✓ {s}</div>
                    ))}
                  </div>
                </div>

                {p.milestone && (
                  <div style={{ marginTop: 10, padding: "8px 12px", background: "#fffbeb", borderRadius: 8, border: "1px solid #fde68a" }}>
                    <span style={{ fontSize: 13 }}>🏆 <strong>Milestone:</strong> {p.milestone}</span>
                  </div>
                )}
                {p.projects?.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <p style={{ fontWeight: 600, fontSize: 13, margin: "0 0 4px 0" }}>🛠 Projects / Exercises</p>
                    {p.projects.map((pr, i) => <div key={i} style={{ fontSize: 13 }}>→ {pr}</div>)}
                  </div>
                )}
                {p.resources?.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <p style={{ fontWeight: 600, fontSize: 13, margin: "0 0 4px 0" }}>🔗 Resources</p>
                    {p.resources.map((r, i) => <div key={i} style={{ fontSize: 13, color: "#2563eb" }}>• {r}</div>)}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Weekly study plan display ─────────────────────────────────────────────────
function StudyPlanDisplay({ plan }) {
  const [openWeek, setOpenWeek] = useState(0);
  if (!plan?.weeks?.length) return null;

  const weekColors = ["#3b82f6","#7c3aed","#0891b2","#16a34a","#d97706","#dc2626","#7c3aed","#0f766e"];

  return (
    <div>
      {/* Overview banner */}
      <div style={{
        background: "linear-gradient(135deg, #1e293b, #334155)",
        color: "white", borderRadius: 12, padding: "16px 20px", marginBottom: 20
      }}>
        <h3 style={{ margin: "0 0 6px 0" }}>📚 {plan.subject} Study Plan</h3>
        <p style={{ margin: "0 0 8px 0", opacity: 0.85, fontSize: 14 }}>{plan.overview}</p>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13, opacity: 0.9 }}>
          <span>📅 {plan.totalWeeks} weeks</span>
          <span>⏱ {plan.hoursPerDay} hrs/day</span>
          <span>📖 {plan.weeks?.length} learning weeks</span>
        </div>
      </div>

      {/* Daily routine */}
      {plan.dailyRoutine && (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
          {Object.entries(plan.dailyRoutine).map(([time, task]) => (
            <div key={time} style={{
              flex: 1, minWidth: 160, background: "#f8fafc",
              borderRadius: 10, padding: "10px 14px",
              borderLeft: "4px solid #2563eb"
            }}>
              <p style={{ margin: "0 0 4px 0", fontWeight: 700, fontSize: 12, color: "#64748b", textTransform: "uppercase" }}>
                {time === "morning" ? "🌅" : time === "afternoon" ? "☀️" : "🌙"} {time}
              </p>
              <p style={{ margin: 0, fontSize: 13 }}>{task}</p>
            </div>
          ))}
        </div>
      )}

      {/* Week tabs */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        {plan.weeks.map((w, i) => (
          <button
            key={i}
            onClick={() => setOpenWeek(i)}
            style={{
              background: openWeek === i ? weekColors[i % weekColors.length] : "#f1f5f9",
              color: openWeek === i ? "white" : "#475569",
              border: "none", borderRadius: 8, padding: "7px 14px",
              fontWeight: 600, fontSize: 13, cursor: "pointer"
            }}
          >Week {w.week}</button>
        ))}
      </div>

      {/* Selected week detail */}
      {plan.weeks[openWeek] && (() => {
        const w = plan.weeks[openWeek];
        const wc = weekColors[openWeek % weekColors.length];
        return (
          <div style={{ background: "#f8fafc", borderRadius: 12, padding: 16, border: `2px solid ${wc}33` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
              <div>
                <h4 style={{ margin: "0 0 4px 0", color: wc }}>Week {w.week}: {w.theme}</h4>
                <p style={{ margin: "0 0 8px 0", fontSize: 14, color: "#475569" }}>{w.goal}</p>
              </div>
            </div>

            {/* Day-by-day */}
            {w.topics?.map((day, di) => (
              <div key={di} style={{
                background: "white", borderRadius: 10, padding: "12px 14px",
                marginBottom: 10, borderLeft: `4px solid ${wc}`
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 4 }}>
                  <span style={{ fontWeight: 700, color: wc, fontSize: 14 }}>
                    {day.day}
                  </span>
                  <span style={{ fontSize: 12, color: "#64748b" }}>⏱ {day.duration}</span>
                </div>
                <p style={{ fontWeight: 600, margin: "6px 0 4px 0", fontSize: 15 }}>{day.topic}</p>

                {day.subtopics?.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                    {day.subtopics.map((s, si) => (
                      <span key={si} style={{
                        background: wc + "15", color: wc, fontSize: 12,
                        padding: "2px 8px", borderRadius: 12
                      }}>{s}</span>
                    ))}
                  </div>
                )}

                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13 }}>
                  {day.activities?.length > 0 && (
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <p style={{ fontWeight: 600, margin: "0 0 4px 0", color: "#374151" }}>📋 Activities</p>
                      {day.activities.map((a, ai) => <div key={ai}>• {a}</div>)}
                    </div>
                  )}
                  {day.resources?.length > 0 && (
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <p style={{ fontWeight: 600, margin: "0 0 4px 0", color: "#374151" }}>🔗 Resources</p>
                      {day.resources.map((r, ri) => <div key={ri} style={{ color: "#2563eb" }}>• {r}</div>)}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Weekly goal & self assessment */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
              {w.weeklyGoal && (
                <div style={{ flex: 1, padding: "8px 12px", background: "#f0fdf4", borderRadius: 8, border: "1px solid #bbf7d0", fontSize: 13 }}>
                  🎯 <strong>Weekly Goal:</strong> {w.weeklyGoal}
                </div>
              )}
              {w.selfAssessment && (
                <div style={{ flex: 1, padding: "8px 12px", background: "#eff6ff", borderRadius: 8, border: "1px solid #bfdbfe", fontSize: 13 }}>
                  📝 <strong>Self-Check:</strong> {w.selfAssessment}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Exam tips */}
      {plan.examTips?.length > 0 && (
        <div style={{ marginTop: 20, padding: 16, background: "#fffbeb", borderRadius: 12, border: "1px solid #fde68a" }}>
          <h4 style={{ margin: "0 0 10px 0" }}>💡 Exam Tips</h4>
          {plan.examTips.map((t, i) => (
            <div key={i} style={{ fontSize: 14, marginBottom: 6 }}>✅ {t}</div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Performance analysis display ─────────────────────────────────────────────
function PerformanceDisplay({ analysis }) {
  if (!analysis) return null;
  const hc = healthColor[analysis.overallHealth] || "#64748b";

  return (
    <div>
      {/* Health score */}
      <div style={{
        display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap",
        padding: 16, background: hc + "11", borderRadius: 12, border: `2px solid ${hc}33`, marginBottom: 16
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 42, fontWeight: 800, color: hc, lineHeight: 1 }}>{analysis.overallScore}</div>
          <div style={{ fontSize: 12, color: "#64748b" }}>Overall Score</div>
        </div>
        <div>
          <Badge text={analysis.overallHealth?.replace("_", " ")} color={hc} />
          <p style={{ margin: "8px 0 0 0", fontSize: 14, color: "#475569" }}>{analysis.summary}</p>
        </div>
      </div>

      {/* Strengths & weaknesses */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <div style={{ flex: 1, minWidth: 200, padding: 14, background: "#f0fdf4", borderRadius: 10, border: "1px solid #bbf7d0" }}>
          <h4 style={{ margin: "0 0 8px 0", color: "#16a34a" }}>💪 Strengths</h4>
          {analysis.strengths?.map((s, i) => <div key={i} style={{ fontSize: 13, marginBottom: 4 }}>✅ {s}</div>)}
        </div>
        <div style={{ flex: 1, minWidth: 200, padding: 14, background: "#fef2f2", borderRadius: 10, border: "1px solid #fecaca" }}>
          <h4 style={{ margin: "0 0 8px 0", color: "#dc2626" }}>⚠️ Needs Improvement</h4>
          {analysis.weaknesses?.map((w, i) => <div key={i} style={{ fontSize: 13, marginBottom: 4 }}>❌ {w}</div>)}
        </div>
      </div>

      {/* Subject insights */}
      {analysis.subjectInsights?.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h4 style={{ marginBottom: 10 }}>📊 Subject Performance</h4>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {analysis.subjectInsights.map((s, i) => {
              const sc = s.status === "Strong" ? "#22c55e" : s.status === "Average" ? "#f59e0b" : "#ef4444";
              return (
                <div key={i} style={{
                  flex: 1, minWidth: 200, padding: 14, background: "white",
                  borderRadius: 10, border: `2px solid ${sc}33`,
                  boxShadow: "0 1px 6px rgba(0,0,0,0.05)"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <strong style={{ fontSize: 14 }}>{s.subject}</strong>
                    <Badge text={s.status} color={sc} />
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: sc }}>{s.quizAvg}%</div>
                  <p style={{ fontSize: 12, color: "#64748b", margin: "4px 0 0 0" }}>{s.tip}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Priority actions */}
      {analysis.priorityActions?.length > 0 && (
        <div>
          <h4 style={{ marginBottom: 10 }}>🚀 Priority Actions</h4>
          {analysis.priorityActions.map((a, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
              background: "#f8fafc", borderRadius: 8, marginBottom: 8,
              borderLeft: `4px solid ${urgencyColor[a.urgency]}`
            }}>
              <Badge text={a.urgency} color={urgencyColor[a.urgency]} />
              <span style={{ fontSize: 14 }}>{a.action}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Weekly recommendation display ────────────────────────────────────────────
function RecommendationDisplay({ rec }) {
  if (!rec) return null;
  const days = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
  return (
    <div>
      {/* Motivation */}
      <div style={{
        background: "linear-gradient(135deg, #1e40af, #2563eb)",
        color: "white", borderRadius: 12, padding: 16, marginBottom: 16, textAlign: "center"
      }}>
        <p style={{ margin: "0 0 8px 0", fontSize: 16, fontStyle: "italic" }}>
          💬 "{rec.motivationalMessage}"
        </p>
        <p style={{ margin: 0, fontSize: 13, opacity: 0.85 }}>
          🎯 Next Milestone: <strong>{rec.nextMilestone}</strong>
        </p>
        {rec.estimatedImprovementWeeks > 0 && (
          <p style={{ margin: "6px 0 0", fontSize: 12, opacity: 0.75 }}>
            📈 Estimated improvement in {rec.estimatedImprovementWeeks} weeks
          </p>
        )}
      </div>

      {/* Focus areas */}
      {rec.recommendedFocus?.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h4 style={{ marginBottom: 8 }}>🎯 Focus Topics This Week</h4>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {rec.recommendedFocus.map((t, i) => (
              <span key={i} style={{
                background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe",
                padding: "4px 14px", borderRadius: 20, fontSize: 13, fontWeight: 500
              }}>{t}</span>
            ))}
          </div>
        </div>
      )}

      {/* Weekly schedule */}
      {rec.studySchedule && (
        <div>
          <h4 style={{ marginBottom: 10 }}>📅 Recommended Weekly Schedule</h4>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
            {days.map((day) => {
              const task = rec.studySchedule[day];
              const isWeekend = day === "Saturday" || day === "Sunday";
              return (
                <div key={day} style={{
                  background: isWeekend ? "#f8fafc" : "white",
                  borderRadius: 10, padding: "10px 14px",
                  border: `1px solid ${isWeekend ? "#e2e8f0" : "#bfdbfe"}`,
                  borderTop: `3px solid ${isWeekend ? "#94a3b8" : "#2563eb"}`
                }}>
                  <p style={{ fontWeight: 700, fontSize: 13, margin: "0 0 4px 0", color: isWeekend ? "#64748b" : "#2563eb" }}>
                    {isWeekend ? "🏖" : "📚"} {day}
                  </p>
                  <p style={{ fontSize: 13, color: "#475569", margin: 0 }}>{task}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
function StudyPlan() {
  const [activeTab, setActiveTab] = useState("analysis");

  // Fetched student data
  const [studentData, setStudentData] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);

  // Analysis
  const [analysis, setAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  // Study plan inputs
  const [subject, setSubject] = useState("");
  const [syllabus, setSyllabus] = useState("");
  const [syllabusFile, setSyllabusFile] = useState(null);
  const [weeks, setWeeks] = useState(4);
  const [hoursPerDay, setHoursPerDay] = useState(3);
  const [level, setLevel] = useState("Beginner");
  const [weakAreas, setWeakAreas] = useState("");
  const [studyPlan, setStudyPlan] = useState(null);
  const [planLoading, setPlanLoading] = useState(false);

  // Roadmap inputs
  const [rmSubject, setRmSubject] = useState("");
  const [rmSyllabus, setRmSyllabus] = useState("");
  const [rmCurrentLevel, setRmCurrentLevel] = useState("Beginner");
  const [rmTargetLevel, setRmTargetLevel] = useState("Advanced");
  const [rmMonths, setRmMonths] = useState(3);
  const [roadmap, setRoadmap] = useState(null);
  const [roadmapLoading, setRoadmapLoading] = useState(false);

  // Recommendation
  const [recommendation, setRecommendation] = useState(null);
  const [recLoading, setRecLoading] = useState(false);

  const hasFetched = useRef(false);

  // ─── Load student performance data from Firestore ──────────────────────────
  const loadStudentData = useCallback(async () => {
    setDataLoading(true);
    const uid = auth.currentUser.uid;

    // Quiz attempts
    const qSnap = await getDocs(query(collection(db, "quizAttempts"), where("studentId", "==", uid)));
    const quizAttempts = [];
    qSnap.forEach((d) => quizAttempts.push(d.data()));

    // Attendance
    const aSnap = await getDocs(query(collection(db, "attendance"), where("studentId", "==", uid)));
    let present = 0, totalAtt = 0;
    aSnap.forEach((d) => { totalAtt++; if (d.data().status === "present") present++; });
    const attendance = totalAtt ? Math.round((present / totalAtt) * 100) : 0;

    // Assignments
    const allAsgSnap = await getDocs(collection(db, "assignments"));
    const assignmentsTotal = allAsgSnap.size;
    const subSnap = await getDocs(query(collection(db, "submissions"), where("studentId", "==", uid)));
    const assignmentsSubmitted = subSnap.size;

    // Quiz stats
    const avgQuizScore = quizAttempts.length
      ? Math.round(quizAttempts.reduce((acc, q) => acc + (q.percentage || 0), 0) / quizAttempts.length)
      : 0;

    // Group quiz by topic
    const quizByTopic = {};
    quizAttempts.forEach((q) => {
      if (q.topic) {
        if (!quizByTopic[q.topic]) quizByTopic[q.topic] = [];
        quizByTopic[q.topic].push(q.percentage || 0);
      }
    });
    const topicAvgs = Object.entries(quizByTopic).map(([topic, scores]) => ({
      topic,
      avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    }));

    // Weak topics = avg < 70%
    const weakTopics = topicAvgs.filter((t) => t.avg < 70).map((t) => t.topic);

    const data = {
      attendance,
      quizAttempts,
      avgQuizScore,
      assignmentsTotal,
      assignmentsSubmitted,
      submissionRate: assignmentsTotal ? Math.round((assignmentsSubmitted / assignmentsTotal) * 100) : 0,
      quizByTopic: topicAvgs,
      weakTopics
    };

    setStudentData(data);
    setDataLoading(false);
    return data;
  }, []);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    loadStudentData();
  }, [loadStudentData]);

  // ─── Analyze performance ───────────────────────────────────────────────────
  const runAnalysis = async () => {
    if (!studentData) return;
    setAnalysisLoading(true);
    try {
      const res = await fetch(`${API}/api/analyze-performance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(studentData)
      });
      const data = await res.json();
      setAnalysis(data);
      // Pre-fill weak areas from analysis
      if (data.weaknesses?.length) setWeakAreas(data.weaknesses.join(", "));
    } catch { alert("Backend not reachable."); }
    setAnalysisLoading(false);
  };

  // ─── Syllabus file reader ──────────────────────────────────────────────────
  const handleSyllabusFile = (e, setter) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setter(ev.target.result);
      setSyllabusFile(file.name);
    };
    reader.readAsText(file); // works for .txt files; PDF requires parsing
  };

  // ─── Generate study plan ───────────────────────────────────────────────────
  const runStudyPlan = async () => {
    if (!syllabus && !subject) { alert("Enter subject and syllabus"); return; }
    setPlanLoading(true);
    try {
      const res = await fetch(`${API}/api/generate-study-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, syllabus, weeks, hoursPerDay, weakAreas, level })
      });
      const data = await res.json();
      setStudyPlan(data);
    } catch { alert("Backend not reachable."); }
    setPlanLoading(false);
  };

  // ─── Generate roadmap ──────────────────────────────────────────────────────
  const runRoadmap = async () => {
    if (!rmSubject && !rmSyllabus) { alert("Enter subject or paste syllabus"); return; }
    setRoadmapLoading(true);
    try {
      const res = await fetch(`${API}/api/generate-roadmap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: rmSubject,
          syllabus: rmSyllabus || rmSubject,
          currentLevel: rmCurrentLevel,
          targetLevel: rmTargetLevel,
          months: rmMonths
        })
      });
      const data = await res.json();
      setRoadmap(data);
    } catch { alert("Backend not reachable."); }
    setRoadmapLoading(false);
  };

  // ─── Get personalized recommendation ──────────────────────────────────────
  const runRecommendation = async () => {
    if (!studentData) return;
    setRecLoading(true);
    try {
      const res = await fetch(`${API}/api/recommend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...studentData,
          syllabusTopics: syllabus ? syllabus.slice(0, 500) : ""
        })
      });
      const data = await res.json();
      setRecommendation(data);
    } catch { alert("Backend not reachable."); }
    setRecLoading(false);
  };

  const tabs = [
    { id: "analysis", emoji: "📊", label: "Performance Analysis" },
    { id: "plan", emoji: "📚", label: "Study Plan" },
    { id: "roadmap", emoji: "🗺️", label: "Learning Roadmap" },
    { id: "recommend", emoji: "🤖", label: "AI Recommendations" }
  ];

  // ─── Stats summary bar at top ──────────────────────────────────────────────
  const stats = studentData
    ? [
        { label: "Attendance", value: studentData.attendance + "%", color: studentData.attendance >= 80 ? "#22c55e" : studentData.attendance >= 75 ? "#f59e0b" : "#ef4444" },
        { label: "Avg Quiz Score", value: studentData.avgQuizScore + "%", color: studentData.avgQuizScore >= 70 ? "#22c55e" : "#f59e0b" },
        { label: "Submission Rate", value: studentData.submissionRate + "%", color: studentData.submissionRate >= 80 ? "#22c55e" : "#f59e0b" },
        { label: "Quiz Attempts", value: studentData.quizAttempts.length, color: "#2563eb" }
      ]
    : [];

  return (
    <div className="main" style={{ marginLeft: 0 }}>
      <h2 style={{ marginBottom: 4 }}>🎓 AI Academic Advisor</h2>
      <p style={{ color: "#64748b", marginBottom: 20, marginTop: 0, fontSize: 14 }}>
        Analyze your performance, generate personalized study plans, and visualize your learning roadmap.
      </p>

      {/* ── Stats bar ── */}
      {!dataLoading && studentData && (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
          {stats.map((s) => (
            <div key={s.label} style={{
              flex: 1, minWidth: 120, background: "white", borderRadius: 12,
              padding: "12px 16px", textAlign: "center",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              borderTop: `4px solid ${s.color}`
            }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {dataLoading && (
        <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>
          ⏳ Loading your academic data...
        </div>
      )}

      {!dataLoading && (
        <>
          <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

          {/* ══ PERFORMANCE ANALYSIS TAB ══ */}
          {activeTab === "analysis" && (
            <SCard title="Academic Performance Analysis" emoji="📊" accent="#2563eb">
              {!analysis ? (
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                  <p style={{ color: "#475569", marginBottom: 16 }}>
                    Click below to get an AI-powered analysis of your attendance, quiz scores, and assignment submission rate.
                  </p>
                  <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 16 }}>
                    {stats.map((s) => (
                      <div key={s.label} style={{ fontSize: 14 }}>
                        <strong style={{ color: s.color }}>{s.value}</strong> {s.label}
                      </div>
                    ))}
                  </div>
                  <button onClick={runAnalysis} disabled={analysisLoading} style={{ fontSize: 15, padding: "10px 28px" }}>
                    {analysisLoading ? "⏳ Analyzing..." : "🔍 Analyze My Performance"}
                  </button>
                </div>
              ) : (
                <div>
                  <PerformanceDisplay analysis={analysis} />
                  <button
                    onClick={() => setAnalysis(null)}
                    style={{ background: "#f1f5f9", color: "#475569", marginTop: 12 }}
                  >🔄 Re-analyze</button>
                </div>
              )}
            </SCard>
          )}

          {/* ══ STUDY PLAN TAB ══ */}
          {activeTab === "plan" && (
            <div>
              {!studyPlan ? (
                <SCard title="Generate Personalized Study Plan" emoji="📚" accent="#7c3aed">
                  <p style={{ color: "#475569", fontSize: 14, marginBottom: 16 }}>
                    Paste your syllabus below. The AI will create a day-by-day study plan from basics to complete understanding.
                  </p>

                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <label style={{ fontWeight: 600, fontSize: 13, display: "block", marginBottom: 4 }}>Subject Name *</label>
                      <input
                        placeholder="e.g. Machine Learning, Data Structures"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        style={{ marginBottom: 0 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontWeight: 600, fontSize: 13, display: "block", marginBottom: 4 }}>Duration (weeks)</label>
                      <input
                        type="number" min={1} max={16} value={weeks}
                        onChange={(e) => setWeeks(Number(e.target.value))}
                        style={{ width: 100, marginBottom: 0 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontWeight: 600, fontSize: 13, display: "block", marginBottom: 4 }}>Hours/Day</label>
                      <input
                        type="number" min={1} max={12} value={hoursPerDay}
                        onChange={(e) => setHoursPerDay(Number(e.target.value))}
                        style={{ width: 100, marginBottom: 0 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontWeight: 600, fontSize: 13, display: "block", marginBottom: 4 }}>Current Level</label>
                      <select value={level} onChange={(e) => setLevel(e.target.value)} style={{ width: 140, marginBottom: 0 }}>
                        <option>Beginner</option>
                        <option>Intermediate</option>
                        <option>Advanced</option>
                      </select>
                    </div>
                  </div>

                  <label style={{ fontWeight: 600, fontSize: 13, display: "block", marginBottom: 4 }}>
                    Syllabus * <span style={{ fontWeight: 400, color: "#94a3b8" }}>(paste topics, units, or full syllabus text)</span>
                  </label>
                  <textarea
                    placeholder={"e.g.\nUnit 1: Introduction to ML\n  - Supervised Learning\n  - Regression\nUnit 2: Neural Networks\n  - Perceptrons\n  - Backpropagation\n..."}
                    value={syllabus}
                    onChange={(e) => setSyllabus(e.target.value)}
                    style={{ minHeight: 160, fontFamily: "monospace", fontSize: 13 }}
                  />

                  <label style={{ fontWeight: 600, fontSize: 13, display: "block", marginBottom: 4 }}>
                    Or upload .txt syllabus file
                  </label>
                  <input
                    type="file" accept=".txt"
                    onChange={(e) => handleSyllabusFile(e, setSyllabus)}
                    style={{ marginBottom: 8 }}
                  />
                  {syllabusFile && <p style={{ fontSize: 12, color: "#22c55e" }}>✅ Loaded: {syllabusFile}</p>}

                  <label style={{ fontWeight: 600, fontSize: 13, display: "block", marginBottom: 4 }}>
                    Weak Areas <span style={{ fontWeight: 400, color: "#94a3b8" }}>(optional — auto-filled from analysis)</span>
                  </label>
                  <input
                    placeholder="e.g. Neural Networks, Dynamic Programming"
                    value={weakAreas}
                    onChange={(e) => setWeakAreas(e.target.value)}
                  />

                  <button onClick={runStudyPlan} disabled={planLoading} style={{ fontSize: 15, padding: "10px 28px" }}>
                    {planLoading ? "⏳ Generating Study Plan..." : "📚 Generate Study Plan"}
                  </button>
                </SCard>
              ) : (
                <div>
                  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
                    <button onClick={() => setStudyPlan(null)} style={{ background: "#f1f5f9", color: "#475569" }}>
                      ← New Plan
                    </button>
                  </div>
                  <SCard title={`Study Plan: ${studyPlan.subject}`} emoji="📚" accent="#7c3aed">
                    <StudyPlanDisplay plan={studyPlan} />
                  </SCard>
                </div>
              )}
            </div>
          )}

          {/* ══ ROADMAP TAB ══ */}
          {activeTab === "roadmap" && (
            <div>
              {!roadmap ? (
                <SCard title="Generate Learning Roadmap" emoji="🗺️" accent="#0891b2">
                  <p style={{ color: "#475569", fontSize: 14, marginBottom: 16 }}>
                    Get a visual phase-by-phase roadmap showing how to go from your current level to mastery.
                  </p>

                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <label style={{ fontWeight: 600, fontSize: 13, display: "block", marginBottom: 4 }}>Subject / Goal *</label>
                      <input
                        placeholder="e.g. Machine Learning, Web Development"
                        value={rmSubject}
                        onChange={(e) => setRmSubject(e.target.value)}
                        style={{ marginBottom: 0 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontWeight: 600, fontSize: 13, display: "block", marginBottom: 4 }}>From Level</label>
                      <select value={rmCurrentLevel} onChange={(e) => setRmCurrentLevel(e.target.value)} style={{ width: 140, marginBottom: 0 }}>
                        <option>Beginner</option>
                        <option>Intermediate</option>
                        <option>Advanced</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontWeight: 600, fontSize: 13, display: "block", marginBottom: 4 }}>To Level</label>
                      <select value={rmTargetLevel} onChange={(e) => setRmTargetLevel(e.target.value)} style={{ width: 140, marginBottom: 0 }}>
                        <option>Intermediate</option>
                        <option>Advanced</option>
                        <option>Expert</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontWeight: 600, fontSize: 13, display: "block", marginBottom: 4 }}>Months Available</label>
                      <input
                        type="number" min={1} max={24} value={rmMonths}
                        onChange={(e) => setRmMonths(Number(e.target.value))}
                        style={{ width: 100, marginBottom: 0 }}
                      />
                    </div>
                  </div>

                  <label style={{ fontWeight: 600, fontSize: 13, display: "block", marginBottom: 4 }}>
                    Syllabus / Topics <span style={{ fontWeight: 400, color: "#94a3b8" }}>(paste to get a more accurate roadmap)</span>
                  </label>
                  <textarea
                    placeholder={"Paste your syllabus or list of topics...\ne.g.\n- Linear Algebra\n- Statistics\n- Python Programming\n- Supervised Learning\n..."}
                    value={rmSyllabus}
                    onChange={(e) => setRmSyllabus(e.target.value)}
                    style={{ minHeight: 130, fontFamily: "monospace", fontSize: 13 }}
                  />

                  <button onClick={runRoadmap} disabled={roadmapLoading} style={{ fontSize: 15, padding: "10px 28px" }}>
                    {roadmapLoading ? "⏳ Generating Roadmap..." : "🗺️ Generate Roadmap"}
                  </button>
                </SCard>
              ) : (
                <div>
                  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
                    <button onClick={() => setRoadmap(null)} style={{ background: "#f1f5f9", color: "#475569" }}>
                      ← New Roadmap
                    </button>
                  </div>
                  <SCard title={`${roadmap.subject} — ${roadmap.fromLevel} → ${roadmap.toLevel}`} emoji="🗺️" accent="#0891b2">
                    <p style={{ color: "#475569", fontSize: 14, marginBottom: 4 }}>{roadmap.overview}</p>
                    <p style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>
                      ⏱ Estimated: {roadmap.estimatedMonths} months
                    </p>
                    <RoadmapVisual phases={roadmap.phases} />
                    {roadmap.finalGoal && (
                      <div style={{ marginTop: 16, padding: 14, background: "#f0fdf4", borderRadius: 10, border: "1px solid #bbf7d0" }}>
                        <strong>🏁 Final Goal:</strong> {roadmap.finalGoal}
                      </div>
                    )}
                    {roadmap.careerRelevance && (
                      <div style={{ marginTop: 10, padding: 14, background: "#eff6ff", borderRadius: 10, border: "1px solid #bfdbfe" }}>
                        <strong>💼 Career Relevance:</strong> {roadmap.careerRelevance}
                      </div>
                    )}
                  </SCard>
                </div>
              )}
            </div>
          )}

          {/* ══ RECOMMENDATIONS TAB ══ */}
          {activeTab === "recommend" && (
            <SCard title="AI Personalized Recommendations" emoji="🤖" accent="#16a34a">
              {!recommendation ? (
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                  <p style={{ color: "#475569", marginBottom: 16, fontSize: 14 }}>
                    Get a personalized 7-day study schedule based on your actual performance data — quiz scores, attendance, and weak topics.
                  </p>
                  {studentData?.weakTopics?.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <p style={{ fontSize: 13, color: "#64748b" }}>Weak topics detected from your quiz history:</p>
                      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                        {studentData.weakTopics.map((t, i) => (
                          <Badge key={i} text={t} color="#ef4444" />
                        ))}
                      </div>
                    </div>
                  )}
                  {studentData?.weakTopics?.length === 0 && (
                    <p style={{ fontSize: 13, color: "#22c55e", marginBottom: 16 }}>
                      ✅ No weak topics found in your quiz history. Keep it up!
                    </p>
                  )}
                  <button onClick={runRecommendation} disabled={recLoading} style={{ fontSize: 15, padding: "10px 28px" }}>
                    {recLoading ? "⏳ Generating..." : "🤖 Get My Recommendations"}
                  </button>
                </div>
              ) : (
                <div>
                  <RecommendationDisplay rec={recommendation} />
                  <button
                    onClick={() => setRecommendation(null)}
                    style={{ background: "#f1f5f9", color: "#475569", marginTop: 16 }}
                  >🔄 Refresh Recommendations</button>
                </div>
              )}
            </SCard>
          )}
        </>
      )}
    </div>
  );
}

export default StudyPlan;