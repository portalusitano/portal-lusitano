# Task Management System - TasksContent Component

## Overview

A production-ready Kanban-style task management system for Portal Lusitano's admin panel. Features drag-and-drop functionality, advanced filtering, real-time statistics, and full CRUD operations.

## Features

### 1. Kanban Board View

- **3 Columns**: To Do (pendente), In Progress (em_andamento), Done (concluida)
- **Drag & Drop**: Move tasks between columns using @dnd-kit
- **Visual Feedback**: Smooth animations and hover states
- **Color Coding**: Each column has distinct colors (gray, blue, green)

### 2. Task Cards

Display the following information:

- **Title & Description**: Truncated with line-clamp for readability
- **Priority Badge**: Color-coded (baixa/normal/alta/urgente)
- **Due Date**: With smart color coding
  - Red: Overdue
  - Yellow: Due today
  - Gray: Future dates
- **Assigned To**: Email of assigned admin user
- **Quick Actions**: Edit and Delete buttons (visible on hover)

### 3. Task Statistics

Real-time dashboard showing:

- Total tasks
- Pending tasks
- In Progress tasks
- Completed tasks
- Overdue tasks
- Tasks due today

### 4. Advanced Filtering & Sorting

#### Filters:

- **Search**: Full-text search across title, description, and assigned_to
- **Priority**: Filter by baixa, normal, alta, urgente
- **Assigned To**: Filter by assigned admin user

#### Sorting:

- By Due Date (default)
- By Creation Date
- By Priority (urgente → alta → normal → baixa)

### 5. Create/Edit Task Modal

Full-featured modal with:

- **Title** (required)
- **Description** (textarea)
- **Assigned To** (text input with datalist of admin users)
- **Priority** (dropdown: baixa, normal, alta, urgente)
- **Due Date** (date picker, required)
- **Status** (dropdown, only shown when editing)
- Form validation
- Auto-focus on first field
- Keyboard shortcuts (ESC to close)

### 6. Smart Date Formatting

- "Hoje" for today
- "Ontem" for yesterday
- "Amanhã" for tomorrow
- "15 fev" for other dates (localized to pt-PT)

## API Endpoints

### GET /api/admin/tasks

List all tasks with filtering.

**Query Parameters:**

- `status`: pendente | em_andamento | concluida | all (default: all)
- `priority`: baixa | normal | alta | urgente | all (default: all)
- `assigned_to`: email | all (default: all)
- `search`: search term
- `month`: YYYY-MM format

**Response:**

```json
{
  "tasks": [
    {
      "id": "uuid",
      "title": "string",
      "description": "string | null",
      "assigned_to": "email | null",
      "status": "pendente | em_andamento | concluida",
      "priority": "baixa | normal | alta | urgente",
      "due_date": "ISO 8601 date",
      "created_at": "ISO 8601 date",
      "updated_at": "ISO 8601 date",
      "admin_email": "email | null",
      "task_type": "string",
      "related_email": "email | null",
      "completed_at": "ISO 8601 date | null"
    }
  ],
  "stats": {
    "total": 0,
    "pendente": 0,
    "em_andamento": 0,
    "concluida": 0,
    "vencidas": 0,
    "hoje": 0
  }
}
```

### POST /api/admin/tasks

Create a new task.

**Request Body:**

```json
{
  "title": "string (required)",
  "description": "string",
  "assigned_to": "email",
  "priority": "baixa | normal | alta | urgente",
  "due_date": "YYYY-MM-DD (required)",
  "task_type": "follow_up",
  "related_email": "email",
  "notes": "string"
}
```

**Response:**

```json
{
  "task": {
    /* Task object */
  }
}
```

### PATCH /api/admin/tasks/[id]

Update an existing task.

**Request Body:** (all fields optional)

```json
{
  "title": "string",
  "description": "string",
  "assigned_to": "email",
  "status": "pendente | em_andamento | concluida",
  "priority": "baixa | normal | alta | urgente",
  "due_date": "YYYY-MM-DD",
  "task_type": "string",
  "related_email": "email",
  "notes": "string"
}
```

**Response:**

```json
{
  "task": {
    /* Updated task object */
  }
}
```

### DELETE /api/admin/tasks/[id]

Delete a task (with confirmation).

**Response:**

```json
{
  "message": "Tarefa eliminada com sucesso"
}
```

### GET /api/admin/users

Get list of admin users (for assignment dropdown).

**Response:**

```json
{
  "users": [
    {
      "id": "uuid",
      "email": "string",
      "nome": "string",
      "role": "string",
      "ativo": true
    }
  ],
  "total": 0
}
```

## Database Schema

### Table: admin_tasks

```sql
CREATE TABLE admin_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Task Information
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT NOT NULL DEFAULT 'follow_up',

  -- Dates
  due_date TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,

  -- Status & Priority
  status TEXT NOT NULL DEFAULT 'pendente',
  priority TEXT NOT NULL DEFAULT 'normal',

  -- Assignment & Relations
  assigned_to TEXT,  -- NEW FIELD added via migration
  related_email TEXT,
  related_contact_id UUID,
  related_message_id UUID,

  -- Notes & Tracking
  notes TEXT,
  admin_email TEXT NOT NULL,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Migration Required

Run this migration to add the `assigned_to` field:

```sql
-- File: supabase/migrations/20260207000001_add_assigned_to_tasks.sql
ALTER TABLE admin_tasks
ADD COLUMN IF NOT EXISTS assigned_to TEXT;

