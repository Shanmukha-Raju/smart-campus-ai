import { useEffect, useState, useCallback, useRef } from "react";
import { db, auth } from "../firebase/config";
import {
  collection, getDocs, addDoc, query,
  where, updateDoc, doc, Timestamp, getDoc
} from "firebase/firestore";
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  BarElement, LineElement, PointElement,
  Title, Tooltip, Legend, Filler
} from "chart.js";
import { Line } from "react-chartjs-2";
import StudyPlan from "./StudyPlan";

// ── Cloudinary unsigned upload ────────────────────────────────────────────────
// ⚠️  Replace with your own values from cloudinary.com (free account)
const CLOUDINARY_CLOUD_NAME = "dhjuwsr9b";        
const CLOUDINARY_UPLOAD_PRESET = "smart_campus";
async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder", "smart_campus_submissions");
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`,
    { method: "POST", body: formData }
  );
  if (!res.ok) throw new Error("Cloudinary upload failed: " + res.statusText);
  const data = await res.json();
  return data.secure_url;
}

ChartJS.register(
  CategoryScale, LinearScale, BarElement,
  LineElement, PointElement, Title, Tooltip, Legend, Filler
);

// ── Risk gauge component (curved SVG arc) ────────────────────────────────────
function RiskGauge({ percent }) {
  // Arc from 180° to 0° (left to right), value maps percent 0→100 to 180°→0°
  const R = 80, cx = 100, cy = 100;
  const clamp = Math.min(100, Math.max(0, percent));
  const angleDeg = 180 - (clamp / 100) * 180;
  const rad = (angleDeg * Math.PI) / 180;
  const nx = cx + R * Math.cos(rad);
  const ny = cy - R * Math.sin(rad);

  // Gradient zones
  const color =
    clamp >= 80 ? "#22c55e"
    : clamp >= 75 ? "#f59e0b"
    : "#ef4444";

  const label =
    clamp === 0 ? "NO DATA"
    : clamp >= 80 ? "SAFE"
    : clamp >= 75 ? "NEAR RISK"
    : "CRITICAL";

  return (
    <div style={{ textAlign: "center" }}>
      <svg viewBox="0 0 200 110" style={{ width: 220, overflow: "visible" }}>
        {/* Background arc */}
        <path
          d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="16"
          strokeLinecap="round"
        />
        {/* Safe zone 80–100 */}
        <path
          d={`M ${cx} ${cy - R} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`}
          fill="none"
          stroke="#22c55e"
          strokeWidth="16"
          strokeLinecap="round"
          opacity="0.25"
        />
        {/* Near risk zone 75–80 */}
        <path
          d={`M ${cx - R * Math.cos((5 / 100) * Math.PI)} ${cy - R * Math.sin((5 / 100) * Math.PI)} A ${R} ${R} 0 0 1 ${cx} ${cy - R}`}
          fill="none"
          stroke="#f59e0b"
          strokeWidth="16"
          opacity="0.25"
        />
        {/* Critical zone 0–75 */}
        <path
          d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx - R * Math.cos((25 / 100) * Math.PI)} ${cy - R * Math.sin((25 / 100) * Math.PI)}`}
          fill="none"
          stroke="#ef4444"
          strokeWidth="16"
          opacity="0.25"
        />
        {/* Needle */}
        {clamp > 0 && (
          <>
            <line
              x1={cx} y1={cy}
              x2={nx} y2={ny}
              stroke={color}
              strokeWidth="3"
              strokeLinecap="round"
            />
            <circle cx={nx} cy={ny} r="6" fill={color} />
          </>
        )}
        <circle cx={cx} cy={cy} r="5" fill="#1e293b" />
        {/* Labels */}
        <text x="22" y="108" fontSize="10" fill="#ef4444">0%</text>
        <text x="87" y="22" fontSize="10" fill="#475569">50%</text>
        <text x="165" y="108" fontSize="10" fill="#22c55e">100%</text>
      </svg>
      <div style={{ marginTop: -8 }}>
        <span style={{
          fontSize: 28, fontWeight: 700,
          color
        }}>{clamp > 0 ? clamp + "%" : "—"}</span>
        <div style={{ fontSize: 14, fontWeight: 700, color, marginTop: 2 }}>
          {label}
        </div>
      </div>
    </div>
  );
}

