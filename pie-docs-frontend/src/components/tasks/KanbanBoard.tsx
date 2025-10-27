import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { RootState, AppDispatch } from '@/store';
import { updateTaskStatus, Task, TaskStatus } from '@/store/slices/tasksSlice';
import KanbanColumn from './KanbanColumn';
import TaskCard from './TaskCard';

const KanbanBoard: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { tasksByStatus } = useSelector((state: RootState) => state.tasks);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const columnConfig = [
    {
      id: 'pending' as TaskStatus,
      title: 'Pending',
      color: 'bg-gray-100',
      headerColor: 'bg-gray-50 border-gray-200',
      tasks: tasksByStatus.pending,
    },
    {
      id: 'inProgress' as TaskStatus,
      title: 'In Progress',
      color: 'bg-blue-100',
      headerColor: 'bg-blue-50 border-blue-200',
      tasks: tasksByStatus.inProgress,
    },
    {
      id: 'completed' as TaskStatus,
      title: 'Completed',
      color: 'bg-green-100',
      headerColor: 'bg-green-50 border-green-200',
      tasks: tasksByStatus.completed,
    },
  ];

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = findTaskById(active.id as string);
    setActiveTask(task);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as TaskStatus;

    // Find the task's current status
    const task = findTaskById(taskId);
    if (!task || task.status === newStatus) return;

    // Update task status
    dispatch(updateTaskStatus({ taskId, status: newStatus }));
  };

  const findTaskById = (id: string): Task | null => {
    for (const column of columnConfig) {
      const task = column.tasks.find(task => task.id === id);
      if (task) return task;
    }
    return null;
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {columnConfig.map(column => (
            <SortableContext
              key={column.id}
              items={column.tasks.map(task => task.id)}
              strategy={verticalListSortingStrategy}
            >
              <KanbanColumn
                id={column.id}
                title={column.title}
                tasks={column.tasks}
                color={column.color}
                headerColor={column.headerColor}
              />
            </SortableContext>
          ))}
        </div>
      </div>

      <DragOverlay>
        {activeTask ? (
          <div className="transform rotate-3 opacity-90">
            <TaskCard task={activeTask} isDragging />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default KanbanBoard;