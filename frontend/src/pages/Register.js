import { useState } from "react";

import { auth, db } from "../firebase/config";

import {
createUserWithEmailAndPassword
} from "firebase/auth";

import {
doc,
setDoc
} from "firebase/firestore";

import { useNavigate } from "react-router-dom";


function Register(){

const navigate = useNavigate();


/* FORM STATE */

const [name,setName] = useState("");
const [email,setEmail] = useState("");
const [password,setPassword] = useState("");

const [role,setRole] = useState("student");

const [studentClass,setStudentClass] = useState("");
const [rollNo,setRollNo] = useState("");

const [loading,setLoading] = useState(false);


/* REGISTER */

const register = async ()=>{

if(!name || !email || !password){

alert("Fill required fields");
return;

}

if(role==="student" && (!studentClass || !rollNo)){

alert("Enter class and roll number");
return;

}

try{

setLoading(true);

const cred =
await createUserWithEmailAndPassword(
auth,
email,
password
);

const user = cred.user;


/* SAVE USER */

await setDoc(
doc(db,"users",user.uid),
{
name,
email,
role,

studentClass:
role==="student"
?
studentClass
:
"",

rollNo:
role==="student"
?
rollNo
:
"",

createdAt:new Date()
}
);


alert("Registration successful");


/* REDIRECT */

if(role==="teacher")
navigate("/teacher");
else
navigate("/student");


}
catch(err){

alert(err.message);

}

setLoading(false);

};


return(

<div className="auth-container">

<h2>Create Account</h2>


<label>Name</label>

<input
value={name}
onChange={(e)=>setName(e.target.value)}
/>


<label>Email</label>

<input
type="email"
value={email}
onChange={(e)=>setEmail(e.target.value)}
/>


<label>Password</label>

<input
type="password"
value={password}
onChange={(e)=>setPassword(e.target.value)}
/>


<label>Role</label>

<select
value={role}
onChange={(e)=>setRole(e.target.value)}
>

<option value="student">
Student
</option>

<option value="teacher">
Teacher
</option>

</select>


{/* STUDENT ONLY */}

{role==="student" && (

<>

<label>Class</label>

<input
value={studentClass}
onChange={(e)=>setStudentClass(e.target.value)}
placeholder="Example: CSE-A"
/>


<label>Roll Number</label>

<input
value={rollNo}
onChange={(e)=>setRollNo(e.target.value)}
placeholder="Example: 23"
/>

</>

)}


<button onClick={register} disabled={loading}>
Register
</button>


<button onClick={()=>navigate("/")}>
Back to Login
</button>


</div>

);

}

export default Register;