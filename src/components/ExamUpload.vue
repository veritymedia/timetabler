<template>
  <div class="p-5">
    <!-- <h2 class="text-2xl font-bold mb-4">Exam Schedule CSV Uploader</h2> -->

    <div
      class="border-2 border-dashed border-gray-400 rounded-lg p-6 mb-6 text-center"
      @dragover.prevent
      @drop.prevent="handleFileDrop"
    >
      <input type="file" ref="fileInput" accept=".csv" class="hidden" @change="handleFileSelect" />
      <BaseButton @click="triggerFileInput"> Select CSV File </BaseButton>
      <p class="text-gray-500 mt-2">or drag and drop your file here</p>
      <p v-if="fileName" class="mt-2 text-sm text-gray-700">Selected file: {{ fileName }}</p>
    </div>

    <div v-if="error" class="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
      {{ error }}
    </div>

    <div v-if="parsedData.length > 0" class="mb-3 flex items-baseline space-x-4">
      <input
        v-model="searchTerm"
        type="text"
        placeholder="Search subject..."
        class="px-3 py-1 border border-gray-300 rounded-md text-sm w-72"
      />
      <BaseButton
        type="destructive"
        class="disabled:bg-gray-400"
        :disabled="!anySelected"
        @click="multiDelete"
      >
        Delete Selected ({{ selectedRowIds.size }})
      </BaseButton>
    </div>

    <div v-if="parsedData.length > 0" class="mb-6">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-semibold">Parsed Data ({{ parsedData.length }} records)</h3>
        <div class="flex gap-2">
          <BaseButton type="secondary" @click="startAddNewRow">Create New Exam</BaseButton>
          <BaseButton @click="downloadJSON"> Continue </BaseButton>
        </div>
      </div>

      <div class="overflow-x-auto relative shadow-2xl max-h-[60vh] text-sm bg-gray-100 rounded-2xl">
        <table class="min-w-full">
          <thead class="">
            <tr class="">
              <th class="py-2 px-2 border-b text-left">
                <input
                  type="checkbox"
                  :checked="allVisibleSelected"
                  @change="toggleSelectAllVisibleRows($event.target.checked)"
                />
              </th>
              <th class="py-2 px-4 border-b text-left">Subject</th>
              <th class="py-2 px-4 border-b text-left">Start Time</th>
              <th class="py-2 px-4 border-b text-left">Duration</th>
              <th class="py-2 px-4 border-b text-left">Room</th>
              <th class="py-2 px-4 border-b text-left">Exam Code</th>
              <th class="py-2 px-4 border-b text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="newRow">
              <td class="border-b"></td>

              <td class="py-2 px-4 border-b">
                <input v-model="newRow.subject" type="text" class="border rounded p-1 w-full" />
              </td>
              <td class="py-2 px-4 border-b">
                <input
                  v-model="newRow.start"
                  type="datetime-local"
                  class="border rounded p-1 w-full"
                />
              </td>
              <td class="py-2 px-4 border-b">
                <input
                  v-model="newRow.duration"
                  type="text"
                  class="border rounded p-1 w-full"
                  placeholder="01:30"
                />
              </td>
              <td class="py-2 px-4 border-b">
                <input v-model="newRow.room" type="text" class="border rounded p-1 w-full" />
              </td>
              <td class="py-2 px-4 border-b">
                <input v-model="newRow.examCode" type="text" class="border rounded p-1 w-full" />
              </td>
              <td class="py-2 px-4 border-b">
                <button
                  @click="saveNewRow"
                  class="mr-1 px-2 py-1 bg-blue-500 text-white text-xs rounded"
                >
                  Save
                </button>
                <button
                  @click="cancelNewRow"
                  class="px-2 py-1 bg-gray-500 text-white text-xs rounded"
                >
                  Cancel
                </button>
              </td>
            </tr>

            <tr v-for="item in filteredRows" :key="item.id" class="hover:bg-gray-50">
              <!-- Edit Row (unchanged logic, with <td></td> first for selector) -->
              <template v-if="editRowId === item.id">
                <td class="py-2 px-2 border-b">
                  <input
                    type="checkbox"
                    :checked="selectedRowIds.has(item.id)"
                    @change="toggleSelectRow(item.id, $event.target.checked)"
                  />
                </td>
                <td class="py-2 px-4 border-b">
                  <input
                    v-model="editBuffer.subject"
                    type="text"
                    class="border rounded p-1 w-full"
                  />
                </td>
                <td class="py-2 px-4 border-b">
                  <input
                    v-model="editBuffer.start"
                    type="datetime-local"
                    class="border rounded p-1 w-full"
                  />
                </td>
                <td class="py-2 px-4 border-b">
                  <input
                    v-model="editBuffer.duration"
                    type="text"
                    class="border rounded p-1 w-full"
                    placeholder="01:30"
                  />
                </td>
                <td class="py-2 px-4 border-b">
                  <input v-model="editBuffer.room" type="text" class="border rounded p-1 w-full" />
                </td>
                <td class="py-2 px-4 border-b">
                  <input
                    v-model="editBuffer.examCode"
                    type="text"
                    class="border rounded p-1 w-full"
                  />
                </td>
                <td class="py-2 px-4 border-b">
                  <button
                    @click="saveEditRow"
                    class="mr-1 px-2 py-1 bg-blue-500 text-white text-xs rounded"
                  >
                    Save
                  </button>
                  <button
                    @click="cancelEditRow"
                    class="px-2 py-1 bg-gray-500 text-white text-xs rounded"
                  >
                    Cancel
                  </button>
                </td>
              </template>
              <!-- Normal Row -->
              <template v-else>
                <td class="py-2 px-2 border-b">
                  <input
                    type="checkbox"
                    :checked="selectedRowIds.has(item.id)"
                    @change="toggleSelectRow(item.id, $event.target.checked)"
                  />
                </td>
                <td class="py-2 px-4 border-b">{{ item.subject }}</td>
                <td class="py-2 px-4 border-b">{{ new Date(item.start).toLocaleString() }}</td>
                <td class="py-2 px-4 border-b">{{ item.duration }}</td>
                <td class="py-2 px-4 border-b">{{ item.room }}</td>
                <td class="py-2 px-4 border-b">{{ item.examCode || '—' }}</td>
                <td class="py-2 px-4 border-b">
                  <div class="flex space-x-2">
                    <BaseButton @click="startEditRow(item)" type="secondary"> Edit </BaseButton>
                    <BaseButton type="secondary" @click="duplicateExam(item)">
                      Duplicate
                    </BaseButton>
                    <BaseButton type="destructive" @click="deleteExam(item.id)">
                      Delete
                    </BaseButton>
                  </div>
                </td>
              </template>
            </tr>
          </tbody>
        </table>
        <div v-if="filteredRows.length === 0" class="mt-3 text-gray-500">No matching records.</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, defineProps } from 'vue'
