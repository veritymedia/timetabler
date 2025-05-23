import { v4 as uuidv4 } from 'uuid'
export type AvailabilityRaw = {
  dow: number | string
  start: string
  end: string
}
export class Availability {
  dow: number
  start: Date
  end: Date
  constructor(avail: AvailabilityRaw) {
    this.dow = typeof avail.dow === 'number' ? avail.dow : parseInt(avail.dow)
    this.start = this.parseTime(avail.start)
    this.end = this.parseTime(avail.end)
  }
  private parseTime(timeStr: string): Date {
    const [hours, minutes] = timeStr.split(':').map(Number)
    const date = new Date(1970, 0, 1, hours, minutes) // Always use Jan 1, 1970
    return date
  }
  getFormattedTime(date: Date): string {
    return date.toTimeString().slice(0, 5) // e.g., "09:00"
  }
}
export type TeacherRaw = {
  name: string
  availabilities: AvailabilityRaw[]
  subjects: string[]
}
export class Teacher {
  id: string
  name: string
  availabilities: Availability[]
  subjects: string[]
  bias: number
  constructor(teacher: TeacherRaw) {
    this.id = uuidv4()
    this.name = teacher.name
    this.bias = Math.floor(Math.random() * 5)
    this.subjects = teacher.subjects.map((sub: string) => {
      return sub.toLowerCase()
    })
    this.availabilities = teacher.availabilities.map((a) => {
      return new Availability(a)
    })
  }
}

export type ExamRaw = {
  subject: string
  start: string // format ISO 8601
  duration: string // format HH:mm
  room: string
  examCode?: string
}
export type BookedSegment = {
  teacher: Teacher
  start: Date
  end: Date
}
enum TORStatus {
  ExamComplete = 0,
  SubjectNotAllowed,
  NoAvailability,
}

// Store processed exams globally to check for room/time overlaps
export class ExamManager {
  static processedExams: Exam[] = []

  static addProcessedExam(exam: Exam): void {
    this.processedExams.push(exam)
  }

  static findOverlappingExamsInSameRoom(exam: Exam): Exam[] {
    return this.processedExams.filter(
      (processedExam) => processedExam.room === exam.room && exam.overlapsWithExam(processedExam),
    )
  }

  static resetProcessedExams(): void {
    this.processedExams = []
  }
}

export class Exam {
  subject: string
  start: Date
  end: Date
  duration: number
  room: string
  bookedSegments: BookedSegment[]
  complete: boolean
  dow: number
  id: string // Added ID for easier referencing

  constructor(exam: ExamRaw) {
    this.id = uuidv4()
    this.subject = exam.subject.toLowerCase()
    this.start = new Date(exam.start)

    // Fix duration parsing - it could be in minutes or HH:MM format
    if (exam.duration.includes(':')) {
      const durationDate = this.parseTime(exam.duration)
      this.duration = durationDate.getHours() * 60 + durationDate.getMinutes()
    } else {
      // If just a number, treat as minutes directly
      this.duration = parseInt(exam.duration)
    }

    this.end = new Date(this.start)
    this.end.setMinutes(this.end.getMinutes() + this.duration)
    this.bookedSegments = []
    this.complete = false
    this.dow = this.start.getDay()
    this.room = exam.room
    console.log('Exam: ', this)
  }

