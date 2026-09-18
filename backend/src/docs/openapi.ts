/**
 * OpenAPI description of the API, kept as a typed object rather than a YAML file
 * so a rename that breaks it fails `npm run typecheck` instead of only showing up
 * as a wrong page in the browser.
 *
 * Only endpoints that actually exist are listed under `paths`. The component
 * schemas describe the database tables, so the doctors and appointments routes
 * can reference them the moment they are implemented.
 */
export const openapiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'Dental Clinic API',
    version: '1.0.0',
    description:
      'REST API for managing clinic doctors and patient appointments.\n\n' +
      'Served at both `/api` and `/api/v1`. The version is declared once when the ' +
      'router is mounted, so a future v2 is an additional mount rather than a ' +
      'change to any handler.',
    license: { name: 'MIT' },
  },
  servers: [
    { url: '/api/v1', description: 'Versioned (canonical)' },
    { url: '/api', description: 'Unversioned alias' },
  ],
  tags: [
    { name: 'Health', description: 'Service and database liveness' },
    { name: 'Doctors', description: 'Clinic doctors' },
    { name: 'Availability', description: 'Bookable 30-minute slots' },
    { name: 'Appointments', description: 'Patient appointments' },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Service health',
        description:
          'Performs a database round-trip, so a 200 means the API and PostgreSQL ' +
          'are both reachable. A process that is up but cannot reach its database ' +
          'reports unhealthy rather than ok.',
        operationId: 'getHealth',
        responses: {
          200: {
            description: 'API and database are reachable',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Health' },
                example: { status: 'ok' },
              },
            },
          },
          500: {
            description: 'Database unreachable',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
                example: { errors: ['Internal server error'] },
              },
            },
          },
        },
      },
    },
    '/doctors': {
      get: {
        tags: ['Doctors'],
        summary: 'List doctors',
        operationId: 'listDoctors',
        parameters: [
          {
            name: 'search',
            in: 'query',
            description: 'Case-insensitive match against name or specialization.',
            schema: { type: 'string' },
          },
          {
            name: 'is_active',
            in: 'query',
            description: 'Restrict to active or inactive doctors.',
            schema: { type: 'string', enum: ['true', 'false'] },
          },
        ],
        responses: {
          200: {
            description: 'Doctors, ordered by name',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/Doctor' } },
              },
            },
          },
          400: { $ref: '#/components/responses/BadRequest' },
        },
      },
      post: {
        tags: ['Doctors'],
        summary: 'Create a doctor',
        operationId: 'createDoctor',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/DoctorInput' } } },
        },
        responses: {
          201: {
            description: 'Created. The Location header points at the new doctor.',
            headers: { Location: { schema: { type: 'string' }, description: 'URL of the new doctor' } },
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Doctor' } } },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          409: {
            description: 'A doctor with that email already exists',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          429: { $ref: '#/components/responses/TooManyRequests' },
        },
      },
    },
    '/doctors/{id}': {
      parameters: [{ $ref: '#/components/parameters/Id' }],
      get: {
        tags: ['Doctors'],
        summary: 'Get a doctor',
        operationId: 'getDoctor',
        responses: {
          200: {
            description: 'The doctor',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Doctor' } } },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      put: {
        tags: ['Doctors'],
        summary: 'Replace a doctor',
        description: 'A full replacement: every writable field must be supplied.',
        operationId: 'updateDoctor',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/DoctorInput' } } },
        },
        responses: {
          200: {
            description: 'The updated doctor',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Doctor' } } },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          404: { $ref: '#/components/responses/NotFound' },
          409: {
            description: 'Another doctor already uses that email',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          429: { $ref: '#/components/responses/TooManyRequests' },
        },
      },
      delete: {
        tags: ['Doctors'],
        summary: 'Delete a doctor',
        description:
          'Refused with 409 if the doctor has any appointments, so patient history is ' +
          'never erased as a side effect. Set is_active to false to retire a doctor instead.',
        operationId: 'deleteDoctor',
        responses: {
          204: { description: 'Deleted' },
          400: { $ref: '#/components/responses/BadRequest' },
          404: { $ref: '#/components/responses/NotFound' },
          409: {
            description: 'The doctor still has appointments',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
                example: {
                  errors: [
                    'Doctor has 3 appointment(s) and cannot be deleted. Set is_active to false to retire the doctor while keeping their history.',
                  ],
                },
              },
            },
          },
          429: { $ref: '#/components/responses/TooManyRequests' },
        },
      },
    },
    '/doctors/{id}/availability': {
      parameters: [{ $ref: '#/components/parameters/Id' }],
      get: {
        tags: ['Availability'],
        summary: 'Get bookable slots for one doctor and date',
        operationId: 'getDoctorAvailability',
        parameters: [{ name: 'date', in: 'query', required: true, schema: { type: 'string', format: 'date' } }],
        responses: {
          200: {
            description: 'Working slots, including occupied slots marked unavailable',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AvailabilityResponse' } } },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/appointments': {
      get: {
        tags: ['Appointments'],
        summary: 'List appointments',
        description: 'Ordered by date then time. Filters combine with AND.',
        operationId: 'listAppointments',
        parameters: [
          {
            name: 'status',
            in: 'query',
            schema: { type: 'string', enum: ['pending', 'confirmed', 'completed', 'cancelled'] },
          },
          { name: 'doctorId', in: 'query', schema: { type: 'integer', minimum: 1 } },
          { name: 'date', in: 'query', schema: { type: 'string', format: 'date' } },
        ],
        responses: {
          200: {
            description: 'Matching appointments, each including its doctor',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/Appointment' } },
              },
            },
          },
          400: { $ref: '#/components/responses/BadRequest' },
        },
      },
      post: {
        tags: ['Appointments'],
        summary: 'Book an appointment',
        operationId: 'createAppointment',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/AppointmentInput' } } },
        },
        responses: {
          201: {
            description: 'Booked',
            headers: { Location: { schema: { type: 'string' } } },
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Appointment' } } },
          },
          400: {
            description: 'Validation failed, or doctor_id references no existing doctor',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          409: { $ref: '#/components/responses/SlotTaken' },
          429: { $ref: '#/components/responses/TooManyRequests' },
        },
      },
    },
    '/appointments/{id}': {
      parameters: [{ $ref: '#/components/parameters/Id' }],
      get: {
        tags: ['Appointments'],
        summary: 'Get an appointment',
        operationId: 'getAppointment',
        responses: {
          200: {
            description: 'The appointment',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Appointment' } } },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      put: {
        tags: ['Appointments'],
        summary: 'Replace an appointment',
        description: 'A full replacement: every writable field must be supplied.',
        operationId: 'updateAppointment',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/AppointmentInput' } } },
        },
        responses: {
          200: {
            description: 'The updated appointment',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Appointment' } } },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          404: { $ref: '#/components/responses/NotFound' },
          409: { $ref: '#/components/responses/SlotTaken' },
          429: { $ref: '#/components/responses/TooManyRequests' },
        },
      },
      delete: {
        tags: ['Appointments'],
        summary: 'Delete an appointment',
        operationId: 'deleteAppointment',
        responses: {
          204: { description: 'Deleted' },
          400: { $ref: '#/components/responses/BadRequest' },
          404: { $ref: '#/components/responses/NotFound' },
          429: { $ref: '#/components/responses/TooManyRequests' },
        },
      },
    },
  },
  components: {
    parameters: {
      Id: {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'integer', minimum: 1 },
      },
    },
    responses: {
      BadRequest: {
        description: 'Validation failed. Every offending field is listed.',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: { errors: ['email: must be a valid email address', 'name: name is required'] },
          },
        },
      },
      NotFound: {
        description: 'No such resource',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
      SlotTaken: {
        description: 'Doctor inactive, outside working hours, or slot already booked',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: { errors: ['The selected appointment slot is already booked.'] },
          },
        },
      },
      TooManyRequests: {
        description: 'Rate limit exceeded',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: { errors: ['Too many requests. Please slow down and try again later.'], retry_after_seconds: 900 },
          },
        },
      },
    },
    schemas: {
      Health: {
        type: 'object',
        required: ['status'],
        properties: { status: { type: 'string', enum: ['ok'] } },
      },
      Error: {
        type: 'object',
        required: ['errors'],
        description: 'Every failure uses this shape. Stack traces are never returned.',
        properties: {
          errors: { type: 'array', items: { type: 'string' } },
          retry_after_seconds: {
            type: 'integer',
            description: 'Present only on 429 responses.',
          },
        },
      },
      WeeklyAvailabilityPeriod: {
        type: 'object',
        required: ['day_of_week', 'start_time', 'end_time'],
        properties: {
          day_of_week: { type: 'integer', minimum: 1, maximum: 7, description: 'ISO weekday: 1 Monday through 7 Sunday.' },
          start_time: { type: 'string', pattern: '^([01]\\d|2[0-3]):(00|30)$', examples: ['09:00'] },
          end_time: { type: 'string', pattern: '^([01]\\d|2[0-3]):(00|30)$', examples: ['17:00'] },
        },
      },
      AvailabilityResponse: {
        type: 'object',
        required: ['success', 'data'],
        properties: {
          success: { type: 'boolean', enum: [true] },
          data: {
            type: 'object', required: ['doctorId', 'date', 'slotDurationMinutes', 'slots'],
            properties: {
              doctorId: { type: 'integer' },
              date: { type: 'string', format: 'date' },
              slotDurationMinutes: { type: 'integer', enum: [30] },
              slots: { type: 'array', items: {
                type: 'object', required: ['start', 'end', 'available'],
                properties: {
                  start: { type: 'string', examples: ['09:00'] },
                  end: { type: 'string', examples: ['09:30'] },
                  available: { type: 'boolean' },
                },
              } },
            },
          },
        },
      },
      Doctor: {
        type: 'object',
        required: ['id', 'name', 'specialization', 'phone', 'email', 'weekly_availability', 'is_active'],
        properties: {
          id: { type: 'integer', readOnly: true, examples: [1] },
          name: { type: 'string', minLength: 1, examples: ['Dr. Amara Okonkwo'] },
          specialization: { type: 'string', minLength: 1, examples: ['General Dentistry'] },
          phone: { type: 'string', minLength: 1, examples: ['+1-555-0101'] },
          email: { type: 'string', format: 'email', description: 'Unique across doctors.' },
          weekly_availability: { type: 'array', items: { $ref: '#/components/schemas/WeeklyAvailabilityPeriod' } },
          is_active: {
            type: 'boolean',
            default: true,
            description:
              'Deactivate rather than delete a doctor who has appointments — deleting one is refused.',
          },
          created_at: { type: 'string', format: 'date-time', readOnly: true },
          updated_at: { type: 'string', format: 'date-time', readOnly: true },
        },
      },
      Appointment: {
        type: 'object',
        required: [
          'id',
          'patient_name',
          'patient_phone',
          'patient_email',
          'doctor_id',
          'appointment_date',
          'appointment_time',
          'status',
        ],
        properties: {
          id: { type: 'integer', readOnly: true, examples: [1] },
          patient_name: { type: 'string', minLength: 1, examples: ['Lena Fischer'] },
          patient_phone: { type: 'string', minLength: 1, examples: ['+1-555-0201'] },
          patient_email: { type: 'string', format: 'email' },
          doctor_id: { type: 'integer', description: 'Must reference an existing doctor.' },
          appointment_date: { type: 'string', format: 'date', examples: ['2026-09-20'] },
          appointment_time: { type: 'string', examples: ['09:00'] },
          reason: { type: 'string', examples: ['Routine checkup and cleaning'] },
          status: {
            type: 'string',
            enum: ['pending', 'confirmed', 'completed', 'cancelled'],
            default: 'pending',
          },
          created_at: { type: 'string', format: 'date-time', readOnly: true },
          updated_at: { type: 'string', format: 'date-time', readOnly: true },
        },
      },
      DoctorInput: {
        type: 'object',
        required: ['name', 'specialization', 'phone', 'email', 'weekly_availability'],
        description: 'Request body for creating or replacing a doctor.',
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 200, examples: ['Dr. Amara Okonkwo'] },
          specialization: { type: 'string', minLength: 1, maxLength: 200, examples: ['General Dentistry'] },
          phone: {
            type: 'string',
            minLength: 7,
            maxLength: 30,
            pattern: '^[+()\\d\\s.-]+$',
            examples: ['+1-555-0101'],
          },
          email: { type: 'string', format: 'email', maxLength: 200, description: 'Lower-cased; unique across doctors.' },
          weekly_availability: {
            type: 'array', maxItems: 28,
            description: 'Non-overlapping working periods. An empty array leaves the doctor without bookable hours.',
            items: { $ref: '#/components/schemas/WeeklyAvailabilityPeriod' },
          },
          is_active: { type: 'boolean', default: true },
        },
      },
      AppointmentInput: {
        type: 'object',
        required: [
          'patient_name',
          'patient_phone',
          'patient_email',
          'doctor_id',
          'appointment_date',
          'appointment_time',
        ],
        description: 'Request body for booking or replacing an appointment.',
        properties: {
          patient_name: { type: 'string', minLength: 1, maxLength: 200, examples: ['Lena Fischer'] },
          patient_phone: { type: 'string', minLength: 7, maxLength: 30, examples: ['+1-555-0201'] },
          patient_email: { type: 'string', format: 'email', maxLength: 200 },
          doctor_id: { type: 'integer', minimum: 1, description: 'Must reference an existing doctor.' },
          appointment_date: { type: 'string', format: 'date', examples: ['2026-09-20'] },
          appointment_time: {
            type: 'string',
            pattern: '^([01]\\d|2[0-3]):(00|30)$',
            description: '24-hour HH:MM on a 30-minute boundary. Every appointment lasts 30 minutes.',
            examples: ['09:00'],
          },
          reason: { type: 'string', maxLength: 500, default: '' },
          status: {
            type: 'string',
            enum: ['pending', 'confirmed', 'completed', 'cancelled'],
            default: 'pending',
          },
        },
      },
    },
  },
} as const