CREATE INDEX IF NOT EXISTS idx_admin_tasks_assigned_to ON admin_tasks(assigned_to);
```

## Design System

### Colors

- **Gold/Primary**: #C5A059 (Portal Lusitano brand color)
- **Background**: Gradient from #050505 via #0A0A0A to #050505
- **Cards**: bg-white/5 with border-white/10
- **Text**: White primary, gray-400 secondary

### Priority Colors

- **Baixa**: Gray (bg-gray-500/20, text-gray-400)
- **Normal**: Blue (bg-blue-500/20, text-blue-400)
- **Alta**: Orange (bg-orange-500/20, text-orange-400)
- **Urgente**: Red (bg-red-500/20, text-red-400)

### Status Colors

- **Pendente**: Gray (border-gray-500/30)
- **Em Andamento**: Blue (border-blue-500/30)
- **Concluída**: Green (border-green-500/30)

## Dependencies

```json
{
  "@dnd-kit/core": "^6.3.1",
  "@dnd-kit/sortable": "^10.0.0",
  "@dnd-kit/utilities": "^3.2.2",
  "lucide-react": "^0.562.0",
  "next": "^16.1.6",
  "react": "19.2.3"
}
```

## Usage

### Import the Component

```tsx
import TasksContent from "@/components/admin-app/TasksContent";

export default function TasksPage() {
  return <TasksContent />;
}
```

### Integration with Admin Layout

The component is designed to work within the admin-app layout structure:

```tsx
// app/admin-app/tarefas/page.tsx
import TasksContent from "@/components/admin-app/TasksContent";

export default function TasksPage() {
  return <TasksContent />;
}
```

## Toast Notifications

The component includes a simple toast implementation. For production, consider replacing with a library like:

- `react-hot-toast`
- `sonner`
- `react-toastify`

To replace the toast implementation, update the `showToast` function:

```tsx
import { toast } from "react-hot-toast"; // or your preferred library

const showToast = (message: string, type: "success" | "error") => {
  if (type === "success") {
    toast.success(message);
  } else {
    toast.error(message);
  }
};
```

## Keyboard Shortcuts (Future Enhancement)

Consider adding:

- `N`: New task
- `ESC`: Close modal
- `Enter`: Submit form
- `F`: Focus search
- `/`: Open command palette

## Performance Optimizations

1. **Lazy Loading**: Tasks are loaded once on mount
2. **Optimistic Updates**: Drag-and-drop updates UI immediately, then syncs with server
3. **Debounced Search**: Consider adding debouncing to search input
4. **Pagination**: For large task lists (>100 tasks), implement pagination

## Security

- All API routes protected with `verifySession()`
- Row Level Security (RLS) enabled on `admin_tasks` table
- Input validation on both client and server
- SQL injection prevention via Supabase client
- XSS prevention via React's built-in escaping

## Accessibility

- Semantic HTML structure
- Keyboard navigation support
- ARIA labels on interactive elements
- Focus management in modal
- Screen reader friendly

## Testing Checklist

- [ ] Create new task
- [ ] Edit existing task
- [ ] Delete task (with confirmation)
- [ ] Drag task between columns
- [ ] Filter by priority
- [ ] Filter by assigned user
- [ ] Search functionality
- [ ] Sort by due date
- [ ] Sort by priority
- [ ] Sort by created date
- [ ] View task statistics
- [ ] Mobile responsiveness
- [ ] Date formatting (hoje, ontem, amanhã)
- [ ] Overdue task highlighting
- [ ] Empty state display

## Future Enhancements

1. **Recurring Tasks**: Add support for repeating tasks
2. **Task Comments**: Allow comments/notes on tasks
3. **File Attachments**: Attach files to tasks
4. **Task Templates**: Create task templates for common workflows
5. **Email Notifications**: Send email reminders for overdue tasks
6. **Calendar View**: Alternative calendar view for tasks
7. **Time Tracking**: Track time spent on tasks
8. **Subtasks**: Create hierarchical task structures
9. **Task Dependencies**: Link tasks with dependencies
10. **Bulk Actions**: Select and update multiple tasks at once

## Troubleshooting

### Tasks not loading

- Check API endpoint is running: `/api/admin/tasks`
- Verify authentication session is valid
- Check browser console for errors
- Verify Supabase connection

### Drag-and-drop not working

- Ensure @dnd-kit packages are installed
- Check browser console for errors
- Verify sensor configuration

### Filter/Search not working

- Check state updates in React DevTools
- Verify filter logic in component
- Test API endpoint with query parameters

## Support

For issues or questions, contact the development team or refer to:

- Next.js Documentation: https://nextjs.org/docs
- @dnd-kit Documentation: https://docs.dndkit.com
- Supabase Documentation: https://supabase.com/docs
