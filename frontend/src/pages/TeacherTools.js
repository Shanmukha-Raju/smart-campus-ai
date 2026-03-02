import { useState, useEffect, useCallback, useRef } from "react";
import { db, auth } from "../firebase/config";
import {
  collection, getDocs, addDoc, query,
  where, getDoc, doc, Timestamp
} from "firebase/firestore";

const API = process.env.REACT_APP_BACKEND_URL;

// ─── Colour helpers ───────────────────────────────────────────────────────────
const STATUS_COLOR = {
  EXCELLENT: "#22c55e", GOOD: "#22c55e",
  AVERAGE: "#3b82f6", AT_RISK: "#f59e0b", CRITICAL: "#ef4444",
  HIGH: "#ef4444", MEDIUM: "#f59e0b", LOW: "#22c55e"
};

// ─── Reusable components ──────────────────────────────────────────────────────
function Badge({ text, color }) {
  return (
    <span style={{
      background: color + "20", color, border: `1px solid ${color}40`,
      padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
      whiteSpace: "nowrap"
    }}>{text}</span>
  );
}

function SCard({ children, accent = "#2563eb", style = {} }) {
  return (
    <div style={{
      background: "white", borderRadius: 14, padding: 20,
      boxShadow: "0 2px 12px rgba(0,0,0,0.07)", marginBottom: 20,
      borderTop: `4px solid ${accent}`, ...style
    }}>
      {children}
    </div>
  );
}

function TabBar({ tabs, active, onChange }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 22 }}>
      {tabs.map((t) => (
        <button key={t.id} onClick={() => onChange(t.id)} style={{
          background: active === t.id ? "#2563eb" : "#f1f5f9",
          color: active === t.id ? "white" : "#475569",
          border: "none", borderRadius: 8, padding: "9px 16px",
          fontWeight: 600, fontSize: 13, cursor: "pointer"
        }}>{t.emoji} {t.label}</button>
      ))}
    </div>
  );
}

function LoadingSpinner({ text = "Generating with AI..." }) {
  return (
    <div style={{ textAlign: "center", padding: "32px 0" }}>
      <div style={{ fontSize: 28, marginBottom: 10 }}>⏳</div>
      <p style={{ color: "#64748b", fontSize: 14 }}>{text}</p>
    </div>
  );
}

