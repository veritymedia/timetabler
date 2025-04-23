import { Teacher, Exam, Availability } from "./objects";
import { teachers as teacherData, exams as examData } from "./data";

const teachers = [];

function getOverlapRange(avail: Availability, exam: Exam) {
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

function processExam(exam: Exam, teachers: Teacher[]) {}

function solve() {
  const teachers = teacherData.map((teacher) => {
    return new Teacher(teacher);
  });

  const exams = examData.map((exam) => {
    return new Exam(exam);
  });

  for (let i = 0; i < exams.length; i++) {
    processExam(exams[i], teachers);
  }
}

export { solve };
