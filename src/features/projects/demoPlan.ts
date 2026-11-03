import type { AIProjectPlanResponse } from '@/services/centralizedAi';

/**
 * A ready-made plan for trying the AI Planner before connecting an AI provider. It goes through the same
 * review and "Approve & create" steps as a generated plan, so the result is a real project to explore.
 */
export function buildDemoPlan(): AIProjectPlanResponse {
  return {
    name: 'Demo: Customer onboarding',
    description: 'A sample project that shows how the AI Planner turns an idea into epics, tasks and sub-tasks.',
    systemGoal: 'Get new customers from sign-up to their first success in under 10 minutes.',
    recommendedStack: 'Your existing web app plus the Pristine SDK for guides and surveys',
    coreWorkflow: ['Customer signs up', 'Welcome guide walks through setup', 'Customer completes the first key action', 'Short survey asks how it went'],
    actors: [
      { name: 'New customer', type: 'HUMAN', responsibilities: ['Signs up', 'Completes setup'] },
      { name: 'Product team', type: 'HUMAN', responsibilities: ['Builds and tunes the onboarding flow'] },
      { name: 'Pristine SDK', type: 'SYSTEM', responsibilities: ['Shows guides and surveys', 'Records onboarding events'] }
    ],
    suggestedStates: [
      { name: 'Backlog', color: '#94A3B8', category: 'BACKLOG' },
      { name: 'To do', color: '#64748B', category: 'UNSTARTED' },
      { name: 'In progress', color: '#3E50D8', category: 'STARTED' },
      { name: 'Done', color: '#2F7D4F', category: 'COMPLETED' }
    ],
    modules: [
      {
        name: 'Sign-up and setup',
        purpose: 'Make the first session short and clear',
        features: [
          {
            name: 'Welcome guide',
            description: 'A three-step guide shown after sign-up',
            acceptanceCriteria: ['Shows once per new user', 'Can be dismissed and reopened'],
            estimatedHours: 6
          }
        ]
      },
      {
        name: 'Measure and improve',
        purpose: 'See where customers drop off and fix it',
        features: [
          {
            name: 'Onboarding events and survey',
            description: 'Track each setup step and ask a one-question survey at the end',
            acceptanceCriteria: ['Each step sends an event', 'Survey shows after the first key action'],
            estimatedHours: 5
          }
        ]
      }
    ],
    epics: [
      { name: 'Welcome flow', description: 'The guide and setup checklist new customers see first' },
      { name: 'Onboarding analytics', description: 'Events, drop-off and survey results' },
      { name: 'Launch', description: 'Roll out and review the first week' }
    ],
    tasks: [
      {
        title: 'Write the welcome guide copy',
        description: 'Three short steps: what the product does, the one setting to change, the first action to take.',
        priority: 'HIGH',
        estimatedHours: 3,
        epicIndex: 0,
        suggestedStateIndex: 1,
        subtasks: [{ title: 'Draft the three steps' }, { title: 'Review with support' }, { title: 'Add screenshots' }]
      },
      {
        title: 'Build the welcome guide in Pristine',
        description: 'Create the guide in Engagement and target it at users who signed up in the last 7 days.',
        priority: 'HIGH',
        estimatedHours: 2,
        epicIndex: 0,
        suggestedStateIndex: 1
      },
      {
        title: 'Add a setup checklist',
        description: 'A checklist of the four setup steps with progress.',
        priority: 'MEDIUM',
        estimatedHours: 4,
        epicIndex: 0,
        suggestedStateIndex: 0,
        subtasks: [{ title: 'Pick the four steps' }, { title: 'Show progress' }]
      },
      {
        title: 'Track each onboarding step',
        description: 'Send an Engagement.track() event when each setup step completes.',
        priority: 'HIGH',
        estimatedHours: 3,
        epicIndex: 1,
        suggestedStateIndex: 1
      },
      {
        title: 'Add the "How did setup go?" survey',
        description: 'One CSAT question after the first key action.',
        priority: 'MEDIUM',
        estimatedHours: 2,
        epicIndex: 1,
        suggestedStateIndex: 0
      },
      {
        title: 'Review drop-off after the first week',
        description: 'Check guide and survey analytics; create tasks for the biggest drop-off.',
        priority: 'MEDIUM',
        estimatedHours: 2,
        epicIndex: 2,
        suggestedStateIndex: 0
      }
    ],
    dependencies: [
      { taskIndex: 1, dependsOnTaskIndex: 0, type: 'BLOCKED_BY', description: 'The guide needs its copy first' },
      { taskIndex: 5, dependsOnTaskIndex: 3, type: 'BLOCKED_BY', description: 'Review needs the events' }
    ],
    risks: [
      { title: 'Guide shows too often', type: 'REQUIREMENTS', severity: 'LOW', mitigation: 'Show once per user and let them reopen it from help.' },
      { title: 'Too few survey answers', type: 'TIMELINE', severity: 'MEDIUM', mitigation: 'Keep it to one question and ask right after success.' }
    ],
    timeline: {
      totalEngineeringHours: 16,
      totalEngineeringDays: 2,
      estimatedCalendarWeeks: 2,
      confidence: 'MEDIUM',
      assumptions: ['The SDK is already installed', 'One person owns the work'],
      milestones: [
        { name: 'Welcome flow live', estimatedHours: 9, epicNames: ['Welcome flow'], targetWeek: 1 },
        { name: 'First week reviewed', estimatedHours: 7, epicNames: ['Onboarding analytics', 'Launch'], targetWeek: 2 }
      ]
    }
  };
}
