import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { createPortal } from 'react-dom';
import { type Task, type TaskWorkflowStatus, TASK_WORKFLOW_STATUS_OPTIONS } from '@/types/task';
import TaskCard, { TASK_STATUS_DOT } from './TaskCard';
import Skeleton from './Skeleton';

interface KanbanBoardProps {
  tasks: Task[];
  onUpdateStatus: (taskId: string, status: TaskWorkflowStatus) => Promise<void>;
  onSelectTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onEditTask: (task: Task) => void;
  onCommentTask?: (task: Task) => void;
  onToggleBlocked?: (task: Task) => void;
  loading?: boolean;
}

const COLUMNS: TaskWorkflowStatus[] = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'BLOCKED', 'DONE'];

function KanbanBoard({
  tasks,
  onUpdateStatus,
  onSelectTask,
  onDeleteTask,
  onEditTask,
  onCommentTask,
  onToggleBlocked,
  loading = false
}: KanbanBoardProps): JSX.Element {

  const getTasksByStatus = (status: TaskWorkflowStatus) => {
    return tasks.filter((task) => task.status === status)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  };


  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const newStatus = destination.droppableId as TaskWorkflowStatus;
    // For now, we only handle status changes. Order within column would need more backend support.
    await onUpdateStatus(draggableId, newStatus);
  };

  return (
    <div className="h-full overflow-x-auto overscroll-x-contain p-3 sm:p-4 snap-x snap-mandatory scroll-px-3 sm:snap-none custom-scrollbar">
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex h-full min-h-[480px] w-max gap-3">
          {COLUMNS.map((status) => {
            const columnTasks = getTasksByStatus(status);
            const label = TASK_WORKFLOW_STATUS_OPTIONS.find(opt => opt.value === status)?.label || status;

            return (
              <div key={status} className="flex w-[calc(100vw-4.5rem)] max-w-[300px] shrink-0 snap-start flex-col rounded-xl border border-slate-200 bg-slate-50 sm:w-72">
                <div className="flex items-center justify-between gap-2 px-3 pb-2 pt-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${TASK_STATUS_DOT[status] ?? 'bg-slate-400'}`} />
                    <h3 className="m-0 truncate text-[13px] font-semibold text-slate-800">
                      {label}
                    </h3>
                    <span className="rounded-full bg-white px-1.5 text-[11px] font-medium tabular-nums text-slate-500 ring-1 ring-inset ring-slate-200">
                      {columnTasks.length}
                    </span>
                  </div>
                </div>

                <Droppable droppableId={status}>
                  {(provided, snapshot) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className={`flex min-h-[120px] flex-1 flex-col gap-2 overflow-y-auto rounded-b-xl px-2 pb-2 transition-colors duration-150 ${snapshot.isDraggingOver ? 'bg-slate-100' : ''}`}
                    >
                      {loading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                          <div key={`skeleton-${status}-${i}`} className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
                            <Skeleton variant="text" className="h-4 w-2/3" />
                            <Skeleton variant="text" className="h-3 w-full" />
                            <div className="flex items-center justify-between pt-1">
                              <Skeleton variant="text" className="h-3 w-16" />
                              <Skeleton variant="circle" className="h-6 w-6" />
                            </div>
                          </div>
                        ))
                      ) : (
                        columnTasks.map((task, index) => (
                          <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(provided, snapshot) => {
                              const content = (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={snapshot.isDragging ? 'z-[9999] rounded-xl shadow-lg ring-1 ring-slate-900/10' : ''}
                                  style={{
                                    ...provided.draggableProps.style,
                                    // Avoid potential position jumps during portal creation
                                    cursor: snapshot.isDragging ? 'grabbing' : 'grab',
                                  }}
                                >
                                  <TaskCard
                                    task={task}
                                    onDelete={onDeleteTask}
                                    onEditTask={onEditTask}
                                    onSelect={onSelectTask}
                                    onComment={onCommentTask}
                                    onToggleBlocked={onToggleBlocked}
                                    variant="card"
                                  />
                                </div>
                              );

                              return snapshot.isDragging
                                ? createPortal(content, document.body)
                                : content;
                            }}
                          </Draggable>
                        ))
                      )}

                      {!loading && columnTasks.length === 0 && !snapshot.isDraggingOver ? (
                        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-400">
                          No tasks
                        </div>
                      ) : null}

                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}

export default KanbanBoard;
