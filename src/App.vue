<template>
  <div class="p-6 max-w-5xl mx-auto bg-gray-50 rounded-lg shadow-md">
    <h1 class="text-2xl font-bold text-indigo-800 mb-6">Exam Schedule</h1>

    <!-- Loading state -->
    <div v-if="loading" class="flex justify-center py-10">
      <div
        class="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"
      ></div>
    </div>

    <!-- Empty state -->
    <div v-else-if="weeklyExams.length === 0" class="py-10 text-center text-gray-500">
      No exams scheduled at this time.
    </div>

    <!-- Exams by week -->
    <div v-else>
      <div v-for="(week, weekIndex) in weeklyExams" :key="weekIndex" class="mb-8">
        <div class="flex items-center mb-4">
          <div class="w-3 h-3 bg-indigo-500 rounded-full mr-2"></div>
          <h2 class="text-xl font-semibold text-gray-800">{{ week.weekLabel }}</h2>
        </div>

        <!-- Week exams cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="(examGroup, examIndex) in week.examGroups"
            :key="examIndex"
            class="bg-white p-4 rounded-lg shadow-sm border-l-4 hover:shadow-md transition-shadow duration-200"
            :class="getBorderClass(examGroup)"
          >
            <!-- Subject(s) and completion badge -->
            <div class="flex justify-between items-start mb-2">
              <div>
                <h3 class="text-lg font-medium capitalize text-gray-900">
                  {{ getSubjectsLabel(examGroup) }}
                </h3>
                <span v-if="examGroup.exams.length > 1" class="text-xs text-gray-500">
                  {{ examGroup.exams.length }} combined exams
                </span>
              </div>
              <span
                v-if="examGroup.exams.length === 1"
                :class="{
                  'bg-green-100 text-green-800': examGroup.exams[0].complete,
                  'bg-yellow-100 text-yellow-800': !examGroup.exams[0].complete,
                }"
                class="text-xs px-2 py-1 rounded-full font-medium"
              >
                {{ examGroup.exams[0].complete ? 'Complete' : 'Incomplete' }}
              </span>
              <span
                v-else
                class="text-xs px-2 py-1 rounded-full font-medium bg-blue-100 text-blue-800"
              >
                Multiple
              </span>
            </div>

            <!-- Time and room info -->
            <div class="text-sm text-gray-600 mb-3">
              <div class="flex items-center mb-1">
                <svg
                  class="w-4 h-4 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  ></path>
                </svg>
                {{ formatDate(examGroup.start) }} - {{ formatTime(getLatestEndTime(examGroup)) }}
                <span class="ml-1">({{ getDurationRange(examGroup) }})</span>
              </div>
              <div class="flex items-center">
                <svg
                  class="w-4 h-4 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  ></path>
                </svg>
                {{ examGroup.room }}
              </div>
            </div>

            <!-- Teachers -->
            <div v-if="getAllTeachers(examGroup).length > 0" class="mt-3">
              <h4 class="text-sm font-medium text-gray-700 mb-1">Proctored by:</h4>
              <div class="flex flex-wrap">
                <span
                  v-for="(teacher, teacherIndex) in getAllTeachers(examGroup)"
                  :key="teacherIndex"
                  class="bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded-full mr-1 mb-1"
                >
                  {{ teacher.name }}
                </span>
              </div>
            </div>

            <!-- Expand button for more details -->
            <button
              @click="toggleExamDetails(weekIndex, examIndex)"
              class="mt-3 text-sm text-indigo-600 hover:text-indigo-800 flex items-center"
            >
              {{ examGroup.showDetails ? 'Hide details' : 'Show details' }}
              <svg
                class="w-4 h-4 ml-1 transition-transform duration-200"
                :class="{ 'transform rotate-180': examGroup.showDetails }"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 9l-7 7-7-7"
                ></path>
              </svg>
            </button>

            <!-- Expanded details -->
            <div v-if="examGroup.showDetails" class="mt-3 pt-3 border-t border-gray-200 text-sm">
              <!-- Multiple exams info -->
              <div v-if="examGroup.exams.length > 1">
                <h5 class="font-medium text-gray-700 mb-2">Combined Exams:</h5>
                <div
                  v-for="(exam, examIdx) in examGroup.exams"
                  :key="examIdx"
                  class="pl-2 border-l-2 border-gray-200 mb-3"
                >
                  <div class="flex justify-between">
                    <span class="font-medium text-gray-700 capitalize">{{ exam.subject }}</span>
                    <span
                      :class="{
                        'bg-green-100 text-green-800': exam.complete,
                        'bg-yellow-100 text-yellow-800': !exam.complete,
                      }"
                      class="text-xs px-2 py-1 rounded-full font-medium"
                    >
                      {{ exam.complete ? 'Complete' : 'Incomplete' }}
                    </span>
                  </div>
                  <p class="text-gray-600">Duration: {{ exam.duration }} min</p>
                  <p class="text-gray-600">
                    Time: {{ formatTime(exam.start) }} - {{ formatTime(exam.end) }}
                  </p>

                  <!-- Teacher info per exam -->
                  <div v-if="exam.bookedSegments && exam.bookedSegments.length > 0" class="mt-1">
                    <div
                      v-for="(segment, segmentIdx) in exam.bookedSegments"
                      :key="segmentIdx"
                      class="text-gray-600"
                    >
                      <p>Teacher: {{ segment.teacher.name }}</p>
                      <p>Subjects: {{ segment.teacher.subjects.join(', ') }}</p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Single exam teacher details -->
              <div v-else>
                <div
                  v-if="
                    examGroup.exams[0].bookedSegments &&
                    examGroup.exams[0].bookedSegments.length > 0
                  "
                >
                  <div
                    v-for="(segment, segmentIndex) in examGroup.exams[0].bookedSegments"
                    :key="segmentIndex"
                    class="mb-2"
                  >
                    <h5 class="font-medium text-gray-700">Teacher: {{ segment.teacher.name }}</h5>
                    <p class="text-gray-600">Subjects: {{ segment.teacher.subjects.join(', ') }}</p>
                    <p class="text-gray-600">Availability on this day:</p>
                    <ul class="list-disc pl-5 text-gray-600">
                      <li
                        v-for="(avail, availIndex) in filterAvailabilitiesByDow(
                          segment.teacher.availabilities,
                          examGroup.exams[0].dow,
                        )"
                        :key="availIndex"
                      >
                        {{ formatTime(avail.start) }} - {{ formatTime(avail.end) }}
                      </li>
                    </ul>
                  </div>
                </div>
                <div v-else class="text-gray-600">No teacher assigned yet.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { Exam, Teacher, BookedSegment } from './types'
