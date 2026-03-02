import { useState } from "react";

function QuizPage(){

const [topic,setTopic]=useState("");
const [quiz,setQuiz]=useState(null);

const [userAnswers,setUserAnswers]=useState({});
const [score,setScore]=useState(null);
const [showReview,setShowReview]=useState(false);
const [loading,setLoading]=useState(false);


/* GENERATE QUIZ */

const generateQuiz=async()=>{

if(!topic){
alert("Enter topic");
return;
}

try{

setLoading(true);

const res=await fetch(
`${process.env.REACT_APP_BACKEND_URL}/api/generate-quiz`,
{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
topic,
count:5
})
}
);

const data=await res.json();

setQuiz(data);
setUserAnswers({});
setScore(null);
setShowReview(false);

}
catch{

alert("Backend not running");

}

setLoading(false);

};


/* SELECT */

const selectAnswer=(qid,option)=>{

setUserAnswers(prev=>({
...prev,
[qid]:option
}));

};


/* SUBMIT */

const submitQuiz=()=>{

let correct=0;

quiz.quiz.forEach(q=>{

if(userAnswers[q.id]===q.correct)
correct++;

});

setScore(correct);

};


/* RETAKE */

const retakeQuiz=()=>{

setUserAnswers({});
setScore(null);
setShowReview(false);

};


return(

<div className="content">

<h2>Quiz Generator</h2>

<div className="card">

<input
value={topic}
onChange={(e)=>setTopic(e.target.value)}
placeholder="Enter topic"
/>

<button onClick={generateQuiz}>
{loading?"Generating...":"Generate Quiz"}
</button>

</div>


{quiz && (

<div>

{quiz.quiz.map((q,index)=>(

<div key={q.id} className="card">

<h4>
{index+1}. {q.question}
</h4>


{/* CRITICAL STRUCTURE */}

{q.options.map((option,i)=>(

<div
key={i}
style={{
display:"block",
margin:"8px 0"
}}
>

<input
type="radio"
name={`question-${q.id}`}
checked={userAnswers[q.id]===option}
onChange={()=>selectAnswer(q.id,option)}
style={{
marginRight:"10px"
}}
/>

<span>

{String.fromCharCode(65+i)}) {option}

</span>

</div>

))}


{score!==null && showReview && (

<div>

<p>
Correct Answer:
<strong> {q.correct}</strong>
</p>

<p>
Explanation: {q.explanation}
</p>

</div>

)}

</div>

))}


{score===null && (

<button onClick={submitQuiz}>
Submit Quiz
</button>

)}


{score!==null && (

<div className="card">

<h3>
Score: {score}/{quiz.quiz.length}
</h3>

<button onClick={()=>setShowReview(true)}>
Review
</button>

<button onClick={retakeQuiz}>
Retake
</button>

</div>

)}

</div>

)}

</div>

);

}

export default QuizPage;