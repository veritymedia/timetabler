# timetabler

This script is meant to work with a list of events/ exams in a specified format and a list of subjects/ teachers in a specified format.

It works well with and has been tested on Pearson Edxecel IGCSE an IAL exam details which are extracted from an official timetable.
However, you can get it to work with any csv if you pre-process the data appropriately.

## Feature Features

- [ ] Support flexible and natural language time input. [See](https://github.com/wanasit/chrono)
- [ ] Support changing how many teacher to proctor in parallel.
- [ ] Global contstraints and soft rules on all teachers. Eg. `Teachers cannot be schedueled for more than 2 hours per day`, `Proctoring should not take up more than 50% of free time in teachers day`
- [ ] Teacher specific constraints and soft rules. Eg. `Teacher X cannot have more than two hours/ 50% of free lessons schedueled per day/ week/ every tuesday`

## Input Structure

### Exam

```typescript
type ExamRaw = {
  subject: string
  start: string // format 2025-04-24T14:08:48.340Z
  duration: string // format hh:mm
  room: string
  examCode?: string
}
```

`subject` is the subject name and qualification level. Eg `Psychology IAL`. This will be used in the final output.

`start` is a string formatted in ISO 8601 format.

`duration` is the length of the event in hh:mm format.

`room` arbitrary room name/ code where the exam takes place. Note, this field is used to group ovelapping exams which start at the same time to not overprovision subjects to the event. This comparion is not case-sensitive, however, spelling must be identical. Eg. `"Room1" === "room1" === "rOoM1"` is equivalent, but `"room1" !== "rooms1" !== "ro0m1"` is not, and will be treated as separate rooms.

`examCode` is optional string which holds the exam code. Used only for output labelling.

### Teacher

```typescript
type TeacherRaw = {
  name: string
  availabilities: AvailabilityRaw[]
  subjects: string[]
}
```

`name` arbitrary string which will be used in the output. It has not impact on the schedueler.

`subjects` are subjects which the teacher should not be assigned to proctor (as they teach them themself). Eg `Psychology IAL` or `Psychology`. Both of those will disqualify them to proctor any exam with `subject: "psychology"` This will be used in the final output.

### Availability

```typescript
type AvailabilityRaw = {
  dow: number | string
  start: string
  end: string
}
```

`dow` is the day of week where Sunday = 0. Eg: `3 -> "Wednesday"`

`start` is a string formatted in ISO 8601 format

`end` is a string formatted in ISO 8601 format

<details>
<summary>Working with Date Fields (start, end)</summary>

This script requires start and end times to be fully qualified with the date and the time. All `start` and `end` inputs will be parsed by the Date() constructor. [Full documentation on it here](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/Date)

Expected strings are in ISO 8601 standard.

</details>
