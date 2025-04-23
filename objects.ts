import { v4 as uuidv4 } from "uuid";

export type AvailabilityRaw = {
  dow: number | string;
  start: string;
  end: string;
};

export class Availability {
  dow: number;
  start: Date;
  end: Date;

  constructor(avail: AvailabilityRaw) {
    this.dow = typeof avail.dow === "number" ? avail.dow : parseInt(avail.dow);
    this.start = this.parseTime(avail.start);
    this.end = this.parseTime(avail.end);
  }

  private parseTime(timeStr: string): Date {
    const [hours, minutes] = timeStr.split(":").map(Number);
    const date = new Date(1970, 0, 1, hours, minutes); // Always use Jan 1, 1970
    return date;
  }

  getFormattedTime(date: Date): string {
    return date.toTimeString().slice(0, 5); // e.g., "09:00"
  }
}

export type TeacherRaw = {
  name: string;
  availabilities: AvailabilityRaw[];
  subjects: string[];
};

export class Teacher {
  id: string;
  name: string;
  availabilities: Availability[];
  subjects: string[];
  bias: number;

  constructor(teacher: TeacherRaw) {
    this.id = uuidv4();
    this.name = teacher.name;
    this.bias = Math.floor(Math.random() * 5);
    this.subjects = teacher.subjects.map((sub: string) => {
      return sub.toLowerCase();
    });
    this.availabilities = teacher.availabilities.map((a) => {
      return new Availability(a);
    });
  }
}

export type ExamRaw = {
  subject: string;
  start: string; // format YYYY-MM-DDThh:mm:ss
  duration: string; // format HH:mm
  room: string;
};

export type BookedSegment = {
  teacher: Teacher;
  start: Date;
  end: Date;
};

enum TORStatus {
  ExamComplete = 0,
  SubjectNotAllowed,
  NoAvailability,
}

export class Exam {
  subject: string;
  start: Date;
  end: Date;
  duration: number;
  room: string;
  bookedSegments: BookedSegment[];
  complete: boolean;
  dow: number;

  constructor(exam: ExamRaw) {
    this.subject = exam.subject.toLowerCase();
    this.start = new Date(exam.start);

    const durationDate = this.parseTime(exam.duration);
    this.duration = durationDate.getHours() * 60 + durationDate.getMinutes();

    this.end = new Date(this.start);
    this.end.setMinutes(this.end.getMinutes() + this.duration);

    this.bookedSegments = [];
    this.complete = false;

    this.dow = this.start.getDay();

    this.room = exam.room;
    console.log("Exam: ", this);
  }

  findTeacherOverlap(teacher: Teacher): TORStatus {
    if (teacher.subjects.includes(this.subject)) {
      return TORStatus.SubjectNotAllowed;
    }
    const teacherAvail = teacher.availabilities.filter((a) => {
      return a.dow === this.dow;
    });

    for (let i = 0; i < teacherAvail.length || !this.complete; i++) {
      const latestStart = new Date(
        Math.max(teacherAvail[i].start.getTime(), this.start.getTime()),
      );
      const earliestEnd = new Date(
        Math.min(teacherAvail[i].end.getTime(), this.end.getTime()),
      );

      if (latestStart <= earliestEnd) {
        this.bookedSegments.push({
          teacher: teacher,
          start: latestStart,
          end: earliestEnd,
        });
      }
    }

    if (this.complete) {
      return TORStatus.ExamComplete;
    } else {
      return TORStatus.NoAvailability;
    }
  }

  private parseTime(timeStr: string): Date {
    const [hours, minutes] = timeStr.split(":").map(Number);
    const date = new Date(1970, 0, 1, hours, minutes); // Always use Jan 1, 1970
    return date;
  }
}