import { solve } from '../core/solve'

// Props and emits
const props = defineProps<{
  // If you want to pass exams as props instead of fetching them
  initialExams?: Exam[]
}>()

// State
const exams = ref<Exam[]>([])
const loading = ref(true)

// Interface for grouped exams (merged by room and start time)
interface ExamGroup {
  exams: Exam[]
  room: string
  start: string
  showDetails: boolean
}

// Interface for weekly grouped exams
interface WeekGroup {
  weekStart: Date
  weekEnd: Date
  weekLabel: string
  examGroups: ExamGroup[]
}

// Group exams by room and start time
const groupExamsByRoomAndTime = (exams: Exam[]): ExamGroup[] => {
  const groups: Record<string, ExamGroup> = {}

  exams.forEach((exam) => {
    // Create a unique key for each room and start time combination
    const key = `${exam.room}-${exam.start}`

    if (!groups[key]) {
      groups[key] = {
        exams: [],
        room: exam.room,
        start: exam.start,
        showDetails: false,
      }
    }

    groups[key].exams.push({ ...exam })
  })

  return Object.values(groups)
}

// Group exams by week
const weeklyExams = computed<WeekGroup[]>(() => {
  if (!exams.value || exams.value.length === 0) return []

  // Group exams by week
  const weeks: Record<string, WeekGroup> = {}

  exams.value.forEach((exam) => {
    const examDate = new Date(exam.start)
    // Get week start (Monday)
    const weekStart = new Date(examDate)
    weekStart.setDate(examDate.getDate() - examDate.getDay() + (examDate.getDay() === 0 ? -6 : 1))

    // Format week key: YYYY-MM-DD
    const weekKey = weekStart.toISOString().split('T')[0]

    // Create week if it doesn't exist
    if (!weeks[weekKey]) {
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)

      weeks[weekKey] = {
        weekStart,
        weekEnd,
        weekLabel: formatWeekLabel(weekStart, weekEnd),
        examGroups: [],
      }
    }
  })

  // For each week, group exams by room and start time
  Object.keys(weeks).forEach((weekKey) => {
    const weekStart = weeks[weekKey].weekStart
    const weekEnd = weeks[weekKey].weekEnd

    // Filter exams that fall within this week
    const weekExams = exams.value.filter((exam) => {
      const examDate = new Date(exam.start)
      return examDate >= weekStart && examDate <= weekEnd
    })

    // Group these exams by room and start time
    weeks[weekKey].examGroups = groupExamsByRoomAndTime(weekExams)
  })

  // Convert to array and sort by week start date
  return Object.values(weeks).sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime())
})

