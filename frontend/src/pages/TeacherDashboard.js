import { useEffect, useState, useCallback, useRef } from "react";
import { db, auth } from "../firebase/config";
import {
  collection, getDocs, addDoc, query,
  where, updateDoc, doc, getDoc, Timestamp
} from "firebase/firestore";
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  BarElement, Title, Tooltip, Legend
} from "chart.js";
import { Bar } from "react-chartjs-2";
import TeacherTools from "./TeacherTools";

// ── Cloudinary unsigned upload ────────────────────────────────────────────────
// ⚠️  Replace with your own values from cloudinary.com (free account)
const CLOUDINARY_CLOUD_NAME = "dhjuwsr9b";        
const CLOUDINARY_UPLOAD_PRESET = "smart_campus";

async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder", "smart_campus_assignments");
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`,
    { method: "POST", body: formData }
  );
  if (!res.ok) throw new Error("Cloudinary upload failed: " + res.statusText);
  const data = await res.json();
  return data.secure_url;
}

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);



function TeacherDashboard() {
  const [page, setPage] = useState("dashboard");
  const [teacherName, setTeacherName] = useState("Teacher");

  // All students
  const [students, setStudents] = useState([]);
  // Unique classes extracted from students
  const [classes, setClasses] = useState([]);
  // Selected class filter for attendance
  const [selectedClass, setSelectedClass] = useState("ALL");

  // Attendance
  const [attendanceDate, setAttendanceDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [subject, setSubject] = useState("");
  const [attendanceStatus, setAttendanceStatus] = useState({});
  const [sessionSaved, setSessionSaved] = useState(false);

  // Assignments
  const [assignments, setAssignments] = useState([]);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  // File attachment for assignment
  const [assignmentFile, setAssignmentFile] = useState(null);   // raw File object
  const [assignmentFileUploading, setAssignmentFileUploading] = useState(false);

  // Submissions
  const [submissions, setSubmissions] = useState([]);

  // Quiz
  const [quizTopic, setQuizTopic] = useState("");
  const [quiz, setQuiz] = useState([]);
  const [quizLoading, setQuizLoading] = useState(false);

  // Attendance stats for chart
  const [attendanceStats, setAttendanceStats] = useState([]);

  const hasFetched = useRef(false);

  // ─── Load all data once ───────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    const uid = auth.currentUser.uid;

    const tSnap = await getDoc(doc(db, "users", uid));
    if (tSnap.exists()) setTeacherName(tSnap.data().name || "Teacher");

    const stuQ = query(collection(db, "users"), where("role", "==", "student"));
    const stuSnap = await getDocs(stuQ);
    const stuList = [];
    stuSnap.forEach((d) => stuList.push({ id: d.id, ...d.data() }));
    setStudents(stuList);

    // Extract unique classes
    const uniqueClasses = [...new Set(stuList.map((s) => s.studentClass).filter(Boolean))].sort();
    setClasses(uniqueClasses);

    const asgSnap = await getDocs(collection(db, "assignments"));
    const asgList = [];
    asgSnap.forEach((d) => asgList.push({ id: d.id, ...d.data() }));
    setAssignments(asgList);

    const subSnap = await getDocs(collection(db, "submissions"));
    const subList = [];
    subSnap.forEach((d) => subList.push({ id: d.id, ...d.data() }));
    setSubmissions(subList);

    const attSnap = await getDocs(collection(db, "attendance"));
    const attList = [];
    attSnap.forEach((d) => attList.push(d.data()));
    setAttendanceStats(attList);
  }, []);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    loadAll();
  }, [loadAll]);

  const refreshSubmissions = async () => {
    const subSnap = await getDocs(collection(db, "submissions"));
    const subList = [];
    subSnap.forEach((d) => subList.push({ id: d.id, ...d.data() }));
    setSubmissions(subList);
  };

  // ─── Attendance ───────────────────────────────────────────────────────────
  // Students shown in the attendance table filtered by selected class
  const filteredStudents = selectedClass === "ALL"
    ? students
    : students.filter((s) => s.studentClass === selectedClass);

  const markStatus = (studentId, status) => {
    setAttendanceStatus((prev) => ({ ...prev, [studentId]: status }));
  };

  // Save: every student in the filtered list who is NOT marked present → absent
  const saveAttendance = async () => {
    if (!subject) { alert("Enter subject name"); return; }
    const uid = auth.currentUser.uid;

    const promises = filteredStudents.map((s) => {
      const status = attendanceStatus[s.id] || "absent"; // default = absent
      return addDoc(collection(db, "attendance"), {
        studentId: s.id,
        studentClass: s.studentClass || "",
        date: attendanceDate,
        status,
        markedBy: uid
      });
    });
    await Promise.all(promises);

    await addDoc(collection(db, "attendanceSessions"), {
      teacherId: uid,
      class: selectedClass,
      subject,
      date: attendanceDate,
      createdAt: Timestamp.now()
    });

    // Refresh attendance stats
    const attSnap = await getDocs(collection(db, "attendance"));
    const attList = [];
    attSnap.forEach((d) => attList.push(d.data()));
    setAttendanceStats(attList);

    setSessionSaved(true);
    setAttendanceStatus({}); // reset for next session
    alert(`✅ Attendance saved for ${filteredStudents.length} students!`);
  };

  // ─── File conversion ──────────────────────────────────────────────────────
  const ALLOWED_FILE_TYPES = [
    "application/pdf",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/png", "image/jpeg"
  ];

  // Store raw File object — upload happens when teacher clicks Post Assignment
  const handleAssignmentFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      alert("Allowed: PDF, PPT, Excel, Word, PNG, JPG"); return;
    }
    if (file.size > 20 * 1024 * 1024) { alert("Max file size is 20MB"); return; }
    setAssignmentFile(file); // store raw File
  };

  // uploadToCloudinary is defined at the top of the file

  // ─── Create assignment ────────────────────────────────────────────────────
  const createAssignment = async () => {
    if (!newTitle) { alert("Enter title"); return; }

    let attachmentName = "";
    let attachmentType = "";
    let attachmentURL = "";   // Firebase Storage download URL — safe for Firestore

    if (assignmentFile) {
      try {
        setAssignmentFileUploading(true);
        attachmentURL = await uploadToCloudinary(assignmentFile);
        attachmentName = assignmentFile.name;
        attachmentType = assignmentFile.type;
        setAssignmentFileUploading(false);
      } catch (err) {
        alert("File upload failed: " + err.message);
        setAssignmentFileUploading(false);
        return;
      }
    }

    await addDoc(collection(db, "assignments"), {
      title: newTitle,
      description: newDesc,
      deadline: newDeadline,
      teacherId: auth.currentUser.uid,
      attachmentName,     // just filename string — tiny
      attachmentType,     // mime type string — tiny
      attachmentURL,      // Storage URL — tiny string, NOT base64
      createdAt: new Date()
    });
    setNewTitle(""); setNewDesc(""); setNewDeadline(""); setAssignmentFile(null);
    const asgSnap = await getDocs(collection(db, "assignments"));
    const asgList = [];
    asgSnap.forEach((d) => asgList.push({ id: d.id, ...d.data() }));
    setAssignments(asgList);
    alert("✅ Assignment posted!");
  };

  // ─── Edit approval ────────────────────────────────────────────────────────
  const approveEdit = async (subId) => {
    await updateDoc(doc(db, "submissions", subId), { locked: false, editRequested: false });
    await refreshSubmissions();
  };

  // ─── Quiz preview ─────────────────────────────────────────────────────────
  const generateQuiz = async () => {
    if (!quizTopic) { alert("Enter topic"); return; }
    setQuizLoading(true);
    try {
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/generate-quiz`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic: quizTopic, count: 5 })
        }
      );
      const data = await res.json();
      setQuiz(data.quiz || []);
    } catch { alert("Backend not running on port 5000."); }
    setQuizLoading(false);
  };

  const logout = () => { auth.signOut(); window.location = "/"; };

  // ─── Chart data ───────────────────────────────────────────────────────────
  // Per-student attendance % coloured by risk
  const displayStudents = selectedClass === "ALL" ? students : students.filter((s) => s.studentClass === selectedClass);

  const studentPcts = displayStudents.map((s) => {
    const recs = attendanceStats.filter((r) => r.studentId === s.id);
    const present = recs.filter((r) => r.status === "present").length;
    return recs.length ? Math.round((present / recs.length) * 100) : 0;
  });

  const barChartData = {
    labels: displayStudents.map((s) => s.name || "Student"),
    datasets: [{
      label: "Attendance %",
      data: studentPcts,
      backgroundColor: studentPcts.map((p) => p >= 80 ? "#22c55e" : p >= 75 ? "#f59e0b" : "#ef4444"),
      borderRadius: 6
    }]
  };

  const pendingEdits = submissions.filter((s) => s.editRequested);

  // ─── File icon helper ─────────────────────────────────────────────────────
  const fileIcon = (type = "") => {
    if (type.includes("pdf")) return "📄";
    if (type.includes("word")) return "📝";
    if (type.includes("sheet") || type.includes("excel")) return "📊";
    if (type.includes("presentation") || type.includes("powerpoint")) return "📑";
    if (type.includes("image")) return "🖼️";
    return "📎";
  };

  // ─── Handler passed to TeacherTools so it can post AI-generated assignments ──
  const handlePostAssignment = async (assignmentData) => {
    await addDoc(collection(db, "assignments"), {
      ...assignmentData,
      teacherId: auth.currentUser.uid,
      createdAt: new Date()
    });
    // Refresh assignments list
    const asgSnap = await getDocs(collection(db, "assignments"));
    const asgList = [];
    asgSnap.forEach((d) => asgList.push({ id: d.id, ...d.data() }));
    setAssignments(asgList);
  };

  return (
    <div>
      {/* ── SIDEBAR ── */}
      <div className="sidebar">
        <h2 style={{ textAlign: "center", fontSize: 16, padding: "0 10px" }}>{teacherName}</h2>
        <p style={{ fontSize: 11, textAlign: "center", color: "#94a3b8", marginTop: -8 }}>Teacher Portal</p>
        <button onClick={() => setPage("dashboard")}>📊 Dashboard</button>
        <button onClick={() => { setPage("attendance"); setSessionSaved(false); }}>✅ Attendance</button>
        <button onClick={() => setPage("assignments")}>📝 Assignments</button>
        <button onClick={() => setPage("submissions")}>📬 Submissions</button>
        <button onClick={() => setPage("quiz")}>🧠 Quiz Generator</button>
        <button onClick={() => setPage("tools")}>🛠 AI Tools</button>
        <button onClick={logout}>🚪 Logout</button>
      </div>

      {/* ── MAIN ── */}
      <div className="main">

        {/* ══ DASHBOARD ══ */}
        {page === "dashboard" && (
          <div>
            {/* Stat cards */}
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
              {[
                { label: "Students", value: students.length, color: "#2563eb" },
                { label: "Assignments", value: assignments.length, color: "#7c3aed" },
                { label: "Submissions", value: submissions.length, color: "#0891b2" },
                { label: "Edit Requests", value: pendingEdits.length, color: pendingEdits.length > 0 ? "#ef4444" : "#22c55e" }
              ].map((s) => (
                <div key={s.label} className="card" style={{ flex: 1, minWidth: 120, textAlign: "center" }}>
                  <h2 style={{ color: s.color, margin: "4px 0" }}>{s.value}</h2>
                  <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* Class filter for chart */}
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                <h3 style={{ margin: 0 }}>Student Attendance Overview</h3>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <label style={{ fontSize: 13, fontWeight: 600 }}>Filter by Class:</label>
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    style={{ width: "auto", padding: "6px 10px" }}
                  >
                    <option value="ALL">All Classes</option>
                    {classes.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              {displayStudents.length > 0 ? (
                <div style={{ marginTop: 16 }}>
                  <Bar
                    data={barChartData}
                    options={{
                      responsive: true,
                      plugins: { legend: { display: false } },
                      scales: {
                        y: { min: 0, max: 100, ticks: { callback: (v) => v + "%" } }
                      }
                    }}
                  />
                  {/* Legend */}
                  <div style={{ display: "flex", gap: 16, marginTop: 10, fontSize: 13 }}>
                    <span>🟢 ≥80% Safe</span>
                    <span>🟡 75–79% Near Risk</span>
                    <span>🔴 &lt;75% Critical</span>
                  </div>
                </div>
              ) : (
                <p style={{ color: "#94a3b8" }}>No students found.</p>
              )}
            </div>
          </div>
        )}

        {/* ══ MARK ATTENDANCE ══ */}
        {page === "attendance" && (
          <div className="card">
            <h3>✅ Mark Attendance</h3>

            {/* Controls row */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16, alignItems: "flex-end" }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600 }}>Date</label>
                <input
                  type="date"
                  value={attendanceDate}
                  style={{ width: "auto" }}
                  onChange={(e) => { setAttendanceDate(e.target.value); setSessionSaved(false); }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600 }}>Subject</label>
                <input
                  placeholder="e.g. Machine Learning"
                  value={subject}
                  style={{ width: 200 }}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
              {/* CLASS FILTER */}
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600 }}>Class</label>
                <select
                  value={selectedClass}
                  onChange={(e) => { setSelectedClass(e.target.value); setAttendanceStatus({}); setSessionSaved(false); }}
                  style={{ width: "auto", padding: "8px 10px" }}
                >
                  <option value="ALL">All Classes</option>
                  {classes.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 10 }}>
              ℹ️ Students not marked will automatically be recorded as <strong>Absent</strong>.
            </p>

            {filteredStudents.length === 0
              ? <p>No students found for this class.</p>
              : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      <th>Class</th>
                      <th>Roll No</th>
                      <th style={{ color: "#22c55e" }}>✅ Present</th>
                      <th style={{ color: "#ef4444" }}>❌ Absent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((s, idx) => (
                      <tr key={s.id} style={{
                        background: attendanceStatus[s.id] === "present"
                          ? "#f0fdf4"
                          : attendanceStatus[s.id] === "absent"
                            ? "#fef2f2"
                            : "#fef9c3"  // yellow = not yet marked (will be absent)
                      }}>
                        <td>{idx + 1}</td>
                        <td style={{ fontWeight: 600 }}>{s.name}</td>
                        <td>{s.studentClass}</td>
                        <td>{s.rollNo}</td>
                        <td>
                          <input
                            type="radio"
                            name={`att-${s.id}`}
                            checked={attendanceStatus[s.id] === "present"}
                            onChange={() => markStatus(s.id, "present")}
                          />
                        </td>
                        <td>
                          <input
                            type="radio"
                            name={`att-${s.id}`}
                            checked={attendanceStatus[s.id] === "absent"}
                            onChange={() => markStatus(s.id, "absent")}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            }

            {filteredStudents.length > 0 && (
              <div style={{ marginTop: 12, display: "flex", gap: 12, alignItems: "center" }}>
                <button onClick={saveAttendance} disabled={sessionSaved}>
                  {sessionSaved ? "✅ Saved!" : "💾 Save Attendance"}
                </button>
                <span style={{ fontSize: 13, color: "#64748b" }}>
                  Present: {Object.values(attendanceStatus).filter((v) => v === "present").length} /
                  {filteredStudents.length} students
                </span>
              </div>
            )}
          </div>
        )}

        {/* ══ ASSIGNMENTS ══ */}
        {page === "assignments" && (
          <div>
            {/* Create form */}
            <div className="card">
              <h3>➕ Post New Assignment</h3>
              <label>Title *</label>
              <input
                placeholder="Assignment title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
              <label>Description / Instructions</label>
              <textarea
                placeholder="Describe the assignment..."
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
              />
              <label>Deadline</label>
              <input
                type="date"
                value={newDeadline}
                onChange={(e) => setNewDeadline(e.target.value)}
                style={{ width: "auto" }}
              />

              {/* File attachment */}
              <label>Attach File (PDF, PPT, Excel, Word — max 5MB)</label>
              <input
                type="file"
                accept=".pdf,.ppt,.pptx,.xls,.xlsx,.doc,.docx,.png,.jpg,.jpeg"
                onChange={handleAssignmentFileChange}
                style={{ padding: 4 }}
              />
              {assignmentFileUploading && <p style={{ color: "#2563eb" }}>⏳ Uploading file to storage...</p>}
              {assignmentFile && !assignmentFileUploading && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "#f0fdf4", borderRadius: 6, marginBottom: 8 }}>
                  <span>{fileIcon(assignmentFile.type)}</span>
                  <span style={{ fontSize: 13 }}>{assignmentFile.name}</span>
                  <button
                    onClick={() => setAssignmentFile(null)}
                    style={{ background: "#ef4444", padding: "2px 8px", fontSize: 12, marginLeft: "auto" }}
                  >✕</button>
                </div>
              )}

              <button onClick={createAssignment} disabled={assignmentFileUploading}>
                📤 Post Assignment
              </button>
            </div>

            {/* List */}
            <div className="card">
              <h3>All Assignments ({assignments.length})</h3>
              {assignments.length === 0 && <p>No assignments yet.</p>}
              {assignments.map((a) => {
                const subs = submissions.filter((s) => s.assignmentId === a.id);
                return (
                  <div key={a.id} className="quiz-card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <h4 style={{ margin: "0 0 4px 0" }}>{a.title}</h4>
                        <p style={{ margin: "0 0 4px 0", color: "#475569", fontSize: 14 }}>{a.description}</p>
                        {a.deadline && <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>📅 Deadline: {a.deadline}</p>}
                      </div>
                      <span style={{ fontSize: 13, color: "#2563eb", fontWeight: 600, whiteSpace: "nowrap" }}>
                        📬 {subs.length} submitted
                      </span>
                    </div>
                    {/* Attachment preview */}
                    {a.attachmentName && (
                      <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                        <span>{fileIcon(a.attachmentType)}</span>
                        <a
                          href={a.attachmentURL}
                          target="_blank"
                          rel="noreferrer"
                          style={{ fontSize: 13, color: "#2563eb" }}
                        >
                          {a.attachmentName}
                        </a>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══ SUBMISSIONS ══ */}
        {page === "submissions" && (
          <div className="card">
            <h3>📬 All Submissions ({submissions.length})</h3>
            {submissions.length === 0 && <p>No submissions yet.</p>}
            <table className="table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Assignment</th>
                  <th>Answer</th>
                  <th>File</th>
                  <th>Edit Req.</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((sub) => {
                  const student = students.find((s) => s.id === sub.studentId);
                  const assignment = assignments.find((a) => a.id === sub.assignmentId);
                  return (
                    <tr key={sub.id} style={{ background: sub.editRequested ? "#fef9c3" : "white" }}>
                      <td style={{ fontWeight: 600 }}>{student?.name || sub.studentId?.slice(0, 8) + "..."}</td>
                      <td>{assignment?.title || sub.assignmentId?.slice(0, 8) + "..."}</td>
                      <td style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {sub.answerText || "—"}
                      </td>
                      <td>
                        {sub.attachmentName
                          ? <a href={sub.attachmentURL} target="_blank" rel="noreferrer" style={{ color: "#2563eb" }}>
                              {fileIcon(sub.attachmentType)} {sub.attachmentName.slice(0, 18)}
                            </a>
                          : sub.fileLink
                            ? <a href={sub.fileLink} target="_blank" rel="noreferrer">📎 Link</a>
                            : "—"
                        }
                      </td>
                      <td>{sub.editRequested ? <span style={{ color: "#f59e0b" }}>⚠️ Yes</span> : "No"}</td>
                      <td>
                        {sub.editRequested && (
                          <button onClick={() => approveEdit(sub.id)} style={{ fontSize: 12, padding: "4px 8px" }}>
                            ✅ Approve
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ══ QUIZ GENERATOR ══ */}
        {page === "quiz" && (
          <div className="card">
            <h3>🧠 Quiz Generator Preview</h3>
            <input
              placeholder="Topic (e.g. Machine Learning)"
              value={quizTopic}
              onChange={(e) => setQuizTopic(e.target.value)}
            />
            <button onClick={generateQuiz} disabled={quizLoading}>
              {quizLoading ? "⏳ Generating..." : "Generate Quiz"}
            </button>
            {quiz.map((q, i) => (
              <div key={q.id} className="quiz-card">
                <h4>{i + 1}. {q.question}</h4>
                {Object.entries(q.options).map(([k, v]) => (
                  <p key={k} style={{ margin: "4px 0" }}>
                    <strong style={{ color: k === q.correct ? "#22c55e" : "inherit" }}>
                      {k === q.correct ? "✅ " : ""}{k})
                    </strong>{" "}{v}
                  </p>
                ))}
                <p style={{ fontSize: 13, color: "#475569", marginTop: 6 }}>💡 {q.explanation}</p>
              </div>
            ))}
          </div>
        )}

        {/* ══ AI TOOLS ══ */}
        {page === "tools" && (
          <TeacherTools
            students={students}
            attendanceStats={attendanceStats}
            submissions={submissions}
            assignments={assignments}
            classes={classes}
            onPostAssignment={handlePostAssignment}
          />
        )}

      </div>
    </div>
  );
}

export default TeacherDashboard;