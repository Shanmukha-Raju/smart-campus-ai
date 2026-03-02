import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

// ─── Core caller — returns parsed JSON ────────────────────────────────────────
async function callGeminiJSON(systemPrompt, userPrompt) {
  const response = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts: [{ text: userPrompt }] }],
      generationConfig: { temperature: 0.4 }
    })
  });
  const data = await response.json();
  let text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  text = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  try {
    return JSON.parse(text);
  } catch {
    console.error("Gemini JSON parse error. Raw:", text.slice(0, 300));
    return null;
  }
}

// ─── Core caller — returns raw text ───────────────────────────────────────────
async function callGeminiText(systemPrompt, userPrompt) {
  const response = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts: [{ text: userPrompt }] }],
      generationConfig: { temperature: 0.5 }
    })
  });
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response.";
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. QUIZ GENERATION
// ═══════════════════════════════════════════════════════════════════════════════
const QUIZ_SYSTEM_PROMPT = `
You are an Academic Quiz Generator AI.
Output STRICT JSON ONLY — no markdown, no commentary, no extra text.

OUTPUT FORMAT:
{
  "quiz": [
    {
      "id": 1,
      "question": "...",
      "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
      "correct": "A",
      "explanation": "1-3 sentence explanation."
    }
  ]
}

RULES:
• Exactly 4 options per question.
• Questions must test understanding, not just memorization.
• Correct answer key must be A, B, C, or D only.
• No duplicate questions.
• If topic is unclear, generate basic foundational questions.
• Do NOT include markdown formatting or code fences.
`;

export async function generateQuiz(topic, count = 5) {
  const prompt = `Topic: ${topic}\n\nGenerate exactly ${count} MCQ questions.`;
  return callGeminiJSON(QUIZ_SYSTEM_PROMPT, prompt);
}