// Methods
const fetchExams = () => {
  // Replace with actual API call
  setTimeout(() => {
    // Sample data - normally you would fetch this from an API
    if (props.initialExams) {
      exams.value = props.initialExams
    } else {
      exams.value = [
        {
          subject: 'biology',
          start: '2024-05-08T07:00:00.000Z',
          end: '2024-05-08T07:30:00.000Z',
          duration: 30,
          room: 'Room1',
          bookedSegments: [
            {
              teacher: {
                id: '75cbc67d-1223-43d6-a69f-d66da7c9ebd1',
                name: 'Simon',
                availabilities: [
                  {
                    dow: 3,
                    start: '1970-01-01T08:00:00.000Z',
                    end: '1970-01-01T08:55:00.000Z',
                  },
                  {
                    dow: 3,
                    start: '1970-01-01T10:10:00.000Z',
                    end: '1970-01-01T11:05:00.000Z',
                  },
                ],
                subjects: ['english'],
                bias: 3,
              },
              start: '2024-05-08T07:00:00.000Z',
              end: '2024-05-08T07:30:00.000Z',
            },
          ],
          complete: true,
          dow: 3,
        },
        // Example of exams that would be merged (same room and start time)
        {
          subject: 'chemistry',
          start: '2024-05-08T07:00:00.000Z',
          end: '2024-05-08T07:45:00.000Z',
          duration: 45,
          room: 'Room1',
          bookedSegments: [
            {
              teacher: {
                id: '85dbc67d-1223-43d6-a69f-d66da7c9ebd2',
                name: 'Maria',
                availabilities: [
                  {
                    dow: 3,
                    start: '1970-01-01T07:00:00.000Z',
                    end: '1970-01-01T09:00:00.000Z',
                  },
                ],
                subjects: ['chemistry'],
                bias: 2,
              },
              start: '2024-05-08T07:00:00.000Z',
              end: '2024-05-08T07:45:00.000Z',
            },
          ],
          complete: false,
          dow: 3,
        },
        // Different week
        {
          subject: 'math',
          start: '2024-05-15T09:00:00.000Z',
          end: '2024-05-15T10:00:00.000Z',
          duration: 60,
          room: 'Room2',
          bookedSegments: [
            {
              teacher: {
                id: '95dbc67d-1223-43d6-a69f-d66da7c9ebd3',
                name: 'John',
                availabilities: [
                  {
                    dow: 3,
                    start: '1970-01-01T09:00:00.000Z',
                    end: '1970-01-01T11:00:00.000Z',
                  },
                ],
                subjects: ['math'],
                bias: 1,
              },
              start: '2024-05-15T09:00:00.000Z',
              end: '2024-05-15T10:00:00.000Z',
            },
          ],
          complete: true,
          dow: 3,
        },
      ]
      exams.value = solve()
    }
    loading.value = false
  }, 500)
}