import Papa from 'papaparse'
import Fuse from 'fuse.js'
import BaseButton from './BaseButton.vue'

// Props definition
const props = defineProps({
  config: {
    type: Object,
    default: () => ({
      morning: '09:00',
      afternoon: '14:00',
    }),
  },
})

// Type definition (for reference)
/**
 * @typedef {Object} ExamRaw
 * @property {string} subject - Subject name
 * @property {string} start - ISO 8601 start time
 * @property {string} duration - Duration in HH:mm format
 * @property {string} room - Room designation
 * @property {string} [examCode] - Optional exam code
 */

const fileInput = ref(null)
const fileName = ref('')
const csvData = ref([])
const error = ref('')
const validationResults = ref([])
const parsedData = ref([])
const examToEdit = ref(null)
const showEditModal = ref(false)
const showNewExamModal = ref(false)
const editMode = ref('edit') // 'edit' or 'duplicate' or 'new'

// Expected CSV headers
const expectedHeaders = [
  'Date',
  'Exam series',
  'Board',
  'Qual',
  'Examination code',
  'Subject',
  'Title',
  'Time',
  'Duration',
]

// Trigger the file input click event
const triggerFileInput = () => {
  fileInput.value.click()
}

// Handle file selection
const handleFileSelect = (event) => {
  const file = event.target.files[0]
  if (file) {
    processFile(file)
  }
}

