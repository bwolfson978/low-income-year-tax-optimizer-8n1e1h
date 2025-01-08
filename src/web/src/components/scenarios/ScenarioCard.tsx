import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../ui/Card';
import { Button } from '../ui/Button';
import { TrashIcon, ChartIcon } from 'lucide-react'; // v0.3.0
import { Scenario } from '../../types/scenario.types';
import { formatCurrency } from '../../utils/currency-helpers';

interface ScenarioCardProps {
  scenario: Scenario;
  onView: (id: string) => void;
  onCompare: (id: string) => void;
  onDelete: (id: string) => Promise<void>;
  isSelected?: boolean;
  className?: string;
}

const ScenarioCard: React.FC<ScenarioCardProps> = ({
  scenario,
  onView,
  onCompare,
  onDelete,
  isSelected = false,
  className,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  // Format currency values with proper accessibility
  const traditionalBalance = formatCurrency(scenario.traditionalIRABalance, {
    addAriaLabel: true,
    useCache: true,
  });
  const rothBalance = formatCurrency(scenario.rothIRABalance, {
    addAriaLabel: true,
    useCache: true,
  });
  const capitalGains = formatCurrency(scenario.capitalGains, {
    addAriaLabel: true,
    useCache: true,
  });

  // Handle delete with loading state and error handling
  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDeleting) return;

    try {
      setIsDeleting(true);
      await onDelete(scenario.id);
    } catch (error) {
      console.error('Error deleting scenario:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  // Format date for display and screen readers
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(scenario.createdAt));

  return (
    <Card
      className={`
        relative hover:shadow-md transition-shadow dark:hover:shadow-md-dark
        ${isSelected ? 'ring-2 ring-primary dark:ring-primary-dark' : ''}
        ${isDeleting ? 'opacity-75 pointer-events-none cursor-not-allowed' : ''}
        ${className || ''}
      `}
      role="article"
      aria-busy={isDeleting}
    >
      <CardHeader className="space-y-2">
        <CardTitle
          as="h3"
          className="text-lg font-semibold leading-none tracking-tight"
        >
          {scenario.name}
        </CardTitle>
        <CardDescription color="muted">
          <time dateTime={scenario.createdAt.toISOString()}>{formattedDate}</time>
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="space-y-2 text-sm md:text-base">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground dark:text-muted-foreground-dark">
              Traditional IRA:
            </span>
            <span
              className="font-medium tabular-nums"
              dangerouslySetInnerHTML={{ __html: traditionalBalance }}
            />
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground dark:text-muted-foreground-dark">
              Roth IRA:
            </span>
            <span
              className="font-medium tabular-nums"
              dangerouslySetInnerHTML={{ __html: rothBalance }}
            />
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground dark:text-muted-foreground-dark">
              Capital Gains:
            </span>
            <span
              className="font-medium tabular-nums"
              dangerouslySetInnerHTML={{ __html: capitalGains }}
            />
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground dark:text-muted-foreground-dark">
              Tax State:
            </span>
            <span className="font-medium">{scenario.taxState}</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex items-center space-x-2 md:space-x-3">
        <Button
          variant="default"
          size="sm"
          onClick={() => onView(scenario.id)}
          className="flex items-center space-x-1 min-w-[5rem] justify-center"
          aria-label={`View details for ${scenario.name}`}
        >
          View Details
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onCompare(scenario.id)}
          className="flex items-center space-x-1 min-w-[5rem] justify-center"
          aria-label={`Compare ${scenario.name} with other scenarios`}
        >
          <ChartIcon className="h-4 w-4" aria-hidden="true" />
          <span>Compare</span>
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleDelete}
          disabled={isDeleting}
          className="flex items-center space-x-1 min-w-[5rem] justify-center"
          aria-label={`Delete ${scenario.name}`}
        >
          <TrashIcon className="h-4 w-4" aria-hidden="true" />
          <span>{isDeleting ? 'Deleting...' : 'Delete'}</span>
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ScenarioCard;