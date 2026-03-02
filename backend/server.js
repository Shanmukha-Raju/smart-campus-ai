import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import {
  generateQuiz,
  generateAssignmentQuiz,
  getAttendanceAdvice,
  analyzeAcademicPerformance,
  generateStudyPlan,
  generateRoadmap,
  getPersonalizedRecommendation,
  generateLessonPlan,
  generateClassReport,
  generateAssignment,
  generateStudentProgressSummary
} from "./gemini.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" })); // allow large syllabus text

// ── HEALTH CHECK ──────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.send("Smart Campus AI Backend is running ✅");
});

// ── QUIZ: Topic based ─────────────────────────────────────────────────────────
app.post("/api/generate-quiz", async (req, res) => {
  try {
    const { topic, count } = req.body;
    if (!topic) return res.status(400).json({ error: "Topic is required" });
    const result = await generateQuiz(topic, count || 5);
    if (!result) return res.status(500).json({ error: "Quiz generation failed" });
    res.json(result);
  } catch (err) {
    console.error("Quiz error:", err);
    res.status(500).json({ error: "Quiz generation failed" });
  }
});

// ── QUIZ: Assignment based ────────────────────────────────────────────────────
app.post("/api/generate-assignment-quiz", async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title) return res.status(400).json({ error: "Title is required" });
    const result = await generateAssignmentQuiz(title, description || "");
    if (!result) return res.status(500).json({ error: "Assignment quiz failed" });
    res.json(result);
  } catch (err) {
    console.error("Assignment quiz error:", err);
    res.status(500).json({ error: "Assignment quiz generation failed" });
  }
});

// ── ATTENDANCE ADVICE ─────────────────────────────────────────────────────────
app.post("/api/attendance-advice", async (req, res) => {
  try {
    const { percent } = req.body;
    if (percent === undefined) return res.status(400).json({ error: "percent is required" });
    const advice = await getAttendanceAdvice(percent);
    res.json({ advice });
  } catch (err) {
    console.error("Attendance advice error:", err);
    res.status(500).json({ error: "Advice generation failed" });
  }
});

// ── ACADEMIC PERFORMANCE ANALYSIS ────────────────────────────────────────────
app.post("/api/analyze-performance", async (req, res) => {
  try {
    const data = req.body;
    if (!data) return res.status(400).json({ error: "Student data is required" });
    const result = await analyzeAcademicPerformance(data);
    if (!result) return res.status(500).json({ error: "Analysis failed" });
    res.json(result);
  } catch (err) {
    console.error("Analysis error:", err);
    res.status(500).json({ error: "Performance analysis failed" });
  }
});

// ── STUDY PLAN GENERATOR ──────────────────────────────────────────────────────
app.post("/api/generate-study-plan", async (req, res) => {
  try {
    const { subject, syllabus, weeks, hoursPerDay, weakAreas, level } = req.body;
    if (!syllabus) return res.status(400).json({ error: "Syllabus is required" });
    const result = await generateStudyPlan({
      subject: subject || "General",
      syllabus,
      weeks: weeks || 4,
      hoursPerDay: hoursPerDay || 3,
      weakAreas: weakAreas || "",
      level: level || "Beginner"
    });
    if (!result) return res.status(500).json({ error: "Study plan generation failed" });
    res.json(result);
  } catch (err) {
    console.error("Study plan error:", err);
    res.status(500).json({ error: "Study plan generation failed" });
  }
});

// ── ROADMAP GENERATOR ─────────────────────────────────────────────────────────
app.post("/api/generate-roadmap", async (req, res) => {
  try {
    const { subject, syllabus, currentLevel, targetLevel, months } = req.body;
    if (!subject && !syllabus) return res.status(400).json({ error: "Subject or syllabus is required" });
    const result = await generateRoadmap({
      subject: subject || "General",
      syllabus: syllabus || subject,
      currentLevel: currentLevel || "Beginner",
      targetLevel: targetLevel || "Advanced",
      months: months || 3
    });
    if (!result) return res.status(500).json({ error: "Roadmap generation failed" });
    res.json(result);
  } catch (err) {
    console.error("Roadmap error:", err);
    res.status(500).json({ error: "Roadmap generation failed" });
  }
});

// ── PERSONALIZED RECOMMENDATION ───────────────────────────────────────────────
app.post("/api/recommend", async (req, res) => {
  try {
    const data = req.body;
    if (!data) return res.status(400).json({ error: "Student data is required" });
    const result = await getPersonalizedRecommendation(data);
    if (!result) return res.status(500).json({ error: "Recommendation failed" });
    res.json(result);
  } catch (err) {
    console.error("Recommendation error:", err);
    res.status(500).json({ error: "Recommendation generation failed" });
  }
});


// ── LESSON PLAN GENERATOR ─────────────────────────────────────────────────────
app.post("/api/generate-lesson-plan", async (req, res) => {
  try {
    const { subject, topic, classLevel, duration, context } = req.body;
    if (!subject || !topic) return res.status(400).json({ error: "Subject and topic are required" });
    const result = await generateLessonPlan({ subject, topic, classLevel: classLevel || "General", duration: duration || 60, context });
    if (!result) return res.status(500).json({ error: "Lesson plan generation failed" });
    res.json(result);
  } catch (err) {
    console.error("Lesson plan error:", err);
    res.status(500).json({ error: "Lesson plan generation failed" });
  }
});

// ── CLASS PERFORMANCE REPORT ──────────────────────────────────────────────────
app.post("/api/class-report", async (req, res) => {
  try {
    const data = req.body;
    if (!data.studentProfiles) return res.status(400).json({ error: "Student data required" });
    const result = await generateClassReport(data);
    if (!result) return res.status(500).json({ error: "Class report generation failed" });
    res.json(result);
  } catch (err) {
    console.error("Class report error:", err);
    res.status(500).json({ error: "Class report generation failed" });
  }
});

// ── AI ASSIGNMENT GENERATOR ───────────────────────────────────────────────────
app.post("/api/generate-assignment", async (req, res) => {
  try {
    const data = req.body;
    if (!data.subject || !data.topic) return res.status(400).json({ error: "Subject and topic required" });
    const result = await generateAssignment(data);
    if (!result) return res.status(500).json({ error: "Assignment generation failed" });
    res.json(result);
  } catch (err) {
    console.error("Assignment gen error:", err);
    res.status(500).json({ error: "Assignment generation failed" });
  }
});

// ── STUDENT PROGRESS SUMMARY ──────────────────────────────────────────────────
app.post("/api/student-progress", async (req, res) => {
  try {
    const data = req.body;
    if (!data.studentName) return res.status(400).json({ error: "Student data required" });
    const result = await generateStudentProgressSummary(data);
    if (!result) return res.status(500).json({ error: "Progress summary failed" });
    res.json(result);
  } catch (err) {
    console.error("Progress summary error:", err);
    res.status(500).json({ error: "Progress summary failed" });
  }
});

// ── START SERVER ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Smart Campus AI Backend running on port ${PORT}`);
});