import { TeacherRaw, ExamRaw } from "./objects";

export const teachers: TeacherRaw[] = [
  {
    name: "Simon",
    subjects: ["English"],
    availabilities: [
      {
        dow: "1",
        start: "9:00",
        end: "9:55",
      },
      {
        dow: "1",
        start: "11:10",
        end: "12:05",
      },
    ],
  },
  {
    name: "Jhon",
    subjects: [""],
    availabilities: [
      {
        dow: "1",
        start: "9:00",
        end: "9:55",
      },
      {
        dow: "1",
        start: "11:10",
        end: "12:05",
      },
    ],
  },
];

export const exams: ExamRaw[] = [
  {
    start: "2024-05-08T09:00:00",
    duration: "30",
    room: "Room1",
    subject: "",
  },

  {
    start: "12:10",
    duration: "60",
    room: "Room1",
    subject: "",
  },
];
