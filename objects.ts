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

  constructor(teacher: TeacherRaw) {
    this.availabilities = teacher.availabilities.map((a) => {
      return new Availability(a);
    });
  }
}

enum ExamRoom {
  Room1 = "Room1",
  Room2 = "Room2",
  Room3 = "Room3",
}

export type ExamRaw = {
  subject: string;
  start: string;
  duration: string; // format HH:mm
  room: string;
  bookedSegments: [];
};

export class Exam {
  subject: string;
  start: Date;
  end: Date;
  duration: number;
  constructor(exam: ExamRaw) {
    this.subject = exam.subject.toLowerCase();
    this.start = this.parseTime(exam.start);
    this.duration = parseInt(exam.duration);
    this.end = new Date(this.start);
    this.end.setMinutes(this.end.getMinutes() + this.duration);
  }

  private parseTime(timeStr: string): Date {
    const [hours, minutes] = timeStr.split(":").map(Number);
    const date = new Date(1970, 0, 1, hours, minutes); // Always use Jan 1, 1970
    return date;
  }
}
