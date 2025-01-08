import { useState, useCallback, useEffect } from 'react'; // v18.0.0
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'; // v4.0.0
import { 
  Scenario, 
  ScenarioFormData, 
  ScenarioAPIResponse, 
  ScenariosAPIResponse 
} from '../types/scenario.types';
import { api } from '../lib/api';
import useToast from './useToast';

// Query key for scenarios
const SCENARIOS_QUERY_KEY = ['scenarios'] as const;

// Constants for API operations
const REFETCH_INTERVAL = 300000; // 5 minutes
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

/**
 * Custom hook for comprehensive scenario management with optimistic updates
 * and error handling.
 */
export const useScenario = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  // Fetch scenarios with background refetching
  const { 
    data: scenariosResponse,
    isLoading,
    error 
  } = useQuery<ScenariosAPIResponse>(
    SCENARIOS_QUERY_KEY,
    async () => {
      const response = await api.get<ScenariosAPIResponse>('/scenarios');
      return response;
    },
    {
      refetchInterval: REFETCH_INTERVAL,
      retry: MAX_RETRIES,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, RETRY_DELAY),
      onError: (error) => {
        toast.toast({
          message: 'Failed to fetch scenarios',
          type: 'error',
          duration: 5000,
        });
      },
    }
  );

  // Create scenario mutation with optimistic updates
  const createMutation = useMutation<
    ScenarioAPIResponse,
    Error,
    ScenarioFormData
  >(
    async (formData) => {
      const response = await api.post<ScenarioAPIResponse>('/scenarios', formData);
      return response;
    },
    {
      onMutate: async (newScenario) => {
        // Cancel outgoing refetches
        await queryClient.cancelQueries(SCENARIOS_QUERY_KEY);

        // Snapshot previous scenarios
        const previousScenarios = queryClient.getQueryData<ScenariosAPIResponse>(SCENARIOS_QUERY_KEY);

        // Optimistically update scenarios
        if (previousScenarios?.data) {
          queryClient.setQueryData<ScenariosAPIResponse>(SCENARIOS_QUERY_KEY, {
            ...previousScenarios,
            data: [...previousScenarios.data, {
              ...newScenario,
              id: `temp-${Date.now()}`,
              createdAt: new Date(),
              updatedAt: new Date(),
              version: 1,
              calculationResult: null,
              lastCalculatedAt: null,
            }],
          });
        }

        return { previousScenarios };
      },
      onError: (error, variables, context) => {
        // Revert optimistic update on error
        if (context?.previousScenarios) {
          queryClient.setQueryData(SCENARIOS_QUERY_KEY, context.previousScenarios);
        }
        toast.toast({
          message: 'Failed to create scenario',
          type: 'error',
          duration: 5000,
        });
      },
      onSuccess: () => {
        toast.toast({
          message: 'Scenario created successfully',
          type: 'success',
          duration: 3000,
        });
      },
      onSettled: () => {
        // Refetch scenarios to ensure consistency
        queryClient.invalidateQueries(SCENARIOS_QUERY_KEY);
      },
    }
  );

  // Update scenario mutation with optimistic updates
  const updateMutation = useMutation<
    ScenarioAPIResponse,
    Error,
    { id: string; data: ScenarioFormData }
  >(
    async ({ id, data }) => {
      const response = await api.put<ScenarioAPIResponse>(`/scenarios/${id}`, data);
      return response;
    },
    {
      onMutate: async ({ id, data }) => {
        await queryClient.cancelQueries(SCENARIOS_QUERY_KEY);
        const previousScenarios = queryClient.getQueryData<ScenariosAPIResponse>(SCENARIOS_QUERY_KEY);

        if (previousScenarios?.data) {
          queryClient.setQueryData<ScenariosAPIResponse>(SCENARIOS_QUERY_KEY, {
            ...previousScenarios,
            data: previousScenarios.data.map((scenario) =>
              scenario.id === id
                ? { ...scenario, ...data, updatedAt: new Date() }
                : scenario
            ),
          });
        }

        return { previousScenarios };
      },
      onError: (error, variables, context) => {
        if (context?.previousScenarios) {
          queryClient.setQueryData(SCENARIOS_QUERY_KEY, context.previousScenarios);
        }
        toast.toast({
          message: 'Failed to update scenario',
          type: 'error',
          duration: 5000,
        });
      },
      onSuccess: () => {
        toast.toast({
          message: 'Scenario updated successfully',
          type: 'success',
          duration: 3000,
        });
      },
      onSettled: () => {
        queryClient.invalidateQueries(SCENARIOS_QUERY_KEY);
      },
    }
  );

  // Delete scenario mutation with optimistic removal
  const deleteMutation = useMutation<void, Error, string>(
    async (id) => {
      await api.delete(`/scenarios/${id}`);
    },
    {
      onMutate: async (id) => {
        await queryClient.cancelQueries(SCENARIOS_QUERY_KEY);
        const previousScenarios = queryClient.getQueryData<ScenariosAPIResponse>(SCENARIOS_QUERY_KEY);

        if (previousScenarios?.data) {
          queryClient.setQueryData<ScenariosAPIResponse>(SCENARIOS_QUERY_KEY, {
            ...previousScenarios,
            data: previousScenarios.data.filter((scenario) => scenario.id !== id),
          });
        }

        return { previousScenarios };
      },
      onError: (error, variables, context) => {
        if (context?.previousScenarios) {
          queryClient.setQueryData(SCENARIOS_QUERY_KEY, context.previousScenarios);
        }
        toast.toast({
          message: 'Failed to delete scenario',
          type: 'error',
          duration: 5000,
        });
      },
      onSuccess: () => {
        toast.toast({
          message: 'Scenario deleted successfully',
          type: 'success',
          duration: 3000,
        });
      },
      onSettled: () => {
        queryClient.invalidateQueries(SCENARIOS_QUERY_KEY);
      },
    }
  );

  // Public API
  const createScenario = useCallback(
    async (data: ScenarioFormData) => {
      const response = await createMutation.mutateAsync(data);
      return response.data!;
    },
    [createMutation]
  );

  const updateScenario = useCallback(
    async (id: string, data: ScenarioFormData) => {
      const response = await updateMutation.mutateAsync({ id, data });
      return response.data!;
    },
    [updateMutation]
  );

  const deleteScenario = useCallback(
    async (id: string) => {
      await deleteMutation.mutateAsync(id);
    },
    [deleteMutation]
  );

  return {
    scenarios: scenariosResponse?.data || [],
    isLoading,
    error,
    createScenario,
    updateScenario,
    deleteScenario,
  };
};

export default useScenario;