// Handle file drop
const handleFileDrop = (event) => {
  const file = event.dataTransfer.files[0]
  if (file) {
    processFile(file)
  }
}

// Process the uploaded file
const processFile = (file) => {
  if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
    error.value = 'Please upload a CSV file.'
    fileName.value = ''
    return
  }

  fileName.value = file.name
  error.value = ''
  validationResults.value = []
  parsedData.value = []

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      csvData.value = results.data
      validateHeaders(results.meta.fields)
      if (!error.value) {
        parseToExamRawFormat()
      }
    },
    error: (err) => {
      error.value = `Error parsing CSV: ${err.message}`
    },
  })
}

// Validate that CSV has expected headers
const validateHeaders = (headers) => {
  validationResults.value = []

  if (!headers || headers.length === 0) {
    error.value = 'No headers found in CSV file.'
    return
  }

  // Check for all expected headers
  expectedHeaders.forEach((header) => {
    const found = headers.includes(header)
    validationResults.value.push({
      valid: found,
      message: found ? `✓ Found header: ${header}` : `✗ Missing header: ${header}`,
    })
  })

  // Check for any unexpected headers
  headers.forEach((header) => {
    if (!expectedHeaders.includes(header)) {
      validationResults.value.push({
        valid: false,
        message: `! Unexpected header: ${header}`,
      })
    }
  })

  // Set error if any required headers are missing
  const missingHeaders = validationResults.value.filter((r) => !r.valid)
  if (missingHeaders.length > 0) {
    error.value = 'CSV file is missing required headers.'
  }
}