  /**
   * Find suitable timeslots from available teachers
   * @param teachers Array of available teachers
   * @returns Status of the operation
   */
  findTimeslots(teachers: Teacher[]): TORStatus {
    // First, check if there are overlapping exams in the same room
    const overlappingExams = ExamManager.findOverlappingExamsInSameRoom(this)
    console.log(`Found ${overlappingExams.length} overlapping exams in room ${this.room}`)

    // If there are overlapping exams that are already complete, reuse their teachers
    if (overlappingExams.length > 0) {
      const completeOverlappingExams = overlappingExams.filter((exam) => exam.complete)

      if (completeOverlappingExams.length > 0) {
        console.log(
          `Found ${completeOverlappingExams.length} complete overlapping exams, reusing their teachers`,
        )
        return this.reuseTeachersFromOverlappingExams(completeOverlappingExams)
      }
    }

    // If no overlapping exams or none are complete, proceed with normal teacher assignment
    // Sort teachers by bias (lower bias teachers get priority)
    teachers.sort((a, b) => a.bias - b.bias)

    // Check if the exam is already fully covered by the booked segments
    if (this.isFullyCovered()) {
      this.complete = true
      return TORStatus.ExamComplete
    }

    // Try each teacher until the exam is fully covered
    for (let i = 0; i < teachers.length && !this.complete; i++) {
      console.log(`Trying teacher ${teachers[i].name} for ${this.subject}`)
      const status = this.findTeacherOverlap(teachers[i])
      console.log(`Result status: ${TORStatus[status]}`)

      // After adding a teacher's availability, check if the exam is now fully covered
      if (this.isFullyCovered()) {
        this.complete = true
        console.log(`Exam ${this.subject} is now complete`)
        return TORStatus.ExamComplete
      }
    }

    // If we're here and not complete, we couldn't cover the whole exam
    return this.complete ? TORStatus.ExamComplete : TORStatus.NoAvailability
  }

  /**
   * Reuse teachers from overlapping exams in the same room
   * @param overlappingExams Array of overlapping exams in the same room
   * @returns Status of the operation
   */
  private reuseTeachersFromOverlappingExams(overlappingExams: Exam[]): TORStatus {
    console.log(`Attempting to reuse teachers from ${overlappingExams.length} overlapping exams`)

    // Sort overlapping exams by end time (latest end time first)
    // This ensures we try to reuse teachers from exams that cover the most time
    overlappingExams.sort((a, b) => b.end.getTime() - a.end.getTime())

    let allSegmentsCovered = false

    // Try to copy segments from each overlapping exam
    for (const exam of overlappingExams) {
      // For each booked segment in the overlapping exam
      for (const segment of exam.bookedSegments) {
        // Create a new segment covering the overlap between this exam and the segment
        const latestStart = new Date(Math.max(this.start.getTime(), segment.start.getTime()))
        const earliestEnd = new Date(Math.min(this.end.getTime(), segment.end.getTime()))

        // If there's a valid overlap
        if (latestStart < earliestEnd) {
          console.log(
            `Found valid overlap with teacher ${segment.teacher.name}: ${latestStart.toTimeString()} - ${earliestEnd.toTimeString()}`,
          )

          // Add the segment if it doesn't overlap with existing segments
          if (!this.overlapsWithExistingSegments(latestStart, earliestEnd)) {
            this.bookedSegments.push({
              teacher: segment.teacher,
              start: latestStart,
              end: earliestEnd,
            })
            console.log(
              `Added reused segment for ${segment.teacher.name}: ${latestStart.toTimeString()} - ${earliestEnd.toTimeString()}`,
            )
          }
        }
      }

      // Sort and merge segments after each exam's segments are added
      this.bookedSegments.sort((a, b) => a.start.getTime() - b.start.getTime())
      this.mergeOverlappingSegments()

      // Check if we've now covered the exam
      if (this.isFullyCovered()) {
        this.complete = true
        console.log(`Exam ${this.subject} is now complete using reused teachers`)
        return TORStatus.ExamComplete
      }
    }

    // If we're here, we couldn't fully cover the exam with reused teachers
    // We'll return partial status and let the regular algorithm finish the job
    console.log(`Could not fully cover exam ${this.subject} with reused teachers`)
    return this.isFullyCovered() ? TORStatus.ExamComplete : TORStatus.NoAvailability
  }

  /**
   * Check if this exam overlaps with another exam
   * @param other Another exam to check against
   * @returns Whether there's an overlap
   */
  overlapsWithExam(other: Exam): boolean {
    return this.start < other.end && other.start < this.end
  }

  /**
   * Check if this exam starts at the same time as another exam
   * @param other Another exam to check against
   * @returns Whether they start at the same time
   */
  startsAtSameTimeAs(other: Exam): boolean {
    return this.start.getTime() === other.start.getTime()
  }

