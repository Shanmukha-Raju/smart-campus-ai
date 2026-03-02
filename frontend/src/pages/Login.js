import { useState } from "react";
import { auth, db, googleProvider } from "../firebase/config";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

function Login() {
  const navigate = useNavigate();

  // Login form state
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);

  // Profile completion state — shown after first-time Google login
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [googleUser, setGoogleUser]           = useState(null);
  const [profileName, setProfileName]         = useState("");
  const [profileRole, setProfileRole]         = useState("student");
  const [profileClass, setProfileClass]       = useState("");
  const [profileRollNo, setProfileRollNo]     = useState("");
  const [profileSubject, setProfileSubject]   = useState("");
  const [saving, setSaving]                   = useState(false);

  const goToDashboard = (role) => {
    if (role === "teacher") navigate("/teacher");
    else navigate("/student");
  };

  // ── Email / Password login ─────────────────────────────────────────────────
  const login = async () => {
    if (!email || !password) { alert("Enter email and password"); return; }
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const snap = await getDoc(doc(db, "users", cred.user.uid));
      if (snap.exists()) goToDashboard(snap.data().role);
      else alert("User record not found. Please register.");
    } catch (err) { alert(err.message); }
    setLoading(false);
  };

  // ── Google login ───────────────────────────────────────────────────────────
  const googleLogin = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user   = result.user;
      const snap   = await getDoc(doc(db, "users", user.uid));

      if (snap.exists()) {
        // Returning user — go straight to dashboard
        goToDashboard(snap.data().role);
      } else {
        // First time — show profile completion form
        setGoogleUser(user);
        setProfileName(user.displayName || "");
        setShowProfileForm(true);
      }
    } catch (err) { alert(err.message); }
    setLoading(false);
  };

  // ── Save profile after first Google login ──────────────────────────────────
  const saveProfile = async () => {
    if (!profileName.trim()) { alert("Please enter your name"); return; }
    if (profileRole === "student" && !profileClass.trim()) {
      alert("Please enter your class"); return;
    }
    if (profileRole === "student" && !profileRollNo.trim()) {
      alert("Please enter your roll number"); return;
    }
    setSaving(true);
    try {
      await setDoc(doc(db, "users", googleUser.uid), {
        name:         profileName.trim(),
        email:        googleUser.email,
        role:         profileRole,
        studentClass: profileRole === "student" ? profileClass.trim() : "",
        rollNo:       profileRole === "student" ? profileRollNo.trim() : "",
        subject:      profileRole === "teacher" ? profileSubject.trim() : "",
        createdAt:    new Date()
      });
      goToDashboard(profileRole);
    } catch (err) {
      alert("Failed to save profile: " + err.message);
    }
    setSaving(false);
  };

  // ── Profile Completion Form ────────────────────────────────────────────────
  if (showProfileForm) {
    return (
      <div className="auth-container" style={{ maxWidth: 420 }}>

        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 48, marginBottom: 6 }}>👋</div>
          <h2 style={{ margin: "0 0 4px" }}>Welcome!</h2>
          <p style={{ color: "#64748b", margin: 0, fontSize: 14 }}>
            Hi <strong>{profileName || googleUser?.displayName}</strong>, just a few details
            to complete your profile.
          </p>
        </div>

        <div style={{
          background: "#f0fdf4", border: "1px solid #bbf7d0",
          borderRadius: 10, padding: "10px 14px", marginBottom: 20,
          display: "flex", alignItems: "center", gap: 10
        }}>
          <span style={{ fontSize: 20 }}>✅</span>
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 13 }}>Google account verified</p>
            <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>{googleUser?.email}</p>
          </div>
        </div>

        <label style={{ fontWeight: 600, fontSize: 13 }}>Full Name *</label>
        <input
          value={profileName}
          onChange={e => setProfileName(e.target.value)}
          placeholder="Enter your full name"
        />

        <label style={{ fontWeight: 600, fontSize: 13 }}>I am a... *</label>
        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          {["student", "teacher"].map(r => (
            <div
              key={r}
              onClick={() => setProfileRole(r)}
              style={{
                flex: 1, padding: "12px 8px", borderRadius: 10, cursor: "pointer",
                textAlign: "center", fontWeight: 700, fontSize: 14,
                border: profileRole === r ? "2px solid #2563eb" : "2px solid #e2e8f0",
                background: profileRole === r ? "#eff6ff" : "white",
                color: profileRole === r ? "#2563eb" : "#94a3b8",
                transition: "all 0.15s"
              }}
            >
              {r === "student" ? "🎓" : "👨‍🏫"}<br />
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </div>
          ))}
        </div>

        {profileRole === "student" && (
          <>
            <label style={{ fontWeight: 600, fontSize: 13 }}>Class / Section *</label>
            <input
              value={profileClass}
              onChange={e => setProfileClass(e.target.value)}
              placeholder="e.g. CSE-A or Year 2 Section B"
            />
            <label style={{ fontWeight: 600, fontSize: 13 }}>Roll Number *</label>
            <input
              value={profileRollNo}
              onChange={e => setProfileRollNo(e.target.value)}
              placeholder="e.g. 21CS045"
            />
          </>
        )}

        {profileRole === "teacher" && (
          <>
            <label style={{ fontWeight: 600, fontSize: 13 }}>Subject / Department (optional)</label>
            <input
              value={profileSubject}
              onChange={e => setProfileSubject(e.target.value)}
              placeholder="e.g. Computer Science"
            />
          </>
        )}

        <button
          onClick={saveProfile}
          disabled={saving}
          style={{ width: "100%", marginTop: 8, background: "#2563eb", fontSize: 15, padding: "12px" }}
        >
          {saving ? "⏳ Saving..." : "✅ Complete Setup & Enter"}
        </button>

        <p
          onClick={() => { setShowProfileForm(false); auth.signOut(); }}
          style={{ textAlign: "center", fontSize: 12, color: "#94a3b8",
            marginTop: 14, cursor: "pointer" }}
        >
          ← Use a different account
        </p>

      </div>
    );
  }

  // ── Normal Login Form ──────────────────────────────────────────────────────
  return (
    <div className="auth-container">
      <h2 style={{ textAlign: "center", marginBottom: 4 }}>Smart Campus AI</h2>
      <p style={{ textAlign: "center", color: "#64748b", marginBottom: 20, marginTop: 0 }}>
        Sign in to continue
      </p>

      <label>Email</label>
      <input
        type="email"
        value={email}
        placeholder="your@email.com"
        onChange={e => setEmail(e.target.value)}
        onKeyDown={e => e.key === "Enter" && login()}
      />

      <label>Password</label>
      <input
        type="password"
        value={password}
        placeholder="••••••••"
        onChange={e => setPassword(e.target.value)}
        onKeyDown={e => e.key === "Enter" && login()}
      />

      <button onClick={login} disabled={loading} style={{ width: "100%", marginTop: 8 }}>
        {loading ? "Signing in..." : "Login"}
      </button>

      <button
        onClick={googleLogin}
        disabled={loading}
        style={{ width: "100%", background: "#db4437", marginTop: 6 }}
      >
        🔴 Login with Google
      </button>

      <hr style={{ margin: "16px 0" }} />

      <button
        onClick={() => navigate("/register")}
        style={{ width: "100%", background: "#475569" }}
      >
        Create New Account
      </button>
    </div>
  );
}

export default Login;