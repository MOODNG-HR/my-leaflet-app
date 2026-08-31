import { useQueryClient } from '@tanstack/react-query';
import {
  getGetDashboardSummaryQueryKey,
  getGetEmployeesQueryKey,
  getGetLeaveRequestsQueryKey,
  useCreateLeaveRequest,
  useUpdateLeaveRequestStatus,
} from '@workspace/api-client-react';

export function useLeaveActions() {
  const queryClient = useQueryClient();
  const create = useCreateLeaveRequest();
  const updateStatus = useUpdateLeaveRequestStatus();

  const refreshLeaveData = () => {
    queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetLeaveRequestsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetEmployeesQueryKey() });
  };

  return {
    createRequest: create,
    updateRequestStatus: updateStatus,
    refreshLeaveData,
  };
}