  /**
   * Check if a particular teacher has valid availability for this exam
   * @param teacher The teacher to check
   * @returns Status of the matching process
   */
  private findTeacherOverlap(teacher: Teacher): TORStatus {
    // Bug fix: Teacher should be able to supervise if they do NOT teach the subject
    if (teacher.subjects.includes(this.subject)) {
      console.log(`Teacher ${teacher.name} teaches ${this.subject}, can't supervise this exam`)
      return TORStatus.SubjectNotAllowed
    }

    // Filter for the teacher's availability on the day of the exam
    const teacherAvail = teacher.availabilities.filter((a) => a.dow === this.dow)

    if (teacherAvail.length === 0) {
      console.log(`Teacher ${teacher.name} has no availability on day ${this.dow}`)
      return TORStatus.NoAvailability
    }

    console.log(
      `Teacher ${teacher.name} has ${teacherAvail.length} availability slots on day ${this.dow}`,
    )

    // Keep track of whether we found at least one valid segment
    let foundValidSegment = false

    // Check each availability time slot for the teacher on this day
    for (let i = 0; i < teacherAvail.length; i++) {
      const avail = teacherAvail[i]
      console.log(
        `Checking availability slot ${i + 1}: ${avail.start.toTimeString()} - ${avail.end.toTimeString()}`,
      )

      // Get the overlapping time period between teacher availability and exam time
      const latestStart = this.getLatestStartTime(avail)
      const earliestEnd = this.getEarliestEndTime(avail)

      console.log(`Exam time: ${this.start.toTimeString()} - ${this.end.toTimeString()}`)
      console.log(`Overlap: ${latestStart.toTimeString()} - ${earliestEnd.toTimeString()}`)

      // If there's a valid overlap
      if (latestStart < earliestEnd) {
        console.log(`Valid overlap found!`)

        // Check if this segment overlaps with any existing booked segments
        if (!this.overlapsWithExistingSegments(latestStart, earliestEnd)) {
          // Add the new segment
          this.bookedSegments.push({
            teacher: teacher,
            start: latestStart,
            end: earliestEnd,
          })
          console.log(
            `Added new segment for ${teacher.name}: ${latestStart.toTimeString()} - ${earliestEnd.toTimeString()}`,
          )
          foundValidSegment = true
        } else {
          console.log(`Segment overlaps with existing booked segments, skipping`)
        }
      } else {
        console.log(`No valid overlap found`)
      }
    }

    // Sort booked segments by start time to make checking coverage easier
    this.bookedSegments.sort((a, b) => a.start.getTime() - b.start.getTime())

    // Merge overlapping segments if any
    this.mergeOverlappingSegments()

    // Check if the exam is now completely covered
    if (this.isFullyCovered()) {
      this.complete = true
      return TORStatus.ExamComplete
    }

    return foundValidSegment ? TORStatus.NoAvailability : TORStatus.NoAvailability
  }

  /**
   * Get the later of the teacher's availability start and exam start
   */
  private getLatestStartTime(avail: Availability): Date {
    // Create dates with the same day as the exam but with the availability times
    const availStartOnExamDay = new Date(this.start)
    availStartOnExamDay.setHours(avail.start.getHours(), avail.start.getMinutes(), 0, 0)

    console.log(`Comparing start times:
      Exam start: ${this.start.toTimeString()} (${this.start.getTime()})
      Avail start: ${availStartOnExamDay.toTimeString()} (${availStartOnExamDay.getTime()})`)

    // Return the later of the two start times
    return new Date(Math.max(availStartOnExamDay.getTime(), this.start.getTime()))
  }

  /**
   * Get the earlier of the teacher's availability end and exam end
   */
  private getEarliestEndTime(avail: Availability): Date {
    // Create dates with the same day as the exam but with the availability times
    const availEndOnExamDay = new Date(this.start)
    availEndOnExamDay.setHours(avail.end.getHours(), avail.end.getMinutes(), 0, 0)

    console.log(`Comparing end times:
      Exam end: ${this.end.toTimeString()} (${this.end.getTime()})
      Avail end: ${availEndOnExamDay.toTimeString()} (${availEndOnExamDay.getTime()})`)

    // Return the earlier of the two end times
    return new Date(Math.min(availEndOnExamDay.getTime(), this.end.getTime()))
  }

