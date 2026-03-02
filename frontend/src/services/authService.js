import { auth, db } from "../firebase/config";
import {
doc,
setDoc,
collection,
query,
where,
getDocs
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from "firebase/auth";

// REGISTER USER (student or teacher)
export const registerUser = async (
  name,
  email,
  password,
  role,
  studentClass
) => {

  const userCredential =
    await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

  const user = userCredential.user;

  let rollNo = null;

  if(role==="student"){

 // find students in same class

    const q = query(
      collection(db,"users"),
      where("class","==",studentClass)
    );
    const snapshot =
      await getDocs(q);
    rollNo =
      snapshot.size + 1;

  }
  await setDoc(
    doc(db,"users",user.uid),
    {
      name,
      email,
      role,
      class: studentClass || "",
      rollNo,
      createdAt:new Date()
    }
  );
};

// LOGIN USER

export const loginUser = async (
  email,
  password
) => {

  const userCredential =
    await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

  return userCredential.user;
};



// LOGOUT

export const logoutUser = async () => {

  await signOut(auth);

};