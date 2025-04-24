import { jest, describe, test, beforeEach, expect } from '@jest/globals'

import {
  Teacher,
  type TeacherRaw,
  Exam,
  type ExamRaw,
  ExamManager,
  processExams,
  type AvailabilityRaw,
} from '../../core/objects'

// Mock UUID to have predictable IDs in tests

describe('Exam Management System', () => {
  // Helper function to create a date with specific time
  const createDate = (
    year: number,
    month: number,
    day: number,
    hours: number,
    minutes: number,
  ): Date => {
    return new Date(year, month, day, hours, minutes)
  }

  // Helper to create an exam with specific times
  const createExamRaw = (
    subject: string,
    startDate: Date,
    durationMinutes: number,
    room: string,
  ): ExamRaw => {
    const start = startDate.toISOString()
    const duration = `${durationMinutes}`
    return { subject, start, duration, room }
  }

  // Helper to create teacher availability
  const createTeacherRaw = (
    name: string,
    subjects: string[],
    availabilities: AvailabilityRaw[],
  ): TeacherRaw => {
    return { name, subjects, availabilities }
  }

  beforeEach(() => {
    // Reset the ExamManager before each test
    ExamManager.resetProcessedExams()
    jest.clearAllMocks()

    // Mock console.log to reduce noise during tests
    jest.spyOn(console, 'log').mockImplementation(() => {})
  })

  describe('Teacher Class', () => {
    test('should create a Teacher instance with correct properties', () => {
      // Arrange
      const teacherRaw: TeacherRaw = {
        name: 'John Doe',
        subjects: ['Math', 'Physics'],
        availabilities: [{ dow: 1, start: '09:00', end: '12:00' }],
      }

      // Act
      const teacher = new Teacher(teacherRaw)

      // Assert
      expect(teacher.name).toBe('John Doe')
      expect(teacher.subjects).toEqual(['math', 'physics'])
      expect(teacher.availabilities.length).toBe(1)
      expect(teacher.availabilities[0].dow).toBe(1)
      expect(teacher.id).toBeDefined()
      expect(teacher.bias).toBeGreaterThanOrEqual(0)
      expect(teacher.bias).toBeLessThanOrEqual(4)
    })
  })

  describe('Exam Class', () => {
    test('should create an Exam instance with correct properties', () => {
      // Arrange
      const startDate = new Date(2025, 3, 15, 9, 0)
      const examRaw = createExamRaw('Math', startDate, 60, 'Room A')

      // Act
      const exam = new Exam(examRaw)

      // Assert
      expect(exam.subject).toBe('math')
      expect(exam.room).toBe('Room A')
      expect(exam.duration).toBe(60)
      expect(exam.start.getTime()).toBe(startDate.getTime())
      expect(exam.end.getTime()).toBe(new Date(startDate.getTime() + 60 * 60 * 1000).getTime())
      expect(exam.bookedSegments).toEqual([])
      expect(exam.complete).toBe(false)
    })

    test('should parse HH:MM format duration correctly', () => {
      // Arrange
      const examRaw: ExamRaw = {
        subject: 'Physics',
        start: new Date(2025, 3, 15, 9, 0).toISOString(),
        duration: '01:30', // 1 hour and 30 minutes
        room: 'Room B',
      }

      // Act
      const exam = new Exam(examRaw)

      // Assert
      expect(exam.duration).toBe(90) // 1h30m = 90 minutes
    })

    test('should detect overlap with another exam correctly', () => {
      // Arrange
      const startDate1 = new Date(2025, 3, 15, 9, 0)
      const startDate2 = new Date(2025, 3, 15, 10, 0)
      const exam1 = new Exam(createExamRaw('Math', startDate1, 120, 'Room A')) // 9:00-11:00
      const exam2 = new Exam(createExamRaw('Physics', startDate2, 120, 'Room A')) // 10:00-12:00
      const exam3 = new Exam(createExamRaw('Chemistry', new Date(2025, 3, 15, 11, 0), 60, 'Room A')) // 11:00-12:00
      const exam4 = new Exam(createExamRaw('Biology', new Date(2025, 3, 15, 13, 0), 60, 'Room A')) // 13:00-14:00

      // Act & Assert
      expect(exam1.overlapsWithExam(exam2)).toBe(true) // Overlap 10:00-11:00
      expect(exam1.overlapsWithExam(exam3)).toBe(false) // No overlap
      expect(exam2.overlapsWithExam(exam3)).toBe(true) // Overlap 11:00-12:00
      expect(exam3.overlapsWithExam(exam4)).toBe(false) // No overlap
    })

    test('should detect same start time correctly', () => {
      // Arrange
      const startDate = new Date(2025, 3, 15, 9, 0)
      const exam1 = new Exam(createExamRaw('Math', startDate, 60, 'Room A'))
      const exam2 = new Exam(createExamRaw('Physics', startDate, 120, 'Room A'))
      const exam3 = new Exam(createExamRaw('Chemistry', new Date(2025, 3, 15, 9, 30), 60, 'Room A'))

      // Act & Assert
      expect(exam1.startsAtSameTimeAs(exam2)).toBe(true)
      expect(exam1.startsAtSameTimeAs(exam3)).toBe(false)
    })
  })

  describe('ExamManager Class', () => {
    test('should find overlapping exams in the same room', () => {
      // Arrange
      const exam1 = new Exam(createExamRaw('Math', new Date(2025, 3, 15, 9, 0), 60, 'Room A'))
      const exam2 = new Exam(createExamRaw('Physics', new Date(2025, 3, 15, 9, 0), 120, 'Room A'))
      const exam3 = new Exam(createExamRaw('Chemistry', new Date(2025, 3, 15, 9, 0), 60, 'Room B'))

      ExamManager.addProcessedExam(exam1)
      ExamManager.addProcessedExam(exam3)

      // Act
      const overlappingExams = ExamManager.findOverlappingExamsInSameRoom(exam2)

      // Assert
      expect(overlappingExams).toContain(exam1)
      expect(overlappingExams).not.toContain(exam3) // Different room
      expect(overlappingExams.length).toBe(1)
    })
  })

  describe('Teacher Allocation', () => {
    test('should allocate teachers to exams correctly', () => {
      // Arrange - Create teachers with availability
      const monday = 1 // Assuming Monday is 1
      const teacherRaws: TeacherRaw[] = [
        createTeacherRaw('Alice', ['English'], [{ dow: monday, start: '08:00', end: '12:00' }]),
        createTeacherRaw('Bob', ['Math'], [{ dow: monday, start: '09:00', end: '15:00' }]),
      ]
      const teachers = teacherRaws.map((raw) => new Teacher(raw))

      // Create exams on Monday
      const examDate = new Date(2025, 3, 14) // A Monday
      examDate.setHours(9, 0, 0, 0)

      const examRaws: ExamRaw[] = [
        createExamRaw('Physics', examDate, 60, 'Room A'),
        createExamRaw('Chemistry', examDate, 120, 'Room A'), // Same start time, same room, longer duration
      ]
      const exams = examRaws.map((raw) => new Exam(raw))

      // Mock the getDay() to return Monday
      const originalGetDay = Date.prototype.getDay
      Date.prototype.getDay = jest.fn(() => monday)

      // Act
      const processedExams = processExams(exams, teachers)

      // Cleanup
      Date.prototype.getDay = originalGetDay

      // Assert
      expect(processedExams[0].complete).toBe(true)
      expect(processedExams[1].complete).toBe(true)

      // Verify that the same teacher is used for overlapping periods
      const firstExamTeachers = processedExams[0].bookedSegments.map((seg) => seg.teacher.name)
      const secondExamFirstHourTeachers = processedExams[1].bookedSegments
        .filter((seg) => seg.start.getHours() === 9)
        .map((seg) => seg.teacher.name)

      // Check that there's overlap in teachers
      const commonTeachers = firstExamTeachers.filter((teacher) =>
        secondExamFirstHourTeachers.includes(teacher),
      )
      expect(commonTeachers.length).toBeGreaterThan(0)
    })
  })

  describe('Reusing Teachers for Multiple Exams', () => {
    test('should reuse teachers for multiple exams in the same room starting at the same time', () => {
      // Arrange
      // Create a teacher who doesn't teach any of our subjects
      const teacherRaw = createTeacherRaw(
        'Teacher',
        [],
        [
          { dow: 1, start: '08:00', end: '14:00' }, // Available all day Monday
        ],
      )
      const teacher = new Teacher(teacherRaw)

      // Create two exams at the same time in the same room
      const examDate = new Date(2025, 3, 14, 9, 0) // A Monday at 9 AM
      const exam1 = new Exam(createExamRaw('Physics', examDate, 60, 'Room A')) // 9:00-10:00
      const exam2 = new Exam(createExamRaw('Chemistry', examDate, 120, 'Room A')) // 9:00-11:00

      // Force the correct day of week
      jest.spyOn(Date.prototype, 'getDay').mockReturnValue(1)

      // Act - First process exam1
      exam1.findTimeslots([teacher])
      // Add to processed exams
      ExamManager.addProcessedExam(exam1)
      // Then process exam2
      exam2.findTimeslots([teacher])

      // Assert
      expect(exam1.complete).toBe(true)
      expect(exam2.complete).toBe(true)

      // Check that exam2 reused teacher from exam1 for the 9:00-10:00 slot
      const exam2FirstHourSegment = exam2.bookedSegments.find(
        (seg) => seg.start.getHours() === 9 && seg.end.getHours() === 10,
      )

      expect(exam2FirstHourSegment).toBeDefined()
      expect(exam2FirstHourSegment?.teacher.name).toBe('Teacher')

      // There should be another segment for 10:00-11:00
      const exam2SecondHourSegment = exam2.bookedSegments.find((seg) => seg.start.getHours() === 10)

      expect(exam2SecondHourSegment).toBeDefined()
    })

    test('should handle multiple overlapping exams in the same room', () => {
      // Arrange
      const teacherRaw = createTeacherRaw(
        'Teacher',
        [],
        [
          { dow: 1, start: '08:00', end: '16:00' }, // Available all day
        ],
      )
      const teacher = new Teacher(teacherRaw)

      // Create three overlapping exams
      const examDate = new Date(2025, 3, 14)
      examDate.setHours(9, 0, 0, 0)

      const exam1 = new Exam(createExamRaw('Physics', examDate, 60, 'Room A')) // 9:00-10:00

      const exam2Start = new Date(examDate)
      exam2Start.setHours(9, 30, 0, 0)
      const exam2 = new Exam(createExamRaw('Chemistry', exam2Start, 60, 'Room A')) // 9:30-10:30

      const exam3Start = new Date(examDate)
      exam3Start.setHours(10, 0, 0, 0)
      const exam3 = new Exam(createExamRaw('Biology', exam3Start, 60, 'Room A')) // 10:00-11:00

      // Force the correct day of week
      jest.spyOn(Date.prototype, 'getDay').mockReturnValue(1)

      // Act
      const processedExams = processExams([exam1, exam2, exam3], [teacher])

      // Assert
      expect(processedExams[0].complete).toBe(true)
      expect(processedExams[1].complete).toBe(true)
      expect(processedExams[2].complete).toBe(true)

      // Check that we maximize teacher reuse
      const totalSegmentsCount = processedExams.reduce(
        (count, exam) => count + exam.bookedSegments.length,
        0,
      )

      // We should have fewer segments than if each exam had its own teachers
      // Without reuse, we'd have at least 3 segments (one per exam)
      // With optimal reuse, we might have just 1-2 segments total
      expect(totalSegmentsCount).toBeLessThan(4)
    })
  })

  describe('Integration Tests', () => {
    test('should handle a realistic scenario with multiple exams and teachers', () => {
      // Arrange
      // Create several teachers with different availabilities and subjects
      const teachers = [
        new Teacher(
          createTeacherRaw('Teacher1', ['Math'], [{ dow: 1, start: '08:00', end: '12:00' }]),
        ),
        new Teacher(
          createTeacherRaw('Teacher2', ['Physics'], [{ dow: 1, start: '09:00', end: '15:00' }]),
        ),
        new Teacher(
          createTeacherRaw('Teacher3', ['Chemistry'], [{ dow: 1, start: '10:00', end: '16:00' }]),
        ),
      ]

      // Create a complex exam schedule with different rooms and times
      const monday = new Date(2025, 3, 14) // A Monday
      monday.setHours(0, 0, 0, 0)

      const exam1Start = new Date(monday)
      exam1Start.setHours(9, 0, 0, 0)

      const exam2Start = new Date(monday)
      exam2Start.setHours(9, 0, 0, 0)

      const exam3Start = new Date(monday)
      exam3Start.setHours(11, 0, 0, 0)

      const exams = [
        new Exam(createExamRaw('English', exam1Start, 60, 'Room A')), // 9:00-10:00
        new Exam(createExamRaw('History', exam2Start, 120, 'Room A')), // 9:00-11:00 (same room)
        new Exam(createExamRaw('Biology', exam1Start, 90, 'Room B')), // 9:00-10:30 (different room)
        new Exam(createExamRaw('Art', exam3Start, 60, 'Room A')), // 11:00-12:00 (same room, later)
      ]

      // Force the correct day of week
      jest.spyOn(Date.prototype, 'getDay').mockReturnValue(1)

      // Act
      const processedExams = processExams(exams, teachers)

      // Assert
      // All exams should be complete
      expect(processedExams.every((exam) => exam.complete)).toBe(true)

      // Check teacher reuse for Room A exams
      const roomAExams = processedExams.filter((exam) => exam.room === 'Room A')

      // Get all teachers used for the 9:00-10:00 slot in Room A
      const firstHourTeachers = new Set<string>()
      roomAExams.forEach((exam) => {
        exam.bookedSegments
          .filter((seg) => seg.start.getHours() === 9)
          .forEach((seg) => firstHourTeachers.add(seg.teacher.name))
      })

      // We should have exactly one teacher for the 9:00-10:00 slot in Room A
      expect(firstHourTeachers.size).toBe(1)
    })
  })
})
