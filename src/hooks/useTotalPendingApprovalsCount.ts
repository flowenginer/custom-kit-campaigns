import { usePendingApprovalsCount } from "./usePendingApprovalsCount";
import { usePendingDeletesCount } from "./usePendingDeletesCount";
import { usePendingModificationsCount } from "./usePendingModificationsCount";

export const useTotalPendingApprovalsCount = () => {
  const { count: urgentCount, isLoading: urgentLoading } = usePendingApprovalsCount();
  const { count: deleteCount, isLoading: deleteLoading } = usePendingDeletesCount();
  const { count: modificationsCount, isLoading: modificationsLoading } = usePendingModificationsCount();

  const totalCount = urgentCount + deleteCount + modificationsCount;
  const isLoading = urgentLoading || deleteLoading || modificationsLoading;

  return { count: totalCount, isLoading };
};