// ── Line chart of attendance over time ────────────────────────────────────────
function AttendanceTrendChart({ records }) {
  // Sort records by date, compute rolling cumulative %
  const sorted = [...records].sort((a, b) => (a.date > b.date ? 1 : -1));
  let present = 0;
  const points = sorted.map((r, i) => {
    if (r.status === "present") present++;
    return { date: r.date, pct: Math.round((present / (i + 1)) * 100) };
  });

  if (points.length === 0) return null;

  const data = {
    labels: points.map((p) => p.date),
    datasets: [
      {
        label: "Attendance %",
        data: points.map((p) => p.pct),
        borderColor: "#2563eb",
        backgroundColor: "rgba(37,99,235,0.08)",
        fill: true,
        tension: 0.45,        // ← curved line
        pointRadius: 4,
        pointBackgroundColor: points.map((p) =>
          p.pct >= 80 ? "#22c55e" : p.pct >= 75 ? "#f59e0b" : "#ef4444"
        ),
        pointBorderColor: "white",
        pointBorderWidth: 2
      },
      // 80% safe threshold line
      {
        label: "Safe (80%)",
        data: points.map(() => 80),
        borderColor: "#22c55e",
        borderDash: [6, 4],
        borderWidth: 1.5,
        pointRadius: 0,
        fill: false,
        tension: 0
      },
      // 75% near-risk threshold line
      {
        label: "Near Risk (75%)",
        data: points.map(() => 75),
        borderColor: "#f59e0b",
        borderDash: [6, 4],
        borderWidth: 1.5,
        pointRadius: 0,
        fill: false,
        tension: 0
      }
    ]
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { position: "bottom", labels: { boxWidth: 12, font: { size: 11 } } },
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y}%`
        }
      }
    },
    scales: {
      y: {
        min: 0, max: 100,
        ticks: { callback: (v) => v + "%" },
        grid: { color: "#f1f5f9" }
      },
      x: {
        ticks: { maxTicksLimit: 8, maxRotation: 30, font: { size: 10 } }
      }
    }
  };

  return (
    <div style={{ marginTop: 20 }}>
      <h4 style={{ marginBottom: 8 }}>📈 Attendance Trend Over Time</h4>
      <Line data={data} options={options} />
    </div>
  );
}

// ── File helpers ──────────────────────────────────────────────────────────────
const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png", "image/jpeg"
];

const fileIcon = (type = "") => {
  if (type.includes("pdf")) return "📄";
  if (type.includes("word")) return "📝";
  if (type.includes("sheet") || type.includes("excel")) return "📊";
  if (type.includes("presentation") || type.includes("powerpoint")) return "📑";
  if (type.includes("image")) return "🖼️";
  return "📎";
};



// ── Main component ────────────────────────────────────────────────────────────
function StudentDashboard() {
  const [page, setPage] = useState("dashboard");
  const [announcements, setAnnouncements] = useState([]);

  const [studentName, setStudentName] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [rollNo, setRollNo] = useState("");

  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [attendancePercent, setAttendancePercent] = useState(0);

  const [assignments, setAssignments] = useState([]);
  const [answers, setAnswers] = useState({});
  const [links, setLinks] = useState({});
  const [subFiles, setSubFiles] = useState({});     // { assignmentId: { name, type, dataUrl } }
  const [submitted, setSubmitted] = useState({});

  const [quizTopic, setQuizTopic] = useState("");
  const [quiz, setQuiz] = useState([]);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizScore, setQuizScore] = useState(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizLoading, setQuizLoading] = useState(false);

  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());

  const hasFetched = useRef(false);

  // ─── Load all ──────────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    const uid = auth.currentUser.uid;

    const userSnap = await getDoc(doc(db, "users", uid));
    if (userSnap.exists()) {
      const d = userSnap.data();
      setStudentName(d.name || "");
      setStudentClass(d.studentClass || "");
      setRollNo(d.rollNo ?? "");
    }

    const attQ = query(collection(db, "attendance"), where("studentId", "==", uid));
    const attSnap = await getDocs(attQ);
    let present = 0, total = 0;
    const records = [];
    attSnap.forEach((d) => {
      records.push(d.data()); total++;
      if (d.data().status === "present") present++;
    });
    setAttendanceRecords(records);

    // Load announcements for this student
    const annSnap = await getDocs(collection(db, "announcements"));
    const annList = [];
    annSnap.forEach((d) => {
      const a = { id: d.id, ...d.data() };
      // Show if targeted at all students or this student's class
      if (a.targetClass === "ALL" || a.targetClass === studentClass) {
        annList.push(a);
      }
    });
    annList.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    setAnnouncements(annList);
    setAttendancePercent(total ? Number(((present / total) * 100).toFixed(1)) : 0);

    const asgSnap = await getDocs(collection(db, "assignments"));
    const asgList = [];
    asgSnap.forEach((d) => asgList.push({ id: d.id, ...d.data() }));
    setAssignments(asgList);

    const subQ = query(collection(db, "submissions"), where("studentId", "==", uid));
    const subSnap = await getDocs(subQ);
    const subMap = {};
    subSnap.forEach((d) => { subMap[d.data().assignmentId] = { id: d.id, ...d.data() }; });
    setSubmitted(subMap);
  }, []);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    loadAll();
  }, [loadAll]);

  const refreshSubmissions = async () => {
    const uid = auth.currentUser.uid;
    const subQ = query(collection(db, "submissions"), where("studentId", "==", uid));
    const subSnap = await getDocs(subQ);
    const subMap = {};
    subSnap.forEach((d) => { subMap[d.data().assignmentId] = { id: d.id, ...d.data() }; });
    setSubmitted(subMap);
  };

  // ─── File for submission — store raw File object, upload on submit ──────────
  const handleSubFileChange = (assignmentId, e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) { alert("Allowed: PDF, PPT, Excel, Word, PNG, JPG"); return; }
    if (file.size > 20 * 1024 * 1024) { alert("Max file size is 20MB"); return; }
    // Store the raw File object — upload happens on Submit
    setSubFiles((prev) => ({ ...prev, [assignmentId]: file }));
  };

  // ─── Upload file to Cloudinary, return secure download URL ──────────────────
  // (Cloudinary free tier: 25GB storage, no credit card needed)

  // ─── Submit assignment — upload file to Storage first ────────────────────
  const [uploadProgress, setUploadProgress] = useState({});

  const submitAssignment = async (id) => {
    const file = subFiles[id]; // raw File object or undefined
    let attachmentName = "";
    let attachmentType = "";
    let attachmentURL = "";   // Firebase Storage download URL — safe to store in Firestore

    if (file) {
      try {
        setUploadProgress((p) => ({ ...p, [id]: "uploading" }));
        attachmentURL = await uploadToCloudinary(file);
        attachmentName = file.name;
        attachmentType = file.type;
        setUploadProgress((p) => ({ ...p, [id]: "done" }));
      } catch (err) {
        alert("File upload failed: " + err.message);
        setUploadProgress((p) => ({ ...p, [id]: "error" }));
        return;
      }
    }

    await addDoc(collection(db, "submissions"), {
      assignmentId: id,
      studentId: auth.currentUser.uid,
      answerText: answers[id] || "",
      fileLink: links[id] || "",
      attachmentName,       // just the filename string — tiny
      attachmentType,       // mime type string — tiny
      attachmentURL,        // Firebase Storage URL — tiny string, NOT base64
      locked: true,
      editRequested: false,
      submittedAt: new Date()
    });
    await refreshSubmissions();
  };

  const requestEdit = async (subDocId) => {
    await updateDoc(doc(db, "submissions", subDocId), { editRequested: true });
    await refreshSubmissions();
  };

  // ─── Quiz ──────────────────────────────────────────────────────────────────
  const generateQuiz = async () => {
    if (!quizTopic) { alert("Enter a topic"); return; }
    setQuizLoading(true);
    try {
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/generate-quiz`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topic: quizTopic, count: 5 }) }
      );
      const data = await res.json();
      setQuiz(data.quiz || []); setQuizAnswers({}); setQuizSubmitted(false); setQuizScore(null);
    } catch { alert("Backend not reachable."); }
    setQuizLoading(false);
  };

  const generateAssignmentQuiz = async (assignment) => {
    setQuizLoading(true);
    try {
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/generate-assignment-quiz`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: assignment.title, description: assignment.description }) }
      );
      const data = await res.json();
      setQuiz(data.quiz || []); setQuizAnswers({}); setQuizSubmitted(false); setQuizScore(null);
      setPage("quiz");
    } catch { alert("Backend not reachable."); }
    setQuizLoading(false);
  };

  const selectAnswer = (qid, opt) => {
    if (quizSubmitted) return;
    setQuizAnswers((prev) => ({ ...prev, [qid]: opt }));
  };

  const submitQuiz = async () => {
    let score = 0;
    quiz.forEach((q) => { if (quizAnswers[q.id] === q.correct) score++; });
    setQuizScore(score); setQuizSubmitted(true);
    await addDoc(collection(db, "quizAttempts"), {
      studentId: auth.currentUser.uid, topic: quizTopic, score,
      totalQuestions: quiz.length,
      percentage: Math.round((score / quiz.length) * 100),
      answers: quizAnswers, questions: quiz, createdAt: Timestamp.now()
    });
  };

  const logout = () => { auth.signOut(); window.location = "/"; };

  // ─── Calendar ──────────────────────────────────────────────────────────────
  const attendanceMap = {};
  attendanceRecords.forEach((r) => { if (r.date) attendanceMap[r.date] = r.status; });
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calendar = [];
  for (let i = 0; i < firstDay; i++) calendar.push(null);
  for (let d = 1; d <= daysInMonth; d++)
    calendar.push(`${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);

  const presentCount = attendanceRecords.filter((r) => r.status === "present").length;
  const absentCount = attendanceRecords.filter((r) => r.status === "absent").length;

  return (
    <div>
      {/* ── SIDEBAR ── */}
      <div className="sidebar">
        <h2 style={{ fontSize: 15, padding: "0 10px", textAlign: "center" }}>{studentName || "Student"}</h2>
        <p style={{ fontSize: 11, textAlign: "center", color: "#94a3b8", marginTop: -8 }}>
          {studentClass} | Roll {rollNo}
        </p>
        <button onClick={() => setPage("dashboard")}>📊 Dashboard</button>
        <button onClick={() => setPage("attendance")}>📅 Attendance</button>
        <button onClick={() => setPage("assignments")}>📝 Assignments</button>
        <button onClick={() => setPage("quiz")}>🧠 Quiz</button>
        <button onClick={() => setPage("studyplan")}>🎓 AI Advisor</button>
        <button onClick={() => setPage("announcements")}>📣 Notices {announcements.filter(a=>a.priority==="URGENT").length > 0 ? "🔴" : ""}</button>
        <button onClick={logout}>🚪 Logout</button>
      </div>

      {/* ── MAIN ── */}
      <div className="main">

        {/* ══ DASHBOARD ══ */}
        {page === "dashboard" && (
          <div>
            {/* Stat cards */}
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
              <div className="card" style={{ flex: 1, minWidth: 120, textAlign: "center" }}>
                <h2 style={{ color: "#22c55e", margin: "4px 0" }}>{presentCount}</h2>
                <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>Days Present</p>
              </div>
              <div className="card" style={{ flex: 1, minWidth: 120, textAlign: "center" }}>
                <h2 style={{ color: "#ef4444", margin: "4px 0" }}>{absentCount}</h2>
                <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>Days Absent</p>
              </div>
              <div className="card" style={{ flex: 1, minWidth: 120, textAlign: "center" }}>
                <h2 style={{ color: "#2563eb", margin: "4px 0" }}>{assignments.length}</h2>
                <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>Assignments</p>
              </div>
              <div className="card" style={{ flex: 1, minWidth: 120, textAlign: "center" }}>
                <h2 style={{ color: "#7c3aed", margin: "4px 0" }}>{Object.keys(submitted).length}</h2>
                <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>Submitted</p>
              </div>
            </div>

            {/* Risk Gauge card */}
            <div className="card" style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "center" }}>
              <div>
                <h3 style={{ marginBottom: 4 }}>Attendance Risk Level</h3>
                <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 12px 0" }}>
                  🟢 ≥80% Safe &nbsp; 🟡 75–79% Near Risk &nbsp; 🔴 &lt;75% Critical
                </p>
                <RiskGauge percent={attendancePercent} />
              </div>

              {/* Trend chart */}
              <div style={{ flex: 1, minWidth: 260 }}>
                <AttendanceTrendChart records={attendanceRecords} />
              </div>
            </div>
          </div>
        )}

        {/* ══ ATTENDANCE CALENDAR ══ */}
        {page === "attendance" && (
          <div className="card">
            <h3>📅 Attendance Calendar</h3>

            {/* Summary pills */}
            <div style={{ display: "flex", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
              <span style={{ background: "#22c55e", color: "white", padding: "4px 14px", borderRadius: 20, fontSize: 13 }}>
                ✅ Present: {presentCount}
              </span>
              <span style={{ background: "#ef4444", color: "white", padding: "4px 14px", borderRadius: 20, fontSize: 13 }}>
                ❌ Absent: {absentCount}
              </span>
              <span style={{ background: "#2563eb", color: "white", padding: "4px 14px", borderRadius: 20, fontSize: 13 }}>
                📊 {attendancePercent}%
              </span>
            </div>

            {/* Month nav */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
              <button onClick={() => {
                if (month === 0) { setMonth(11); setYear((y) => y - 1); }
                else setMonth((m) => m - 1);
              }}>← Prev</button>
              <strong style={{ minWidth: 140, textAlign: "center" }}>
                {new Date(year, month).toLocaleString("default", { month: "long" })} {year}
              </strong>
              <button onClick={() => {
                if (month === 11) { setMonth(0); setYear((y) => y + 1); }
                else setMonth((m) => m + 1);
              }}>Next →</button>
            </div>

            {/* Legend */}
            <div style={{ display: "flex", gap: 10, marginBottom: 10, fontSize: 12 }}>
              <span style={{ background: "#22c55e", color: "white", padding: "2px 10px", borderRadius: 4 }}>Present</span>
              <span style={{ background: "#ef4444", color: "white", padding: "2px 10px", borderRadius: 4 }}>Absent</span>
              <span style={{ background: "#e2e8f0", padding: "2px 10px", borderRadius: 4 }}>No class</span>
            </div>

            <div className="calendar-header">
              {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => <div key={d}>{d}</div>)}
            </div>
            <div className="calendar-grid">
              {calendar.map((date, i) => {
                if (!date) return <div key={i} />;
                const status = attendanceMap[date];
                return (
                  <div
                    key={i}
                    className={
                      status === "present" ? "calendar-day present"
                      : status === "absent" ? "calendar-day absent"
                      : "calendar-day empty"
                    }
                    title={date + (status ? ": " + status : "")}
                  >
                    {parseInt(date.split("-")[2])}
                  </div>
                );
              })}
            </div>

            {/* Inline trend below calendar */}
            <AttendanceTrendChart records={attendanceRecords} />
          </div>
        )}

        {/* ══ ASSIGNMENTS ══ */}
        {page === "assignments" && (
          <div className="card">
            <h3>📝 My Assignments</h3>
            {assignments.length === 0 && <p>No assignments posted yet.</p>}
            {assignments.map((a) => {
              const sub = submitted[a.id];
              return (
                <div key={a.id} className="quiz-card">
                  <h4 style={{ margin: "0 0 4px 0" }}>{a.title}</h4>
                  <p style={{ margin: "0 0 4px 0", color: "#475569", fontSize: 14 }}>{a.description}</p>
                  {a.deadline && (
                    <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 8px 0" }}>📅 Deadline: {a.deadline}</p>
                  )}
                  {/* Teacher attachment download */}
                  {a.attachmentName && (
                    <div style={{ marginBottom: 8 }}>
                      <a
                        href={a.attachmentURL}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: 13, color: "#2563eb" }}
                      >
                        {fileIcon(a.attachmentType)} Download: {a.attachmentName}
                      </a>
                    </div>
                  )}

                  <button onClick={() => generateAssignmentQuiz(a)} disabled={quizLoading} style={{ marginBottom: 8 }}>
                    🧠 Generate Quiz from This
                  </button>

                  {sub ? (
                    <div>
                      <p style={{ color: "#22c55e", margin: "4px 0" }}>✅ Submitted</p>
                      {sub.answerText && <p style={{ fontSize: 13 }}>Your answer: {sub.answerText}</p>}
                      {sub.attachmentName && (
                        <p style={{ fontSize: 13 }}>
                          {fileIcon(sub.attachmentType)}{" "}
                          <a href={sub.attachmentURL} target="_blank" rel="noreferrer" style={{ color: "#2563eb" }}>
                            {sub.attachmentName}
                          </a>
                        </p>
                      )}
                      {sub.editRequested
                        ? <p style={{ color: "#f59e0b" }}>⏳ Edit request pending teacher approval</p>
                        : <button onClick={() => requestEdit(sub.id)}>✏️ Request Edit</button>
                      }
                    </div>
                  ) : (
                    <div>
                      <label style={{ fontWeight: 600, fontSize: 13 }}>Your Answer</label>
                      <textarea
                        placeholder="Type your answer here..."
                        value={answers[a.id] || ""}
                        onChange={(e) => setAnswers({ ...answers, [a.id]: e.target.value })}
                      />
                      <label style={{ fontWeight: 600, fontSize: 13 }}>Or paste a link</label>
                      <input
                        placeholder="Drive / OneDrive / GitHub link"
                        value={links[a.id] || ""}
                        onChange={(e) => setLinks({ ...links, [a.id]: e.target.value })}
                      />
                      <label style={{ fontWeight: 600, fontSize: 13 }}>Or upload a file (PDF, PPT, Excel, Word — max 5MB)</label>
                      <input
                        type="file"
                        accept=".pdf,.ppt,.pptx,.xls,.xlsx,.doc,.docx,.png,.jpg,.jpeg"
                        onChange={(e) => handleSubFileChange(a.id, e)}
                        style={{ padding: 4 }}
                      />
                      {subFiles[a.id] && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: "#f0fdf4", borderRadius: 6, marginBottom: 8 }}>
                          <span>{fileIcon(subFiles[a.id].type)}</span>
                          <span style={{ fontSize: 13 }}>{subFiles[a.id].name}</span>
                          <button
                            onClick={() => setSubFiles((p) => { const n = { ...p }; delete n[a.id]; return n; })}
                            style={{ background: "#ef4444", padding: "2px 8px", fontSize: 12, marginLeft: "auto" }}
                          >✕</button>
                        </div>
                      )}
                      {uploadProgress[a.id] === "uploading" && (
                        <p style={{ color: "#2563eb", fontSize: 13 }}>⏳ Uploading file...</p>
                      )}
                      <button onClick={() => submitAssignment(a.id)}
                        disabled={uploadProgress[a.id] === "uploading"}>
                        📤 Submit
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ══ QUIZ ══ */}
        {page === "quiz" && (
          <div className="card">
            <h3>🧠 AI Quiz Generator</h3>
            <input
              placeholder="Enter topic (e.g. Machine Learning Basics)"
              value={quizTopic}
              onChange={(e) => setQuizTopic(e.target.value)}
            />
            <button onClick={generateQuiz} disabled={quizLoading}>
              {quizLoading ? "⏳ Generating..." : "Generate Quiz"}
            </button>

            {quiz.map((q) => (
              <div key={q.id} className="quiz-card">
                <h4 style={{ margin: "0 0 8px 0" }}>{q.id}. {q.question}</h4>
                {Object.entries(q.options).map(([k, v]) => (
                  <label key={k} style={{ display: "flex", alignItems: "center", gap: 8, margin: "6px 0", cursor: "pointer" }}>
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      checked={quizAnswers[q.id] === k}
                      onChange={() => selectAnswer(q.id, k)}
                    />
                    <span style={{
                      color: quizSubmitted
                        ? k === q.correct ? "#22c55e"
                        : quizAnswers[q.id] === k ? "#ef4444" : "inherit"
                        : "inherit",
                      fontWeight: quizSubmitted && k === q.correct ? 700 : 400
                    }}>
                      {k}) {v}
                    </span>
                  </label>
                ))}
                {quizSubmitted && (
                  <div style={{ marginTop: 6, padding: 10, background: "#f0fdf4", borderRadius: 6 }}>
                    <p style={{ margin: 0, color: quizAnswers[q.id] === q.correct ? "#22c55e" : "#ef4444", fontWeight: 600 }}>
                      {quizAnswers[q.id] === q.correct ? "✅ Correct!" : `❌ Wrong — correct answer: ${q.correct}`}
                    </p>
                    <p style={{ margin: "4px 0 0", fontSize: 13, color: "#475569" }}>{q.explanation}</p>
                  </div>
                )}
              </div>
            ))}

            {quiz.length > 0 && !quizSubmitted && (
              <button onClick={submitQuiz}>Submit Quiz</button>
            )}
            {quizSubmitted && (
              <div className="card" style={{ textAlign: "center" }}>
                <h2 style={{ color: quizScore / quiz.length >= 0.8 ? "#22c55e" : quizScore / quiz.length >= 0.6 ? "#f59e0b" : "#ef4444" }}>
                  🎯 {quizScore}/{quiz.length} ({Math.round((quizScore / quiz.length) * 100)}%)
                </h2>
                <button onClick={() => { setQuiz([]); setQuizAnswers({}); setQuizSubmitted(false); setQuizScore(null); setQuizTopic(""); }}>
                  🔄 New Quiz
                </button>
              </div>
            )}
          </div>
        )}
        {/* ══ ANNOUNCEMENTS ══ */}
        {page === "announcements" && (
          <div className="main" style={{ marginLeft: 0 }}>
            <h2 style={{ marginBottom: 4 }}>📣 Announcements</h2>
            <p style={{ color: "#64748b", fontSize: 14, marginBottom: 20, marginTop: 0 }}>
              Important notices from your teacher.
            </p>
            {announcements.length === 0 && (
              <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>
                No announcements yet.
              </div>
            )}
            {announcements.map((a) => {
              const pc = a.priority === "URGENT" ? "#ef4444" : a.priority === "IMPORTANT" ? "#f59e0b" : "#2563eb";
              return (
                <div key={a.id} style={{
                  background: "white", borderRadius: 12, padding: "16px 20px",
                  marginBottom: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  borderLeft: `5px solid ${pc}`
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>{a.title}</span>
                    <span style={{
                      background: pc + "20", color: pc, border: `1px solid ${pc}40`,
                      padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700
                    }}>{a.priority}</span>
                  </div>
                  <p style={{ fontSize: 14, color: "#475569", margin: "0 0 8px" }}>{a.message}</p>
                  <span style={{ fontSize: 12, color: "#94a3b8" }}>📅 {a.date}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* ══ AI ACADEMIC ADVISOR ══ */}
        {page === "studyplan" && <StudyPlan />}

      </div>
    </div>
  );
}

export default StudentDashboard;