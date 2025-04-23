import { Teacher, Exam, Availability } from "./objects";
import { teachers as teacherData, exams as examData } from "./data";

const teachers = [];

function solve() {
  const teachers = teacherData.map((teacher) => {
    return new Teacher(teacher);
  });

  const exams = examData.map((exam) => {
    return new Exam(exam);
  });

  for (let i = 0; i < exams.length; i++) {
    exams[i].findTimeslots(teachers);
  }

  console.log(JSON.stringify(exams, undefined, 2));
}

export { solve };
