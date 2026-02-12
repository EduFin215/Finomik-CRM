import { useQuery } from '@tanstack/react-query';
import { getUnreadWorkTaskNotificationCount } from '../services/tasks';

export function useWorkTaskNotificationCount(userId: string | undefined) {
  const { data: count = 0 } = useQuery({
    queryKey: ['work-task-notification-count', userId],
    queryFn: () => (userId ? getUnreadWorkTaskNotificationCount(userId) : 0),
    enabled: !!userId,
  });
  return count;
}
