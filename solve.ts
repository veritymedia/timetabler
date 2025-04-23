import { Teacher, Exam, Availability } from "./objects";
import { teachers as teacherData, exams as examData } from "./data";

const teachers = [];

function getOverlapRange(avail: Availability, exam: Exam) {
  // const personStart = new Date(avail.start);
  // const personEnd = new Date(avail.end);
  // const eventStart = new Date(exam.start);
  // const eventEnd = new Date(exam.end);

  // Check for overlap
  const latestStart = new Date(
    Math.max(avail.start.getTime(), exam.start.getTime()),
  );
  const earliestEnd = new Date(
    Math.min(avail.end.getTime(), exam.end.getTime()),
  );

  if (latestStart <= earliestEnd) {
    return {
      overlap: true,
      range: {
        start: latestStart,
        end: earliestEnd,
      },
    };
  } else {
    return {
      overlap: false,
      range: null,
    };
  }
}

function solve() {
  const teachers = teacherData;
  const teacher = new Teacher(teachers[0]);

  const exams = examData;
  const exam = new Exam(exams[1]);
  const res = getOverlapRange(teacher.availabilities[0], exam);
  console.log(res);
}

export { solve };
