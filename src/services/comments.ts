import api from '@/services/api';

export interface Comment {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  /** When the text was last changed after posting, or null. */
  editedAt?: string | null;
  /** The signed-in person is the author or an admin of the task's project. */
  canModify?: boolean;
  user: {
    id: string;
    email: string;
    name: string | null;
  };
  createdAt: string;
}

interface CommentListResponse {
  message: string;
  data: {
    comments: Comment[];
  };
}

interface CommentResponse {
  message: string;
  data: {
    comment: Comment;
  };
}

const getComments = async (taskId: string): Promise<Comment[]> => {
  const response = await api.get<CommentListResponse>(`/tasks/${taskId}/comments`);
  return response.data.data.comments;
};

const addComment = async (taskId: string, content: string): Promise<Comment> => {
  const response = await api.post<CommentResponse>(`/tasks/${taskId}/comments`, { content });
  return response.data.data.comment;
};

const updateComment = async (taskId: string, commentId: string, content: string): Promise<Comment> => {
  const response = await api.patch<CommentResponse>(`/tasks/${taskId}/comments/${commentId}`, { content });
  return response.data.data.comment;
};

const deleteComment = async (taskId: string, commentId: string): Promise<void> => {
  await api.delete(`/tasks/${taskId}/comments/${commentId}`);
};

export { getComments, addComment, updateComment, deleteComment };
