import { useState } from "react";
import { auth, db, googleProvider } from "../firebase/config";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const goToDashboard = (role) => {
    if (role === "teacher") navigate("/teacher");
    else navigate("/student");
  };

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

  const googleLogin = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(ref, {
          name: user.displayName || "Student",
          email: user.email,
          role: "student",
          studentClass: "",
          rollNo: "",
          createdAt: new Date()
        });
        navigate("/student");
      } else {
        goToDashboard(snap.data().role);
      }
    } catch (err) { alert(err.message); }
    setLoading(false);
  };

  return (
    <div className="auth-container">
      {/* Centered heading */}
      <h2 style={{ textAlign: "center", marginBottom: 4 }}>Smart Campus AI</h2>
      <p style={{ textAlign: "center", color: "#64748b", marginBottom: 20, marginTop: 0 }}>
        Sign in to continue
      </p>

      <label>Email</label>
      <input
        type="email"
        value={email}
        placeholder="your@email.com"
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && login()}
      />

      <label>Password</label>
      <input
        type="password"
        value={password}
        placeholder="••••••••"
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && login()}
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