// Format date (Wed, May 8)
const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  const options: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' }
  return date.toLocaleDateString('en-US', options)
}

// Format time (7:00 AM)
const formatTime = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

// Format week label (May 6 - 12, 2024)
const formatWeekLabel = (startDate: Date, endDate: Date): string => {
  const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' })
  const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' })

  const startDay = startDate.getDate()
  const endDay = endDate.getDate()

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay} - ${endDay}, ${startDate.getFullYear()}`
  } else {
    return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${startDate.getFullYear()}`
  }
}

// Filter availabilities by day of week
const filterAvailabilitiesByDow = (availabilities: any[], dow: number) => {
  return availabilities.filter((a) => a.dow === dow)
}

// Toggle exam details
const toggleExamDetails = (weekIndex: number, examIndex: number) => {
  weeklyExams.value[weekIndex].examGroups[examIndex].showDetails =
    !weeklyExams.value[weekIndex].examGroups[examIndex].showDetails
}

// Get border color class based on exam completion status
const getBorderClass = (examGroup: ExamGroup): string => {
  if (examGroup.exams.length === 1) {
    return examGroup.exams[0].complete ? 'border-green-500' : 'border-yellow-500'
  }

  // Mixed completion status for multiple exams
  const allComplete = examGroup.exams.every((exam) => exam.complete)
  const allIncomplete = examGroup.exams.every((exam) => !exam.complete)

  if (allComplete) return 'border-green-500'
  if (allIncomplete) return 'border-yellow-500'

  // Mixed status
  return 'border-blue-500'
}

// Get combined subjects label
const getSubjectsLabel = (examGroup: ExamGroup): string => {
  if (examGroup.exams.length === 1) {
    return examGroup.exams[0].subject
  }

  // Multiple subjects, limit to 2 with "and more" text
  const subjects = [...new Set(examGroup.exams.map((exam) => exam.subject))]

  if (subjects.length <= 2) {
    return subjects.join(' & ')
  }

  return `${subjects[0]} & ${subjects.length - 1} more`
}

// Get latest end time from all exams in a group
const getLatestEndTime = (examGroup: ExamGroup): string => {
  const endTimes = examGroup.exams.map((exam) => new Date(exam.end).getTime())
  const latestTime = new Date(Math.max(...endTimes))
  return latestTime.toISOString()
}

// Get duration range (e.g., "30-45 min" or just "30 min" if all same)
const getDurationRange = (examGroup: ExamGroup): string => {
  const durations = examGroup.exams.map((exam) => exam.duration)
  const minDuration = Math.min(...durations)
  const maxDuration = Math.max(...durations)

  if (minDuration === maxDuration) {
    return `${minDuration} min`
  }

  return `${minDuration}-${maxDuration} min`
}

// Get all teachers from all exams in a group
const getAllTeachers = (examGroup: ExamGroup): Teacher[] => {
  const teachers: Teacher[] = []
  const teacherIds = new Set<string>()

  examGroup.exams.forEach((exam) => {
    if (exam.bookedSegments) {
      exam.bookedSegments.forEach((segment) => {
        if (!teacherIds.has(segment.teacher.id)) {
          teacherIds.add(segment.teacher.id)
          teachers.push(segment.teacher)
        }
      })
    }
  })

  return teachers
}

// Lifecycle hooks
onMounted(() => {
  fetchExams()
})
</script>