// Parse CSV data to ExamRaw format
const parseToExamRawFormat = () => {
  parsedData.value = csvData.value
    .map((row, index) => {
      // Format the date and time to ISO 8601
      const dateParts = row.Date.split('/')
      if (dateParts.length !== 3) {
        return null // Skip rows with invalid date format
      }

      const [month, day, year] = dateParts

      // Parse time using config prop (assuming 'Time' field contains 'Morning', 'Afternoon', etc.)
      let timeValue = props.config.morning // Use config morning time
      if (row.Time && row.Time.toLowerCase().includes('afternoon')) {
        timeValue = props.config.afternoon // Use config afternoon time
      }

      // Create the ISO date string
      const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${timeValue}:00`

      // Format duration from "0h 45m" to "00:45"
      let formattedDuration = '01:00' // Default
      if (row.Duration) {
        const durationMatch = row.Duration.match(/(\d+)h\s*(\d+)m/)
        if (durationMatch) {
          const hours = durationMatch[1].padStart(2, '0')
          const minutes = durationMatch[2].padStart(2, '0')
          formattedDuration = `${hours}:${minutes}`
        } else if (row.Duration.match(/(\d+)h/)) {
          const hours = row.Duration.match(/(\d+)h/)[1].padStart(2, '0')
          formattedDuration = `${hours}:00`
        } else if (row.Duration.match(/(\d+)m/)) {
          const minutes = row.Duration.match(/(\d+)m/)[1].padStart(2, '0')
          formattedDuration = `00:${minutes}`
        }
      }

      return {
        id: `exam-${index}`, // Add unique ID for tracking
        subject: row.Subject || '',
        start: isoDate,
        duration: formattedDuration,
        room: 'Room1', // Default as not provided in CSV
        examCode: row['Examination code'] || undefined,
      }
    })
    .filter((item) => item !== null)
}

// Download parsed data as JSON
const downloadJSON = () => {
  const json = JSON.stringify(parsedData.value, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = `${fileName.value.replace('.csv', '')}_parsed.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// New fields for inline edit/add
const editRowId = ref(null) // id of row being edited
const editBuffer = ref({}) // buffer for changes
const newRow = ref(null) // object for "add new row" inline

// Called to begin edit mode for a row
function startEditRow(row) {
  editRowId.value = row.id
  editBuffer.value = { ...row } // shallow copy is sufficient for flat objects
}
function cancelEditRow() {
  editRowId.value = null
  editBuffer.value = {}
}
function saveEditRow() {
  let idx = parsedData.value.findIndex((e) => e.id === editRowId.value)
  if (idx !== -1) {
    parsedData.value[idx] = { ...editBuffer.value } // replace with buffer
  }
  cancelEditRow()
}

// "Add new row" handler
function startAddNewRow() {
  // Fill start by default to now, duration/room empty.
  const now = new Date()
  // const pad = (v) => String(v).padStart(2, '0')
  newRow.value = {
    id: `exam-${Date.now()}`,
    subject: '',
    start: now.toISOString().slice(0, 16), // datetime-local inputs want "YYYY-MM-DDTHH:mm"
    duration: '',
    room: '',
    examCode: '',
  }
}
function cancelNewRow() {
  newRow.value = null
}
function saveNewRow() {
  // Simple validation (expand if needed)
  if (!newRow.value.subject || !newRow.value.start || !newRow.value.duration) {
    alert('Please fill all required fields')
    return
  }
  parsedData.value.push({ ...newRow.value })
  cancelNewRow()
}

// Adjust duplicate logic: now works by instantly adding a prefilled newRow
function duplicateExam(row) {
  newRow.value = {
    ...row,
    id: `exam-${Date.now()}`,
  }
  window.scrollTo({
    top: 0,
    left: 0,
    behavior: 'smooth',
  })
}

function deleteExam(examId) {
  const idx = parsedData.value.findIndex((ex) => ex.id === examId)
  if (idx !== -1) {
    parsedData.value.splice(idx, 1)
    if (editRowId.value === examId) {
      cancelEditRow()
    }
  }
}

// Open edit modal for an exam
const editExam = (exam) => {
  examToEdit.value = JSON.parse(JSON.stringify(exam)) // Deep copy to avoid direct mutation
  editMode.value = 'edit'
  showEditModal.value = true
}

const searchTerm = ref('')
const selectedRowIds = ref(new Set()) // Set for fast lookup

// Fuzzy search logic using fuse.js
const filteredRows = computed(() => {
  if (!searchTerm.value.trim()) return parsedData.value
  const fuse = new Fuse(parsedData.value, {
    keys: ['subject'],
    threshold: 0.2, // Adjust for more/less tolerance
  })
  const result = fuse.search(searchTerm.value.trim())
  // Fuse returns [{ item, ... }, ...]
  return result.map((r) => r.item)
})

// Helper: whether all visible rows are selected
const allVisibleSelected = computed(() => {
  if (filteredRows.value.length === 0) return false
  return filteredRows.value.every((row) => selectedRowIds.value.has(row.id))
})
const anySelected = computed(() => selectedRowIds.value.size > 0)

// Row selection logic
function toggleSelectRow(id, checked) {
  if (checked) {
    selectedRowIds.value.add(id)
  } else {
    selectedRowIds.value.delete(id)
  }
  // Force reactive update
  selectedRowIds.value = new Set(selectedRowIds.value)
}
// Select or deselect all filtered (visible) rows
function toggleSelectAllVisibleRows(checked) {
  if (checked) {
    filteredRows.value.forEach((row) => selectedRowIds.value.add(row.id))
  } else {
    filteredRows.value.forEach((row) => selectedRowIds.value.delete(row.id))
  }
  // Force update for reactivity
  selectedRowIds.value = new Set(selectedRowIds.value)
}

// Multi-delete: remove all selected ids from main data
function multiDelete() {
  parsedData.value = parsedData.value.filter((row) => !selectedRowIds.value.has(row.id))
  selectedRowIds.value.clear()
}

// Save exam changes
const saveExam = () => {
  if (editMode.value === 'new' || editMode.value === 'duplicate') {
    // Add new exam to the list
    parsedData.value.push(examToEdit.value)
  } else {
    // Update existing exam
    const index = parsedData.value.findIndex((exam) => exam.id === examToEdit.value.id)
    if (index !== -1) {
      parsedData.value[index] = examToEdit.value
    }
  }

  showEditModal.value = false
  examToEdit.value = null
}
</script>

<style scoped>
table {
  table-layout: fixed;
}

thead,
tr > th {
  position: sticky;
  background: #f3f4f6;
}

thead {
  top: 0;
  z-index: 2;
}
tr > th {
  left: 0;
  z-index: 1;
}
thead tr > th:first-child {
  z-index: 3;
}
</style>
