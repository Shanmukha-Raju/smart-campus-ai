import { useEffect, useState, useRef } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";

import { auth, db } from "./firebase/config";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import Login from "./pages/Login";
import Register from "./pages/Register";
import StudentDashboard from "./pages/StudentDashboard";
import TeacherDashboard from "./pages/TeacherDashboard";

function App() {
  const navigate = useNavigate();
  const navigateRef = useRef(navigate); // ✅ store in ref so useEffect dep is stable
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    // Keep ref current (in case navigate identity ever changes)
    navigateRef.current = navigate;
  }, [navigate]);

  useEffect(() => {
    // Runs exactly once on mount — auth state listener
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const snap = await getDoc(doc(db, "users", currentUser.uid));
          const role = snap.exists() ? snap.data().role : "student";
          // Use ref to navigate — no dependency needed in this effect
          if (role === "teacher") {
            navigateRef.current("/teacher", { replace: true });
          } else {
            navigateRef.current("/student", { replace: true });
          }
        } catch (err) {
          console.error("Role fetch error:", err);
          navigateRef.current("/", { replace: true });
        }
      }
      setAuthReady(true);
    });

    return () => unsubscribe();
  }, []); // ✅ truly stable — no warnings

  if (!authReady) {
    return (
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        fontSize: "20px",
        fontFamily: "Segoe UI, sans-serif",
        background: "#f1f5f9",
        color: "#1e293b"
      }}>
        ⏳ Loading...
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/student" element={<StudentDashboard />} />
      <Route path="/teacher" element={<TeacherDashboard />} />
      <Route path="*" element={<Login />} />
    </Routes>
  );
}

export default App;