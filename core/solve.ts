import { Teacher, Exam, Availability, processExams } from './objects'
import { teachers as teacherData, exams as examData } from './data'

const teachers = []

function solve() {
  const teachers = teacherData.map((teacher) => {
    return new Teacher(teacher)
  })

  const exams = examData.map((exam) => {
    return new Exam(exam)
  })

  const res = processExams(exams, teachers)
  console.log(JSON.stringify(res, undefined, 2))
  return exams
}

export { solve }
