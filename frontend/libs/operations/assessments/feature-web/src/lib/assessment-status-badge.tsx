import { Badge } from '@mantine/core';
import { AssessmentStatus } from '@rootstock/operations/assessments/assessments-data-access';
import { palette } from '@rootstock/ui/theme';

interface AssessmentStatusBadgeProps {
  status: AssessmentStatus;
}

export const AssessmentStatusBadge = ({ status }: AssessmentStatusBadgeProps) => {
  const getColor = (status: AssessmentStatus) => {
    switch (status) {
      case AssessmentStatus.COMPLETED:
        return palette.status.completed;
      case AssessmentStatus.IN_PROGRESS:
        return palette.status.inProgress;
      case AssessmentStatus.PENDING:
      default:
        return palette.status.pending;
    }
  };

  return (
    <Badge color={getColor(status)} variant="light">
      {status.replace('_', ' ')}
    </Badge>
  );
};
