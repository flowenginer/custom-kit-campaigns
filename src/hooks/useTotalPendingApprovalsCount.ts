import { usePendingApprovalsCount } from "./usePendingApprovalsCount";
import { usePendingDeletesCount } from "./usePendingDeletesCount";
import { usePendingModificationsCount } from "./usePendingModificationsCount";
import { usePendingCustomerDeletesCount } from "./usePendingCustomerDeletesCount";

export const useTotalPendingApprovalsCount = () => {
  const { count: urgentCount, isLoading: urgentLoading } = usePendingApprovalsCount();
  const { count: deleteCount, isLoading: deleteLoading } = usePendingDeletesCount();
  const { count: modificationsCount, isLoading: modificationsLoading } = usePendingModificationsCount();
  const { count: customerDeleteCount, isLoading: customerDeleteLoading } = usePendingCustomerDeletesCount();

  const totalCount = urgentCount + deleteCount + modificationsCount + customerDeleteCount;
  const isLoading = urgentLoading || deleteLoading || modificationsLoading || customerDeleteLoading;

  return { count: totalCount, isLoading };
};
