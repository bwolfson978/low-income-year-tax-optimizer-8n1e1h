import React, { useState, useCallback, useEffect, useRef } from 'react';
import { PlusIcon } from 'lucide-react'; // v0.3.0
import { ScenarioCard } from './ScenarioCard';
import useScenario from '../../hooks/useScenario';
import { Button } from '../ui/Button';
import { Scenario } from '../../types/scenario.types';
import useToast from '../../hooks/useToast';

interface ScenarioListProps {
  onNewScenario: () => void;
  onViewScenario: (id: string) => void;
  onCompareScenario: (id: string) => void;
  className?: string;
  ariaLabel?: string;
  analyticsContext?: Record<string, unknown>;
}

const ITEMS_PER_PAGE = 12;
const SCROLL_THRESHOLD = 0.8;

export const ScenarioList: React.FC<ScenarioListProps> = ({
  onNewScenario,
  onViewScenario,
  onCompareScenario,
  className = '',
  ariaLabel = 'Saved tax optimization scenarios',
  analyticsContext = {},
}) => {
  // State management
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<'createdAt' | 'name'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filter, setFilter] = useState<string>('');
  const [selectedScenarioIds, setSelectedScenarioIds] = useState<Set<string>>(new Set());
  const [isCompareMode, setIsCompareMode] = useState(false);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastCardRef = useRef<HTMLDivElement>(null);

  // Hooks
  const { scenarios, isLoading, error, deleteScenario } = useScenario();
  const toast = useToast();

  // Memoized filtered and sorted scenarios
  const processedScenarios = React.useMemo(() => {
    let result = [...scenarios];

    // Apply filter
    if (filter) {
      const searchTerm = filter.toLowerCase();
      result = result.filter(scenario => 
        scenario.name.toLowerCase().includes(searchTerm) ||
        scenario.description?.toLowerCase().includes(searchTerm)
      );
    }

    // Apply sorting
    result.sort((a, b) => {
      const aValue = sortBy === 'createdAt' ? a.createdAt.getTime() : a.name;
      const bValue = sortBy === 'createdAt' ? b.createdAt.getTime() : b.name;
      return sortOrder === 'asc' 
        ? aValue > bValue ? 1 : -1
        : aValue < bValue ? 1 : -1;
    });

    return result;
  }, [scenarios, filter, sortBy, sortOrder]);

  // Pagination calculation
  const paginatedScenarios = React.useMemo(() => {
    const startIndex = 0;
    const endIndex = currentPage * ITEMS_PER_PAGE;
    return processedScenarios.slice(startIndex, endIndex);
  }, [processedScenarios, currentPage]);

  // Infinite scroll setup
  useEffect(() => {
    if (!lastCardRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const lastEntry = entries[0];
        if (lastEntry.isIntersecting && 
            paginatedScenarios.length < processedScenarios.length) {
          setCurrentPage(prev => prev + 1);
        }
      },
      { threshold: SCROLL_THRESHOLD }
    );

    observerRef.current.observe(lastCardRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [paginatedScenarios.length, processedScenarios.length]);

  // Error handling
  useEffect(() => {
    if (error) {
      toast.toast({
        message: 'Failed to load scenarios. Please try again.',
        type: 'error',
        duration: 5000,
      });
    }
  }, [error, toast]);

  // Handlers
  const handleDeleteScenario = useCallback(async (id: string) => {
    try {
      await deleteScenario(id);
      setSelectedScenarioIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      toast.toast({
        message: 'Scenario deleted successfully',
        type: 'success',
        duration: 3000,
      });
    } catch (error) {
      toast.toast({
        message: 'Failed to delete scenario',
        type: 'error',
        duration: 5000,
      });
    }
  }, [deleteScenario, toast]);

  const handleScenarioSelect = useCallback((id: string) => {
    setSelectedScenarioIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleCompareMode = useCallback(() => {
    setIsCompareMode(!isCompareMode);
    setSelectedScenarioIds(new Set());
  }, [isCompareMode]);

  // Render functions
  const renderHeader = () => (
    <div className="flex items-center justify-between mb-6 sticky top-0 bg-background z-10 p-4 border-b">
      <div className="flex items-center space-x-4">
        <h2 className="text-2xl font-semibold tracking-tight">My Scenarios</h2>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortBy(sortBy === 'createdAt' ? 'name' : 'createdAt')}
            aria-label={`Sort by ${sortBy === 'createdAt' ? 'name' : 'date'}`}
          >
            {sortBy === 'createdAt' ? 'Sort by Name' : 'Sort by Date'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            aria-label={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </Button>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          onClick={handleCompareMode}
          disabled={selectedScenarioIds.size === 0 && isCompareMode}
          aria-label="Toggle comparison mode"
        >
          {isCompareMode ? 'Cancel Compare' : 'Compare'}
        </Button>
        <Button
          variant="default"
          onClick={onNewScenario}
          className="flex items-center space-x-2"
          aria-label="Create new scenario"
        >
          <PlusIcon className="w-4 h-4" />
          <span>New Scenario</span>
        </Button>
      </div>
    </div>
  );

  const renderScenarios = () => (
    <div
      ref={containerRef}
      className={`grid gap-4 auto-rows-max ${className}`}
      style={{
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
      }}
      role="list"
      aria-label={ariaLabel}
    >
      {paginatedScenarios.map((scenario, index) => (
        <div
          key={scenario.id}
          ref={index === paginatedScenarios.length - 1 ? lastCardRef : null}
          role="listitem"
        >
          <ScenarioCard
            scenario={scenario}
            onView={onViewScenario}
            onCompare={onCompareScenario}
            onDelete={handleDeleteScenario}
            isSelected={selectedScenarioIds.has(scenario.id)}
            className={isCompareMode ? 'cursor-pointer' : ''}
            onClick={() => isCompareMode && handleScenarioSelect(scenario.id)}
          />
        </div>
      ))}
    </div>
  );

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <p className="text-lg text-muted-foreground mb-4">
        No scenarios found. Create your first scenario to get started.
      </p>
      <Button onClick={onNewScenario} variant="default">
        <PlusIcon className="w-4 h-4 mr-2" />
        Create Scenario
      </Button>
    </div>
  );

  const renderLoadingState = () => (
    <div className="grid gap-4 auto-rows-max" style={{
      gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    }}>
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse bg-muted rounded-lg h-[200px]"
          aria-hidden="true"
        />
      ))}
    </div>
  );

  return (
    <div className="space-y-6 relative">
      {renderHeader()}
      
      {isLoading ? renderLoadingState() : (
        processedScenarios.length > 0 ? renderScenarios() : renderEmptyState()
      )}

      {/* Accessibility announcement for dynamic updates */}
      <div className="sr-only" role="status" aria-live="polite">
        {isLoading ? 'Loading scenarios' : 
          `${processedScenarios.length} scenarios available`}
      </div>
    </div>
  );
};

export default ScenarioList;