export async function generateAssignmentQuiz(title, description) {
  const prompt = `Assignment Title: ${title}\nDescription: ${description}\n\nGenerate 5 MCQ questions based on this assignment.`;
  return callGeminiJSON(QUIZ_SYSTEM_PROMPT, prompt);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. ATTENDANCE ADVICE
// ═══════════════════════════════════════════════════════════════════════════════
export async function getAttendanceAdvice(percent) {
  const sys = `You are a student academic advisor. Give concise, motivating advice. Maximum 80 words.`;
  const prompt = `Student attendance is ${percent}%. Explain the risk level and give 2-3 actionable tips to improve attendance.`;
  return callGeminiText(sys, prompt);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. ACADEMIC PERFORMANCE ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════════
const ANALYSIS_SYSTEM_PROMPT = `
You are an AI Academic Performance Analyst for university students.
Analyze the provided student data and output STRICT JSON ONLY — no markdown, no commentary.

OUTPUT FORMAT:
{
  "overallHealth": "GOOD",
  "overallScore": 78,
  "summary": "2-3 sentence overall summary of the student performance.",
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1", "weakness2"],
  "subjectInsights": [
    {
      "subject": "subject name",
      "quizAvg": 75,
      "status": "Strong",
      "tip": "specific actionable tip for this subject"
    }
  ],
  "priorityActions": [
    { "action": "specific action to take", "urgency": "HIGH" }
  ]
}

RULES:
• overallHealth must be one of: GOOD, AVERAGE, AT_RISK, CRITICAL
• overallScore is a number from 0 to 100
• status in subjectInsights must be one of: Strong, Average, Needs Work
• urgency must be one of: HIGH, MEDIUM, LOW
• Be specific and actionable, not generic
`;

export async function analyzeAcademicPerformance(data) {
  const prompt = `
Student Academic Data:
- Attendance: ${data.attendance}%
- Total Quiz Attempts: ${data.quizAttempts.length}
- Average Quiz Score: ${data.avgQuizScore}%
- Total Assignments: ${data.assignmentsTotal}
- Assignments Submitted: ${data.assignmentsSubmitted}
- Submission Rate: ${data.submissionRate}%
- Quiz performance by topic: ${JSON.stringify(data.quizByTopic)}

Analyze this student's overall academic performance comprehensively.
`;
  return callGeminiJSON(ANALYSIS_SYSTEM_PROMPT, prompt);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. STUDY PLAN GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════
const STUDY_PLAN_SYSTEM_PROMPT = `
You are an Expert Academic Study Plan Generator AI.
Create a detailed, personalized week-by-week study plan based on the provided syllabus.
Output STRICT JSON ONLY — no markdown, no commentary, no extra text.

OUTPUT FORMAT:
{
  "subject": "Subject Name",
  "totalWeeks": 4,
  "hoursPerDay": 3,
  "overview": "2-3 sentence plan overview",
  "weeks": [
    {
      "week": 1,
      "theme": "Foundations and Basics",
      "goal": "What the student will achieve by end of this week",
      "topics": [
        {
          "day": "Monday",
          "topic": "Topic name from syllabus",
          "subtopics": ["subtopic1", "subtopic2"],
          "duration": "2 hours",
          "activities": ["Read chapter X", "Solve 5 practice problems", "Watch concept video"],
          "resources": ["Textbook Chapter 1", "Khan Academy", "YouTube: topic name"]
        }
      ],
      "weeklyGoal": "Complete X chapters and attempt 1 practice test",
      "selfAssessment": "Quiz yourself on these specific topics: ..."
    }
  ],
  "examTips": ["tip1", "tip2", "tip3"],
  "dailyRoutine": {
    "morning": "description of morning study session",
    "afternoon": "description of afternoon study session",
    "evening": "description of evening review session"
  }
}

RULES:
• Cover the ENTIRE syllabus systematically from basics to advanced.
• Fundamentals first, then application, then advanced topics.
• Each day must have clear actionable tasks — not vague.
• Include revision days and practice tests in the plan.
• Difficulty must progress: easy → medium → hard across weeks.
• If weak areas are provided, allocate extra time to those topics.
• Generate topics for Monday through Sunday for each week.
• Do NOT include markdown formatting or code fences.
`;

export async function generateStudyPlan(data) {
  const prompt = `
Subject / Course: ${data.subject}
Available Time: ${data.weeks} weeks, ${data.hoursPerDay} hours per day
Student's Current Level: ${data.level || "Beginner"}
Student's Weak Areas: ${data.weakAreas || "Not specified"}

COMPLETE SYLLABUS:
${data.syllabus}

Generate a complete week-by-week study plan covering this entire syllabus from start to finish.
`;
  return callGeminiJSON(STUDY_PLAN_SYSTEM_PROMPT, prompt);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. ROADMAP GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════
const ROADMAP_SYSTEM_PROMPT = `
You are an Expert Academic Learning Roadmap Generator AI.
Create a structured visual learning roadmap with clear phases.
Output STRICT JSON ONLY — no markdown, no commentary, no extra text.

OUTPUT FORMAT:
{
  "subject": "Subject Name",
  "fromLevel": "Beginner",
  "toLevel": "Advanced",
  "estimatedMonths": 3,
  "overview": "Brief description of what this roadmap covers",
  "phases": [
    {
      "phase": 1,
      "name": "Phase Name (e.g. Foundations)",
      "duration": "3 weeks",
      "color": "#3b82f6",
      "description": "What this phase covers and why it is important",
      "topics": ["Topic 1", "Topic 2", "Topic 3"],
      "skills": ["Skill you gain 1", "Skill you gain 2"],
      "milestone": "Measurable milestone e.g. Complete Chapter 3 quiz with 80%+",
      "resources": ["Resource 1", "Resource 2"],
      "projects": ["Mini project or hands-on exercise"]
    }
  ],
  "finalGoal": "What the student will be able to do after completing the full roadmap",
  "careerRelevance": "How this knowledge applies in a professional or academic career"
}

RULES:
• Generate between 4 and 8 phases from beginner to advanced.
• Each phase must build logically on the previous one.
• Include practical projects or exercises in each phase.
• Milestones must be specific and measurable.
• Assign a unique hex color to each phase.
• Distribute all syllabus topics across phases logically.
• Do NOT include markdown formatting or code fences.
`;

export async function generateRoadmap(data) {
  const prompt = `
Subject / Goal: ${data.subject}
Current Level: ${data.currentLevel || "Beginner"}
Target Level: ${data.targetLevel || "Advanced"}
Available Time: ${data.months || 3} months

SYLLABUS / TOPICS TO COVER:
${data.syllabus}

Generate a complete learning roadmap from ${data.currentLevel || "Beginner"} to ${data.targetLevel || "Advanced"}.
`;
  return callGeminiJSON(ROADMAP_SYSTEM_PROMPT, prompt);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. PERSONALIZED WEEKLY RECOMMENDATION
// ═══════════════════════════════════════════════════════════════════════════════
const RECOMMENDATION_SYSTEM_PROMPT = `
You are a Personalized Academic Recommendation AI.
Based on the student's actual performance data, generate a practical weekly recommendation.
Output STRICT JSON ONLY — no markdown, no commentary, no extra text.

OUTPUT FORMAT:
{
  "recommendedFocus": ["Topic 1", "Topic 2", "Topic 3"],
  "studySchedule": {
    "Monday": "Specific topic and task for this day",
    "Tuesday": "Specific topic and task for this day",
    "Wednesday": "Specific topic and task for this day",
    "Thursday": "Specific topic and task for this day",
    "Friday": "Specific topic and task for this day",
    "Saturday": "Revision + practice test",
    "Sunday": "Rest or light review"
  },
  "motivationalMessage": "Personalized encouraging message addressing the student's situation",
  "nextMilestone": "One specific achievable goal for the next 7 days",
  "estimatedImprovementWeeks": 3
}

RULES:
• Be specific to the student's weak topics — not generic advice.
• Daily tasks must be actionable and time-bound.
• motivationalMessage must feel personal, not generic.
• estimatedImprovementWeeks must be a realistic number.
• Do NOT include markdown formatting or code fences.
`;

export async function getPersonalizedRecommendation(data) {
  const prompt = `
Student Performance Summary:
- Attendance: ${data.attendance}%
- Average Quiz Score: ${data.avgQuizScore}%
- Weak topics identified from quiz history: ${data.weakTopics.join(", ") || "None identified yet"}
- Assignments submitted: ${data.assignmentsSubmitted} out of ${data.assignmentsTotal}
- Current syllabus topics (if provided): ${data.syllabusTopics || "Not provided"}

Generate a personalized 7-day study recommendation to help this student improve their academic performance.
`;
  return callGeminiJSON(RECOMMENDATION_SYSTEM_PROMPT, prompt);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7. LESSON PLAN GENERATOR (Teacher)
// ═══════════════════════════════════════════════════════════════════════════════
const LESSON_PLAN_PROMPT = `
You are an Expert Academic Lesson Plan Generator for university and school teachers.
Output STRICT JSON ONLY — no markdown, no commentary, no extra text.

OUTPUT FORMAT:
{
  "subject": "Subject Name",
  "topic": "Specific Topic",
  "classLevel": "e.g. Year 2 / Semester 3",
  "duration": "e.g. 60 minutes",
  "objectives": ["By end of lesson students will be able to...", "..."],
  "prerequisiteKnowledge": ["Concept 1 students should already know", "Concept 2"],
  "lessonOutline": [
    {
      "phase": "Introduction",
      "duration": "10 minutes",
      "teacherActivity": "What the teacher does",
      "studentActivity": "What students do",
      "resources": ["Whiteboard", "Slides"]
    }
  ],
  "keyConceptsToExplain": [
    { "concept": "Concept name", "explanation": "Simple explanation", "example": "Real-world example" }
  ],
  "classworkQuestions": [
    { "q": "Question text", "type": "MCQ/Short Answer/Problem", "answer": "Expected answer" }
  ],
  "homeworkTask": "Specific homework assignment description",
  "assessmentCriteria": ["Criteria 1", "Criteria 2"],
  "differentiationTips": {
    "forStrugglingStudents": "How to support weaker students",
    "forAdvancedStudents": "How to challenge stronger students"
  },
  "teacherNotes": "Any additional notes or warnings for the teacher"
}
RULES: Cover the topic thoroughly. lessonOutline must have 4-6 phases. Minimum 5 classwork questions.
`;

export async function generateLessonPlan(data) {
  const prompt = `
Subject: ${data.subject}
Specific Topic: ${data.topic}
Class Level / Year: ${data.classLevel}
Lesson Duration: ${data.duration} minutes
Learning Context: ${data.context || "General classroom"}
Generate a complete lesson plan for this topic.
`;
  return callGeminiJSON(LESSON_PLAN_PROMPT, prompt);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 8. CLASS PERFORMANCE REPORT (Teacher)
// ═══════════════════════════════════════════════════════════════════════════════
const CLASS_REPORT_PROMPT = `
You are an AI Academic Class Performance Analyst for teachers.
Analyse the provided class data and output STRICT JSON ONLY — no markdown, no commentary.

OUTPUT FORMAT:
{
  "className": "Class Name",
  "totalStudents": 0,
  "reportDate": "today",
  "overallClassHealth": "GOOD",
  "classSummary": "2-3 sentence overview of class performance",
  "attendanceInsight": "Insight about class attendance patterns",
  "quizInsight": "Insight about quiz performance across the class",
  "submissionInsight": "Insight about assignment submission patterns",
  "topPerformers": [
    { "name": "Student Name", "reason": "Why they stand out" }
  ],
  "atRiskStudents": [
    { "name": "Student Name", "issue": "Specific concern", "urgency": "HIGH/MEDIUM/LOW" }
  ],
  "classWeakAreas": ["Topic or skill the whole class struggles with"],
  "teachingRecommendations": [
    { "recommendation": "Specific action for teacher", "priority": "HIGH/MEDIUM/LOW" }
  ],
  "subjectBreakdown": [
    { "topic": "Topic name", "avgScore": 75, "studentsStruggling": 3, "note": "Brief insight" }
  ]
}
RULES: Be specific and data-driven. atRiskStudents = attendance < 75% OR avg quiz < 60% OR submission < 50%.
`;

export async function generateClassReport(data) {
  const prompt = `
Class: ${data.className}
Total Students: ${data.totalStudents}
Student Data:
${JSON.stringify(data.studentProfiles)}
Quiz Topic Averages Across Class:
${JSON.stringify(data.topicAverages)}
Generate a comprehensive class performance report.
`;
  return callGeminiJSON(CLASS_REPORT_PROMPT, prompt);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 9. AI ASSIGNMENT GENERATOR (Teacher)
// ═══════════════════════════════════════════════════════════════════════════════
const ASSIGNMENT_GEN_PROMPT = `
You are an Expert Academic Assignment Creator for teachers.
Output STRICT JSON ONLY — no markdown, no commentary, no extra text.

OUTPUT FORMAT:
{
  "title": "Assignment title",
  "subject": "Subject name",
  "topic": "Specific topic",
  "difficulty": "Beginner/Intermediate/Advanced",
  "estimatedTime": "e.g. 3 hours",
  "description": "Full assignment description and context",
  "learningOutcomes": ["Students will demonstrate...", "..."],
  "questions": [
    {
      "number": 1,
      "type": "Theory/Practical/Case Study/Problem Solving",
      "question": "Full question text",
      "marks": 10,
      "hints": "Optional hint for students",
      "sampleAnswer": "Expected answer or key points"
    }
  ],
  "totalMarks": 100,
  "submissionGuidelines": ["Guideline 1", "Guideline 2"],
  "rubric": [
    { "criteria": "Understanding of concepts", "excellent": "Description", "good": "Description", "needsWork": "Description", "marks": 30 }
  ],
  "resources": ["Suggested reading or reference 1", "Reference 2"]
}
RULES: Generate 4-6 questions. totalMarks must equal sum of all question marks. rubric must have 3-4 criteria.
`;

export async function generateAssignment(data) {
  const prompt = `
Subject: ${data.subject}
Topic: ${data.topic}
Difficulty Level: ${data.difficulty}
Number of Questions: ${data.questionCount || 5}
Total Marks: ${data.totalMarks || 100}
Class Level: ${data.classLevel || "University"}
Special Instructions: ${data.instructions || "None"}
Generate a complete assignment with marking scheme and rubric.
`;
  return callGeminiJSON(ASSIGNMENT_GEN_PROMPT, prompt);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 10. STUDENT PROGRESS SUMMARY (Teacher — individual student)
// ═══════════════════════════════════════════════════════════════════════════════
const STUDENT_PROGRESS_PROMPT = `
You are an AI Student Progress Analyst for teachers.
Output STRICT JSON ONLY — no markdown, no commentary, no extra text.

OUTPUT FORMAT:
{
  "studentName": "Name",
  "overallStatus": "EXCELLENT/GOOD/AVERAGE/AT_RISK/CRITICAL",
  "progressScore": 78,
  "summary": "2-3 sentence personalised summary for the teacher",
  "attendanceAssessment": "Assessment of attendance pattern and trend",
  "academicAssessment": "Assessment of quiz performance and assignment submission",
  "strengths": ["Strength 1", "Strength 2"],
  "concerns": ["Concern 1", "Concern 2"],
  "teacherActionItems": [
    { "action": "Specific action teacher should take for this student", "urgency": "HIGH/MEDIUM/LOW" }
  ],
  "suggestedInterventions": ["Intervention 1", "Intervention 2"],
  "predictedOutcome": "Prediction of student's end-of-term performance if current trend continues"
}
`;

export async function generateStudentProgressSummary(data) {
  const prompt = `
Student Name: ${data.studentName}
Class: ${data.studentClass}
Attendance: ${data.attendance}% (${data.presentDays} present, ${data.absentDays} absent out of ${data.totalDays} recorded days)
Average Quiz Score: ${data.avgQuizScore}%
Quiz Attempts: ${data.quizAttempts}
Assignments Submitted: ${data.assignmentsSubmitted} out of ${data.assignmentsTotal}
Submission Rate: ${data.submissionRate}%
Quiz performance by topic: ${JSON.stringify(data.quizByTopic)}
Generate a detailed individual progress summary for the teacher.
`;
  return callGeminiJSON(STUDENT_PROGRESS_PROMPT, prompt);
}