function InfoRow({ label, value, accent = "#2563eb" }) {
  return (
    <div style={{
      display: "flex", gap: 12, padding: "8px 0",
      borderBottom: "1px solid #f1f5f9", alignItems: "flex-start"
    }}>
      <span style={{ fontWeight: 700, fontSize: 12, color: accent,
        minWidth: 140, paddingTop: 1 }}>{label}</span>
      <span style={{ fontSize: 13, color: "#475569", flex: 1 }}>{value}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE 1 — AI LESSON PLAN GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════
function LessonPlanGenerator() {
  const [subject, setSubject]       = useState("");
  const [topic, setTopic]           = useState("");
  const [classLevel, setClassLevel] = useState("");
  const [duration, setDuration]     = useState(60);
  const [context, setContext]       = useState("");
  const [plan, setPlan]             = useState(null);
  const [loading, setLoading]       = useState(false);

  const generate = async () => {
    if (!subject || !topic) { alert("Enter subject and topic"); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/generate-lesson-plan`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, topic, classLevel, duration, context })
      });
      const data = await res.json();
      setPlan(data);
    } catch { alert("Backend not reachable."); }
    setLoading(false);
  };

  const phaseColors = ["#3b82f6","#7c3aed","#0891b2","#16a34a","#d97706","#dc2626"];

  return (
    <div>
      {!plan ? (
        <SCard accent="#7c3aed">
          <h3 style={{ marginTop: 0, color: "#7c3aed" }}>📋 AI Lesson Plan Generator</h3>
          <p style={{ color: "#64748b", fontSize: 13, marginBottom: 16 }}>
            Enter your topic details and get a complete structured lesson plan with
            objectives, activities, classwork questions, homework, and differentiation tips.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 4, color: "#374151" }}>
                Subject *
              </label>
              <input value={subject} onChange={e => setSubject(e.target.value)}
                placeholder="e.g. Data Structures" style={{ marginBottom: 0 }} />
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 4, color: "#374151" }}>
                Specific Topic *
              </label>
              <input value={topic} onChange={e => setTopic(e.target.value)}
                placeholder="e.g. Binary Search Trees" style={{ marginBottom: 0 }} />
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 4, color: "#374151" }}>
                Class Level
              </label>
              <input value={classLevel} onChange={e => setClassLevel(e.target.value)}
                placeholder="e.g. Year 2 / Semester 3" style={{ marginBottom: 0 }} />
            </div>
            <div style={{ minWidth: 120 }}>
              <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 4, color: "#374151" }}>
                Duration (mins)
              </label>
              <input type="number" value={duration} min={15} max={180}
                onChange={e => setDuration(Number(e.target.value))} style={{ marginBottom: 0, width: 100 }} />
            </div>
          </div>
          <div style={{ marginTop: 10 }}>
            <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 4, color: "#374151" }}>
              Additional Context (optional)
            </label>
            <textarea value={context} onChange={e => setContext(e.target.value)}
              placeholder="e.g. Students have prior knowledge of binary trees. Focus on insertion and deletion..."
              style={{ minHeight: 70, marginBottom: 0 }} />
          </div>
          <button onClick={generate} disabled={loading}
            style={{ background: "#7c3aed", marginTop: 12, padding: "10px 28px", fontSize: 14 }}>
            {loading ? "⏳ Generating..." : "📋 Generate Lesson Plan"}
          </button>
        </SCard>
      ) : (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3 style={{ margin: 0, color: "#7c3aed" }}>📋 {plan.topic} — Lesson Plan</h3>
            <button onClick={() => setPlan(null)} style={{ background: "#f1f5f9", color: "#475569" }}>← New Plan</button>
          </div>

          {/* Header info */}
          <SCard accent="#7c3aed">
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 12 }}>
              {[
                ["📚 Subject", plan.subject],
                ["🎯 Topic", plan.topic],
                ["👥 Class", plan.classLevel],
                ["⏱ Duration", plan.duration],
              ].map(([l, v]) => (
                <div key={l} style={{ background: "#f8fafc", borderRadius: 8, padding: "8px 14px" }}>
                  <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700 }}>{l}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>{v}</div>
                </div>
              ))}
            </div>

            {/* Objectives */}
            {plan.objectives?.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <h4 style={{ margin: "0 0 8px", color: "#7c3aed", fontSize: 13 }}>🎯 Learning Objectives</h4>
                {plan.objectives.map((o, i) => (
                  <div key={i} style={{ fontSize: 13, color: "#475569", marginBottom: 4 }}>✅ {o}</div>
                ))}
              </div>
            )}

            {/* Prerequisites */}
            {plan.prerequisiteKnowledge?.length > 0 && (
              <div>
                <h4 style={{ margin: "0 0 8px", color: "#475569", fontSize: 13 }}>📌 Prerequisites</h4>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {plan.prerequisiteKnowledge.map((p, i) => (
                    <span key={i} style={{ background: "#f1f5f9", color: "#475569", fontSize: 12,
                      padding: "3px 10px", borderRadius: 12 }}>• {p}</span>
                  ))}
                </div>
              </div>
            )}
          </SCard>

          {/* Lesson outline */}
          {plan.lessonOutline?.length > 0 && (
            <SCard accent="#0891b2">
              <h4 style={{ margin: "0 0 14px", color: "#0891b2" }}>📅 Lesson Outline</h4>
              {plan.lessonOutline.map((phase, i) => (
                <div key={i} style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 36 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%",
                      background: phaseColors[i % phaseColors.length], color: "white",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 700, fontSize: 13, flexShrink: 0 }}>{i + 1}</div>
                    {i < plan.lessonOutline.length - 1 && (
                      <div style={{ width: 2, flex: 1, background: "#e2e8f0", minHeight: 20 }} />
                    )}
                  </div>
                  <div style={{ flex: 1, background: "#f8fafc", borderRadius: 10,
                    padding: "10px 14px", marginBottom: 4 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, color: phaseColors[i % phaseColors.length], fontSize: 13 }}>
                        {phase.phase}
                      </span>
                      <span style={{ fontSize: 12, color: "#94a3b8" }}>⏱ {phase.duration}</span>
                    </div>
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 12 }}>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontWeight: 600, color: "#374151" }}>Teacher: </span>
                        <span style={{ color: "#475569" }}>{phase.teacherActivity}</span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontWeight: 600, color: "#374151" }}>Students: </span>
                        <span style={{ color: "#475569" }}>{phase.studentActivity}</span>
                      </div>
                    </div>
                    {phase.resources?.length > 0 && (
                      <div style={{ marginTop: 6, fontSize: 11, color: "#94a3b8" }}>
                        🔧 Resources: {phase.resources.join(", ")}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </SCard>
          )}

          {/* Key concepts */}
          {plan.keyConceptsToExplain?.length > 0 && (
            <SCard accent="#16a34a">
              <h4 style={{ margin: "0 0 12px", color: "#16a34a" }}>💡 Key Concepts to Explain</h4>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {plan.keyConceptsToExplain.map((c, i) => (
                  <div key={i} style={{ flex: 1, minWidth: 220, background: "#f0fdf4",
                    borderRadius: 10, padding: 12, border: "1px solid #bbf7d0" }}>
                    <p style={{ fontWeight: 700, margin: "0 0 4px", fontSize: 13, color: "#16a34a" }}>{c.concept}</p>
                    <p style={{ fontSize: 12, color: "#475569", margin: "0 0 4px" }}>{c.explanation}</p>
                    <p style={{ fontSize: 11, color: "#94a3b8", margin: 0 }}>💡 Example: {c.example}</p>
                  </div>
                ))}
              </div>
            </SCard>
          )}

          {/* Classwork questions */}
          {plan.classworkQuestions?.length > 0 && (
            <SCard accent="#d97706">
              <h4 style={{ margin: "0 0 12px", color: "#d97706" }}>📝 Classwork Questions</h4>
              {plan.classworkQuestions.map((q, i) => (
                <div key={i} style={{ background: "#fffbeb", borderRadius: 8, padding: "10px 14px",
                  marginBottom: 8, borderLeft: "3px solid #d97706" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>Q{i + 1}. {q.q}</span>
                    <span style={{ fontSize: 11, color: "#94a3b8", background: "#fef3c7",
                      padding: "2px 8px", borderRadius: 8 }}>{q.type}</span>
                  </div>
                  <p style={{ fontSize: 12, color: "#16a34a", margin: 0 }}>✅ Answer: {q.answer}</p>
                </div>
              ))}
            </SCard>
          )}

          {/* Homework + differentiation */}
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            {plan.homeworkTask && (
              <SCard accent="#dc2626" style={{ flex: 1, minWidth: 240 }}>
                <h4 style={{ margin: "0 0 8px", color: "#dc2626" }}>🏠 Homework</h4>
                <p style={{ fontSize: 13, color: "#475569", margin: 0 }}>{plan.homeworkTask}</p>
              </SCard>
            )}
            {plan.differentiationTips && (
              <SCard accent="#7c3aed" style={{ flex: 1, minWidth: 240 }}>
                <h4 style={{ margin: "0 0 8px", color: "#7c3aed" }}>🎯 Differentiation</h4>
                <p style={{ fontSize: 12, color: "#475569", margin: "0 0 6px" }}>
                  <strong>Struggling students:</strong> {plan.differentiationTips.forStrugglingStudents}
                </p>
                <p style={{ fontSize: 12, color: "#475569", margin: 0 }}>
                  <strong>Advanced students:</strong> {plan.differentiationTips.forAdvancedStudents}
                </p>
              </SCard>
            )}
          </div>

          {plan.teacherNotes && (
            <div style={{ padding: "10px 16px", background: "#fef9c3", borderRadius: 10,
              border: "1px solid #fde68a", fontSize: 13, color: "#92400e" }}>
              ⚠️ <strong>Teacher Notes:</strong> {plan.teacherNotes}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE 2 — CLASS PERFORMANCE REPORT
// ═══════════════════════════════════════════════════════════════════════════════
function ClassReportGenerator({ students, attendanceStats, submissions, assignments }) {
  const [selectedClass, setSelectedClass]   = useState("ALL");
  const [report, setReport]                 = useState(null);
  const [loading, setLoading]               = useState(false);

  const classes = ["ALL", ...new Set(students.map(s => s.studentClass).filter(Boolean)).values()];

  const generate = async () => {
    setLoading(true);
    try {
      const filtered = selectedClass === "ALL" ? students
        : students.filter(s => s.studentClass === selectedClass);

      // Build per-student profiles
      const studentProfiles = filtered.map(s => {
        const attRecs = attendanceStats.filter(r => r.studentId === s.id);
        const present = attRecs.filter(r => r.status === "present").length;
        const subs = submissions.filter(sub => sub.studentId === s.id);
        return {
          name: s.name, class: s.studentClass, rollNo: s.rollNo,
          attendance: attRecs.length ? Math.round((present / attRecs.length) * 100) : 0,
          totalDays: attRecs.length,
          submissionsCount: subs.length,
          submissionRate: assignments.length ? Math.round((subs.length / assignments.length) * 100) : 0
        };
      });

      const res = await fetch(`${API}/api/class-report`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          className: selectedClass,
          totalStudents: filtered.length,
          studentProfiles,
          topicAverages: []
        })
      });
      const data = await res.json();
      setReport(data);
    } catch { alert("Backend not reachable."); }
    setLoading(false);
  };

  const hc = STATUS_COLOR[report?.overallClassHealth] || "#64748b";

  return (
    <div>
      <SCard accent="#0891b2">
        <h3 style={{ marginTop: 0, color: "#0891b2" }}>📊 Class Performance Report</h3>
        <p style={{ color: "#64748b", fontSize: 13, marginBottom: 14 }}>
          Generate an AI-powered class-wide analysis showing top performers, at-risk students,
          weak areas, and specific teaching recommendations.
        </p>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 4 }}>Select Class</label>
            <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
              style={{ width: 180, marginBottom: 0 }}>
              {classes.map(c => <option key={c} value={c}>{c === "ALL" ? "All Classes" : c}</option>)}
            </select>
          </div>
          <button onClick={generate} disabled={loading}
            style={{ background: "#0891b2", padding: "10px 24px", fontSize: 14 }}>
            {loading ? "⏳ Analysing..." : "📊 Generate Report"}
          </button>
        </div>
      </SCard>

      {loading && <LoadingSpinner text="Analysing class performance..." />}

      {report && !loading && (
        <div>
          {/* Header */}
          <div style={{ background: hc + "18", border: `2px solid ${hc}33`, borderRadius: 14,
            padding: 18, marginBottom: 16, display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 40, fontWeight: 800, color: hc, lineHeight: 1 }}>
                {report.totalStudents}
              </div>
              <div style={{ fontSize: 11, color: "#64748b" }}>Students</div>
            </div>
            <div>
              <Badge text={report.overallClassHealth?.replace("_", " ")} color={hc} />
              <p style={{ margin: "8px 0 0", fontSize: 13, color: "#475569" }}>{report.classSummary}</p>
            </div>
          </div>

          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            {/* Insights */}
            <SCard accent="#0891b2" style={{ flex: 2, minWidth: 260 }}>
              <h4 style={{ margin: "0 0 12px", color: "#0891b2" }}>📈 Insights</h4>
              <InfoRow label="📅 Attendance" value={report.attendanceInsight} accent="#0891b2" />
              <InfoRow label="🧠 Quiz Performance" value={report.quizInsight} accent="#7c3aed" />
              <InfoRow label="📬 Submissions" value={report.submissionInsight} accent="#16a34a" />
            </SCard>

            {/* At-Risk students */}
            <SCard accent="#ef4444" style={{ flex: 1, minWidth: 220 }}>
              <h4 style={{ margin: "0 0 12px", color: "#ef4444" }}>⚠️ At-Risk Students</h4>
              {report.atRiskStudents?.length === 0
                ? <p style={{ fontSize: 13, color: "#22c55e" }}>✅ No at-risk students!</p>
                : report.atRiskStudents?.map((s, i) => (
                  <div key={i} style={{ marginBottom: 10, padding: "8px 10px",
                    background: "#fef2f2", borderRadius: 8, borderLeft: "3px solid #ef4444" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>{s.name}</span>
                      <Badge text={s.urgency} color={STATUS_COLOR[s.urgency]} />
                    </div>
                    <span style={{ fontSize: 12, color: "#64748b" }}>{s.issue}</span>
                  </div>
                ))
              }
            </SCard>
          </div>

          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            {/* Top performers */}
            <SCard accent="#22c55e" style={{ flex: 1, minWidth: 200 }}>
              <h4 style={{ margin: "0 0 12px", color: "#22c55e" }}>🏆 Top Performers</h4>
              {report.topPerformers?.map((s, i) => (
                <div key={i} style={{ marginBottom: 8, padding: "6px 10px",
                  background: "#f0fdf4", borderRadius: 8, borderLeft: "3px solid #22c55e" }}>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>🥇 {s.name}</span>
                  <p style={{ fontSize: 11, color: "#64748b", margin: "3px 0 0" }}>{s.reason}</p>
                </div>
              ))}
            </SCard>

            {/* Teaching recommendations */}
            <SCard accent="#7c3aed" style={{ flex: 2, minWidth: 260 }}>
              <h4 style={{ margin: "0 0 12px", color: "#7c3aed" }}>🚀 Teaching Recommendations</h4>
              {report.teachingRecommendations?.map((r, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10,
                  padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
                  <Badge text={r.priority} color={STATUS_COLOR[r.priority]} />
                  <span style={{ fontSize: 13, color: "#475569" }}>{r.recommendation}</span>
                </div>
              ))}
            </SCard>
          </div>

          {/* Weak areas */}
          {report.classWeakAreas?.length > 0 && (
            <SCard accent="#d97706">
              <h4 style={{ margin: "0 0 10px", color: "#d97706" }}>📉 Class Weak Areas</h4>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {report.classWeakAreas.map((w, i) => (
                  <span key={i} style={{ background: "#fffbeb", color: "#d97706",
                    border: "1px solid #fde68a", padding: "4px 14px",
                    borderRadius: 20, fontSize: 13 }}>{w}</span>
                ))}
              </div>
            </SCard>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE 3 — AI ASSIGNMENT GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════
function AssignmentGenerator({ onPostAssignment }) {
  const [subject, setSubject]           = useState("");
  const [topic, setTopic]               = useState("");
  const [difficulty, setDifficulty]     = useState("Intermediate");
  const [classLevel, setClassLevel]     = useState("");
  const [totalMarks, setTotalMarks]     = useState(100);
  const [instructions, setInstructions] = useState("");
  const [assignment, setAssignment]     = useState(null);
  const [loading, setLoading]           = useState(false);
  const [posting, setPosting]           = useState(false);
  const [posted, setPosted]             = useState(false);

  const generate = async () => {
    if (!subject || !topic) { alert("Enter subject and topic"); return; }
    setLoading(true);
    setAssignment(null);
    try {
      const res = await fetch(`${API}/api/generate-assignment`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, topic, difficulty, classLevel, totalMarks, instructions })
      });
      const data = await res.json();
      setAssignment(data);
    } catch { alert("Backend not reachable."); }
    setLoading(false);
  };

  const postToFirestore = async () => {
    if (!assignment) return;
    setPosting(true);
    try {
      await onPostAssignment({
        title: assignment.title,
        description: `${assignment.description}\n\nEstimated Time: ${assignment.estimatedTime}\nTotal Marks: ${assignment.totalMarks}`,
        deadline: "",
        attachmentName: "", attachmentType: "", attachmentURL: "",
        aiGenerated: true, difficulty: assignment.difficulty
      });
      setPosted(true);
      alert("✅ Assignment posted to student dashboards!");
    } catch { alert("Failed to post assignment."); }
    setPosting(false);
  };

  return (
    <div>
      <SCard accent="#16a34a">
        <h3 style={{ marginTop: 0, color: "#16a34a" }}>🤖 AI Assignment Generator</h3>
        <p style={{ color: "#64748b", fontSize: 13, marginBottom: 14 }}>
          Generate a complete assignment with questions, marking scheme, and rubric instantly.
          Then post it directly to students with one click.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 4 }}>Subject *</label>
            <input value={subject} onChange={e => setSubject(e.target.value)}
              placeholder="e.g. Machine Learning" style={{ marginBottom: 0 }} />
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 4 }}>Topic *</label>
            <input value={topic} onChange={e => setTopic(e.target.value)}
              placeholder="e.g. Neural Networks" style={{ marginBottom: 0 }} />
          </div>
          <div style={{ minWidth: 140 }}>
            <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 4 }}>Difficulty</label>
            <select value={difficulty} onChange={e => setDifficulty(e.target.value)} style={{ marginBottom: 0 }}>
              <option>Beginner</option><option>Intermediate</option><option>Advanced</option>
            </select>
          </div>
          <div style={{ minWidth: 120 }}>
            <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 4 }}>Total Marks</label>
            <input type="number" value={totalMarks} min={10} max={500}
              onChange={e => setTotalMarks(Number(e.target.value))} style={{ marginBottom: 0, width: 90 }} />
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 4 }}>Class Level</label>
            <input value={classLevel} onChange={e => setClassLevel(e.target.value)}
              placeholder="e.g. Year 3" style={{ marginBottom: 0 }} />
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 4 }}>Special Instructions (optional)</label>
          <textarea value={instructions} onChange={e => setInstructions(e.target.value)}
            placeholder="e.g. Include a practical implementation question..." style={{ minHeight: 60, marginBottom: 0 }} />
        </div>
        <button onClick={generate} disabled={loading}
          style={{ background: "#16a34a", marginTop: 12, padding: "10px 28px", fontSize: 14 }}>
          {loading ? "⏳ Generating..." : "🤖 Generate Assignment"}
        </button>
      </SCard>

      {loading && <LoadingSpinner text="Creating assignment with AI..." />}

      {assignment && !loading && (
        <div>
          {/* Header */}
          <SCard accent="#16a34a">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
              <div>
                <h3 style={{ margin: "0 0 4px", color: "#16a34a" }}>{assignment.title}</h3>
                <p style={{ margin: "0 0 8px", fontSize: 13, color: "#475569" }}>{assignment.description}</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Badge text={assignment.difficulty} color="#16a34a" />
                  <Badge text={`⏱ ${assignment.estimatedTime}`} color="#0891b2" />
                  <Badge text={`📊 ${assignment.totalMarks} marks`} color="#7c3aed" />
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setAssignment(null)} style={{ background: "#f1f5f9", color: "#475569" }}>🔄 Regenerate</button>
                <button onClick={postToFirestore} disabled={posting || posted}
                  style={{ background: posted ? "#94a3b8" : "#16a34a" }}>
                  {posted ? "✅ Posted" : posting ? "⏳ Posting..." : "📤 Post to Students"}
                </button>
              </div>
            </div>
            {assignment.learningOutcomes?.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <p style={{ fontWeight: 700, fontSize: 12, color: "#374151", margin: "0 0 6px" }}>🎯 Learning Outcomes</p>
                {assignment.learningOutcomes.map((o, i) => (
                  <div key={i} style={{ fontSize: 12, color: "#475569", marginBottom: 3 }}>✅ {o}</div>
                ))}
              </div>
            )}
          </SCard>

          {/* Questions */}
          {assignment.questions?.length > 0 && (
            <SCard accent="#d97706">
              <h4 style={{ margin: "0 0 14px", color: "#d97706" }}>❓ Questions</h4>
              {assignment.questions.map((q, i) => (
                <div key={i} style={{ background: "#fffbeb", borderRadius: 10, padding: "12px 16px",
                  marginBottom: 10, borderLeft: "4px solid #d97706" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>Q{q.number}. {q.question}</span>
                    <div style={{ display: "flex", gap: 6 }}>
                      <Badge text={q.type} color="#d97706" />
                      <Badge text={`${q.marks} marks`} color="#7c3aed" />
                    </div>
                  </div>
                  {q.hints && <p style={{ fontSize: 12, color: "#94a3b8", margin: "0 0 4px" }}>💡 Hint: {q.hints}</p>}
                  <p style={{ fontSize: 12, color: "#16a34a", margin: 0 }}>
                    <strong>Sample Answer:</strong> {q.sampleAnswer}
                  </p>
                </div>
              ))}
            </SCard>
          )}

          {/* Rubric */}
          {assignment.rubric?.length > 0 && (
            <SCard accent="#7c3aed">
              <h4 style={{ margin: "0 0 12px", color: "#7c3aed" }}>📋 Marking Rubric</h4>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: "#1e293b", color: "white" }}>
                      {["Criteria", "Excellent", "Good", "Needs Work", "Marks"].map(h => (
                        <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontWeight: 700 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {assignment.rubric.map((r, i) => (
                      <tr key={i} style={{ background: i % 2 === 0 ? "white" : "#f8fafc" }}>
                        <td style={{ padding: "8px 10px", fontWeight: 600, color: "#7c3aed" }}>{r.criteria}</td>
                        <td style={{ padding: "8px 10px", color: "#16a34a" }}>{r.excellent}</td>
                        <td style={{ padding: "8px 10px", color: "#d97706" }}>{r.good}</td>
                        <td style={{ padding: "8px 10px", color: "#ef4444" }}>{r.needsWork}</td>
                        <td style={{ padding: "8px 10px", fontWeight: 700, color: "#7c3aed" }}>{r.marks}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SCard>
          )}

          {/* Resources */}
          {assignment.resources?.length > 0 && (
            <SCard accent="#0891b2">
              <h4 style={{ margin: "0 0 8px", color: "#0891b2" }}>🔗 Suggested Resources</h4>
              {assignment.resources.map((r, i) => (
                <div key={i} style={{ fontSize: 13, color: "#475569", marginBottom: 4 }}>• {r}</div>
              ))}
            </SCard>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE 4 — ANNOUNCEMENT BOARD
// ═══════════════════════════════════════════════════════════════════════════════
function AnnouncementBoard({ students, classes }) {
  const [announcements, setAnnouncements] = useState([]);
  const [title, setTitle]                 = useState("");
  const [message, setMessage]             = useState("");
  const [targetClass, setTargetClass]     = useState("ALL");
  const [priority, setPriority]           = useState("NORMAL");
  const [posting, setPosting]             = useState(false);

  const loadAnnouncements = useCallback(async () => {
    const snap = await getDocs(collection(db, "announcements"));
    const list = [];
    snap.forEach(d => list.push({ id: d.id, ...d.data() }));
    list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    setAnnouncements(list);
  }, []);

  useEffect(() => { loadAnnouncements(); }, [loadAnnouncements]);

  const post = async () => {
    if (!title || !message) { alert("Enter title and message"); return; }
    setPosting(true);
    try {
      await addDoc(collection(db, "announcements"), {
        title, message, targetClass, priority,
        teacherId: auth.currentUser.uid,
        createdAt: Timestamp.now(),
        date: new Date().toLocaleDateString()
      });
      setTitle(""); setMessage(""); setTargetClass("ALL"); setPriority("NORMAL");
      await loadAnnouncements();
      alert("✅ Announcement posted!");
    } catch (e) { alert("Error: " + e.message); }
    setPosting(false);
  };

  const pColor = { URGENT: "#ef4444", IMPORTANT: "#f59e0b", NORMAL: "#2563eb" };

  return (
    <div>
      <SCard accent="#dc2626">
        <h3 style={{ marginTop: 0, color: "#dc2626" }}>📣 Post Announcement</h3>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: 2, minWidth: 200 }}>
            <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 4 }}>Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Exam Postponed to Next Week" style={{ marginBottom: 0 }} />
          </div>
          <div style={{ minWidth: 160 }}>
            <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 4 }}>Target Class</label>
            <select value={targetClass} onChange={e => setTargetClass(e.target.value)} style={{ marginBottom: 0 }}>
              <option value="ALL">All Students</option>
              {classes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ minWidth: 140 }}>
            <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 4 }}>Priority</label>
            <select value={priority} onChange={e => setPriority(e.target.value)} style={{ marginBottom: 0 }}>
              <option value="NORMAL">Normal</option>
              <option value="IMPORTANT">Important</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>
        </div>
        <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 4, marginTop: 10 }}>Message *</label>
        <textarea value={message} onChange={e => setMessage(e.target.value)}
          placeholder="Type your announcement here..." style={{ minHeight: 90, marginBottom: 0 }} />
        <button onClick={post} disabled={posting}
          style={{ background: "#dc2626", marginTop: 12, padding: "10px 24px" }}>
          {posting ? "⏳ Posting..." : "📣 Post Announcement"}
        </button>
      </SCard>

      <div>
        <h4 style={{ marginBottom: 12, color: "#1e293b" }}>
          📋 All Announcements ({announcements.length})
        </h4>
        {announcements.length === 0 && (
          <p style={{ color: "#94a3b8", fontSize: 13 }}>No announcements yet.</p>
        )}
        {announcements.map(a => (
          <div key={a.id} style={{
            background: "white", borderRadius: 12, padding: "14px 16px",
            marginBottom: 10, boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
            borderLeft: `4px solid ${pColor[a.priority] || "#2563eb"}`
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>{a.title}</span>
              <div style={{ display: "flex", gap: 6 }}>
                <Badge text={a.priority} color={pColor[a.priority] || "#2563eb"} />
                <Badge text={a.targetClass === "ALL" ? "All Students" : a.targetClass} color="#64748b" />
              </div>
            </div>
            <p style={{ fontSize: 13, color: "#475569", margin: "0 0 6px" }}>{a.message}</p>
            <span style={{ fontSize: 11, color: "#94a3b8" }}>📅 {a.date}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE 5 — STUDENT PROGRESS TRACKER
// ═══════════════════════════════════════════════════════════════════════════════
function StudentProgressTracker({ students, attendanceStats, submissions, assignments }) {
  const [selectedStudent, setSelectedStudent] = useState("");
  const [filterClass, setFilterClass]         = useState("ALL");
  const [progress, setProgress]               = useState(null);
  const [loading, setLoading]                 = useState(false);

  const classes = ["ALL", ...new Set(students.map(s => s.studentClass).filter(Boolean)).values()];
  const filteredStudents = filterClass === "ALL" ? students
    : students.filter(s => s.studentClass === filterClass);

  const analyse = async () => {
    if (!selectedStudent) { alert("Select a student"); return; }
    setLoading(true);
    setProgress(null);
    try {
      const student = students.find(s => s.id === selectedStudent);
      const attRecs = attendanceStats.filter(r => r.studentId === selectedStudent);
      const present = attRecs.filter(r => r.status === "present").length;
      const absent  = attRecs.length - present;
      const subs    = submissions.filter(s => s.studentId === selectedStudent);

      // Fetch quiz attempts for this student
      const qSnap = await getDocs(
        query(collection(db, "quizAttempts"), where("studentId", "==", selectedStudent))
      );
      const quizAttempts = [];
      qSnap.forEach(d => quizAttempts.push(d.data()));
      const avgQuiz = quizAttempts.length
        ? Math.round(quizAttempts.reduce((a, q) => a + (q.percentage || 0), 0) / quizAttempts.length)
        : 0;

      const quizByTopic = {};
      quizAttempts.forEach(q => {
        if (q.topic) {
          if (!quizByTopic[q.topic]) quizByTopic[q.topic] = [];
          quizByTopic[q.topic].push(q.percentage || 0);
        }
      });
      const topicAvgs = Object.entries(quizByTopic).map(([topic, scores]) => ({
        topic, avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      }));

      const res = await fetch(`${API}/api/student-progress`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName: student.name,
          studentClass: student.studentClass,
          attendance: attRecs.length ? Math.round((present / attRecs.length) * 100) : 0,
          presentDays: present, absentDays: absent, totalDays: attRecs.length,
          avgQuizScore: avgQuiz, quizAttempts: quizAttempts.length,
          assignmentsSubmitted: subs.length, assignmentsTotal: assignments.length,
          submissionRate: assignments.length ? Math.round((subs.length / assignments.length) * 100) : 0,
          quizByTopic: topicAvgs
        })
      });
      const data = await res.json();
      setProgress({
        ...data,
        studentInfo: student,
        attRecs, present, absent,
        quizAttempts, avgQuiz, topicAvgs,
        subs
      });
    } catch { alert("Backend not reachable."); }
    setLoading(false);
  };

  const sc = STATUS_COLOR[progress?.overallStatus] || "#64748b";

  return (
    <div>
      <SCard accent="#2563eb">
        <h3 style={{ marginTop: 0, color: "#2563eb" }}>📈 Student Progress Tracker</h3>
        <p style={{ color: "#64748b", fontSize: 13, marginBottom: 14 }}>
          Select any student to get their complete academic profile with an AI-generated
          progress summary, action items, and intervention suggestions.
        </p>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 4 }}>Filter by Class</label>
            <select value={filterClass} onChange={e => { setFilterClass(e.target.value); setSelectedStudent(""); }}
              style={{ width: 160, marginBottom: 0 }}>
              {classes.map(c => <option key={c} value={c}>{c === "ALL" ? "All Classes" : c}</option>)}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 4 }}>Select Student *</label>
            <select value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)} style={{ marginBottom: 0 }}>
              <option value="">-- Select a student --</option>
              {filteredStudents.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.studentClass} | Roll {s.rollNo})</option>
              ))}
            </select>
          </div>
          <button onClick={analyse} disabled={loading}
            style={{ background: "#2563eb", padding: "10px 24px", fontSize: 14 }}>
            {loading ? "⏳ Analysing..." : "📈 Analyse Student"}
          </button>
        </div>
      </SCard>

      {loading && <LoadingSpinner text="Analysing student profile..." />}

      {progress && !loading && (
        <div>
          {/* Status header */}
          <div style={{ background: sc + "18", border: `2px solid ${sc}33`, borderRadius: 14,
            padding: 18, marginBottom: 16, display: "flex", gap: 20, flexWrap: "wrap" }}>
            <div>
              <h3 style={{ margin: "0 0 4px", color: sc }}>{progress.studentInfo?.name}</h3>
              <p style={{ margin: "0 0 8px", fontSize: 13, color: "#64748b" }}>
                {progress.studentInfo?.studentClass} | Roll {progress.studentInfo?.rollNo}
              </p>
              <Badge text={progress.overallStatus?.replace("_", " ")} color={sc} />
            </div>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              {[
                { label: "Attendance", value: progress.attRecs.length ? Math.round((progress.present / progress.attRecs.length) * 100) + "%" : "N/A", color: progress.present / Math.max(progress.attRecs.length, 1) >= 0.8 ? "#22c55e" : "#ef4444" },
                { label: "Avg Quiz", value: progress.avgQuiz + "%", color: progress.avgQuiz >= 70 ? "#22c55e" : "#f59e0b" },
                { label: "Submissions", value: `${progress.subs.length}/${assignments.length}`, color: "#2563eb" },
                { label: "Progress Score", value: progress.progressScore, color: sc },
              ].map(stat => (
                <div key={stat.label} style={{ textAlign: "center", background: "white",
                  borderRadius: 10, padding: "10px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: stat.color }}>{stat.value}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          <p style={{ fontSize: 13, color: "#475569", padding: "0 4px", marginBottom: 16 }}>{progress.summary}</p>

          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            {/* Assessments */}
            <SCard accent="#2563eb" style={{ flex: 1, minWidth: 240 }}>
              <h4 style={{ margin: "0 0 10px", color: "#2563eb" }}>📋 Assessments</h4>
              <InfoRow label="📅 Attendance" value={progress.attendanceAssessment} accent="#2563eb" />
              <InfoRow label="📚 Academic" value={progress.academicAssessment} accent="#7c3aed" />
              <InfoRow label="🔮 Prediction" value={progress.predictedOutcome} accent="#d97706" />
            </SCard>

            {/* Strengths & concerns */}
            <div style={{ flex: 1, minWidth: 220, display: "flex", flexDirection: "column", gap: 14 }}>
              <SCard accent="#22c55e" style={{ flex: 1, margin: 0 }}>
                <h4 style={{ margin: "0 0 8px", color: "#22c55e" }}>💪 Strengths</h4>
                {progress.strengths?.map((s, i) => (
                  <div key={i} style={{ fontSize: 12, color: "#475569", marginBottom: 4 }}>✅ {s}</div>
                ))}
              </SCard>
              <SCard accent="#ef4444" style={{ flex: 1, margin: 0 }}>
                <h4 style={{ margin: "0 0 8px", color: "#ef4444" }}>⚠️ Concerns</h4>
                {progress.concerns?.map((c, i) => (
                  <div key={i} style={{ fontSize: 12, color: "#475569", marginBottom: 4 }}>❌ {c}</div>
                ))}
              </SCard>
            </div>
          </div>

          {/* Teacher action items */}
          {progress.teacherActionItems?.length > 0 && (
            <SCard accent="#d97706">
              <h4 style={{ margin: "0 0 12px", color: "#d97706" }}>🚀 Your Action Items</h4>
              {progress.teacherActionItems.map((a, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10,
                  padding: "8px 10px", marginBottom: 6, background: "#fffbeb",
                  borderRadius: 8, borderLeft: "3px solid #d97706" }}>
                  <Badge text={a.urgency} color={STATUS_COLOR[a.urgency]} />
                  <span style={{ fontSize: 13, color: "#475569" }}>{a.action}</span>
                </div>
              ))}
            </SCard>
          )}

          {/* Interventions */}
          {progress.suggestedInterventions?.length > 0 && (
            <SCard accent="#7c3aed">
              <h4 style={{ margin: "0 0 10px", color: "#7c3aed" }}>🛠 Suggested Interventions</h4>
              {progress.suggestedInterventions.map((s, i) => (
                <div key={i} style={{ fontSize: 13, color: "#475569", marginBottom: 6 }}>→ {s}</div>
              ))}
            </SCard>
          )}

          {/* Quiz topic breakdown */}
          {progress.topicAvgs?.length > 0 && (
            <SCard accent="#0891b2">
              <h4 style={{ margin: "0 0 12px", color: "#0891b2" }}>🧠 Quiz Performance by Topic</h4>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {progress.topicAvgs.map((t, i) => {
                  const c = t.avg >= 80 ? "#22c55e" : t.avg >= 60 ? "#f59e0b" : "#ef4444";
                  return (
                    <div key={i} style={{ background: c + "15", border: `1px solid ${c}33`,
                      borderRadius: 10, padding: "8px 14px", textAlign: "center", minWidth: 100 }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: c }}>{t.avg}%</div>
                      <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{t.topic}</div>
                    </div>
                  );
                })}
              </div>
            </SCard>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
function TeacherTools({ students, attendanceStats, submissions, assignments,
                        classes, onPostAssignment }) {
  const [tab, setTab] = useState("lesson");

  const tabs = [
    { id: "lesson",      emoji: "📋", label: "Lesson Planner" },
    { id: "classreport", emoji: "📊", label: "Class Report" },
    { id: "aigenerate",  emoji: "🤖", label: "AI Assignment" },
    { id: "announce",    emoji: "📣", label: "Announcements" },
    { id: "progress",    emoji: "📈", label: "Student Progress" },
  ];

  return (
    <div>
      <h2 style={{ marginBottom: 4 }}>🛠 Teacher AI Tools</h2>
      <p style={{ color: "#64748b", marginBottom: 20, marginTop: 0, fontSize: 14 }}>
        AI-powered tools to make your teaching easier — lesson planning, class analysis,
        assignment generation, announcements, and individual student tracking.
      </p>
      <TabBar tabs={tabs} active={tab} onChange={setTab} />

      {tab === "lesson"      && <LessonPlanGenerator />}
      {tab === "classreport" && (
        <ClassReportGenerator students={students} attendanceStats={attendanceStats}
          submissions={submissions} assignments={assignments} />
      )}
      {tab === "aigenerate"  && <AssignmentGenerator onPostAssignment={onPostAssignment} />}
      {tab === "announce"    && <AnnouncementBoard students={students} classes={classes} />}
      {tab === "progress"    && (
        <StudentProgressTracker students={students} attendanceStats={attendanceStats}
          submissions={submissions} assignments={assignments} />
      )}
    </div>
  );
}

export default TeacherTools;