  /**
   * Check if a new segment would overlap with existing booked segments
   * @param start Start time of the new segment
   * @param end End time of the new segment
   * @returns Whether there is an overlap
   */
  private overlapsWithExistingSegments(start: Date, end: Date): boolean {
    for (const segment of this.bookedSegments) {
      // Check for overlap
      if (start < segment.end && segment.start < end) {
        return true
      }
    }
    return false
  }

  /**
   * Merge any overlapping segments to simplify the coverage checking
   */
  private mergeOverlappingSegments(): void {
    if (this.bookedSegments.length <= 1) return

    const mergedSegments: BookedSegment[] = [this.bookedSegments[0]]

    for (let i = 1; i < this.bookedSegments.length; i++) {
      const current = this.bookedSegments[i]
      const lastMerged = mergedSegments[mergedSegments.length - 1]

      // If this segment overlaps with the previous one
      if (current.start <= lastMerged.end) {
        // Extend the end time of the last segment if needed
        if (current.end > lastMerged.end) {
          lastMerged.end = current.end
        }
      } else {
        // No overlap, add as a new segment
        mergedSegments.push(current)
      }
    }

    this.bookedSegments = mergedSegments
  }

  /**
   * Check if the exam is fully covered by booked segments
   * @returns Whether the exam is fully covered
   */
  private isFullyCovered(): boolean {
    // No segments = not covered
    if (this.bookedSegments.length === 0) {
      console.log('No booked segments, exam is not covered')
      return false
    }

    // Sort segments by start time
    const sortedSegments = [...this.bookedSegments].sort(
      (a, b) => a.start.getTime() - b.start.getTime(),
    )

    console.log(`Checking ${sortedSegments.length} segments for complete coverage`)

    // Check if the first segment starts at or before the exam start
    if (sortedSegments[0].start.getTime() > this.start.getTime()) {
      console.log(
        `First segment starts at ${sortedSegments[0].start.toTimeString()}, which is after exam start ${this.start.toTimeString()}`,
      )
      return false
    }

    // Check if the last segment ends at or after the exam end
    if (sortedSegments[sortedSegments.length - 1].end.getTime() < this.end.getTime()) {
      console.log(
        `Last segment ends at ${sortedSegments[sortedSegments.length - 1].end.toTimeString()}, which is before exam end ${this.end.toTimeString()}`,
      )
      return false
    }

    // Check for gaps between segments
    let currentEnd = sortedSegments[0].end
    for (let i = 1; i < sortedSegments.length; i++) {
      if (sortedSegments[i].start.getTime() > currentEnd.getTime()) {
        // Gap found
        console.log(`Gap found between segments ${i - 1} and ${i}`)
        return false
      }
      currentEnd = new Date(Math.max(currentEnd.getTime(), sortedSegments[i].end.getTime()))
    }

    // If we're here, the exam is fully covered
    console.log('Exam is fully covered!')
    return true
  }

  private parseTime(timeStr: string): Date {
    const [hours, minutes] = timeStr.split(':').map(Number)
    const date = new Date(1970, 0, 1, hours, minutes) // Always use Jan 1, 1970
    return date
  }
}

/**
 * Main function to process all exams and assign teachers
 * @param exams Array of exams to process
 * @param teachers Array of available teachers
 * @returns Array of processed exams
 */
export function processExams(exams: Exam[], teachers: Teacher[]): Exam[] {
  // Reset the processed exams list
  ExamManager.resetProcessedExams()

  // Sort exams by start time, then by room
  // This ensures we process exams that start at the same time in the same room together
  exams.sort((a, b) => {
    const startCompare = a.start.getTime() - b.start.getTime()
    if (startCompare === 0) {
      return a.room.localeCompare(b.room)
    }
    return startCompare
  })

  for (const exam of exams) {
    console.log(
      `Processing exam: ${exam.subject} in room ${exam.room} at ${exam.start.toTimeString()}`,
    )
    const status = exam.findTimeslots(teachers)
    console.log(`Exam processing status: ${TORStatus[status]}`)

    // Add the exam to the processed list if it's complete
    if (exam.complete) {
      ExamManager.addProcessedExam(exam)
    }
  }

  return exams
}
